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
- [x] Lembretes automáticos de RSVP por e-mail — **entregues na entrega seguinte à Fase 2 do Hub** (2026-09-13, `fase2-convidados.md` seção 13), junto do envio real por e-mail. Um cron diário, configurado por casamento em Configurações › Avisos e **desligado por padrão**: quem nunca recebeu o convite, quem já respondeu por inteiro e quem já recebeu lembrete hoje ficam de fora, e a proteção contra repetição é derivada do log de envios, nunca de uma coluna.
- [ ] Exportação de dados em CSV/PDF — **convidados em CSV entregue** (segue os filtros da tela, colunas do catálogo central; ver [`PRODUCT.md`](PRODUCT.md) seção 3.5). Falta presentes, e PDF em qualquer um dos dois.
- [x] Convite com geração de link/QR code — entregue em
      `InviteAccessLinkSection.vue`: gerar, reexibir sem invalidar o já
      compartilhado, revogar e QR renderizado no navegador. A linha só não
      tinha sido marcada; constatado no refinamento da Fase 2 do Hub
      ([`fase2-convidados.md`](fase2-convidados.md)).
- [x] Colaboradores — convite/remoção com papel binário `dono`/`colaborador`, checagem de `owner` no servidor (ver [`PRODUCT.md`](PRODUCT.md) seção 7.3), tela em Configurações → Colaboradores. Implementado no Passo 3 do `docs/PLANO-SAAS.md`.
- [ ] Permissões granulares por funcionalidade (ex.: colaborador que só edita convidados, não presentes/configurações) — decisão consciente de manter o modelo binário por ora (2026-08-24); schema novo fica pra quando houver demanda real.
- [ ] Auditoria completa de ações administrativas.
- [x] **Testes E2E cobrindo os fluxos críticos** — RSVP (`guests-invites-rsvp.spec.ts`) e login (`login.spec.ts`) já existiam; **reserva de presente** era o buraco, e saiu em 2026-09-13 (`reserva-de-presente.spec.ts`). Cobre o caminho gratuito, o único percorrível inteiro sem sair da aplicação, e assere no BANCO: o estoque cai no servidor, dentro da função com `FOR UPDATE`. O caminho pago termina num checkout hospedado da InfinitePay — um teste de navegador que fingisse o retorno estaria testando a própria encenação.

### Fase 3 — Refinamento de Produto
- [x] Galeria de fotos do casal — inicialmente upload direto (Supabase Storage), **superada pela "Fase Galeria via Google Drive"**: passou a espelhar uma pasta do Google Drive do casal, nunca copiar.
- [x] Temas visuais pré-configurados (`shared/theme-presets.ts`) selecionáveis pelo casal.
- [x] Cronograma detalhado do evento — cada `event_segment` vira sua própria seção em destaque na home pública.
- [x] Mapa/localização integrada — embed do Google Maps por segmento do cronograma.
- [x] Confirmação por WhatsApp (link direto pré-preenchido) — **entregue na Fase 2 do Hub** (F2.3), e lá ele deixou de ser "canal alternativo ao e-mail" para ser o canal principal: é o do casamento brasileiro, e o telefone já está no cadastro. A mensagem sai pronta com o link do convite, e abrir o WhatsApp registra o envio.
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
- **Hub, Fase 1 — Financeiro (2026-09-10, redesenhado em 2026-09-11)**: primeiro módulo do plano de Hub (`docs/plano-produto-hub-casamento.md`). Três telas para três momentos do dinheiro — Orçamento (planejar, com custo estimado por gasto e teto por categoria), Fornecedores (cotar e contratar) e Pagamentos (o que sai e quando) —, mais Documentos no primeiro bucket **privado** do projeto. Nenhum estado de pagamento é gravado: tudo deriva de `pago_em`, e é o custo final que transforma planejamento em compromisso. Refinamento e decisões em [`fase1-financeiro.md`](fase1-financeiro.md).
- **Hub, Fase 2 — Convidados (2026-09-13)**: fecha o que ficou pela metade no módulo e acrescenta Mesas e Comunicações. Refinamento e decisões em [`fase2-convidados.md`](fase2-convidados.md). **F2.1 a F2.6 entregues**: a linha do Modo Lista virou planilha de verdade e o RSVP passou a agrupar quem vai junto (F2.1); o envio do convite deixou de ser um checkbox e virou registro com canal e tipo, com `enviado_em` derivado dele, mais o WhatsApp assistido e o editor de mensagens (F2.2–F2.3); e Mesas nasceu com lista, planta arrastável em centímetros, elementos do salão e exportação do mapa (F2.4–F2.6). A **migration B** da costura — remover `convites.enviado_em` e `convites.status_convite` — saiu no merge seguinte (2026-09-13), como planejado: com o código novo já em produção, a janela de deploy que a adiava tinha fechado, e o `coalesce` sobre a coluna física saiu junto com ela. **Fase 2 concluída.**
- **Hub, Fase 3 — Planejamento (2026-09-13)**: o módulo que responde "o que eu faço agora, e estou atrasado?" — a checklist do casal, agrupada por janela de prazo derivada de `prazo` contra hoje, com criação e edição na própria linha. A regra que organiza a fase: **o sistema sugere, o casal conclui** — os fatos dos outros módulos (gasto contratado, convite enviado, mesa montada) decidem qual das ~45 sugestões do catálogo oferecer, e nunca marcam tarefa como feita. Sugestão não é linha no banco, não se esgota, e a de fase já passada nasce sem prazo. Entrou como 6ª aba do painel (Presentes desceu para o "Mais" no celular) e empurra um número para a home. A fila de jobs `tarefas` virou `fila_processamento` para liberar o nome. Refinamento e decisões em [`fase3-planejamento.md`](fase3-planejamento.md).
- **Hub, Fase 4 — Onboarding guiado (2026-09-14)**: a porta de entrada. Um roteiro de **Primeiros passos** no topo do Início — quando, onde, a cara do site e publicar (agora ou depois) —, derivado dos mesmos fatos que o Planejamento observa: **nenhuma tabela, nenhuma coluna**, nem para o progresso, nem para a etapa em que o casal parou, nem para "pulei esta". Um passo pode se marcar sozinho porque aqui o passo e o fato são o mesmo objeto, o oposto da regra da Fase 3. Junto vieram duas mudanças de comportamento do produto para todo casamento: `status_ciclo_vida` ganhou o primeiro escritor e **rascunho passou a barrar o site público de verdade** (policy de RLS para as rotas de anon key, checagem em TypeScript para presentes e RSVP — e o casal continua vendo o próprio rascunho pela policy de membro), e as **seções da home viraram opt-in**, então o site de um casal novo é só a capa. O catálogo de temas foi refeito no mesmo trabalho: eram seis das oito primárias num arco de 40°, são nove famílias de cor com a escolha mostrando a capa do site em vez de dois pontinhos. Refinamento em [`fase4-onboarding.md`](fase4-onboarding.md); o que só o uso real encontrou está no [`CHANGELOG.md`](CHANGELOG.md).
- **Reorganização de documentação (2026-08)**: CLAUDE.md reduzido a índice operacional; conteúdo de produto/banco/design system/roadmap movido para `docs/PRODUCT.md`, `docs/DATABASE.md`, `docs/DESIGN-SYSTEM.md` e este arquivo. `docs/ARCHITECTURE.md` e `docs/CHANGELOG.md` mantidos como já estavam (já tinham o escopo certo).

## 3. Modo Lista de convidados — o que falta

O grosso saiu no PR #99; a entrada rápida e o colar da planilha saíram na
sequência. O que resta:

**Tela do rascunho "Em consideração" — descartada por ora** (decisão do usuário,
2026-09-10: "não vejo necessidade alguma de fazer, talvez no futuro"). A coluna,
o CHECK e o filtro na API continuam prontos — quem retomar não começa do zero.
Na Fase 2 do Hub (F2.1) saíram as duas pontas soltas que a decisão deixou: o
`GuestListDraftPanel.vue`, que estava no repositório com zero usuários, e o
"+ N em consideração" da faixa de números, que era sempre zero (nenhuma tela
grava `em_consideracao`) e não levava a lugar nenhum.

- [x] **Formulários e Integrações** — eram dois itens de menu sem nada por trás,
      e **saíram do menu na Fase 2 do Hub** (`fase2-convidados.md`, F2.1): item
      que promete e não entrega é pior que item ausente. "Formulários"
      (perguntas extras no RSVP) fica como direção nomeada para uma rodada
      própria. "Núcleos" saiu junto, por motivo diferente: a tela foi
      descartada, não adiada, e o item continuava prometendo-a "em breve".

E uma lacuna de acabamento que era o buraco mais visível numa tela que se propõe
"planilha inteligente": **edição inline só existia na coluna Categoria**.
**Resolvida na Fase 2 do Hub** (F2.1) para nome, grupo, categoria e observação,
com um salvamento por linha; acompanhantes fica de fora de propósito (agrupar
exige dizer *com quem*, o que não cabe numa célula).

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

Estava à espera de decisão, e as duas foram resolvidas na Fase 2 do Hub
(2026-09-13, `fase2-convidados.md`): **agrupar visualmente os membros por núcleo
na tela do convidado (RSVP)** — quem abria um convite de 6 pessoas via 6 nomes
soltos — está **entregue** (F2.1): um cartão por núcleo, sem rótulo (o "João e
Maria" é linguagem do painel), com a resposta continuando por pessoa. E
**desagrupar em massa continua fora**:
agrupar em massa existe porque a lista nasce solta, desagrupar não tem gesto
de origem equivalente, e desfazer é remover o acompanhante pelo cadastro, que
com dois membros dissolve o núcleo.

## 4. Dívidas conhecidas (fora de fase — pequenas e independentes)

- [x] **`prefers-reduced-motion` não era respeitado em lugar nenhum da plataforma** (levantado em 2026-09-09, **pago em 2026-09-13**). Quem liga "Reduzir movimento" no sistema normalmente tem distúrbio vestibular — enjoo ou tontura de verdade com movimento que acontece sozinho. O bloco `@media (prefers-reduced-motion: reduce)` em `main.css` tem dois níveis, e a diferença entre eles é o ponto: o que roda **sem ninguém pedir** (o `animate-bounce` da seta do Hero, o `animate-pulse` do `UiSkeleton`) é `animation: none`, e o que **responde a um gesto** cai para `1ms` em vez de `0s` — zerar de vez cancelaria o evento `transitionend`, e componente que espera por ele para desmontar ficaria preso na tela. As duas ressalvas da dívida foram resolvidas: o seletor genérico alcança o `duration-200` escrito à mão do `UiModal` (que não passa pelo token), e os dois `behavior: 'smooth'` em JS passaram a consultar `matchMedia` via `app/utils/motion.ts` — API de script não obedece CSS.
- [x] **Corrida entre o filtro debounced e o clique na linha** (`useTableFilters`, encontrada em 2026-09-09, reproduzida em 2026-09-10, **paga em 2026-09-13**). O clique dispara `router.push` com `?editar=<id>` e, com a navegação ainda em voo, o `router.replace` do filtro **abortava** a anterior — o modal não abria. A correção é o filtro **ceder a passagem**: `criarFilaDeQuery` (em `app/utils/table-filters.ts`) guarda o patch enquanto uma navegação está em voo e o reaplica quando ela assenta, sobre a URL que ela produziu. Os dois guardas (`router.beforeEach`/`afterEach`) dizem à fila quando ceder — e `afterEach` roda também em navegação abortada, que é o que impede a fila de ficar presa.

      O teste E2E equivalente continua descartado, e agora por um motivo melhor que "é instável": a regra virou estado puro, e `tests/unit/app/utils/fila-de-query.spec.ts` a verifica sem depender de tempo nenhum — inclusive o caso que o E2E não alcançava (a navegação que falha precisa liberar a fila).
- [x] **A trava de rolagem do painel estava no `<body>`, onde não funciona** (achada em 2026-09-10, **movida em 2026-09-13**). `main.css` põe `overflow-x: hidden` no `html`, o que faz o `overflow-y` dele computar `auto` e torna o **html** o contêiner de rolagem do viewport; daí o overflow do body deixava de propagar. Agora `app/layouts/admin.vue` trava em `htmlAttrs` e mantém só `admin-ui` no body (que precisa ficar lá: todo modal sai por `DialogPortal`, filho de `<body>`). Sair do painel devolve a rolagem sozinho — `useHead` de um layout é desfeito ao desmontar —, e `tests/e2e/rolagem-do-painel.spec.ts` continua guardando a promessa ("o documento do painel não rola"), que é o que não muda de lugar.
- [x] **Auditoria completa de ações administrativas** (**paga em 2026-09-13**). Quatro rotas escreviam sem registrar — criar e excluir etiqueta de convite, editar e excluir elemento da planta. Mas o que fecha a dívida não é ter escrito esses quatro registros, e sim `tests/unit/server/auditoria-completa.spec.ts`: a varredura percorre `server/api/**`, separa as rotas de escrita do caminho administrativo (o convidado, o site público, o webhook e o cron ficam de fora — não têm ator a quem atribuir) e falha quando uma nasce sem registro. A única dispensa existente é declarada no próprio arquivo, junto do motivo (arrastar mesa na planta geraria ruído que esconderia o resto da trilha).
- [x] **Exportação em CSV/PDF** (**paga em 2026-09-13**). Presentes ganharam CSV, e o PDF dos dois é a **folha imprimível**: "Salvar como PDF" é um destino de impressão em todo navegador atual, então uma biblioteca de geração de PDF custaria centenas de KB no caminho do casal para redesenhar, pior, uma tabela que o navegador já pagina. O bloco `@media print` de `main.css` desfaz o app shell (a trava de rolagem, o `max-height` da grade) — sem isso sairia uma página só, com a primeira dobra da tabela. Botão em Convidados, Presentes e Mesas, este último entregando a "folha imprimível" que a F2.5 previa.

      No caminho apareceu um defeito real: a coluna "Presenteado por" e o status da tela de Presentes saíam de `activity`, que é limitada aos 20 lançamentos mais recentes — um presente de cota com contribuições antigas aparecia como "Disponível", sem nenhum nome, e o filtro por status concordava com a mentira. `GET /api/gifts` passou a devolver `giversByGift` e `raisedByGift` sobre **todos** os lançamentos.

## 5. Fase 4 — Preparação para Escala
- [ ] Revisão de performance com dados de casamentos grandes (500+ convidados).
- [ ] **LCP do site público** (5,8s medido na Fase Editorial, meta < 2,5s). O alvo foi corrigido em 2026-09-13: o "vazamento do bundle do admin" que constava como causa **não existe** — remedido contra o build de produção, o painel contribui com 1,2KB de manifesto de rotas num chunk de 285KB, e nenhum componente dele entra (relato completo em [`CHANGELOG.md`](CHANGELOG.md)). Os suspeitos reais são o carregamento da fonte de exibição, o CSS que bloqueia a primeira pintura e o custo de hidratação das 13 seções da home — o elemento de LCP é o `<h1>` do Hero, que é texto.
- [ ] **Testes de carga**: `scripts/carga-publica.mjs` existe desde 2026-09-13 (concorrência e percentis sobre as três rotas públicas de leitura, sem dependência externa). Falta **rodar** contra um ambiente com dado de casamento grande e registrar o resultado — o script mede, não conclui.
- [ ] **Observabilidade completa** (Sentry + métricas de uso). Continua aberta e **não é trabalho só de código**: exige escolher provedor, DSN e política de retenção — e a aplicação trata dado pessoal de convidado, então "o que pode ir para um serviço de terceiro" é decisão de produto antes de ser de instrumentação. Mesma classe da decisão do provedor de e-mail.
- [ ] Revisão de segurança/RLS **por terceiros** antes da abertura multi-tenant — contratação, não implementação.

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
4. **Escalabilidade de e-mail transacional**: volume de convites/lembretes cresce proporcionalmente ao número de tenants — revisar limites e reputação de envio do provedor (Resend, integrado em 2026-09-13 atrás de `server/utils/email-provider.ts`) antes da Fase 5. O cron de avisos manda um e-mail por convite em sequência: com muitos tenants no mesmo dia, é o primeiro ponto a revisar (lote/fila).

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
- **Rótulo do papel profissional configurável pela própria profissional** (aberto em 2026-09-15, no refinamento da Fase 5 do Hub — [`fase5-multievento.md`](fase5-multievento.md) seção 4.6). O papel `planejador` nasce com o rótulo fixo **"Assessoria"**, que é a palavra que o casal usa e é na tela do casal que o selo aparece. Ela não cobre todo mundo: no mercado brasileiro, "assessoria/cerimonial" costuma ser o pacote que inclui a execução do dia, enquanto "wedding planner" é quem entra na concepção e toca orçamento e fornecedores por meses, às vezes sem fazer o dia do evento — e para quem vende isso, "assessoria" nomeia a categoria abaixo da dela. O produto serve os dois igualmente bem (o ciclo inteiro está em Financeiro, Fornecedores e Planejamento); **o risco é de autoidentificação, não técnico**. A direção é deixar a profissional escolher o texto. Não vira um segundo papel: seria inventar diferença de permissão onde só há diferença de posicionamento comercial. Gatilho para implementar: a primeira profissional real reclamando do selo. Trava a resolver antes: seria o primeiro atributo **por conta** que aparece em tela (hoje `conta_id` só existe em `assinaturas`/`funcionalidades_habilitadas`, apontando direto para `auth.users`, sem tabela `contas`), e é texto de usuário exibido no painel de outra pessoa.

---

*Este documento é revisado a cada fase de trabalho concluída — mover a entrada correspondente de "planejado" para "concluído" (com resumo de 1-2 frases) e registrar o histórico completo em `docs/CHANGELOG.md`.*
