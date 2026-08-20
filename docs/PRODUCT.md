# Especificação de Produto — MeuSiteCasamento

> Visão de produto, personas e regras de negócio dos sistemas de Convidados, RSVP, Convites/Grupos, Presentes e Administração. Para como esses fluxos são implementados tecnicamente (rotas, funções Postgres, fluxo de requisição), ver [`ARCHITECTURE.md`](ARCHITECTURE.md). Para o modelo de dados subjacente, ver [`DATABASE.md`](DATABASE.md). Em caso de conflito, [`CLAUDE.md`](../CLAUDE.md) prevalece.

---

## 1. Visão Geral do Produto

O **MeuSiteCasamento** é uma aplicação web voltada para casais que estão organizando seu casamento e precisam de uma ferramenta central para:

- Publicar um site de casamento personalizado (história do casal, data, local, cronograma do evento, galeria de fotos).
- Gerenciar a lista de convidados de forma estruturada, incluindo grupos familiares e acompanhantes.
- Coletar confirmações de presença (RSVP) com suporte a restrições alimentares, número de acompanhantes e mensagens.
- Disponibilizar uma lista de presentes (física, digital ou "cota" para lua de mel) com controle de reservas para evitar duplicidade.
- Fornecer um painel administrativo para os noivos (ou um planejador de casamentos contratado) acompanharem métricas de confirmação, presentes e comunicação com convidados.

O produto nasce como uma aplicação de uso único por casamento (single-tenant, uso por evento), mas é desenhado desde o início para evoluir para um modelo **multi-tenant SaaS**, onde múltiplos casais podem criar suas próprias instâncias de forma independente (ver [`ROADMAP.md`](ROADMAP.md)).

### 1.1 Personas

| Persona | Descrição | Necessidades principais |
|---|---|---|
| **Noivo(a) / Casal** | Dono(a) da conta, administra o evento | Configurar site, gerenciar convidados, acompanhar RSVPs e presentes |
| **Convidado** | Recebe o convite e acessa o site público | Ver informações do evento, confirmar presença, escolher presente |
| **Colaborador/Família** | Auxilia o casal na organização (ex: mãe da noiva) | Acesso limitado ao painel administrativo (permissões) |
| **Planejador de Casamento** | Profissional contratado, pode gerenciar múltiplos eventos | Visão consolidada de múltiplos casamentos (papel futuro, SaaS) |

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
6. Segurança adequada ao tratar dados pessoais de convidados (nome, telefone, e-mail, restrições alimentares).

### 2.3 Não-objetivos (nesta fase)

- Não construir um app mobile nativo.
- ~~Não implementar pagamentos/gateway financeiro para presentes em dinheiro~~ — superado na "Fase Presentes 2.0" (seção 6), decisão explícita do usuário: pagamento Pix real via InfinitePay, apesar do não-objetivo original desta seção. Relatórios financeiros completos (taxas, estornos, exportação) continuam fora de escopo.
- Não suportar múltiplos idiomas na v1 (i18n é item de roadmap).
- Não implementar múltiplos tenants/contas na v1 (arquitetura já prepara terreno, mas não é exposta ao usuário).

## 3. Sistema de Convidados

### 3.1 Conceito

Convidados (`guests`) são sempre vinculados a um `invite` (a unidade real de RSVP) para poder responder — o vínculo pode ficar pendente ("Fazer Depois" no wizard) até ser resolvido. Independentemente disso, um convidado pode opcionalmente ter uma etiqueta livre (`group`, ex. "Família da Noiva") e pertencer a um agrupamento de Acompanhantes (`guest_party`) — os três vínculos (`invite_id`, `group_id`, `party_id`) são independentes entre si (ver [`DATABASE.md`](DATABASE.md)).

### 3.2 Funcionalidades previstas

- Cadastro de convidado via wizard (dados pessoais, Acompanhantes, vínculo com convite) — persistência em lote numa única transação (`sync_guest_party()`).
- Perfil do convidado: apelido, sexo, data de nascimento, foto, papel de padrinho/madrinha, restrição alimentar, observações internas.
- Importação em massa (CSV) — mapeamento de colunas para `full_name`, `email`, `phone`.
- Edição inline de dados de contato e restrições alimentares.
- "Criança" nunca é um campo manual — calculada a partir de `birth_date` + `weddings.child_max_age` (`guest_is_child()`), para fins de contagem de "lugares" no evento.
- Soft delete de convidados (remoção lógica, preservando histórico de RSVP/presentes associados).
- Busca e filtro por nome (tolerante a acentuação/ordem/apelido — `guest_name_matches`), convite, status de RSVP.

### 3.3 Regras de negócio

- Um convidado só consegue responder RSVP depois de vinculado a um convite (`invite_id`); antes disso, existe no cadastro mas fica fora do fluxo de RSVP.
- Alterar o convite/etiqueta/grupo de Acompanhantes de um convidado não apaga suas respostas de RSVP anteriores (histórico preservado).
- E-mail/telefone não são obrigatórios (alguns convidados só têm envio de convite físico), mas ao menos um canal de contato é recomendado pela UI (aviso, não bloqueio).

## 4. Sistema de RSVP

### 4.1 Conceito

RSVP (*répondez s'il vous plaît*) é o fluxo pelo qual o convidado confirma ou recusa presença. É sempre **por convidado** — não existe mais um "modo grupo" que cobre todos os membros de uma vez.

### 4.2 Configuração por casamento

- `weddings.guest_list_mode` (`'closed'` default | `'open'`) — coluna própria de comportamento de negócio, deliberadamente separada de `theme_config` (que é exclusivamente visual). `'closed'`: só convidados pré-cadastrados podem confirmar presença. `'open'`: permite acompanhante avulso (nome livre, sem cadastro prévio) até `invites.max_companions`.
- `rsvp_deadline` define o prazo final — após essa data, o formulário público entra em modo somente leitura.

### 4.3 Dados coletados

- Status por convidado: `pending` (default) | `confirmed` | `declined` (escolhidos pelo próprio convidado) | `waitlisted` | `removed` (só administrativos, o convidado nunca escolhe sozinho).
- Acompanhante avulso (nome sem cadastro prévio, só em `guest_list_mode = 'open'`) registrado em `companions`, pendurado no convite (não numa resposta individual) — respeitando `invites.max_companions`.
- Restrições alimentares do convidado (texto livre + possíveis tags pré-definidas: vegetariano, vegano, sem glúten, sem lactose, alergias) — fonte única em `guests.dietary_restrictions`, mesmo formato usado em `companions.dietary_restrictions`.
- Mensagem opcional ao casal — uma por **convite** (`invites.rsvp_message`, preenchida na revisão final), não por convidado individual.
- Timestamp de resposta (`responded_at`) por convidado, permitindo reenvio de lembrete apenas para quem ainda está `pending`.
- Fluxo de formulário diferenciado por resultado: recusar presença **não** solicita restrição alimentar — reduz fricção de quem só precisa dizer "não vou".

### 4.4 Regras de negócio

- Resposta de cada convidado é **editável** até `rsvp_deadline` — `upsert_guest_rsvp()` atualiza o registro existente (não cria duplicata), gravando o evento em `invite_events` na mesma transação.
- Confirmar acompanhante avulso contra `invites.max_companions` é uma operação sujeita a corrida (múltiplos convidados do mesmo convite respondendo simultaneamente), resolvida com `SELECT ... FOR UPDATE` sobre a linha do convite dentro de `finalize_invite_rsvp()` — nunca apenas validação client-side.
- Painel administrativo exibe contadores **atualizados a cada carregamento/refetch** (não é um canal de push em tempo real): confirmados, recusados, pendentes, total de acompanhantes.
- Sistema de lembretes (fase 2 do roadmap): disparo automático de e-mail para convidados `pending` X dias antes do `rsvp_deadline`, registrado em `communications` (não em `guest_access_tokens`, que permanece estável entre envios).

## 5. Sistema de Convites e Grupos

### 5.1 Conceito

Dois conceitos independentes, fáceis de confundir pelo nome:

- **Convite (`invites`)** é a unidade real de RSVP e comunicação — "quem recebeu o mesmo convite físico/digital". Todo link/QR de acesso, lembrete e mensagem ao casal opera nesse nível. Um convite pode ter um Convidado Responsável (`responsible_guest_id`), usado pra personalizar mensagens.
- **Grupo (`groups`)** é só uma etiqueta organizacional livre (ex.: "Família da Noiva", "Trabalho") — sem nenhuma semântica de RSVP, comunicação ou limite de acompanhante. Serve pra filtrar/organizar a lista de convidados no admin.
- **Acompanhantes (`guest_parties`)** é um terceiro conceito, tratado à parte na seção 3 — agrupamento simétrico de convidados comumente convidados juntos.

### 5.2 Funcionalidades previstas

**Convites:**
- Criar convite, vincular convidados, definir Convidado Responsável.
- Gerar link/QR de acesso (`guest_access_tokens`) e reenviar sem invalidar o já compartilhado.
- Definir `max_companions` (limite de acompanhante avulso, só relevante em `guest_list_mode = 'open'`).
- Etiquetas internas reutilizáveis (`invite_tags`, ex.: "VIP", "Mesa 01") — só uso administrativo.
- Linha do Tempo do convite (`invite_events`): criado, token enviado, primeiro acesso, RSVP alterado, mensagem enviada, arquivado.
- Visualização: convite → convidados → status de RSVP de cada um.

**Grupos (etiqueta livre):**
- Criar/renomear/excluir grupos, definir cor.
- Atribuir/remover a etiqueta de um convidado (não move o convidado de convite nem de Acompanhantes).

### 5.3 Regras de negócio

- Excluir um convite ou grupo com convidados associados exige realocar os convidados ou confirmar exclusão em cascata (soft delete) — nunca exclusão física silenciosa. A cascata soft-deleta os convidados **e** o próprio convite/grupo (nunca um `DELETE` físico): `guests.invite_id` é `ON DELETE RESTRICT`, então a linha do convite permanece referenciada por qualquer convidado soft-deleted que já tenha pertencido a ele. Um convite/grupo sem nenhum convidado (nem ativo, nem soft-deleted) também é apenas soft-deleted, pela mesma convenção.
- `max_companions` é validado no momento da revisão final do RSVP (`finalize_invite_rsvp`): não permite confirmar mais acompanhantes avulsos do que o limite definido pelo casal.

## 6. Sistema de Presentes

### 6.1 Conceito ("Presentes 2.0")

A lista de presentes é um "ecossistema de presentes", não uma lista fria de produtos: a página pública (`/{slug}/presentes`) abre com uma mensagem do casal e organiza os itens em três seções — **Lista de Presentes** (itens físicos, `gift_categories`), **Contribuições** (presentes de cota em dinheiro, agrupados por categoria) e **Presentes Emocionais** (contribuições com apresentação evocativa em vez de foto de produto). "Presente emocional" **não é uma entidade nova** — é um presente de cota comum (`gifts.is_group_gift = true`) com `display_style = 'emotional'` e um `emotional_icon` (catálogo fixo validado no Zod, `shared/schemas/gifts.ts#EMOTIONAL_GIFT_ICONS`) no lugar de foto.

**Nomenclatura "Pix" usada nesta seção**: por brevidade, o resto desta seção fala em "pagamento Pix"/"caminho pago", mas tecnicamente o que a plataforma gera é um **link de pagamento genérico da InfinitePay** — quais métodos ele aceita (Pix, cartão, ambos) é definido pela própria conta InfinitePay do casal, não pelo nosso código. A UI (convidado e admin) reflete essa nuance com o rótulo "pagamento online", nunca prometendo "Pix" especificamente.

### 6.2 Funcionalidades previstas

- CRUD de presentes pelo painel administrativo (título, descrição, foto, preço estimado, quantidade disponível, estilo de exibição, cota fixa).
- **A página de presentes é pública, sempre, sem link personalizado por convite** — diferente do RSVP (que ainda usa `guest_access_token`), `/{slug}/presentes` nunca exigiu nem exige um `?code=`. **Identificação de quem está presenteando é o primeiro passo antes de qualquer ação**: o convidado informa nome (obrigatório) e telefone (opcional) — coletados uma única vez por sessão (`useGiftGiverIdentity`, `useState` do Nuxt, isolado por requisição no SSR) e reaproveitados em todos os presentes/contribuições da mesma visita. Gravados em `gift_reservations.contributor_name`/`giver_phone` e `gift_contributions.contributor_name`/`giver_phone`. `guest_id`/`group_id` nunca são preenchidos pelo fluxo público atual — a identificação é **inteiramente** nome/telefone, sem nenhuma ligação com a lista de convidados cadastrados.
- **Presente físico (`is_group_gift = false`) pode ter até duas formas de ser presenteado** — quais delas ficam disponíveis é decisão do casal (`weddings.physical_gift_delivery_mode`: `'both'` default, `'self_purchase_only'`, `'payment_only'` — em `/admin/configuracoes`, aba Geral); entre as habilitadas, o convidado escolhe qual usar, depois de se identificar:
  - **"Vou comprar e entregar"** — reserva de intenção grátis, fluxo original: `gift_reservations` gravada diretamente via `reserve_gift()`, sem dinheiro passar pela plataforma. Escondida quando `physical_gift_delivery_mode = 'payment_only'`.
  - **"Enviar o valor pelo link de pagamento"** — exige `weddings.infinitepay_handle` configurado **e** `physical_gift_delivery_mode ≠ 'self_purchase_only'`; o convidado paga `gifts.price_cents` via checkout online (InfinitePay) e, só depois do pagamento confirmado, a mesma `reserve_gift()` é chamada.
  - Se a combinação de configurações não deixar nenhuma opção disponível (`'payment_only'` sem handle configurado), o botão "Presentear" some da vitrine e o modal, se já aberto, mostra que o casal ainda não configurou uma forma de receber.
  - Dentro do modal, a ordem é sempre: **escolher o método** (só exige clique quando há mais de uma opção — com uma só, já vem pré-selecionado) → **mensagem opcional** → **confirmar**.
- **Contribuições (presente de cota) e Presentes Emocionais sempre exigem pagamento online real** — sem `infinitepay_handle` configurado, essas duas seções ficam bloqueadas/somente leitura na vitrine pública, com uma mensagem explicando que o casal ainda não ativou pagamentos.
- **Cotas fixas**: um presente de cota pode opcionalmente definir `gifts.quota_amount_cents` — quando preenchido, o convidado escolhe *quantidade de cotas* a comprar de uma vez em vez de digitar um valor livre (ex.: Air Fryer de R$800 dividida em cotas de R$100). Convive com o modo de contribuição de valor livre (sugestões de valor + campo aberto) para presentes sem cota fixa definida.
- Cartão/mensagem opcional do convidado ao presentear/contribuir (`gift_reservations.message` / `gift_contributions.message`) — separado da identificação (nome/telefone), sempre visível ao casal no painel, nunca a outros convidados.
- Indicação visual clara de "já reservado"/progresso de arrecadação no site público, sem expor nome completo do convidado que reservou (apenas ao casal, no painel administrativo).

### 6.3 Regras de negócio (caminho gratuito, inalterado)

- Reserva grátis é **atômica**: `reserve_gift()` executa `SELECT ... FOR UPDATE` na linha do presente dentro de uma transação antes de decrementar `quantity_available` e inserir a reserva — nunca um `check-then-insert` feito na camada de aplicação.
- Presente com `quantity_available = 0` não aceita novas reservas e aparece como "Esgotado" na vitrine pública.
- **Não há cancelamento self-service** — sem token de convite, não haveria como provar posse com segurança (nome/telefone sozinhos são triviais de forjar). Qualquer ajuste é resolvido falando direto com o casal.
- Painel administrativo mostra quem reservou/contribuiu o quê (incluindo mensagem e status de pagamento) e uma atividade recente cross-presente (`/admin/presentes`), para fins de agradecimento pós-evento.

### 6.4 Pagamento online (InfinitePay) — fluxo pago

`gift_payments` é a peça central do caminho pago: uma linha por tentativa de checkout, nunca por presente. **Nenhum efeito de negócio (`gift_reservations`/`gift_contributions`) nasce diretamente de uma requisição do convidado** — só a função `confirm_gift_payment()` grava esses registros, e só depois de o pagamento ser confirmado servidor-a-servidor.

Fluxo detalhado, incluindo o modelo de confiança do webhook não assinado, está em [`ARCHITECTURE.md`](ARCHITECTURE.md), seção "Fluxo de Presentes". Resumo das regras de negócio:

1. Convidado escolhe pagar/contribuir → o servidor calcula `amount_cents` **sempre**, nunca aceita valor do client (exceto contribuição de valor livre).
2. Pagamento confirmado → `reserve_gift()` (kind `reservation`) ou insere em `gift_contributions` (kind `contribution`), atomicamente.
3. **Corrida aceita como limitação conhecida**: se a última unidade de um presente físico for levada pelo caminho gratuito entre o checkout e a confirmação do pagamento, a reserva falha dentro de `confirm_gift_payment()` — marca `status = 'failed'` (nunca propaga como exceção não tratada), porque "pago mas não conseguiu reservar" é um estado real que precisa ficar visível para o casal resolver manualmente (destacado na própria página `/admin/presentes`).
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
| **Cronograma** | Gestão de `event_segments` — cerimônia, recepção, festa, cada um com local/horário próprios |
| **Convites e Comunicações** | Geração de tokens de acesso (`guest_access_tokens`), histórico completo de envios por canal (`communications`), reenvio de lembretes sem invalidar o link já compartilhado |
| **Configurações** | Dados do evento (data, nome dos noivos, `guest_list_mode`), tema visual, prazo de RSVP, handle da InfinitePay (ativa pagamento online de presentes) |
| **Colaboradores** | Convidar/remover pessoas com acesso administrativo, definir permissões |

### 7.3 Regras de negócio

- Apenas `owner` pode gerenciar colaboradores e excluir o evento. **Nota de implementação**: essa checagem ainda não é aplicada no servidor (só existiria na UI) — não é uma vulnerabilidade ativa hoje porque a funcionalidade de Colaboradores em si não foi construída ainda; precisa ser implementada junto quando essa feature nascer (achado de auditoria, 2026-08).
- Toda ação sensível (exclusão de convidado, alteração de configurações do evento) é registrada em `audit_logs`.
- Exportação de dados (CSV de convidados, lista de presentes reservados) disponível a qualquer momento — o casal é o dono dos seus dados.

---

*Fonte original deste documento: `CLAUDE.md` (antes da reorganização de documentação de 2026-08-20, ver `docs/CHANGELOG.md`). Este documento evolui junto com o produto — toda mudança de regra de negócio deve ser refletida aqui.*
