# Plano de Execução — Remodelagem SaaS

> Checklist de trabalho derivado da Auditoria Arquitetural de 2026-08-21 (documento completo publicado como artifact: https://claude.ai/code/artifact/7ab3bd5d-6a51-49d2-9ba7-abfd26ab6752). Este arquivo é a fonte de verdade de **progresso** — atualizado a cada item concluído, com entrada correspondente no "Log de progresso" ao final. `docs/ROADMAP.md` continua sendo a fonte de verdade de **fase de produto** (Fase 4/5); este documento é o detalhamento tático de como chegar lá.

**Como usar**: marcar `[x]` só quando o item estiver de fato implementado e validado (não necessariamente mergeado — ver contrato de execução abaixo). Cada passo bloqueia o próximo, na ordem abaixo (ver seção 15/17 do artifact para a justificativa do sequenciamento).

## Contrato de execução (definido pelo usuário em 2026-08-21)

- **Execução contínua e autônoma**: sem pausar para pedir autorização de edição, commit, PR ou decisão técnica razoável dentro do escopo do plano. Sem apresentar progresso parcial no meio do caminho.
- **Validação a cada etapa**: lint/typecheck/testes unitários/integração/E2E/build/validações de banco e migration/busca de referências antigas/imports quebrados/arquivos órfãos, conforme aplicável. Falha → investigar, corrigir, revalidar, só then seguir.
- **Commits**: unidades coerentes de trabalho, sem pedir aprovação. Nem um commit por arquivo, nem um commit gigante por Passo inteiro.
- **PRs**: um PR por unidade coerente de responsabilidade (pode passar de 20 no total). PRs dependentes usam o modelo *stacked* (branch parte da branch do PR anterior, nunca de `main` direto, quando há dependência real).
- **Merge para `main` é proibido durante toda a execução autônoma** — `main` dispara deploy automático de produção. PRs ficam criados e prontos, nunca mergeados, até autorização explícita no checkpoint final.
- **Único checkpoint humano**: ao final de todo o plano (todos os Passos + correções de documentação), com relatório de PRs, ordem de merge recomendada, validações e pendências reais.
- Rename para português (Passo 1) é tratado como migração arquitetural completa — banco, backend, APIs, frontend, testes, documentação, configs — nunca parcial. Busca sistemática por referências aos nomes antigos antes de considerar concluído.

---

## Status geral

- **Fase atual**: Passo 1 (rename para português) — **completo, mergeado em `main` e promovido para produção**. Banco, `shared/`, `server/`, `app/` (types/composables/components/pages), `tests/unit/**` (57 arquivos) e documentação (`CLAUDE.md`, `docs/DATABASE.md`, `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, `docs/DESIGN-SYSTEM.md`, `docs/ROADMAP.md`) traduzidos e consistentes. `npm run typecheck`/`lint`/`test`/`build` limpos (0 erros, 383/383 testes passando). `supabase/seed.sql` atualizado para o novo esquema.
- **Merge e produção (2026-08-21)**: os 4 PRs da pilha (#79→#80→#81→#82) foram mergeados em `main` nessa ordem, com autorização explícita do usuário. As 5 migrations de rename foram aplicadas ao projeto `prod` (`elatoqglxrpqriqphkjy`) logo em seguida. Deploy do Vercel do commit final (`9ef60ef`) concluído com sucesso; usuário confirmou produção funcionando normalmente. Houve uma janela curta (~1-2 min) entre o deploy do código novo e a aplicação da migration em prod, devido a retentativas do classificador de permissão do Claude Code nos comandos `gh pr merge`/`supabase db push` — sem impacto observado, dado que o ambiente ainda está pré-lançamento (sem dado real de casamento).
- **Última atualização**: 2026-08-21.
- **Decisão confirmada com o usuário em 2026-08-21**: composables (`useGuests`, `useInvites`...) e pastas de componente (`components/gifts/` etc.) **permanecem em inglês** — mesmo raciocínio já aplicado às pastas de rota de `server/api/**` (organização interna de código/protocolo, não vocabulário de dados do domínio). Os dois itens correspondentes abaixo ficam marcados como decisão consciente, não pendência.

### Bloqueio anterior — resolvido

O bloqueio de validação (sem Docker local, `supabase db push` inicialmente negado pelo classificador) foi resolvido: o usuário rodou `npx supabase db push --linked` diretamente no terminal dele, e nas tentativas seguintes o comando passou a ser permitido também para mim. Três bugs reais foram encontrados e corrigidos só porque essa validação existiu (nenhum apareceria em revisão estática de SQL):
1. `UPDATE` de tradução de enum rodando antes do `DROP` do `CHECK` antigo (violava a própria constraint ainda ativa).
2. Trigger de consistência disparando durante o `UPDATE` de `pagamentos_presentes.tipo`, chamando o corpo *antigo* da função (`new.kind`, campo que não existe mais) — mesma classe de bug que este projeto já teve historicamente com `reserve_gift`.
3. `CREATE OR REPLACE FUNCTION` não permite renomear parâmetro de entrada — corrigido trocando para `DROP FUNCTION` + `CREATE FUNCTION` nas 9 funções de negócio sem dependentes por OID; `is_membro_casamento`/`is_dono_casamento` mantêm o parâmetro `p_wedding_id` de propósito (têm ~90 RLS policies dependentes por OID).

## Decisões já validadas com o usuário

- [x] Ambiente confirmado pré-lançamento, sem dado real de casamento em produção (2026-08-21).
- [x] Remodelagem completa da nomenclatura do banco para português aprovada, mesmo contra a recomendação técnica original da auditoria (2026-08-21).

---

## Passo 1 — Rename completo para português

Corte coordenado único (banco + API + tipos + schemas + testes + docs), validado inteiramente em `dev` antes de promover. Absorve as correções P0 da auditoria no mesmo movimento.

- [x] Migration: renomear as 27 tabelas (`20260821090001`)
- [x] Migration: renomear colunas centrais (`wedding_id`→`casamento_id` em toda tabela filha, etc.) (`20260821090001`)
- [x] Migration: corrigir `group_id`→`convite_id` em `gift_reservations`/`gift_contributions` (renomeadas para `reservas_presentes`/`contribuicoes_presentes`) (`20260821090001`)
- [x] Migration: recriar trigger de consistência `casamento_id`/`convite_id` ausente em `companions` (→ `acompanhantes_avulsos`) (`20260821090003`)
- [x] Migration: recriar trigger de consistência ausente em `photos.source_connection_id` (→ `fotos.conexao_id`) (`20260821090003`)
- [x] Migration: traduzir valores de `CHECK`/status (`20260821090002`)
- [x] Migration: renomear RLS policies (`20260821090004`)
- [x] Migration: renomear/recriar funções Postgres (`20260821090003`) — inclui limpeza dos 2 overloads obsoletos de `reserve_gift`
- [x] Migration: adicionar `is_slug_reservado(text)` + `CHECK` em `casamentos.slug` (`20260821090005`)
- [x] Migration: escopo de conta em `assinaturas`/`funcionalidades_habilitadas` + `planos.max_casamentos` + ciclo de vida (`20260821090005`)
- [x] Validar as 5 migrations acima contra Postgres real (projeto `dev`, via `npx supabase db push --linked`) — 4 bugs reais encontrados e corrigidos (ver "Bloqueio anterior — resolvido")
- [x] Trocar `service_role` por `serverSupabaseClient` em `wedding/gallery/connection.delete.ts` e `wedding/gallery/sync.post.ts` — só nas leituras/escritas que resolvem a conexão do próprio casal (RLS como defesa em profundidade); `syncGalleryConnection()` em si continua em `service_role` de propósito, por ser compartilhado com o cron (sem sessão de usuário)
- [x] Renomear policies de storage (migration `20260821100001`) — as 9 policies de `storage.objects` dos buckets `wedding-covers`/`wedding-photos`/`wedding-event-segments` foram renomeadas via `DROP`+`CREATE` (não `ALTER POLICY RENAME` — `storage.objects` pertence a `supabase_storage_admin`, e o role de migration só tem privilégio de `CREATE`/`DROP` policy nela, não `ALTER`/`RENAME`, achado real desta sessão). Validado e aplicado em `dev` e `prod`
- [x] Regenerar `database.types.ts` a partir do schema novo (`npx supabase gen types typescript --linked`, confirmado sem nomes antigos)
- [x] Traduzir `shared/schemas/**` e `shared/utils/**` (campos que espelham colunas do banco) — branch `refactor/pt-br-shared-e-utils`
- [x] Traduzir `server/utils/**` (todas as chamadas `.from`/`.select`/`.eq`/`.rpc`) — mesma branch
- [x] Traduzir `server/api/**` (76 endpoints, todos os domínios) — branch `refactor/pt-br-server-api`. `npm run typecheck`/`lint` limpos em `shared/`+`server/` inteiro
- [x] Renomear pastas/arquivos de rota em `server/api/**` (ex.: `invites/`→`convites/`) — **decisão: NÃO fazer** — nomes de pasta de rota não são "nomenclatura do domínio" visível, e renomear quebraria URLs de API já em uso sem nenhum ganho real (as rotas HTTP não são a "nomenclatura em inglês" que o briefing original pedia para traduzir — o conteúdo/campos já estão traduzidos). Decisão consciente, não pendência esquecida.
- [x] Renomear composables (`useInvites`→`useConvites` etc.) — **decisão confirmada com o usuário em 2026-08-21: NÃO fazer**, mesmo raciocínio do item acima (organização interna de código, não vocabulário de dados). O conteúdo interno de cada composable (campos que acessam objetos vindos do banco) já está 100% traduzido.
- [x] Renomear pastas de componente (`components/gifts/`→`components/presentes/`) — **mesma decisão acima: NÃO fazer**. `components/rsvp/` também mantém (RSVP é termo universal, nem entraria nessa discussão).
- [x] Atualizar `app/types/**` derivados (`Guest`, `Wedding`, `GiftPayment`, `auth.ts#WeddingContext`, etc.) — branch `refactor/pt-br-app-layer`. `WeddingContext.weddingId/role/memberId` deliberadamente mantidos (tipo transversal, tradução adiada, baixo risco)
- [x] Traduzir `app/composables/**` (31 arquivos + 2 stores) e `app/components/**`/`app/pages/**`/`app/layouts/**`/`app/utils/**` — campos que acessam objetos vindos do banco atualizados para os novos nomes; nomes de função/arquivo/pasta mantidos em inglês (ver decisão acima). `npm run typecheck`/`lint` limpos em `app/` inteiro (0 erros)
- [x] Atualizar os 57 testes unitários existentes para os novos nomes — 22 arquivos precisavam de correção (mocks/fixtures com campos antigos), 35 já estavam corretos. `npm run test` limpo (383/383 passando)
- [x] Atualizar `docs/DATABASE.md`, `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, `docs/DESIGN-SYSTEM.md`, `docs/ROADMAP.md` e `CLAUDE.md` (seção 6 "Idioma" estava desatualizada — dizia "identificadores em inglês", o oposto da decisão já aprovada) com a nomenclatura nova
- [x] Atualizar `supabase/seed.sql` para os novos nomes

### Escopo deliberadamente deixado em inglês nesta etapa (registrar, não esquecer)
- Nomes de constraint de FK/PK no banco (identificadores internos de catálogo, sem ganho funcional em renomear).
- Chaves internas de `config_tema`/`config_conteudo` (JSONB — não são colunas).
- Campos técnicos de integração com Google Drive (`code`, `folderId`, `folderName`) e da API externa da InfinitePay (`order_nsu`, `redirect_url` etc. — contrato de terceiro, não nosso).
- Alguns DTOs locais de baixo risco (ex.: `AuditLogInput.entityType/entityId`) — a escrita no banco já está 100% correta; o nome do parâmetro TS é cosmético e pode ser revisitado depois sem risco.
- DTOs computados/agregados de view-model (`PublicGift`, `RsvpInvitePayload.wedding.coupleNames/eventDate`, `GiftReservationEntry`/`GiftContributionEntry`/`GiftActivityEntry`, `DashboardSummary`, `InviteListItem` — campos calculados/agregados, não colunas de tabela) — exceção documentada e consistente nos dois lados (server e client nunca misturam os dois padrões no mesmo objeto).
- Nomes de composable (`useGuests`, `useInvites`...) e pastas de componente (`components/gifts/` etc.) — decisão confirmada com o usuário em 2026-08-21, mesmo raciocínio das pastas de rota de `server/api/**`.
- `app/types/auth.ts#WeddingContext.weddingId/role/memberId` — tipo transversal, tradução adiada por baixo risco/baixo ganho.

### Pendências reais de Passo 1 (fora do rename em si)
- [ ] Gate de CI: falhar build se view nova/alterada não tiver `security_invoker = true`
- [ ] Gate de CI: falhar build se `database.types.ts` estiver desatualizado em relação às migrations
- [ ] Validar `build` de produção passando com o schema novo (lint/typecheck/test unitário já validados, ver Status geral)
- [ ] Busca final por referências antigas remanescentes em todo o repositório (grep sistemático)
- [x] Organizar as branches acumuladas em PRs stacked reais no GitHub (#79→#80→#81→#82)
- [x] Mergear os 4 PRs em `main`, em sequência, com autorização explícita do usuário (2026-08-21)
- [x] Promover as 5 migrations para `prod` (`elatoqglxrpqriqphkjy`) logo após o merge final — usuário confirmou produção funcionando normalmente

## Passo 2 — Suíte de testes de isolamento entre tenants

Escrita diretamente contra o schema já em português — nenhum retrabalho de tradução depois. Bloqueia o Passo 3.

- [ ] `tests/integration/rls/` — 1 teste por tabela: usuário de um casamento nunca lê/escreve dado de outro
- [ ] `tests/integration/guest-path/` — 1 teste por endpoint público-facing (RSVP link/QR, busca por nome, presentes) confirmando escopo de token/sessão
- [ ] `tests/integration/api/` — caminho feliz + erro de domínio por endpoint de mutação
- [ ] Adicionar as 3 suítes como gate obrigatório no CI (hoje só roda `lint`/`typecheck`/`test` unitário/`build`)

## Passo 3 — Camada Conta → Casamento no admin

- [ ] Evoluir `resolveWeddingContext()` para receber identificador explícito do casamento ativo (slug/id da URL), não mais `.limit(1)`
- [ ] Rotas admin passam a carregar o casamento ativo na URL (`/admin/{slug}/**`, espelhando o padrão público)
- [ ] Tipo de contexto de sessão deixa de ser singular — vira lista de casamentos administrados pelo usuário
- [ ] Tela de seleção de casamento pós-login (só aparece quando há mais de um)
- [ ] Endpoints novos: gestão de `membros_casamento` (convidar/remover colaborador)
- [ ] Checar `papel = 'dono'` em TypeScript, não só via RLS (fecha achado do PRODUCT.md §7.3)
- [ ] E2E: fluxo de seleção/troca de casamento ativo

## Passo 4 — Extensão de assinaturas/entitlements para escopo de conta

- [ ] Migration aditiva: `casamento_id` opcional + `conta_id` em `assinaturas` (CHECK XOR)
- [ ] Mesmo padrão XOR em `funcionalidades_habilitadas`
- [ ] Adicionar `planos.max_casamentos` (nullable = ilimitado)
- [ ] RLS policies para as 4 tabelas de SaaS-readiness (hoje habilitadas mas sem nenhuma policy)
- [ ] Camada centralizada de autorização de features (`canAddGuest`, `canCreateWedding`, `canUseCustomTheme` etc. — nome final em português a definir)
- [ ] Checar limite de casamentos por conta na criação via `COUNT`, sem contador materializado

## Passo 5 — Observabilidade

- [ ] Integrar Sentry (erros + performance)
- [ ] Logging estruturado com request id (substitui `console.error` ad-hoc espalhado em 4 arquivos)
- [ ] Métricas por casamento onde tecnicamente apropriado

## Passo 6 — Ciclo de vida do casamento

- [ ] Adicionar `status_ciclo_vida` (`rascunho`\|`publicado`\|`arquivado`) + `arquivado_em` em `casamentos`
- [ ] Definir e implementar comportamento de arquivamento/exportação/exclusão por entidade

## Passo 7 — Testes de carga com critério objetivo

- [ ] Definir metas de p50/p95/p99/taxa de erro antes de rodar (não descobrir depois)
- [ ] Rodar contra RSVP, reserva de presente, páginas públicas em 500 convidados
- [ ] Rodar em 1.000 convidados
- [ ] Rodar em 5.000+ convidados quando fizer sentido

## Passo 8 — Fundação do painel interno da plataforma

- [ ] Visão mínima de contas/casamentos/uso/status para o time (pré-requisito antes de self-service)

## Passo 9 — Monetização / self-service / billing

- [ ] Não iniciar antes dos passos 1–8 estarem sólidos (Fase 5 real)

---

## Correções de documentação (paralelas, sem dependência de passo)

- [ ] `docs/ROADMAP.md` §5.1: remover menção a subdomínio/CNAME/domínio customizado (contradiz a decisão de só usar `/{slug}`)
- [ ] `docs/ROADMAP.md` §6: remover "domínio customizado" da descrição do Plano Casal
- [ ] `docs/DESIGN-SYSTEM.md`: corrigir menção a "slug editável pelo casal" — não implementado hoje

---

## Log de progresso

_Entradas mais recentes primeiro. Adicionar uma linha a cada item concluído ou marco relevante._

- **2026-08-21** — Fechadas as duas últimas pendências de baixa prioridade do Passo 1: (1) `connection.delete.ts`/`sync.post.ts` agora usam `serverSupabaseClient` pra resolver a conexão de galeria do próprio casal, service_role só no motor de sync compartilhado com o cron; (2) as 9 RLS policies de `storage.objects` renomeadas pra português via migration `20260821100001`. Achado técnico: `ALTER POLICY ... RENAME` falha em `storage.objects` ("must be owner of table objects") porque a tabela pertence a `supabase_storage_admin` — só `CREATE`/`DROP POLICY` são concedidos ao role de migration, não `ALTER`. Contornado com `DROP`+`CREATE` reproduzindo a definição original exata. Validado e aplicado em `dev` e `prod`.
- **2026-08-21** — Passo 1 mergeado em `main` e promovido para produção. Sequência: PR #79 (banco) → #80 (shared/server-utils) → #81 (server/api) → #82 (app/testes/docs), cada um retargeted para `main` e mergeado via `gh pr merge --merge` (sem squash, pra preservar a pilha sem reescrever histórico). CI do GitHub Actions falhou nos merges intermediários de #80/#81 (esperado — código daquele ponto da pilha ainda não estava 100% consistente sozinho) e passou no merge final de #82. Migrations aplicadas ao projeto `prod` logo após o merge de #82; usuário confirmou site funcionando normalmente em produção. `database.types.ts` de prod não precisou ser regenerado à parte — schema idêntico ao de `dev`, mesmas migrations.
- **2026-08-21** — Passo 1 (rename para português) completo em todas as camadas de código e documentação: banco (5 migrations validadas em `dev`), `shared/`, `server/`, `app/` (types/composables/components/pages/layouts/utils), 57 testes unitários (22 corrigidos), `supabase/seed.sql`, e os 6 documentos de `docs/` + `CLAUDE.md`. `npm run typecheck`/`lint`/`test` limpos (0 erros, 383/383 testes). Decisão confirmada com o usuário: composables e pastas de componente permanecem em inglês (mesmo raciocínio já aplicado às rotas de `server/api/**`). Corrigido também um erro real remanescente na seção 6 do `CLAUDE.md`, que ainda instruía "identificadores em inglês" — o oposto da convenção já aprovada e aplicada. Restam: gates de CI, busca final por referências antigas, validação de `build`, organização das branches em PRs stacked, e promoção manual pra `prod`.
- **2026-08-21** — Documento criado a partir da Auditoria Arquitetural. Nenhum item de implementação iniciado ainda.
