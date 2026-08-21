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

- **Fase atual**: nenhum passo iniciado ainda.
- **Última atualização**: 2026-08-21.

## Decisões já validadas com o usuário

- [x] Ambiente confirmado pré-lançamento, sem dado real de casamento em produção (2026-08-21).
- [x] Remodelagem completa da nomenclatura do banco para português aprovada, mesmo contra a recomendação técnica original da auditoria (2026-08-21).

---

## Passo 1 — Rename completo para português

Corte coordenado único (banco + API + tipos + schemas + testes + docs), validado inteiramente em `dev` antes de promover. Absorve as correções P0 da auditoria no mesmo movimento.

- [ ] Migration: renomear as 27 tabelas (mapeamento completo na seção 5 do artifact)
- [ ] Migration: renomear colunas centrais (`wedding_id`→`casamento_id` em toda tabela filha, etc.)
- [ ] Migration: corrigir `group_id`→`convite_id` em `gift_reservations`/`gift_contributions` (renomeadas para `reservas_presentes`/`contribuicoes_presentes`) — achado da auditoria, absorvido aqui
- [ ] Migration: recriar trigger de consistência `casamento_id`/`convite_id` ausente em `companions` (→ `acompanhantes_avulsos`)
- [ ] Migration: recriar trigger de consistência ausente em `photos.source_connection_id` (→ `fotos.conexao_id`)
- [ ] Migration: traduzir valores de `CHECK`/status (`role`→`papel` com `'owner'/'collaborator'`→`'dono'/'colaborador'`, `status` de RSVP, etc.)
- [ ] Migration: renomear RLS policies (mantendo `select`/`insert`/`update`/`delete` como estão — são operação SQL, não vocabulário de negócio)
- [ ] Migration: renomear funções Postgres (`is_wedding_member`→`is_membro_casamento`, `is_wedding_owner`→`is_dono_casamento`, `reserve_gift`, `confirm_gift_payment`, `upsert_guest_rsvp`, `finalize_invite_rsvp`, `sync_guest_party`, `guest_is_child`, `guest_name_matches`, `search_guests_by_name`)
- [ ] Migration: adicionar `is_slug_reservado(text)` + `CHECK` em `casamentos.slug`
- [ ] Trocar `service_role` por `serverSupabaseClient` em `wedding/gallery/connection.delete.ts` e `wedding/gallery/sync.post.ts`
- [ ] Regenerar `database.types.ts` a partir do schema novo
- [ ] Renomear pastas/arquivos de rota em `server/api/**` (ex.: `invites/`→`convites/`, `gifts/`→`presentes/`)
- [ ] Renomear composables (`useInvites`→`useConvites` etc.)
- [ ] Renomear pastas de componente (`components/gifts/`→`components/presentes/`; `components/rsvp/` mantém — RSVP é termo universal)
- [ ] Atualizar `shared/schemas/**` (Zod) com os novos nomes de campo/tabela
- [ ] Atualizar `app/types/**` derivados
- [ ] Atualizar os 57 testes unitários existentes para os novos nomes
- [ ] Atualizar `docs/DATABASE.md`, `docs/ARCHITECTURE.md`, `docs/PRODUCT.md` com a nomenclatura nova
- [ ] Gate de CI: falhar build se view nova/alterada não tiver `security_invoker = true`
- [ ] Gate de CI: falhar build se `database.types.ts` estiver desatualizado em relação às migrations
- [ ] Validar `lint`/`typecheck`/testes unitários/`build` passando com o schema novo em `dev`
- [ ] Promover para `prod` manualmente, só depois de validado

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

- **2026-08-21** — Documento criado a partir da Auditoria Arquitetural. Nenhum item de implementação iniciado ainda.
