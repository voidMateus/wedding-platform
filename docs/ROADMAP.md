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
- [x] Importação de convidados via CSV — wizard de três passos, catálogo central de campos e gerador de modelo; ver [`PRODUCT.md`](PRODUCT.md) seções 3.5 e 3.6. Acompanhantes ficaram deliberadamente fora.
- [ ] Lembretes automáticos de RSVP por e-mail.
- [ ] Exportação de dados em CSV/PDF — **convidados em CSV entregue** (segue os filtros da tela, colunas do catálogo central; ver [`PRODUCT.md`](PRODUCT.md) seção 3.5). Falta presentes, e PDF em qualquer um dos dois.
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

### Fases fora da sequência numerada (concluídas, salvo onde indicado)

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
- **Fase Classificação Etária**: faixa etária do convidado deixou de ser propriedade da pessoa — passou a ser derivada da idade na data do evento contra faixas configuráveis por casamento (`casamentos.config_faixas_etarias`), com faixa manual opcional para quem não tem data de nascimento. Estado atual em [`PRODUCT.md`](PRODUCT.md) seção 3.4.
- **Fase Filtros por Coluna**: recorte de lista deixou de ser fileira de chips e virou filtro/ordenação da própria coluna, com o estado na URL, cabeçalho fixo, grade rolável e múltipla escolha onde faz sentido (dois status, duas faixas). Cobre as quatro telas com tabela — Convidados, Convites, Presentes e Plataforma (esta migrada para `AdminTable`, o que aposentou a `UiTable`). Grupos não entra: é lista com barra de andamento, não tabela. Duas views nasceram aqui (`convidados_com_status`, `convites_com_resumo`), pelo mesmo motivo: estado consolidado que precisa existir antes de paginar.
- **Reorganização de documentação (2026-08)**: CLAUDE.md reduzido a índice operacional; conteúdo de produto/banco/design system/roadmap movido para `docs/PRODUCT.md`, `docs/DATABASE.md`, `docs/DESIGN-SYSTEM.md` e este arquivo. `docs/ARCHITECTURE.md` e `docs/CHANGELOG.md` mantidos como já estavam (já tinham o escopo certo).

## 3. Modo Lista de convidados — o que falta

O grosso saiu no PR #99; a entrada rápida e o colar da planilha saíram na
sequência. O que resta:

- [ ] **Tela do rascunho "Em consideração".** `GuestListDraftPanel.vue` está no
      repositório com zero usuários. A coluna, o CHECK, o filtro na API e o
      contador estão prontos — mas não há como marcar alguém como em
      consideração, ver quem está, nem promover um rascunho para a lista. O
      número aparece e não leva a lugar nenhum.

Inertes por decisão, com o motivo no `title` de cada um:

- [ ] **Formulários e Integrações** — dois itens de menu sem nada por trás.

E uma lacuna de acabamento: **edição inline só existe na coluna Categoria**.
Nome, grupo, acompanhantes e observação ainda exigem abrir a modal, o que é o
buraco mais visível numa tela que se propõe "planilha inteligente".

Resolvido na **Fase Acompanhantes** (2026-09-10; decisões de produto em
[`PRODUCT.md`](PRODUCT.md) seção 3.7): "Agrupar como acompanhantes" saiu do
estado inerte e virou `agrupar_acompanhantes()`, com aviso antes quando a
operação faz mais do que a seleção diz. A **tela de Núcleos foi descartada, não
adiada** — o núcleo não tem nome e o rótulo dele muda quando alguém entra ou
sai, então uma tela listando essas linhas não serviria de referência para
ninguém; ele aparece onde significa algo (linha, cadastro, convite, filtro). No
caminho: a ordem do núcleo deixou de virar sozinha ao salvar o cadastro de outro
membro, núcleo de uma pessoa passou a ser dissolvido, `ordem_nucleo` parou de
ordenar convite (`server/utils/membros-do-convite.ts`) e
`PATCH /api/guests/party/reorder` foi removido — nunca teve chamador, porque a
ordem sempre foi gravada pelo próprio cadastro.

Fica de fora, à espera de decisão: **agrupar visualmente os membros por núcleo
na tela do convidado (RSVP)**. Quem abre um convite de 6 pessoas vê 6 nomes
soltos; agrupar ajudaria e não feriria o invariante (a resposta continua por
pessoa), mas é mexer no fluxo do convidado, não só no admin. E **desagrupar em
massa** não existe: desfazer é remover o acompanhante pelo cadastro, que com
dois membros dissolve o núcleo.

## 4. Dívidas conhecidas (fora de fase — pequenas e independentes)

- [ ] **`prefers-reduced-motion` não é respeitado em lugar nenhum da plataforma** (levantado em 2026-09-09). Quem liga "Reduzir movimento" no sistema normalmente tem distúrbio vestibular — enjoo ou tontura de verdade com movimento que acontece sozinho. O inventário real é pequeno: o `animate-bounce` da seta "role para descobrir" no Hero do site público (loop infinito, na primeira tela que todo convidado vê) e o `animate-pulse` do `UiSkeleton` são os dois casos que rodam **sem ninguém pedir**; o resto (`.transition-brand`, o `scale` do `UiModal`, o `translateX` da linha de tabela) responde a clique ou hover, o que é aceitável. O conserto é um bloco `@media (prefers-reduced-motion: reduce)` no `main.css` zerando `animation-duration`/`iteration-count` e o `--transition-duration` — a vantagem de o movimento sair de um token só. Duas ressalvas para não dar falsa sensação de resolvido: o `duration-200` do `UiModal` está escrito na classe e não no token (precisa migrar ou ganhar regra própria), e `scrollIntoView({ behavior: 'smooth' })` em JS **ignora** o CSS — só respeita se o código consultar `matchMedia` antes, o que são 2 lugares hoje.
- [ ] **Remover `convites.status_convite`** (obsoleta desde 2026-09-10). O mesmo fato é `enviado_em`, e nada no código a lê ou escreve mais. Não foi removida junto porque as migrations são aplicadas em prod no merge, em paralelo com o deploy da Vercel: existe uma janela em que o código antigo roda contra o schema novo, e nela um `update` na coluna removida falharia. Entra numa migration própria, quando nenhuma versão em voo a escrever.
- [ ] **Tempo no estágio do convite** ("Aberto há 8 dias") — é o que torna o status acionável de verdade, e foi deixado para depois de propósito: exige um timestamp por estágio (`enviado_em` existe; o primeiro acesso está em `historico_convite.ocorrido_em`; "parcial desde" é o `respondido_em` mais recente) e é a parte que mais engorda a view. Junto viria o rótulo de providência na própria listagem, hoje só no detalhe.
- [ ] **A trava de rolagem do painel está no `<body>`, onde não funciona** (achada em 2026-09-10, ao consertar a rolagem infinita da lista de convidados). `app/layouts/admin.vue` põe `overflow-hidden` no body para o documento não rolar por baixo do app shell, mas `main.css` põe `overflow-x: hidden` no `html` — o que faz o `overflow-y` do html computar `auto` e torna o **html** o contêiner de rolagem do viewport. Daí o overflow do body deixa de propagar para o viewport: ele recorta só o conteúdo do próprio body, e absoluto/fixo ancorado no bloco contêiner inicial vaza para a área de rolagem do html. Foi assim que 196 rótulos `sr-only` esticaram o documento para 5646px. A raiz daquele caso está corrigida (`relative` no `AdminRowAction`) e coberta por `tests/e2e/rolagem-do-painel.spec.ts`, mas a trava continua no lugar errado — o certo é `html`, como a própria nota de `main.css` já diz para o eixo horizontal. Mover afeta todas as páginas do painel, e precisa verificar que o site público volta a rolar ao sair do admin.
- [ ] **Corrida entre o filtro debounced e o clique na linha** (`useTableFilters`, encontrada em 2026-09-09). Digitar no filtro e clicar numa linha dentro da janela do debounce faz a gravação atrasada reescrever a query a partir de um retrato anterior e apagar o `?editar=<id>` que o clique acabou de pôr — o modal não abre. Vale para pessoa real, não só para teste; ver o achado detalhado em `CHANGELOG.md`.

## 5. Fase 4 — Preparação para Escala
- [ ] Revisão de performance com dados de casamentos grandes (500+ convidados).
- [ ] Observabilidade completa (Sentry + métricas de uso).
- [ ] Testes de carga nos endpoints públicos (RSVP, reserva de presentes).
- [ ] Revisão de segurança/RLS por terceiros antes da abertura multi-tenant.

## 6. Fase 5 — Transição para SaaS Multi-Tenant
- [ ] Onboarding self-service (qualquer casal cria sua própria conta/evento).
- [ ] Planos e cobrança (ver seção 6).
- [ ] Painel de administração da plataforma (visão do time interno sobre todos os tenants). Fundação mínima entregue em 2026-08-25 (`docs/PLANO-SAAS.md`, Passo 8): `/plataforma` mostra casamentos/status/convidados/donos entre tenants, só leitura. Ainda faltam métricas de uso agregadas de verdade (storage), suporte e billing — item permanece aberto até esses três chegarem.
- [ ] Papel de "planejador de casamentos" gerenciando múltiplos eventos de clientes distintos.

## 7. Premissa arquitetural (por que a transição é evolutiva, não uma reescrita)

- Toda entidade relevante já carrega `casamento_id`.
- RLS já opera filtrando por `casamento_id` acessível ao usuário autenticado, mesmo que hoje só exista um `casamento_id` "vivo" por deploy.
- Autenticação já é multiusuário (`wedding_members`), permitindo múltiplos papéis por evento desde o início.

### 7.1 O que muda na transição

| Aspecto | Hoje (single-tenant) | Futuro (SaaS multi-tenant) |
|---|---|---|
| Criação de evento | Feita manualmente/via seed, um por deploy | Self-service — qualquer usuário cria seu `wedding` no cadastro |
| Domínio | Um casamento por deploy, mesmo path `/{slug}` | Path `/{slug}` continua sendo o modelo de URL — múltiplos tenants no mesmo domínio, sem subdomínio nem domínio customizado por casamento |
| Cobrança | Inexistente | Planos por assinatura (ver seção 6) |
| Limites de uso | Não aplicável | Limites por plano (nº de convidados, storage de fotos, presentes cadastrados) |
| Painel interno | `/plataforma` — visão mínima só leitura (casamentos/status/convidados/donos, desde 2026-08-25) | Painel de operação da plataforma completo: métricas agregadas de uso (storage), suporte, billing |
| Isolamento de dados | Garantido por RLS + único tenant real | Garantido por RLS com múltiplos tenants simultâneos — auditoria de policy se torna crítica |

## 8. Modelo de monetização proposto

- **Plano Gratuito**: 1 evento, até N convidados (ex: 50), marca d'água discreta da plataforma.
- **Plano Casal**: evento único, convidados ilimitados, remoção de marca d'água, temas premium do Design System.
- **Plano Planejador**: múltiplos eventos simultâneos sob uma conta (para profissionais de organização de casamentos), com painel consolidado entre eventos de clientes.
- Cobrança recorrente (mensal até o casamento, ou taxa única "vitalícia" por evento) — modelo exato a validar com pesquisa de mercado antes da Fase 5.

## 9. Riscos técnicos a mitigar antes da abertura multi-tenant

1. **Vazamento de dados entre tenants**: exige suíte de testes automatizados específica validando que toda query respeita RLS, incluindo endpoints novos adicionados ao longo do tempo — e, separadamente, testes do caminho do convidado (não coberto por RLS, ver [`CLAUDE.md`](../CLAUDE.md), Modelo de Confiança).
2. **Ruído de performance de um tenant afetando outro**: a denormalização de `casamento_id` em tabelas filhas (ver [`DATABASE.md`](DATABASE.md)) já prepara o particionamento declarativo por `casamento_id` em `convidados`, `respostas_rsvp` e `reservas_presentes`. Gatilho de decisão sugerido: avaliar particionamento quando qualquer uma dessas tabelas ultrapassar ~5 milhões de linhas agregadas, ou quando queries de dashboard de um único tenant começarem a competir visivelmente por I/O com outros tenants.
3. **Suporte ao cliente em escala**: painel interno de operação precisa existir antes de abrir cadastro self-service, para permitir suporte, reembolsos e resolução de disputas sem acesso direto ao banco de produção.
4. **Escalabilidade de e-mail transacional**: volume de convites/lembretes cresce proporcionalmente ao número de tenants — revisar limites e reputação de envio do provedor (Resend) antes da Fase 5.

## 10. Tabelas de preparação para SaaS (criadas desde a v1, mesmo sem cobrança ativa)

Para evitar retrofitar limites de plano em cima de dados de produção já existentes, as seguintes tabelas são criadas (ainda que com uso mínimo) já na Fase 0/1:

| Tabela | Propósito |
|---|---|
| `planos` | Catálogo de planos (nome, limites — nº de convidados, storage, presentes, `max_casamentos`) |
| `assinaturas` | Vínculo entre casamento/conta e plano (mesmo que hoje todo casamento esteja em um único plano padrão "interno"); `casamento_id`/`conta_id` são mutuamente exclusivos (XOR) |
| `contadores_uso` | Contadores materializados por `casamento_id` (nº de convidados ativos, storage usado) para checagem rápida de limite sem `count(*)` sob demanda |
| `funcionalidades_habilitadas` | Feature flags por `casamento_id`/`conta_id`/plano (ex.: domínio customizado habilitado) — evita espalhar `if (plan === 'pro')` pelo código quando o billing chegar |

Essas tabelas não têm UI de gestão na v1 — existem apenas para que o modelo de dados não precise de uma migration estrutural disruptiva no momento da transição da Fase 5.

## 11. Não-decisões (a validar antes de implementar)

- Ainda não decidido se o modelo multi-tenant será por **schema separado por tenant** ou **RLS em schema compartilhado** — a abordagem atual (RLS + schema compartilhado) é a assumida como padrão pela comunidade Supabase e a mais provável de seguir, mas deve ser revisitada com dados reais de volume antes da Fase 5.
- Estratégia de billing (Stripe Billing vs. solução própria) não definida — item de pesquisa antes da Fase 5.
- **Classificações etárias por finalidade** (alimentação: infantil 0–7 / adulto 8+; organização de mesas; recreação: bebê 0–2 / criança 3–7) não implementadas — hoje existe uma classificação principal por evento. A estrutura já não impede: `casamentos.config_faixas_etarias` grava as faixas sob a chave `principal`, então outras finalidades entram como chaves irmãs, e `classificarFaixaEtaria` já é função pura do array de faixas (aceita conjunto parcial ou não contínuo). Falta decidir o que o produto realmente precisa antes de multiplicar configuração na tela do casal — ver [`PRODUCT.md`](PRODUCT.md) seção 3.4.
- **Histórico/versão da configuração de faixas** não existe: alterar os limites passa a valer imediatamente para toda a lista. Só vale implementar se aparecer um caso real de precisar reconstruir "como a lista estava classificada em tal data".

---

*Este documento é revisado a cada fase de trabalho concluída — mover a entrada correspondente de "planejado" para "concluído" (com resumo de 1-2 frases) e registrar o histórico completo em `docs/CHANGELOG.md`.*
