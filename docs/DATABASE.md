# Banco de Dados — MeuSiteCasamento

> Modelo de dados completo: princípios de modelagem, tabelas, relacionamentos e convenções SQL. Para como isso se traduz em migrations/RLS/funções Postgres na prática, ver [`ARCHITECTURE.md`](ARCHITECTURE.md) (seções 4, 9.1). Para regras de negócio que motivam certas colunas/constraints, ver [`PRODUCT.md`](PRODUCT.md). Em caso de conflito, [`CLAUDE.md`](../CLAUDE.md) prevalece.

---

## 1. Princípios de modelagem

- **SGBD**: PostgreSQL 15+ (via Supabase).
- **Modelagem**: normalizada (3FN) como padrão; denormalização só é aceita com justificativa de performance documentada em comentário SQL.
- **Chaves primárias**: `uuid` (`gen_random_uuid()`), nunca `serial`/`bigserial` — evita vazamento de contagem de registros e facilita merge futuro entre tenants. Três exceções verificadas no schema atual: `contadores_uso` não tem `id` próprio — é uma tabela de extensão 1:1 de `casamentos`, com `casamento_id` como chave primária; `operadores_plataforma` segue o mesmo padrão, extensão 1:1 de `auth.users` com `usuario_id` como chave primária; `vinculos_convite_etiqueta` (junção pura M:N) também não tem `id` — a chave primária é o par `(convite_id, etiqueta_id)`.
- **Timestamps**: toda tabela possui `created_at` e `updated_at` (`timestamptz`, default `now()`), atualizados via trigger `<tabela>_set_updated_at` (função `atualizar_timestamp()`). Exceções deliberadas: `historico_convite` e `trilha_auditoria` (logs append-only) não têm `updated_at` — um log nunca é editado; `vinculos_convite_etiqueta` também não tem `updated_at` — um vínculo é removido e recriado, nunca atualizado in-place; `contadores_uso` tem só `updated_at` (sem `created_at`) — é uma tabela de contadores materializados, não uma entidade "criada" pela aplicação.
- **Soft delete**: entidades com valor histórico (convidados, presentes) usam `excluido_em timestamptz null` em vez de exclusão física, permitindo recuperação e auditoria. `convites` e `grupos` também usam soft delete — não por valor histórico próprio, mas porque `convidados.convite_id`/`convidados.grupo_id` podem referenciar essas linhas mesmo após um convidado ser soft-deleted (ver seção 3.2). `etapas_evento`, por outro lado, usa exclusão física — nenhuma outra tabela referencia essa entidade e ela não tem valor histórico por si só. `nucleos_acompanhantes` e `etiquetas_convite` não têm soft delete — não carregam valor histórico próprio (ver seção 3.2).
- **Row Level Security (RLS)**: habilitado em **todas** as tabelas desde a v1, mesmo em modo single-tenant. Na maioria das tabelas, a policy filtra por `casamento_id` pertencente ao usuário autenticado (caminho administrativo, preparando a base para o modelo SaaS); `casamentos` e `etapas_evento` também têm uma policy adicional de leitura pública, sem filtro de `casamento_id`, para atender o site público (ver CLAUDE.md, Modelo de Confiança). O caminho do convidado tem enforcement próprio, fora de RLS.
- **`casamento_id` denormalizado em toda tabela filha**: mesmo quando `casamento_id` é tecnicamente derivável via join (ex.: `convidados` → `convites` → `casamentos`), a coluna é duplicada diretamente na tabela filha (`convidados.casamento_id`, `respostas_rsvp.casamento_id`, `reservas_presentes.casamento_id` etc.). Isso simplifica e acelera as RLS policies (evita join por linha) e prepara particionamento futuro por `casamento_id` (ver [`ROADMAP.md`](ROADMAP.md), seção "Riscos técnicos"). A consistência entre `convidados.casamento_id` e `convidados.convite_id → convites.casamento_id` (assim como `grupo_id`/`nucleo_id`, quando preenchidos) é garantida por trigger (padrão `<tabela>_verificar_casamento_id` em cada tabela filha), nunca apenas por convenção.
- **Tokens de acesso hasheados em repouso**: qualquer valor que funcione como credencial (código de acesso do convite) é armazenado como hash (ex.: SHA-256), nunca em texto plano — comparação sempre feita pelo hash do valor recebido. Reduz o dano de um vazamento de banco a zero reutilização direta dos códigos.
- **Extensões utilizadas**: `pgcrypto` (geração de UUID e hashing), `citext` (e-mails case-insensitive), `unaccent` (busca tolerante de nome, ver seção 3.2).
- **XOR entre `casamento_id` e `conta_id` (billing, estrutura embrionária)**: `assinaturas` e `funcionalidades_habilitadas` aceitam vínculo a um casamento **ou** a uma conta (`auth.users`), nunca os dois — `CHECK (num_nonnulls(casamento_id, conta_id) = 1)`. Suporta dois modelos de cobrança em paralelo (plano Casal, por evento; plano Planner, por conta, cobrindo múltiplos casamentos) sem uma tabela "contas" própria — ver seção 2/3.2. Design preliminar, ainda não finalizado (ver [`ROADMAP.md`](ROADMAP.md)).

## 2. Visão geral das tabelas

**Domínio principal**

| Tabela | Propósito |
|---|---|
| `casamentos` | Um casamento/evento — unidade central de particionamento. Também carrega o único estado agregado do casamento inteiro (`status_ciclo_vida`: rascunho/publicado/arquivado), distinto do soft delete pontual por entidade filha — ver seção 3.1/3.2 |
| `membros_casamento` | Usuários com acesso administrativo a um casamento (casal, colaboradores) |
| `etapas_evento` | Etapas do evento (cerimônia, recepção, festa), cada uma com local e horário próprios |
| `convites` | Convite — quem recebeu o mesmo convite físico/digital. Unidade real de RSVP, com um Convidado Responsável opcional (`convidado_responsavel_id`) |
| `grupos` | Etiqueta organizacional livre do convidado (Família da Noiva, Amigos, Trabalho...) — **não é** a unidade de RSVP; não confundir com `convites` nem `nucleos_acompanhantes` (ver seção 3.1) |
| `nucleos_acompanhantes` | Agrupamento simétrico de "Acompanhantes" — convidados comumente convidados juntos (casal, pais e filhos); nunca chamado de "família" na UI |
| `convidados` | Convidados individuais, sempre pertencentes a um convite (`convite_id`) |
| `respostas_rsvp` | Resposta de confirmação de presença, sempre por convidado (`convidado_id`) |
| `acompanhantes_avulsos` | Acompanhante avulso (nome sem cadastro prévio) de um convite — só existe quando `casamentos.modo_lista_convidados = 'aberta'` |
| `etiquetas_convite` / `vinculos_convite_etiqueta` | Etiquetas internas reutilizáveis de convite (VIP, Mesa 01...), M:N — só uso administrativo, nunca exibidas ao convidado |
| `historico_convite` | Log append-only de eventos por convite (criado, credencial gerada/enviada, primeiro acesso, mudança de status de RSVP, mensagem enviada, arquivado) — alimenta auditoria e a Linha do Tempo visual do convite no admin |

**Presentes**

| Tabela | Propósito |
|---|---|
| `categorias_presentes` | Categorias da lista de presentes (opcional, para organização visual) |
| `presentes` | Itens da lista de presentes, incluindo presentes de cota (`e_presente_cota`) |
| `reservas_presentes` | Reserva integral de um presente unitário — grátis (o convidado compra por fora) ou paga online via InfinitePay (ver `pagamentos_presentes`) |
| `contribuicoes_presentes` | Contribuição parcial em dinheiro para um presente de cota (`e_presente_cota = true`) — sempre paga online (InfinitePay) desde a "Fase Presentes 2.0" |
| `pagamentos_presentes` | Tentativas de checkout via InfinitePay — única origem de efeito de negócio no caminho pago; `reservas_presentes`/`contribuicoes_presentes` só são gravadas depois de um pagamento confirmado |

**Acesso e comunicação**

| Tabela | Propósito |
|---|---|
| `credenciais_acesso_convite` | Credencial estável de acesso ao convite (hash do código), sempre por `convite_id` — independente de quantas comunicações foram enviadas |
| `comunicacoes` | Log de cada envio (convite, lembrete, confirmação) por canal — 1:N em relação à credencial de acesso |

**Mídia e operação**

| Tabela | Propósito |
|---|---|
| `fotos` | Itens da galeria de fotos do casal. Referencia um arquivo de uma fonte externa espelhada (`conexao_id` → `conexoes_galeria`, `id_arquivo_origem`, `url_miniatura_origem`, `tipo_mime_origem`), servido direto do Google (thumbnail do Drive), nunca copiado — `caminho_storage` é coluna legada (nullable, não mais escrita). Policy de leitura pública (`fotos_select_publico`) além da de membros; `foco_x`/`foco_y` (ponto de foco, ver [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md)) |
| `conexoes_galeria` | Conexão do casamento com a fonte externa da galeria (Google Drive hoje). Uma por `casamento_id`. Modo `oauth` (tokens cifrados em repouso — AES-256-GCM) ou `public_link` (URL de pasta pública). `provedor` é ponto de extensão pra outras fontes sem migration estrutural. Sem policy pública (guarda segredo) |
| `tarefas` | Fila de processamento assíncrono (importação de CSV, envio de e-mail em lote) — **ainda não implementada**, ver [`ARCHITECTURE.md`](ARCHITECTURE.md) seção 3.4 |
| `trilha_auditoria` | Trilha de auditoria de ações administrativas sensíveis |

**Billing e limites (estrutura embrionária — design completo ainda não fechado, ver [`ROADMAP.md`](ROADMAP.md))**

| Tabela | Propósito |
|---|---|
| `planos` | Definição de plano (limites de convidados/presentes/storage; `max_casamentos` quando o plano é de conta) |
| `assinaturas` | Vínculo ativo a um plano, por `casamento_id` **ou** por `conta_id` (nunca os dois) — dois modelos de cobrança em paralelo: plano Casal (por evento) e plano Planner (por conta, cobrindo múltiplos casamentos) |
| `contadores_uso` | Contadores materializados de uso por casamento (convidados, storage) |
| `funcionalidades_habilitadas` | Feature flags por `casamento_id` **ou** `conta_id`, mesmo padrão de exclusividade de `assinaturas` |

Nenhuma dessas quatro tabelas tem cobrança real integrada ainda (sem gateway de assinatura recorrente) — são a base de dados já criada para a transição SaaS descrita em [`ROADMAP.md`](ROADMAP.md).

**Plataforma (equipe interna)**

| Tabela | Propósito |
|---|---|
| `operadores_plataforma` | Extensão 1:1 de `auth.users` (`usuario_id` é a própria PK, mesmo padrão de `contadores_uso`) — quem é equipe interna da plataforma, com leitura entre casamentos/contas via `/plataforma/**` (docs/PLANO-SAAS.md, Passo 8; CLAUDE.md seção 4.2, 5º modelo de confiança). RLS: só SELECT da própria linha (`usuario_id = auth.uid()`); sem INSERT/UPDATE/DELETE — bootstrap é sempre manual via `service_role`, sem UI de gestão nesta fase. Nunca confundir com `membros_casamento.papel = 'dono'` (esse é por casamento) |

## 3. Modelo Entidade-Relacionamento

> As tabelas abaixo (colunas-chave e relações, não diagramas ASCII) são a representação de referência. Em caso de divergência, a lista de regras em texto (3.2) é a fonte de verdade.

### 3.1 Entidades e relações

**Núcleo: evento, locais, convites, grupos, acompanhantes, RSVP**

| Tabela | FK principal | O que é |
|---|---|---|
| `casamentos` | — | Evento — `slug`, `nomes_noivos`, `data_evento`, `prazo_rsvp`, `modo_lista_convidados`, `config_faixas_etarias`, `config_tema`, `config_conteudo`, `status_ciclo_vida`, `arquivado_em` |
| `membros_casamento` | `casamento_id`; `usuario_id` (auth) | Acesso administrativo — `papel` |
| `etapas_evento` | `casamento_id`; `mesmo_local_que` (auto-referência, opcional) | Cerimônia/recepção/festa — local, horário, `ordem_exibicao`. O local é uma entidade selecionável, não texto: `origem_local` (`maps_place`\|`manual`\|null=legado), `place_id_local` + `provedor_local`, `url_mapa_local`, coordenadas e as partes do endereço manual — ver seção 3.2 |
| `convites` | `casamento_id`; `convidado_responsavel_id` → `convidados` (opcional) | Unidade real de RSVP — `codigo_interno`, `status_convite` (`pendente`\|`enviado`), `max_acompanhantes`, `mensagem_rsvp`, `arquivado_em` |
| `grupos` | `casamento_id` | Etiqueta organizacional livre — `nome`, `cor` |
| `nucleos_acompanhantes` | `casamento_id` | Agrupamento simétrico de Acompanhantes — sem colunas de negócio próprias |
| `convidados` | `casamento_id` (denormalizado); `convite_id` → `convites` (restrict); `grupo_id` → `grupos` (opcional); `nucleo_id` → `nucleos_acompanhantes` (opcional) | Convidado individual — nome, contato, `apelido`/`sexo`/`data_nascimento`/`faixa_etaria_manual`/`caminho_foto`/`papel_casamento`, `ordem_nucleo` |
| `respostas_rsvp` | `casamento_id` (denormalizado); `convidado_id` → `convidados` (obrigatório, único); `convite_id` (denormalizado) | Resposta de RSVP, sempre por convidado — `status_rsvp` (`pendente`\|`confirmado`\|`recusado`\|`lista_espera`\|`removido`) |
| `acompanhantes_avulsos` | `convite_id` → `convites` | Acompanhante avulso do convite (nome livre) — só quando `modo_lista_convidados = 'aberta'`; soft delete |
| `etiquetas_convite` / `vinculos_convite_etiqueta` | `casamento_id` (na etiqueta); `convite_id` + `etiqueta_id` (no vínculo) | Etiqueta interna reutilizável de convite, M:N |
| `historico_convite` | `casamento_id`; `convite_id` → `convites` | Log append-only de eventos do convite |

**Presentes**

| Tabela | FK principal | O que é |
|---|---|---|
| `categorias_presentes` | `casamento_id` | Categoria opcional — `nome`, `ordem_exibicao` |
| `presentes` | `casamento_id`; `categoria_id` (opcional) | Item — `preco_centavos`, `quantidade_disponivel`, `e_presente_cota`, `valor_meta_centavos`, `valor_cota_centavos`, `estilo_exibicao`, `icone_emocional` |
| `reservas_presentes` | `presente_id`; `convidado_id`/`convite_id` (legado, sempre `null` em registros novos) | Reserva integral — `nome_contribuinte`/`telefone_presenteador`, `mensagem` |
| `contribuicoes_presentes` | `presente_id`; `convidado_id`/`convite_id` (legado, sempre `null` em registros novos) | Contribuição parcial — `valor_centavos`, `quantidade_cotas`, `nome_contribuinte`/`telefone_presenteador`, `mensagem` |
| `pagamentos_presentes` | `presente_id`; `convite_id` (legado, nullable); `reserva_resultante_id`/`contribuicao_resultante_id` (nullable, exclusivos entre si) | Tentativa de checkout InfinitePay — `status_pagamento`, `nsu_transacao_provedor`, `slug_fatura_provedor` |

**Acesso do convidado, comunicação e auditoria**

| Tabela | FK principal | O que é |
|---|---|---|
| `credenciais_acesso_convite` | `casamento_id`; `convite_id` → `convites` (único ativo por convite, `where revogado_em is null`) | Credencial — `codigo_hash` (SHA-256, autentica), `codigo_cifrado` (AES-256-GCM, só reexibição no painel; nulo em linhas antigas), `revogado_em` |
| `comunicacoes` | `credencial_id` → `credenciais_acesso_convite` | Log de envio — `tipo`, `canal`, `enviado_em`/`aberto_em` |
| `conexoes_galeria` | `casamento_id` (único) | Conexão da galeria — `provedor`, `modo`, tokens cifrados |
| `trilha_auditoria` | `casamento_id`; `autor_id` (opcional — nulo em ações do sistema) | `tipo_autor`, `acao`, `tipo_entidade`/`entidade_id`, `metadados` |

**Billing (estrutura embrionária)**

| Tabela | FK principal | O que é |
|---|---|---|
| `planos` | — | Definição de plano — `nome`, limites, `max_casamentos` |
| `assinaturas` | `casamento_id` **ou** `conta_id` → `auth.users` (exclusivo); `plano_id` → `planos` | Vínculo ativo a um plano — `iniciado_em` |
| `contadores_uso` | `casamento_id` (único, é a própria PK) | Contadores de uso — `contagem_convidados`, `storage_usado_mb` |
| `funcionalidades_habilitadas` | `casamento_id` **ou** `conta_id` → `auth.users` (exclusivo) | Feature flag — `chave`, `habilitado` |

### 3.2 Regras de relacionamento

- `convidados.convite_id` é o vínculo que habilita RSVP — nullable até o convidado ser vinculado a um convite (ex.: "Fazer Depois" no wizard de cadastro), mas obrigatório pra responder RSVP. `convidados.grupo_id` (etiqueta livre) e `convidados.nucleo_id` (Acompanhantes) são **independentes** de `convite_id` e entre si — os três nunca devem ser confundidos (ver seção 2).
- `convidados.casamento_id` e `respostas_rsvp.casamento_id` são denormalizados (ver seção 1) e mantidos consistentes com o `casamento_id` de `convite_id`/`grupo_id`/`nucleo_id` via trigger — nunca definidos de forma independente pela aplicação.
- `respostas_rsvp.convidado_id` é obrigatório e único (RSVP é sempre por convidado — não existe mais "modo grupo"); `convite_id` é denormalizado a partir de `convidados.convite_id` pra agregação rápida por convite.
- **Faixa etária não é uma coluna — é derivada de duas informações independentes.** `casamentos.config_faixas_etarias` (jsonb, `{"principal": [{chave, idadeMinima, idadeMaxima}]}`) guarda os limites do evento; `convidados.data_nascimento` (opcional) guarda o dado da pessoa. A classificação é a idade **na data do evento** aplicada às faixas — calculada em `shared/utils/faixa-etaria.ts`, nunca por função SQL nem por coluna gerada (ela dependeria de duas linhas de tabelas diferentes e mudaria a cada alteração de configuração). `convidados.faixa_etaria_manual` (CHECK `crianca`\|`adolescente`\|`adulto`\|`idoso`) só vale na ausência de `data_nascimento` e sempre perde para ela; sem nenhuma das duas, a faixa é "não informada". A chave `principal` do jsonb reserva espaço para classificações por finalidade futuras (alimentação, mesas) sem migration de formato. Antes de 2026-09-04 isso era `casamentos.idade_maxima_crianca` + `convidado_e_crianca()`, os dois removidos — ver [`CHANGELOG.md`](CHANGELOG.md).
- **Recorte por faixa etária no banco é intervalo de datas de nascimento, não classificação em memória.** `/api/guests` traduz a faixa pedida em `data_nascimento <= dataEvento - idadeMinima anos` (mais o limite inferior, quando a faixa é fechada), somado a `data_nascimento is null and faixa_etaria_manual = <faixa>` — `server/utils/age-groups.ts#buildAgeGroupFilter`. Classificar em memória quebraria a paginação e faria o "N confirmados" do cabeçalho descrever uma lista diferente da exibida (ver seção 4).
- `acompanhantes_avulsos` (acompanhante avulso) só existe quando `casamentos.modo_lista_convidados = 'aberta'`, pendurado em `convite_id`. Confirmar um avulso contra `convites.max_acompanhantes` é uma operação sujeita a concorrência — resolvida com `SELECT ... FOR UPDATE` na linha do convite dentro de `finalizar_rsvp_convite()` (mesmo mecanismo de bloqueio usado na reserva de presentes, ver seção 4 e [`PRODUCT.md`](PRODUCT.md)), nunca apenas validação client-side.
- `presentes.e_presente_cota = true` usa `contribuicoes_presentes` (soma de `valor_centavos` até `valor_meta_centavos`); `presentes.e_presente_cota = false` usa `reservas_presentes` (reserva integral e exclusiva). As duas tabelas nunca se aplicam ao mesmo `presente_id`.
- `reservas_presentes`/`contribuicoes_presentes` sempre têm `convidado_id`/`convite_id` nulos e `nome_contribuinte` preenchido desde a "Fase Presentes 2.0" — a identificação do fluxo público é **inteiramente** nome/telefone (`nome_contribuinte`/`telefone_presenteador`), nunca ligada à lista de convidados cadastrados. As colunas `convidado_id`/`convite_id` continuam existindo por compatibilidade com dados anteriores a essa fase; a coluna `convite_id` nessas duas tabelas se chamava `group_id` antes do rename para português, mas seu FK sempre apontou para `convites`, nunca para `grupos` — nome corrigido nessa remodelagem para refletir o destino real.
- `pagamentos_presentes.status_pagamento = 'confirmado'` sempre tem `reserva_resultante_id` **ou** `contribuicao_resultante_id` preenchido (`CHECK`), nunca os dois — só uma dessas duas tabelas recebe o efeito de um mesmo pagamento, dependendo de `presentes.e_presente_cota`.
- `credenciais_acesso_convite` é sempre por `convite_id` (nunca `convidado_id`/`grupo_id` isolado) — o link/QR resolve o convite inteiro; o convidado específico dentro do convite é resolvido por busca tolerante de nome (`convidado_nome_corresponde`/`buscar_convidados_por_nome`, ver CLAUDE.md, Modelo de Confiança) ou por seleção direta na tela do convite. `comunicacoes` é apenas log — revogar/rotacionar uma credencial (`revogado_em`) não apaga o histórico já registrado.
- `etiquetas_convite`/`vinculos_convite_etiqueta` não têm `casamento_id` próprio no vínculo (evita duplicar o par se um convite trocasse de casamento, o que nunca acontece) — RLS via subquery em `convites`.
- Toda tabela com `casamento_id` possui índice composto `(casamento_id, <coluna mais consultada>)` para otimizar queries filtradas por evento.
- `etapas_evento.mesmo_local_que` (auto-referência, `on delete set null`) resolve o caso de cerimônia e recepção no mesmo local — quando definido, **todas** as colunas de local deste próprio registro ficam nulas (`nome_local`, `endereco_local`, coordenadas, `origem_local`, `place_id_local`, `provedor_local`, `url_mapa_local` e as partes do endereço manual), fonte de verdade única. Um `place_id_local` sobrevivente aqui seria pior que um endereço duplicado: "Ver no mapa" o preferiria ao local certo do segmento referenciado (garantido em `server/utils/event-segment-venue-columns.ts`, espelhado na leitura por `app/utils/resolve-event-segment-venue.ts`). Validado na aplicação (`server/utils/validate-same-venue.ts`): não pode ser o próprio id, e não pode apontar para um segmento que já tem `mesmo_local_que` definido (só um nível de indireção). Excluir um segmento referenciado por outro é bloqueado até o dependente ser desvinculado.

- **Localização de `etapas_evento` — três formas, uma coluna de exibição.** `endereco_local` é sempre o endereço **pronto para exibição**, nas três: seleção no provedor de lugares (`origem_local = 'maps_place'`, endereço formatado vindo do provedor), cadastro manual (`origem_local = 'manual'`, composto das partes por `shared/utils/endereco-local.ts`) e linha legada (`origem_local is null`, texto digitado antes da Fase Localização). Nenhum consumidor de exibição precisa saber qual é o caso. As colunas `logradouro_local`/`numero_local`/`complemento_local`/`cidade_local`/`estado_local` existem só para reabrir o formulário manual com cada campo no lugar — nunca são lidas para exibir.

  Dois `CHECK` guardam a coerência do identificador do lugar, espelhados na entrada por `shared/schemas/event-segments.ts`: `place_id_local` existe **se e somente se** `origem_local = 'maps_place'`, e `provedor_local` existe **se e somente se** `place_id_local` existe. O segundo é o que torna seguro trocar de provedor de lugares no futuro — um `place_id` do Google é lixo para qualquer outro provedor, e sem a origem registrada a troca produziria ponteiros silenciosamente errados em vez de falha visível.

  Latitude e longitude continuam existindo, mas **nunca** são digitadas: vêm da seleção no provedor ou do marcador arrastado no mapa (CLAUDE.md, seção 12).

- `casamentos.slug` é validado contra `is_slug_reservado()` (`CHECK casamentos_slug_nao_reservado`) — lista fixa de slugs técnicos da própria plataforma (`admin`, `login`, `api`...) que um casamento nunca pode reivindicar, evitando colisão com uma rota real.
- `casamentos.status_ciclo_vida` (`rascunho`\|`publicado`\|`arquivado`, default `rascunho`) é o único estado agregado do casamento inteiro — distinto do soft delete pontual por entidade filha (`excluido_em` em `convidados`/`convites`/`grupos`/`presentes`). `arquivado_em` é preenchido quando o status vira `arquivado`; comportamento de exportação/exclusão pós-arquivamento é trabalho de produto separado, ainda não existe.
- `assinaturas` e `funcionalidades_habilitadas` aceitam exatamente um entre `casamento_id` e `conta_id` (`CHECK num_nonnulls(...) = 1`) — "conta" é `auth.users` diretamente, sem tabela própria; suporta o plano Casal (por evento) e o plano Planner (por conta, múltiplos casamentos) em paralelo. Design preliminar (ver [`ROADMAP.md`](ROADMAP.md)).
- `planos.max_casamentos` limita quantos casamentos uma conta pode possuir como dono simultaneamente (nulo = ilimitado); checado via `COUNT` no momento de criar/assumir um casamento, sem contador materializado.

## 4. Convenções SQL

- **Nomenclatura de tabelas**: `snake_case`, plural (`convidados`, `reservas_presentes`).
- **Nomenclatura de colunas**: `snake_case`, singular (`nome_completo`, `data_evento`).
- **Chaves estrangeiras**: sempre nomeadas `<entidade_singular>_id` (ex: `casamento_id`, `convite_id`).
- **Chaves primárias**: sempre `id uuid primary key default gen_random_uuid()` (exceções documentadas na seção 1).
- **Enums**: implementados como `CHECK` constraint sobre `text`, não `CREATE TYPE ... AS ENUM`, para facilitar alteração de valores permitidos sem migração destrutiva.
  ```sql
  status_convite text not null check (status_convite in ('pendente', 'enviado')) default 'pendente'
  ```
- **Padrão XOR entre colunas opcionais**: quando uma linha deve pertencer a exatamente uma de duas entidades-pai (ex.: `assinaturas.casamento_id` ou `assinaturas.conta_id`), usa-se `CHECK (num_nonnulls(coluna_a, coluna_b) = 1)` — nunca duas FKs opcionais sem constraint garantindo exclusividade.
- **Migrations**: uma migration por mudança lógica, nome no padrão `YYYYMMDDHHMMSS_short_description.sql`. Migrations nunca são editadas após merge na branch principal — correções viram uma nova migration.
- **Índices**: toda FK ganha índice explícito (Postgres não cria automaticamente para FKs). Índices únicos parciais usados para regras como "uma única credencial de acesso ativa por convite" (`credenciais_acesso_convite.convite_id` onde `revogado_em is null`, índice `credenciais_acesso_convite_convite_ativo_key`).
- **RLS Policies**: nomeadas no padrão `<tabela>_<operação>_<regra>` (ex: `convidados_select_membro`, `casamentos_delete_dono`).
- **Comentários em SQL**: toda tabela e coluna não óbvia recebe `COMMENT ON TABLE`/`COMMENT ON COLUMN` explicando intenção de negócio, já que o schema é a documentação viva do domínio.
- **Views**: último recurso, para o que o PostgREST não consegue expressar a partir da tabela — nunca conveniência de consulta (agregação reaproveitada continua sendo computada no endpoint, como faz `server/api/dashboard/summary.get.ts`). Qualquer view **precisa** ser criada com `security_invoker = true` (Postgres 15+): sem isso ela roda com o privilégio do dono (que ignora RLS), não do usuário que consulta — ver em `docs/CHANGELOG.md` o achado de segurança que motivou remover a primeira view do projeto.

  Existe uma única view hoje:

  | View | O que resolve |
  |---|---|
  | `convidados_com_status` | Cada convidado com `status_rsvp` resolvido (`coalesce(respostas_rsvp.status_rsvp, 'pendente')`) mais `respondido_em`. Existe porque "pendente" não é valor gravado: `respostas_rsvp` só ganha linha quando alguém responde, e "sem linha OU status pendente" não é expressável a partir de `convidados` (com `!inner` quem nunca respondeu some; com `!left` o filtro corta a resposta embutida, não o convidado). Usada só em `GET /api/guests` — leitura; escrita continua sempre em `convidados`/`respostas_rsvp` |

  **Manutenção**: a view seleciona `c.*`, expandido na criação. Coluna nova em `convidados` não aparece nela sozinha — é preciso `drop view` + `create view` (o `create or replace` não muda a lista de colunas). O typecheck acusa, porque o tipo gerado da view fica sem a coluna que o código passou a usar.
- **Colunas de hash**: nomeadas `<coluna>_hash` (ex: `codigo_hash`), geradas via `pgcrypto` no momento da escrita; o valor em texto plano correspondente nunca é persistido, apenas retornado uma vez no momento da geração (ex: dentro do link enviado ao convidado).
- **Concorrência em operações de estoque/limite** (reserva de presente via `reservar_presente()`, acompanhante avulso contra `convites.max_acompanhantes` dentro de `finalizar_rsvp_convite()`): implementada via função Postgres com `SELECT ... FOR UPDATE` sobre a linha do recurso limitado, dentro de uma transação, combinada com índice único parcial que impede exceder o limite — nunca via `check-then-insert` feito na camada de aplicação.

---

*Este documento evolui junto com o schema real (`supabase/migrations/`). Qualquer mudança de modelagem de dados deve ser refletida aqui antes/junto da migration correspondente.*
