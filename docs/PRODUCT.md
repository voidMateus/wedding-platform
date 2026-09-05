# Especificação de Produto — MeuSiteCasamento

> Visão de produto, personas e regras de negócio dos sistemas de Convidados, RSVP, Convites/Grupos, Presentes e Administração. Para como esses fluxos são implementados tecnicamente (rotas, funções Postgres, fluxo de requisição), ver [`ARCHITECTURE.md`](ARCHITECTURE.md). Para o modelo de dados subjacente, ver [`DATABASE.md`](DATABASE.md). Em caso de conflito, [`CLAUDE.md`](../CLAUDE.md) prevalece.

---

## 1. Visão Geral do Produto

O **MeuSiteCasamento** é uma aplicação web voltada para casais que estão organizando seu casamento e precisam de uma ferramenta central para:

- Publicar um site de casamento personalizado (história do casal, data, local, cronograma do evento, galeria de fotos).
- Gerenciar a lista de convidados de forma estruturada, incluindo grupos familiares e acompanhantes.
- Coletar confirmações de presença (RSVP) com suporte a número de acompanhantes e mensagens.
- Disponibilizar uma lista de presentes (física, digital ou "cota" para lua de mel) com controle de reservas para evitar duplicidade.
- Fornecer um painel administrativo para os noivos (ou um planejador de casamentos contratado) acompanharem métricas de confirmação, presentes e comunicação com convidados.

O produto nasce como uma aplicação de uso único por casamento (single-tenant, uso por evento), mas é desenhado desde o início para evoluir para um modelo **multi-tenant SaaS**, onde múltiplos casais podem criar suas próprias instâncias de forma independente (ver [`ROADMAP.md`](ROADMAP.md)).

### 1.1 Personas

| Persona | Descrição | Necessidades principais |
|---|---|---|
| **Noivo(a) / Casal** | Dono(a) da conta, administra o evento | Configurar site, gerenciar convidados, acompanhar RSVPs e presentes |
| **Convidado** | Recebe o convite e acessa o site público | Ver informações do evento, confirmar presença, escolher presente |
| **Colaborador/Família** | Auxilia o casal na organização (ex: mãe da noiva) | Acesso limitado ao painel administrativo (permissões) |
| **Planejador de Casamento** | Profissional contratado, pode gerenciar múltiplos eventos | Visão consolidada de múltiplos casamentos — **papel futuro, ainda não implementado (Fase 5, ver [`ROADMAP.md`](ROADMAP.md))** |

### 1.1.1 Tipos de usuário/acesso — estado atual da implementação

A tabela acima descreve personas de produto; esta detalha como cada uma delas (e algumas que não são "persona" no sentido de produto) é implementada e isolada tecnicamente hoje. Fonte de verdade complementar: [`CLAUDE.md`](../CLAUDE.md) seção 4.2 ("Modelo de Confiança por Fluxo"), que descreve os mesmos tipos organizados por caminho/rota em vez de por identidade — os dois devem ser mantidos consistentes.

| Tipo | Quem é | Como acessa | Isolamento/autorização | Onde vive no banco |
|---|---|---|---|---|
| **Dono de casamento** | O casal (ou quem administra aquele evento específico) | Login (e-mail/senha ou link mágico) → `/admin/{slug}/**` | RLS por `casamento_id` | `membros_casamento.papel = 'dono'` |
| **Colaborador de casamento** | Alguém convidado pelo dono pra ajudar naquele evento específico | Mesmo login → `/admin/{slug}/**` | RLS por `casamento_id` — não pode gerenciar outros colaboradores nem excluir o casamento | `membros_casamento.papel = 'colaborador'` |
| **Operador de plataforma** | Equipe interna do produto (não é casal/colaborador de nenhum casamento) | Mesmo login → `/plataforma` (visão entre todos os tenants) | Não é RLS — é `service_role` + checagem em código (`requirePlatformOperator()`). Acesso binário, sem sub-níveis (não existe "dono da plataforma") | `operadores_plataforma` |
| **Convidado (RSVP)** | Quem foi convidado pra um casamento | Link/QR (token) ou busca por nome (sem login) | Token opaco na leitura; sessão `rsvp_session` na mutação | Sem conta — não é `auth.users` |
| **Visitante público** | Qualquer pessoa | Direto em `/{slug}` (site do casamento) ou vitrine de presentes | Nenhuma — RLS de leitura pública em tabelas sem dado sensível | Sem conta |

Pontos que geram confusão se não forem lidos com atenção:
- **Dono/colaborador é sempre por casamento, nunca global.** A mesma conta pode ser dono de um casamento e colaborador de outro simultaneamente — `papel` é uma coluna de `membros_casamento`, uma linha por vínculo, não um atributo da conta.
- **Operador de plataforma é um papel completamente separado** dos dois de cima, checado numa tabela diferente (`operadores_plataforma`, sem `casamento_id`). Uma conta pode acumular os dois ao mesmo tempo (ex.: dono de um casamento *e* operador de plataforma), mas são checagens independentes — nenhuma dá a outra automaticamente.
- Hoje **não existe hierarquia dentro dos operadores de plataforma** (sem "dono"/"admin" vs "operador comum") — presença na tabela `operadores_plataforma` já dá o acesso completo ao painel `/plataforma`, que por sua vez é só leitura (ver [`PLANO-SAAS.md`](PLANO-SAAS.md), Passo 8).

### 1.2 Proposta de Valor

- **Centralização**: substitui planilhas soltas, grupos de WhatsApp e formulários avulsos por uma única fonte de verdade.
- **Simplicidade para o convidado**: RSVP em poucos cliques, sem necessidade de criar conta.
- **Clareza para o casal**: dashboard com números reais de confirmados, pendentes e presentes reservados.
- **Personalização visual**: cada casal pode aplicar sua identidade visual (cores, fontes, fotos) dentro de um Design System consistente (ver [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md)).

## 2. Objetivos do Projeto

### 2.1 Objetivos de Produto

1. Permitir que um casal configure um site de casamento funcional em menos de 30 minutos.
2. Reduzir a taxa de não-resposta de convidados através de lembretes e UX de RSVP simplificada.
3. Eliminar presentes duplicados através de reservas em tempo real.
4. Fornecer visibilidade total do status do evento (confirmados, grupos, presentes) em um único painel.
5. Garantir que o site público funcione perfeitamente em dispositivos móveis, já que a maioria dos convidados acessará via link enviado por WhatsApp.

### 2.2 Objetivos Técnicos

1. Base de código tipada de ponta a ponta (TypeScript estrito, sem `any` implícito).
2. Arquitetura que permita evoluir de single-tenant para multi-tenant sem reescrita completa.
3. Modelagem de banco de dados normalizada, com integridade referencial garantida via constraints, não apenas via aplicação.
4. Cobertura de testes automatizados crescente, priorizando fluxos críticos (RSVP, reserva de presentes, autenticação).
5. Performance de carregamento do site público competitiva (LCP < 2.5s em 4G) por ser a principal porta de entrada de convidados.
6. Segurança adequada ao tratar dados pessoais de convidados (nome, telefone, e-mail).

### 2.3 Não-objetivos (nesta fase)

- Não construir um app mobile nativo.
- ~~Não implementar pagamentos/gateway financeiro para presentes em dinheiro~~ — superado na "Fase Presentes 2.0" (seção 6), decisão explícita do usuário: pagamento Pix real via InfinitePay, apesar do não-objetivo original desta seção. Relatórios financeiros completos (taxas, estornos, exportação) continuam fora de escopo.
- Não suportar múltiplos idiomas na v1 (i18n é item de roadmap).
- Não implementar múltiplos tenants/contas na v1 (arquitetura já prepara terreno, mas não é exposta ao usuário).

## 3. Sistema de Convidados

### 3.1 Conceito

Convidados (`convidados`) são sempre vinculados a um `convite` (a unidade real de RSVP) para poder responder — o vínculo pode ficar pendente ("Fazer Depois" no wizard) até ser resolvido. Independentemente disso, um convidado pode opcionalmente ter uma etiqueta livre (`grupo`, ex. "Família da Noiva") e pertencer a um agrupamento de Acompanhantes (`nucleos_acompanhantes`) — os três vínculos (`convite_id`, `grupo_id`, `nucleo_id`) são independentes entre si (ver [`DATABASE.md`](DATABASE.md)).

### 3.2 Funcionalidades previstas

- Cadastro de convidado via wizard (dados pessoais, Acompanhantes, vínculo com convite) — persistência em lote numa única transação (`sincronizar_nucleo_convidado()`).
- Perfil do convidado: apelido, sexo, data de nascimento (opcional), faixa etária (opcional, informada à mão), foto, papel de padrinho/madrinha, observações internas.
- Importação em massa (CSV) — mapeamento de colunas para `nome_completo`, `email`, `telefone`.
- Edição inline de dados de contato.
- Classificação etária do convidado (Criança/Adolescente/Adulto/Idoso) para contagem de "lugares" e organização da lista — derivada, com limites configuráveis por evento; ver seção 3.4.
- Soft delete de convidados (remoção lógica, preservando histórico de RSVP/presentes associados).
- Busca e filtro por nome (tolerante a acentuação/ordem/apelido — `convidado_nome_corresponde`), convite, status de RSVP, grupo e faixa etária.
- Na lista do admin, cada recorte é o filtro da própria coluna (nome, status de RSVP, faixa etária, grupo), e status/faixa/grupo aceitam **mais de um valor ao mesmo tempo** — "quem ainda não respondeu ou está em espera" é uma pergunta só do casal, não duas. O status de cada convidado aparece na própria linha, e "pendente" inclui quem nunca respondeu (não é valor gravado; ver `convidados_com_status` em [`DATABASE.md`](DATABASE.md)).

### 3.3 Regras de negócio

- Um convidado só consegue responder RSVP depois de vinculado a um convite (`convite_id`); antes disso, existe no cadastro mas fica fora do fluxo de RSVP.
- Alterar o convite/etiqueta/grupo de Acompanhantes de um convidado não apaga suas respostas de RSVP anteriores (histórico preservado).
- E-mail/telefone não são obrigatórios (alguns convidados só têm envio de convite físico), mas ao menos um canal de contato é recomendado pela UI (aviso, não bloqueio).

### 3.4 Classificação etária

**O princípio:** a data de nascimento pertence ao convidado; a regra de classificação pertence ao evento. "Criança" não é uma característica da pessoa — é o resultado de aplicar as faixas *deste* casamento à idade que a pessoa terá *na data dele*. Nenhuma classificação é gravada em `convidados` (ver [`CLAUDE.md`](../CLAUDE.md) seção 12).

Três conceitos distintos, nessa ordem:

| Conceito | Onde vive | Natureza |
|---|---|---|
| Data de nascimento | `convidados.data_nascimento` (opcional) | Informação do convidado |
| Idade no evento | calculada (`calcularIdadeNaData`) | Derivada — nunca persistida |
| Classificação etária | calculada (`classificarFaixaEtaria`) | Derivada das faixas do evento |

**Por que não é uma propriedade fixa do convidado:** a definição de "criança" não é universal e varia por evento — um casamento considera criança até 7 anos, outro até 11. Gravar "João é criança" impediria que o mesmo João fosse adolescente num evento com limites diferentes.

**Configuração (Configurações → Geral → Classificação etária).** Quatro faixas — Criança, Adolescente, Adulto, Idoso — com limites editáveis pelo casal. O padrão de um evento novo é 0–11 / 12–17 / 18–59 / 60+, apenas um ponto de partida. A configuração é validada como conjunto: contínua, sem sobreposição e sem buraco, com a última faixa sempre aberta no topo — exatamente uma faixa se aplica a cada idade. Há ação de "Restaurar classificação padrão".

**Regra de prioridade.** Com `data_nascimento` preenchida, a faixa é *calculada* (idade na data do evento × faixas do evento). Sem ela, vale a faixa informada à mão (`faixa_etaria_manual`). Sem nenhuma das duas, a faixa é "não informada" — a plataforma nunca infere idade por nome, parentesco ou qualquer outro dado. A faixa manual **nunca compete** com uma data de nascimento válida: preencher a data depois faz a classificação passar automaticamente a calculada. A interface sempre indica se o valor foi calculado ou informado manualmente.

**Cadastro sem fricção.** A data de nascimento é opcional de propósito: o casal raramente conhece a de todos os convidados, e "sei que ele é adulto" precisa ser suficiente para concluir o cadastro. A faixa manual é o campo de primeira classe do formulário; a data de nascimento é informação complementar que, quando existe, mostra idade no evento e classificação em leitura.

**Acompanhantes.** Cada pessoa tem a própria data de nascimento e a própria faixa — um acompanhante nunca herda a classificação do convidado responsável (todo acompanhante é uma linha de `convidados`, ver seção 3.1). Acompanhantes avulsos do RSVP (`acompanhantes_avulsos`, nome livre) não têm nenhuma das duas informações e por isso não entram nas contagens por faixa.

**RSVP.** O fluxo do convidado não pergunta idade nem data de nascimento — a classificação é ferramenta de organização do casal, não pergunta ao convidado.

**Ao alterar a configuração**, nenhum dado de convidado muda: só a classificação calculada. Um convidado de 11 anos exibido como "Adolescente" com criança até 7 passa a "Criança" quando o limite vira 11. Não há histórico de classificações nesta versão — a regra vigente é a atual.

**Evolução prevista** (não implementada): classificações diferentes por finalidade — alimentação (infantil 0–7 / adulto 8+), organização de mesas, recreação (bebê 0–2 / criança 3–7). Por isso a configuração é gravada sob a chave `principal`, e não como um array solto: outras finalidades entram como chaves irmãs, sem migration de formato. Ver [`ROADMAP.md`](ROADMAP.md).

## 4. Sistema de RSVP

### 4.1 Conceito

RSVP (*répondez s'il vous plaît*) é o fluxo pelo qual o convidado confirma ou recusa presença. É sempre **por convidado** — não existe mais um "modo grupo" que cobre todos os membros de uma vez.

### 4.2 Configuração por casamento

- `casamentos.modo_lista_convidados` (`'fechada'` default | `'aberta'`) — coluna própria de comportamento de negócio, deliberadamente separada de `config_tema` (que é exclusivamente visual). `'fechada'`: só convidados pré-cadastrados podem confirmar presença. `'aberta'`: permite acompanhante avulso (nome livre, sem cadastro prévio) até `convites.max_acompanhantes`.
- `prazo_rsvp` define o prazo final — após essa data, o formulário público entra em modo somente leitura.

### 4.3 Dados coletados

- Status por convidado: `pendente` (default) | `confirmado` | `recusado` (escolhidos pelo próprio convidado) | `lista_espera` | `removido` (só administrativos, o convidado nunca escolhe sozinho).
- Acompanhante avulso (nome sem cadastro prévio, só em `modo_lista_convidados = 'aberta'`) registrado em `acompanhantes_avulsos`, pendurado no convite (não numa resposta individual) — respeitando `convites.max_acompanhantes`.
- Mensagem opcional ao casal — uma por **convite** (`convites.mensagem_rsvp`, preenchida na revisão final), não por convidado individual.
- Timestamp de resposta (`respondido_em`) por convidado, permitindo reenvio de lembrete apenas para quem ainda está `pendente`.

### 4.4 Regras de negócio

- Resposta de cada convidado é **editável** até `prazo_rsvp` — `salvar_rsvp_convidado()` atualiza o registro existente (não cria duplicata), gravando o evento em `historico_convite` na mesma transação.
- Confirmar acompanhante avulso contra `convites.max_acompanhantes` é uma operação sujeita a corrida (múltiplos convidados do mesmo convite respondendo simultaneamente), resolvida com `SELECT ... FOR UPDATE` sobre a linha do convite dentro de `finalizar_rsvp_convite()` — nunca apenas validação client-side.
- Painel administrativo exibe contadores **atualizados a cada carregamento/refetch** (não é um canal de push em tempo real): confirmados, recusados, pendentes, total de acompanhantes.
- Sistema de lembretes (fase 2 do roadmap): disparo automático de e-mail para convidados `pendente` X dias antes do `prazo_rsvp`, registrado em `comunicacoes` (não em `credenciais_acesso_convite`, que permanece estável entre envios).

## 5. Sistema de Convites e Grupos

### 5.1 Conceito

Dois conceitos independentes, fáceis de confundir pelo nome:

- **Convite (`convites`)** é a unidade real de RSVP e comunicação — "quem recebeu o mesmo convite físico/digital". Todo link/QR de acesso, lembrete e mensagem ao casal opera nesse nível. Um convite pode ter um Convidado Responsável (`convidado_responsavel_id`), usado pra personalizar mensagens.
- **Grupo (`grupos`)** é só uma etiqueta organizacional livre (ex.: "Família da Noiva", "Trabalho") — sem nenhuma semântica de RSVP, comunicação ou limite de acompanhante. Serve pra filtrar/organizar a lista de convidados no admin.
- **Acompanhantes (`nucleos_acompanhantes`)** é um terceiro conceito, tratado à parte na seção 3 — agrupamento simétrico de convidados comumente convidados juntos.

### 5.2 Funcionalidades previstas

**Convites:**
- Criar convite, vincular convidados, definir Convidado Responsável.
- Gerar link/QR de acesso (`credenciais_acesso_convite`) e reenviar sem invalidar o já compartilhado.
- Definir `max_acompanhantes` (limite de acompanhante avulso, só relevante em `modo_lista_convidados = 'aberta'`).
- Etiquetas internas reutilizáveis (`etiquetas_convite`, ex.: "VIP", "Mesa 01") — só uso administrativo.
- Linha do Tempo do convite (`historico_convite`): criado, token enviado, primeiro acesso, RSVP alterado, mensagem enviada, arquivado.
- Visualização: convite → convidados → status de RSVP de cada um.

**Grupos (etiqueta livre):**
- Criar/renomear/excluir grupos, definir cor.
- Atribuir/remover a etiqueta de um convidado (não move o convidado de convite nem de Acompanhantes).

### 5.3 Regras de negócio

- Excluir um convite ou grupo com convidados associados exige realocar os convidados ou confirmar exclusão em cascata (soft delete) — nunca exclusão física silenciosa. A cascata soft-deleta os convidados **e** o próprio convite/grupo (nunca um `DELETE` físico): `convidados.convite_id` é `ON DELETE RESTRICT`, então a linha do convite permanece referenciada por qualquer convidado soft-deleted que já tenha pertencido a ele. Um convite/grupo sem nenhum convidado (nem ativo, nem soft-deleted) também é apenas soft-deleted, pela mesma convenção.
- `max_acompanhantes` é validado no momento da revisão final do RSVP (`finalizar_rsvp_convite`): não permite confirmar mais acompanhantes avulsos do que o limite definido pelo casal.

## 6. Sistema de Presentes

### 6.1 Conceito ("Presentes 2.0")

A lista de presentes é um "ecossistema de presentes", não uma lista fria de produtos: a página pública (`/{slug}/presentes`) abre com uma mensagem do casal e organiza os itens em três seções — **Lista de Presentes** (itens físicos, `categorias_presentes`), **Contribuições** (presentes de cota em dinheiro, agrupados por categoria) e **Presentes Emocionais** (contribuições com apresentação evocativa em vez de foto de produto). "Presente emocional" **não é uma entidade nova** — é um presente de cota comum (`presentes.e_presente_cota = true`) com `estilo_exibicao = 'emocional'` e um `icone_emocional` (catálogo fixo validado no Zod, `shared/schemas/gifts.ts#EMOTIONAL_GIFT_ICONS`) no lugar de foto.

**Nomenclatura "Pix" usada nesta seção**: por brevidade, o resto desta seção fala em "pagamento Pix"/"caminho pago", mas tecnicamente o que a plataforma gera é um **link de pagamento genérico da InfinitePay** — quais métodos ele aceita (Pix, cartão, ambos) é definido pela própria conta InfinitePay do casal, não pelo nosso código. A UI (convidado e admin) reflete essa nuance com o rótulo "pagamento online", nunca prometendo "Pix" especificamente.

### 6.2 Funcionalidades previstas

- CRUD de presentes pelo painel administrativo (título, descrição, foto, preço estimado, quantidade disponível, estilo de exibição, cota fixa).
- **A página de presentes é pública, sempre, sem link personalizado por convite** — diferente do RSVP (que ainda usa `credenciais_acesso_convite`), `/{slug}/presentes` nunca exigiu nem exige um `?code=`. **Identificação de quem está presenteando é o primeiro passo antes de qualquer ação**: o convidado informa nome (obrigatório) e telefone (opcional) — coletados uma única vez por sessão (`useGiftGiverIdentity`, `useState` do Nuxt, isolado por requisição no SSR) e reaproveitados em todos os presentes/contribuições da mesma visita. Gravados em `reservas_presentes.nome_contribuinte`/`telefone_presenteador` e `contribuicoes_presentes.nome_contribuinte`/`telefone_presenteador`. `convidado_id`/`convite_id` nunca são preenchidos pelo fluxo público atual — a identificação é **inteiramente** nome/telefone, sem nenhuma ligação com a lista de convidados cadastrados.
- **Presente físico (`e_presente_cota = false`) pode ter até duas formas de ser presenteado** — quais delas ficam disponíveis é decisão do casal (`casamentos.modo_entrega_presente_fisico`: `'ambos'` default, `'somente_compra_propria'`, `'somente_pagamento'` — em `/admin/configuracoes`, aba Geral); entre as habilitadas, o convidado escolhe qual usar, depois de se identificar:
  - **"Vou comprar e entregar"** — reserva de intenção grátis, fluxo original: `reservas_presentes` gravada diretamente via `reservar_presente()`, sem dinheiro passar pela plataforma. Escondida quando `modo_entrega_presente_fisico = 'somente_pagamento'`.
  - **"Enviar o valor pelo link de pagamento"** — exige `casamentos.handle_infinitepay` configurado **e** `modo_entrega_presente_fisico ≠ 'somente_compra_propria'`; o convidado paga `presentes.preco_centavos` via checkout online (InfinitePay) e, só depois do pagamento confirmado, a mesma `reservar_presente()` é chamada.
  - Se a combinação de configurações não deixar nenhuma opção disponível (`'somente_pagamento'` sem handle configurado), o botão "Presentear" some da vitrine e o modal, se já aberto, mostra que o casal ainda não configurou uma forma de receber.
  - Dentro do modal, a ordem é sempre: **escolher o método** (só exige clique quando há mais de uma opção — com uma só, já vem pré-selecionado) → **mensagem opcional** → **confirmar**.
- **Contribuições (presente de cota) e Presentes Emocionais sempre exigem pagamento online real** — sem `handle_infinitepay` configurado, essas duas seções ficam bloqueadas/somente leitura na vitrine pública, com uma mensagem explicando que o casal ainda não ativou pagamentos.
- **Cotas fixas**: um presente de cota pode opcionalmente definir `presentes.valor_cota_centavos` — quando preenchido, o convidado escolhe *quantidade de cotas* a comprar de uma vez em vez de digitar um valor livre (ex.: Air Fryer de R$800 dividida em cotas de R$100). Convive com o modo de contribuição de valor livre (sugestões de valor + campo aberto) para presentes sem cota fixa definida.
- Cartão/mensagem opcional do convidado ao presentear/contribuir (`reservas_presentes.mensagem` / `contribuicoes_presentes.mensagem`) — separado da identificação (nome/telefone), sempre visível ao casal no painel, nunca a outros convidados.
- Indicação visual clara de "já reservado"/progresso de arrecadação no site público, sem expor nome completo do convidado que reservou (apenas ao casal, no painel administrativo).

### 6.3 Regras de negócio (caminho gratuito, inalterado)

- Reserva grátis é **atômica**: `reservar_presente()` executa `SELECT ... FOR UPDATE` na linha do presente dentro de uma transação antes de decrementar `quantidade_disponivel` e inserir a reserva — nunca um `check-then-insert` feito na camada de aplicação.
- Presente com `quantidade_disponivel = 0` não aceita novas reservas e aparece como "Esgotado" na vitrine pública.
- **Não há cancelamento self-service** — sem token de convite, não haveria como provar posse com segurança (nome/telefone sozinhos são triviais de forjar). Qualquer ajuste é resolvido falando direto com o casal.
- Painel administrativo mostra quem reservou/contribuiu o quê (incluindo mensagem e status de pagamento) e uma atividade recente cross-presente (`/admin/presentes`), para fins de agradecimento pós-evento.

### 6.4 Pagamento online (InfinitePay) — fluxo pago

`pagamentos_presentes` é a peça central do caminho pago: uma linha por tentativa de checkout, nunca por presente. **Nenhum efeito de negócio (`reservas_presentes`/`contribuicoes_presentes`) nasce diretamente de uma requisição do convidado** — só a função `confirmar_pagamento_presente()` grava esses registros, e só depois de o pagamento ser confirmado servidor-a-servidor.

Fluxo detalhado, incluindo o modelo de confiança do webhook não assinado, está em [`ARCHITECTURE.md`](ARCHITECTURE.md), seção "Fluxo de Presentes". Resumo das regras de negócio:

1. Convidado escolhe pagar/contribuir → o servidor calcula `valor_centavos` **sempre**, nunca aceita valor do client (exceto contribuição de valor livre).
2. Pagamento confirmado → `reservar_presente()` (tipo `reserva`) ou insere em `contribuicoes_presentes` (tipo `contribuicao`), atomicamente.
3. **Corrida aceita como limitação conhecida**: se a última unidade de um presente físico for levada pelo caminho gratuito entre o checkout e a confirmação do pagamento, a reserva falha dentro de `confirmar_pagamento_presente()` — marca `status_pagamento = 'falhou'` (nunca propaga como exceção não tratada), porque "pago mas não conseguiu reservar" é um estado real que precisa ficar visível para o casal resolver manualmente (destacado na própria página `/admin/presentes`).
4. **Cancelamento de item já pago é bloqueado no self-service** — recusa com 409 orientando contato direto com o casal. Sem estorno automático: a InfinitePay não documenta publicamente uma API de estorno.

### 6.5 Limitações conhecidas da integração InfinitePay

A API pública de checkout da InfinitePay tem documentação técnica limitada — isso molda decisões acima, não é uma lacuna de implementação:

- **Sem sandbox documentado**: validação do fluxo completo é sempre manual, contra a API real, com valores baixos (R$1–2) em ambiente controlado, antes de qualquer merge que toque este fluxo.
- **Sem assinatura no webhook**: o corpo recebido em `POST /api/public/gifts/payments/webhook` nunca é tratado como prova de pagamento.
- **Sem split/marketplace nativo**: uma única conta (`handle`) recebe todo o dinheiro — não há hoje um modelo de múltiplas contas por casal (relevante para a transição SaaS, ver [`ROADMAP.md`](ROADMAP.md)).
- **Sem API de estorno documentada**: motivo direto da regra "cancelamento de item pago é bloqueado".

### 6.6 Fora de escopo desta fase

Timeline pública de contribuições, modo anônimo explícito, fotos pós-presente, agradecimentos em massa pelo painel, gamificação de metas atingidas, relatórios financeiros completos (taxas detalhadas, estornos, exportação) e suporte a moeda estrangeira/cartão internacional.

## 7. Sistema Administrativo

### 7.1 Conceito

Painel autenticado (`/admin/**`) onde o casal e colaboradores gerenciam todo o evento.

### 7.2 Módulos previstos

| Módulo | Função |
|---|---|
| **Dashboard** | Visão consolidada: total de convidados, % confirmados, presentes reservados, prazo de RSVP restante |
| **Convidados** | CRUD completo, importação CSV, filtros e busca |
| **Grupos** | Organização de convidados em grupos, definição de limites de acompanhantes |
| **Presentes** | CRUD de itens, categorias, visão de reservas/contribuições por item (com identificação de quem presenteou, mensagem e status de pagamento), resumo mínimo do arrecadado online e uma atividade recente cross-presente — tudo na própria página `/admin/presentes` |
| **Cronograma** | Gestão de `etapas_evento` — cerimônia, recepção, festa, cada um com local/horário próprios. O local é escolhido, não digitado (ver 7.4) |
| **Convites e Comunicações** | Geração de tokens de acesso (`credenciais_acesso_convite`), histórico completo de envios por canal (`comunicacoes`), reenvio de lembretes sem invalidar o link já compartilhado |
| **Configurações** | Dados do evento (data, nome dos noivos, `modo_lista_convidados`), tema visual, prazo de RSVP, handle da InfinitePay (ativa pagamento online de presentes) |
| **Colaboradores** | Convidar/remover pessoas com acesso administrativo, definir permissões |

### 7.3 Regras de negócio

- Apenas `owner` pode gerenciar colaboradores e excluir o evento. **Nota de implementação**: essa checagem ainda não é aplicada no servidor (só existiria na UI) — não é uma vulnerabilidade ativa hoje porque a funcionalidade de Colaboradores em si não foi construída ainda; precisa ser implementada junto quando essa feature nascer (achado de auditoria, 2026-08).
- Toda ação sensível (exclusão de convidado, alteração de configurações do evento) é registrada em `trilha_auditoria`.
- Exportação de dados (CSV de convidados, lista de presentes reservados) disponível a qualquer momento — o casal é o dono dos seus dados.

### 7.4 Localização do Cronograma

O local de cada etapa é uma **entidade selecionada**, não um texto digitado. O casal nunca vê, nem informa, latitude ou longitude — coordenada é dado interno da localização.

**Caminho principal — escolher no Maps.** O casal digita o nome ou o endereço ("Buffet Leila Malouf", "Av. Miguel Sutil, 1234") e escolhe uma sugestão real do provedor de lugares. A sugestão tem duas linhas justamente para diferenciar homônimos: nome em cima, endereço/cidade embaixo. Escolhida a sugestão, o campo de busca some e dá lugar à confirmação: nome, endereço, um preview pequeno do mapa e duas ações — **Ver no mapa** e **Alterar local**.

**O preview é pequeno e só informativo.** Ele existe para o casal reconhecer o ponto, não para explorar o mapa; nenhum mapa grande abre por padrão.

**"Ver no mapa" nunca refaz busca textual** quando existe identificação do lugar. Busca por texto é exatamente o que produzia o ponto errado antes desta fase — dois buffets de nome parecido na mesma avenida resolvem para o primeiro que o Maps achar, não para o que o casal escolheu.

**"Alterar local" não apaga nada até haver substituto.** Abrir a busca e desistir mantém o local anterior; a troca só acontece quando uma nova escolha é concluída.

**Caminho alternativo — cadastro manual.** Nem todo local existe como Place: chácaras, sítios, salões pequenos, propriedades particulares, espaços novos, endereços rurais. "Nenhum resultado" **nunca** é tratado como erro bloqueante — junto da busca vazia aparece sempre "Não encontrou o local? Informar local manualmente". O cadastro manual pede endereço em partes (logradouro, número, complemento, cidade, UF) e, opcionalmente, **Definir localização no mapa**: um mapa em que o casal arrasta ou toca para posicionar o marcador e confirma. As coordenadas saem daí, sem nenhum campo numérico.

**O Maps é o caminho principal, nunca uma dependência.** Sem provedor configurado, ou com o provedor fora do ar, o cadastro manual continua completo por si só e o painel abre direto nele.

**Compatibilidade com o que já existe.** Etapas cadastradas antes desta fase têm só o endereço em texto. Elas continuam sendo exibidas normalmente e nenhuma é convertida automaticamente para um resultado do Maps — substituir o endereço de um casal por um palpite de geocodificação, sem ele confirmar, é o oposto do que esta mudança resolve.


---

*Fonte original deste documento: `CLAUDE.md` (antes da reorganização de documentação de 2026-08-20, ver `docs/CHANGELOG.md`). Este documento evolui junto com o produto — toda mudança de regra de negócio deve ser refletida aqui.*
