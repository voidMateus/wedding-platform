# Roadmap e Estratégia SaaS Futura — MeuSiteCasamento

> Planejamento de produto: o que já foi entregue (resumo curto por fase), o que falta, e a estratégia de transição para SaaS multi-tenant. Histórico completo de cada fase (decisões, achados de bugs, rodadas de iteração) está em [`docs/CHANGELOG.md`](CHANGELOG.md) — este documento cita cada fase em 1-2 frases e aponta pra lá. Em caso de conflito, [`CLAUDE.md`](../CLAUDE.md) prevalece sobre o estado atual do produto (ver [`PRODUCT.md`](PRODUCT.md)).

---

## 1. Regra de manutenção

Um fato de estado atual (o que o produto faz hoje) vai em [`PRODUCT.md`](PRODUCT.md)/[`ARCHITECTURE.md`](ARCHITECTURE.md)/[`DATABASE.md`](DATABASE.md)/[`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md), conforme o assunto. Narrativa de processo — achado de bug, reversão de escopo, rodada de iteração dentro de uma fase — vai direto em [`docs/CHANGELOG.md`](CHANGELOG.md), nunca misturada a este roadmap. Cada fase nomeada abaixo tem só um resumo curto + pointer; o histórico completo mora só no CHANGELOG.

## 2. Fases concluídas

### Fase 0 — Fundação
- [x] Especificação técnica e de produto.
- [x] Setup inicial do projeto Nuxt + Supabase.
- [x] CI (GitHub Actions) — lint/typecheck/test/build em todo PR contra `main`.
- [x] Upstash Redis (rate limiting) — sliding window, 20 requisições/60s por IP em `/api/rsvp/**`.
- [x] Schema inicial do banco de dados + RLS básica.
- [x] Design System — tokens e componentes atômicos essenciais.

### Fase 1 — MVP Single-Tenant
- [x] Autenticação do casal (login/cadastro por e-mail/senha e magic link; cadastro manual/via seed).
- [x] CRUD de convidados e grupos.
- [x] Configuração básica do evento (data, local, tema visual, cronograma).
- [x] Site público com informações do evento.
- [x] Fluxo de RSVP via código único — **superado pela "Fase 7"**: RSVP passou a ser sempre por convidado, com um segundo caminho de entrada (busca por nome) — ver [`PRODUCT.md`](PRODUCT.md) seção 4/[`ARCHITECTURE.md`](ARCHITECTURE.md) seção 6 para o comportamento atual.
- [x] Lista de presentes com reserva — **superada pela "Fase Presentes 2.0"**: a vitrine deixou de depender de token de convite e o cancelamento self-service foi removido — ver [`PRODUCT.md`](PRODUCT.md) seção 6 para o comportamento atual.
- [x] Dashboard administrativo com contadores essenciais — originalmente lido de uma view removida por achado de segurança (ver `docs/CHANGELOG.md`); hoje computado em memória.

### Fase 2 — Consolidação
- [ ] Importação de convidados via CSV.
- [ ] Lembretes automáticos de RSVP por e-mail.
- [ ] Exportação de dados (convidados, presentes) em CSV/PDF.
- [ ] Convite com geração de link/QR code.
- [x] Colaboradores — convite/remoção com papel binário `dono`/`colaborador`, checagem de `owner` no servidor (ver [`PRODUCT.md`](PRODUCT.md) seção 7.3), tela em Configurações → Colaboradores. Implementado no Passo 3 do `docs/PLANO-SAAS.md`.
- [ ] Permissões granulares por funcionalidade (ex.: colaborador que só edita convidados, não presentes/configurações) — decisão consciente de manter o modelo binário por ora (2026-08-24); schema novo fica pra quando houver demanda real.
- [ ] Auditoria completa de ações administrativas.
- [ ] Testes E2E cobrindo os fluxos críticos (RSVP, reserva de presente, login).

### Fase 3 — Refinamento de Produto
- [x] Galeria de fotos do casal — inicialmente upload direto (Supabase Storage), **superada pela "Fase Galeria via Google Drive"**: passou a espelhar uma pasta do Google Drive do casal, nunca copiar.
- [x] Temas visuais pré-configurados (`shared/theme-presets.ts`) selecionáveis pelo casal.
- [x] Cronograma detalhado do evento — cada `event_segment` vira sua própria seção em destaque na home pública.
- [x] Mapa/localização integrada — embed do Google Maps por segmento do cronograma.
- [ ] Confirmação por WhatsApp (link direto pré-preenchido) como canal alternativo ao e-mail.
- [ ] Internacionalização (i18n) — suporte a inglês/espanhol.

### Fases fora da sequência numerada (todas concluídas)

Cada uma tem histórico completo em `docs/CHANGELOG.md` — resumo de uma linha aqui:

- **Fase 7 — Convites, Grupos e Acompanhantes**: reestruturação de schema mais profunda já feita no produto — `guest_groups` virou `invites`; `groups` e `guest_parties` nasceram como conceitos independentes. Modelo atual em [`DATABASE.md`](DATABASE.md)/[`PRODUCT.md`](PRODUCT.md).
- **Fase Editorial**: redesign completo de identidade visual e conteúdo do site público (paleta Borgonha/Dourado, 7 novas seções na home, galeria ativada, navegação por âncora).
- **Fase Vermelho Clássico**: redesign visual "front only" da home pública para casar com uma referência real de mercado.
- **Fase Jornada do Convidado**: reordenação da home pública simulando "entrar na casa dos noivos".
- **Fase Linguagem Visual**: padronização visual do site público (cabeçalho de seção, alternância de fundo, tier de cartão "premium", Hero reconstruído em 13 rodadas).
- **Fase Admin Premium**: painel administrativo ganhou o mesmo polimento visual do site público.
- **Fase Presentes 2.0**: refatoração completa do módulo de presentes — vitrine em três seções, pagamento Pix real via InfinitePay, cotas fixas, identificação por nome/telefone, cancelamento self-service removido. Estado atual em [`PRODUCT.md`](PRODUCT.md) seção 6.
- **Fase Mensagens Personalizáveis**: `casamentos.config_conteudo` permite ao casal reescrever as mensagens narrativas do site público sem tocar em código.
- **Fase Galeria via Google Drive**: upload manual substituído por sincronização com uma pasta do Google Drive do casal.
- **Reorganização de documentação (2026-08)**: CLAUDE.md reduzido a índice operacional; conteúdo de produto/banco/design system/roadmap movido para `docs/PRODUCT.md`, `docs/DATABASE.md`, `docs/DESIGN-SYSTEM.md` e este arquivo. `docs/ARCHITECTURE.md` e `docs/CHANGELOG.md` mantidos como já estavam (já tinham o escopo certo).

## 3. Fase 4 — Preparação para Escala
- [ ] Revisão de performance com dados de casamentos grandes (500+ convidados).
- [ ] Observabilidade completa (Sentry + métricas de uso).
- [ ] Testes de carga nos endpoints públicos (RSVP, reserva de presentes).
- [ ] Revisão de segurança/RLS por terceiros antes da abertura multi-tenant.

## 4. Fase 5 — Transição para SaaS Multi-Tenant
- [ ] Onboarding self-service (qualquer casal cria sua própria conta/evento).
- [ ] Planos e cobrança (ver seção 6).
- [ ] Painel de administração da plataforma (visão do time interno sobre todos os tenants). Fundação mínima entregue em 2026-08-25 (`docs/PLANO-SAAS.md`, Passo 8): `/plataforma` mostra casamentos/status/convidados/donos entre tenants, só leitura. Ainda faltam métricas de uso agregadas de verdade (storage), suporte e billing — item permanece aberto até esses três chegarem.
- [ ] Papel de "planejador de casamentos" gerenciando múltiplos eventos de clientes distintos.

## 5. Premissa arquitetural (por que a transição é evolutiva, não uma reescrita)

- Toda entidade relevante já carrega `casamento_id`.
- RLS já opera filtrando por `casamento_id` acessível ao usuário autenticado, mesmo que hoje só exista um `casamento_id` "vivo" por deploy.
- Autenticação já é multiusuário (`wedding_members`), permitindo múltiplos papéis por evento desde o início.

### 5.1 O que muda na transição

| Aspecto | Hoje (single-tenant) | Futuro (SaaS multi-tenant) |
|---|---|---|
| Criação de evento | Feita manualmente/via seed, um por deploy | Self-service — qualquer usuário cria seu `wedding` no cadastro |
| Domínio | Um casamento por deploy, mesmo path `/{slug}` | Path `/{slug}` continua sendo o modelo de URL — múltiplos tenants no mesmo domínio, sem subdomínio nem domínio customizado por casamento |
| Cobrança | Inexistente | Planos por assinatura (ver seção 6) |
| Limites de uso | Não aplicável | Limites por plano (nº de convidados, storage de fotos, presentes cadastrados) |
| Painel interno | `/plataforma` — visão mínima só leitura (casamentos/status/convidados/donos, desde 2026-08-25) | Painel de operação da plataforma completo: métricas agregadas de uso (storage), suporte, billing |
| Isolamento de dados | Garantido por RLS + único tenant real | Garantido por RLS com múltiplos tenants simultâneos — auditoria de policy se torna crítica |

## 6. Modelo de monetização proposto

- **Plano Gratuito**: 1 evento, até N convidados (ex: 50), marca d'água discreta da plataforma.
- **Plano Casal**: evento único, convidados ilimitados, remoção de marca d'água, temas premium do Design System.
- **Plano Planejador**: múltiplos eventos simultâneos sob uma conta (para profissionais de organização de casamentos), com painel consolidado entre eventos de clientes.
- Cobrança recorrente (mensal até o casamento, ou taxa única "vitalícia" por evento) — modelo exato a validar com pesquisa de mercado antes da Fase 5.

## 7. Riscos técnicos a mitigar antes da abertura multi-tenant

1. **Vazamento de dados entre tenants**: exige suíte de testes automatizados específica validando que toda query respeita RLS, incluindo endpoints novos adicionados ao longo do tempo — e, separadamente, testes do caminho do convidado (não coberto por RLS, ver [`CLAUDE.md`](../CLAUDE.md), Modelo de Confiança).
2. **Ruído de performance de um tenant afetando outro**: a denormalização de `casamento_id` em tabelas filhas (ver [`DATABASE.md`](DATABASE.md)) já prepara o particionamento declarativo por `casamento_id` em `convidados`, `respostas_rsvp` e `reservas_presentes`. Gatilho de decisão sugerido: avaliar particionamento quando qualquer uma dessas tabelas ultrapassar ~5 milhões de linhas agregadas, ou quando queries de dashboard de um único tenant começarem a competir visivelmente por I/O com outros tenants.
3. **Suporte ao cliente em escala**: painel interno de operação precisa existir antes de abrir cadastro self-service, para permitir suporte, reembolsos e resolução de disputas sem acesso direto ao banco de produção.
4. **Escalabilidade de e-mail transacional**: volume de convites/lembretes cresce proporcionalmente ao número de tenants — revisar limites e reputação de envio do provedor (Resend) antes da Fase 5.

## 8. Tabelas de preparação para SaaS (criadas desde a v1, mesmo sem cobrança ativa)

Para evitar retrofitar limites de plano em cima de dados de produção já existentes, as seguintes tabelas são criadas (ainda que com uso mínimo) já na Fase 0/1:

| Tabela | Propósito |
|---|---|
| `planos` | Catálogo de planos (nome, limites — nº de convidados, storage, presentes, `max_casamentos`) |
| `assinaturas` | Vínculo entre casamento/conta e plano (mesmo que hoje todo casamento esteja em um único plano padrão "interno"); `casamento_id`/`conta_id` são mutuamente exclusivos (XOR) |
| `contadores_uso` | Contadores materializados por `casamento_id` (nº de convidados ativos, storage usado) para checagem rápida de limite sem `count(*)` sob demanda |
| `funcionalidades_habilitadas` | Feature flags por `casamento_id`/`conta_id`/plano (ex.: domínio customizado habilitado) — evita espalhar `if (plan === 'pro')` pelo código quando o billing chegar |

Essas tabelas não têm UI de gestão na v1 — existem apenas para que o modelo de dados não precise de uma migration estrutural disruptiva no momento da transição da Fase 5.

## 9. Não-decisões (a validar antes de implementar)

- Ainda não decidido se o modelo multi-tenant será por **schema separado por tenant** ou **RLS em schema compartilhado** — a abordagem atual (RLS + schema compartilhado) é a assumida como padrão pela comunidade Supabase e a mais provável de seguir, mas deve ser revisitada com dados reais de volume antes da Fase 5.
- Estratégia de billing (Stripe Billing vs. solução própria) não definida — item de pesquisa antes da Fase 5.

---

*Este documento é revisado a cada fase de trabalho concluída — mover a entrada correspondente de "planejado" para "concluído" (com resumo de 1-2 frases) e registrar o histórico completo em `docs/CHANGELOG.md`.*
