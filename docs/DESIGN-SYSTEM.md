# Design System, UX/UI e SEO — MeuSiteCasamento

> Tokens visuais, componentes do Design System (`components/ui/`), princípios de UX, responsividade, acessibilidade e SEO. Para regras de código/organização de componentes (onde um componente deve viver, como ele recebe dados), ver [`CLAUDE.md`](../CLAUDE.md), seção "Convenções de Código". Em caso de conflito, CLAUDE.md prevalece.

---

## 1. Experiência do Usuário (UX)

### 1.1 Princípios gerais

- **Fricção mínima para o convidado**: nenhuma criação de conta é exigida para RSVP ou reserva de presente.
- **Clareza de estado**: em qualquer tela, o usuário deve entender imediatamente "o que já foi feito" e "o que falta fazer" (ex: RSVP já enviado vs. pendente).
- **Feedback imediato**: toda ação de mutação (confirmar presença, reservar presente) mostra feedback otimista ou loading state claro, seguido de confirmação visual (toast/inline).
- **Prevenção de erro antes de correção de erro**: validações client-side (Zod + VeeValidate) bloqueiam submissões inválidas antes de chegar ao servidor, mas o servidor sempre revalida (nunca confia apenas no client).

### 1.2 Fluxos críticos mapeados

1. **Convidado confirma presença**: recebe link → vê informações do evento → preenche RSVP → recebe confirmação visual e (futuramente) por e-mail.
2. **Convidado reserva presente**: acessa lista de presentes → filtra por categoria → se identifica (nome/telefone) → escolhe forma de presentear → recebe confirmação, item marcado como reservado para os demais.
3. **Casal acompanha status**: login → dashboard → visão de pendências → ação direta (reenviar lembrete, editar convidado) sem sair do contexto.

### 1.3 Estados a tratar explicitamente em toda tela de listagem

- Vazio (nenhum convidado/presente cadastrado ainda) — com call-to-action claro.
- Carregando.
- Erro de carregamento — com opção de retry.
- Populado — com paginação ou virtualização se a lista crescer muito (casamentos grandes podem ter 300+ convidados).

## 2. Interface do Usuário (UI)

- Interface do **site público** é fortemente visual e emocional (fotos do casal, tipografia expressiva), permitindo customização de tema por casamento — cor primária, cor secundária e par tipográfico (`--font-display`) aplicados globalmente via `layouts/default.vue` (`ui.store.ts` + `useWeddingTheme.ts`), cobrindo `/{slug}`, `/{slug}/presentes` e `/{slug}/rsvp` (com ou sem código) automaticamente, por herdarem do mesmo layout.
- Interface do **painel administrativo** prioriza escaneabilidade (tabelas, contadores, filtros), mas a linguagem visual do Design System é **100% compartilhada com o site público**: pill buttons com glow (`rounded="full"`, default da plataforma inteira), cartões com raio/sombra premium (`radius="xl"`/`elevation="xl"`, default de `UiCard`) e dropdowns modernizados aparecem também no admin (histórico de como se chegou a essa decisão — inclusive uma reversão de escopo — em `docs/CHANGELOG.md`). O painel herda a paleta de cores do casamento (`layouts/admin.vue`, mesmo mecanismo do site público). A fonte, porém, nunca varia: `--font-sans` é fixa em toda a plataforma, mesmo que o casal tenha escolhido um `fontPairId` diferente para o site público — legibilidade em densidade de dados prevalece sobre identidade visual aqui, e é a única exceção mantida por essa razão, não por preferência estética. **Único ponto de divergência visual mantido, deliberado**: o "lift" de hover dos botões pill (`hover:scale-[1.03]`) é suprimido no admin via `provide(ADMIN_UI_CONTEXT_KEY, true)` em `layouts/admin.vue`, injetado (default `false`) dentro de `UiButton` — glow, uppercase e o `active:scale` de clique continuam idênticos nos dois contextos; só o hover passivo muda (`app/utils/admin-ui-context.ts`, testado em `Button.spec.ts`).
- **Polimento "Admin Premium"**: cards, botões, campos de formulário e linhas de tabela têm transições suaves (`transition-brand`, ver seção 3.1). Cabeçalho de página padronizado via `AdminSection.vue` (`components/admin/`, slots `title`/`description`/`actions`); métricas do dashboard via `AdminStatCard.vue` (ícone + label + valor); atalhos de ação via `AdminQuickAction.vue`. Configurações organizada em abas (`UiTabs`, ver seção 3.2) — Geral/Aparência/Conteúdo — com as subseções de Aparência agrupadas em `UiAccordion` por tema (Branding/Tema/Experiência). A variante `ghost` de `UiButton` tem uma borda sutil sempre visível (`border-border/60`), mesmo em repouso, pra não ler como texto solto sobre uma linha/card da mesma cor. Marca do sidebar/header do admin: "MeuSiteCasamento" (`layouts/admin.vue`), mesmo rebrand do público.
- Uso consistente de **estado vazio ilustrado** nas listagens administrativas para orientar o próximo passo do usuário.
- Modais reservados para ações rápidas e contidas (ex: editar um convidado); fluxos longos (ex: importação CSV com mapeamento de colunas) usam página dedicada ou wizard em etapas.
- Toasts para feedback de ações assíncronas (sucesso/erro), nunca `alert()` nativo do navegador.
- **Hero com contagem regressiva e atalhos embutidos, personalizáveis**: a contagem regressiva vive dentro do próprio `Hero.vue`, nas duas variantes (com/sem foto de capa), condicionada a `config_tema.showCountdown`. Logo abaixo, uma linha de `UiButton` em formato pill (`rounded="full"`) com os atalhos que o casal escolher — catálogo fixo de 8 possíveis em `shared/hero-buttons.ts` (`HERO_BUTTON_CATALOG`: Presentes, Confirmar presença, Cerimônia e festa, Manual do convidado, Dress code, Nossa história, Galeria, FAQ), seleção e destaque editáveis em `/admin/configuracoes` (Aparência → "Atalhos do Hero"). Persistido em `config_tema.heroButtons` (array de ids) e `config_tema.heroFeaturedButton` (o único que recebe `variant="primary"`; os demais ficam `variant="outline"`). `resolveHeroButtons()` ignora ids desconhecidos/removidos do catálogo silenciosamente — nunca quebra o Hero por causa de uma seleção antiga. `casamento.nomes_noivos` no formato `"Nome & Nome"` é dividido em 3 linhas (`Nome` / `&` / `Nome`) para o tratamento tipográfico grande do Hero — nomes fora desse padrão caem no fallback de uma linha só. A linha da data mostra o nome do local (`nome_local` da primeira `etapa_evento` cadastrada, normalmente a Cerimônia).

## 3. Design System

### 3.1 Fundamentos (tokens)

- **Cor**: paleta base neutra (escala de cinzas) + duas cores de "tema do casamento" configuráveis, `primary` e `secondary` (aplicadas via CSS variables, permitindo customização por evento sem alterar código — ver seção 3.3).
  ```css
  :root {
    --color-primary: #6b4a35; /* customizável por casamento */
    --color-primary-foreground: #ffffff;
    --color-secondary: #5f6f52; /* customizável por casamento */
    --color-secondary-foreground: #ffffff;
    --color-surface: #fbf9f5; /* off-white — fundo de página, fixo na plataforma */
    --color-surface-elevated: #ffffff; /* branco puro — cartões/conteúdo em destaque (Card.vue), flutuando sobre o off-white */
    --color-surface-muted: #f2ece2;
    --color-border: #e8ddd0;
    --color-text: #2b2622;
    --color-text-muted: #6b6259;
    --color-heading: var(--color-text); /* customizável por casamento (titleColor, opcional — modo de cor avançada) */
    --color-body: var(--color-text); /* customizável por casamento (bodyColor, opcional — modo de cor avançada) */
  }
  ```
  > `#6b4a35` (mesma família de tom do preset "Clássico Elegante") é o default real (`app/assets/css/main.css`, `shared/utils/contrast.ts#DEFAULT_PRIMARY_COLOR`), validado ≥4.5:1 de contraste contra `--color-surface` — `#a8785c` fica citado em `tests/unit/utils/contrast.spec.ts` só como caso de rejeição conhecido (~3.81:1, achado real documentado em `docs/CHANGELOG.md`).
  > **Off-white vs. branco puro**: `--color-surface`/`--color-surface-muted`/`--color-border` são tons neutros fixos da **plataforma inteira** (público e admin) — não variam por casamento, ao contrário de `primary`/`secondary`/`heading`/`body`. `--color-surface-elevated` existe à parte para dar profundidade sutil (cartão branco puro sobre página off-white, como um editorial impresso); `shared/utils/contrast.ts` continua validando contra branco puro como pior caso.
- **Tipografia**: um par tipográfico por casamento — uma fonte serifada de destaque (`--font-display`, aplicada ao site público) e uma fonte sans-serif fixa de plataforma (`--font-sans`, aplicada a corpo de texto e a todo o painel administrativo, nunca customizada por casamento — legibilidade em densidade de dados). O casal escolhe o par via `shared/theme-presets.ts#FONT_PAIRS`, independentemente da paleta de cores (ver seção 3.3). Cada par pode opcionalmente definir uma terceira família só para botões/CTAs (`FontPair.buttonFontFamily`, ex.: preset `vermelho-classico` usa Montserrat) — resolvida para `--font-button` por `useWeddingTheme.ts` (mesmo padrão condicional de `--color-heading`/`--color-body`: só entra quando o par a define) e aplicada globalmente por `UiButton` (`[font-family:var(--font-button)]` nas classes base). Sem sobrescrita, `--font-button` cai em `var(--font-sans)` (default declarado em `main.css`) — pares sem `buttonFontFamily` não mudam de aparência. Como só o layout público injeta `--font-button` (`includeFont: true`; o admin usa `includeFont: false`, mesma regra de `--font-display`), botões do painel administrativo nunca variam por casamento.
- **Espaçamento**: escala baseada em múltiplos de 4px (Tailwind spacing scale padrão, sem customização salvo necessidade real).
- **Raio de borda e sombra**: escala limitada (`--radius-sm/md/lg/xl`, `--shadow-sm/md/lg/xl`) fixa na plataforma — não varia por tema, aplicada consistentemente via os componentes de `components/ui/`; nenhum valor arbitrário de `border-radius`/`box-shadow` direto em componentes de domínio. O tier `xl` é o **default de `UiCard`** na plataforma inteira, público e admin.
- **Movimento**: `--transition-duration` (200ms) e `--transition-easing` (`cubic-bezier(0.16, 1, 0.3, 1)`), consumidos pela utility `.transition-brand` (`app/assets/css/main.css`, `@layer utilities`) — duração/easing únicos para toda a plataforma, para que ajustar a "sensação" das transições seja uma mudança de 2 variáveis, não de dezenas de componentes. Usada em todos os componentes de `components/ui/` (Button, Card, Input, Select, Textarea, Checkbox, RadioGroup, Toast) e em hovers/transições de página do admin (nav ativa, linhas de tabela). O glow colorido dos CTAs pill primary também é uma utility própria (`.shadow-glow-primary`), reaproveitada por qualquer botão flutuante fora do `UiButton` (ex.: `ScrollToTopButton.vue`) — nunca reescrever o `color-mix()` como valor arbitrário.

### 3.2 Componentes base (`components/ui/`)

| Componente | Responsabilidade |
|---|---|
| `Button` | Variantes: `primary`, `secondary`, `outline` (borda sutil `border-primary/25` + fundo translúcido `bg-surface-elevated/70` com `backdrop-blur-sm` — CTAs secundários sobre fundo claro ou foto), `ghost` (borda sutil `border-border/60` sempre visível, mesmo em repouso, pra não ler como texto solto sobre um card/linha da mesma cor), `destructive`; tamanhos `sm/md/lg`; prop `rounded` (`'full'` = pill, **default da plataforma inteira**; `'md'` só onde pedido explicitamente). CTAs em pill ganham rótulo uppercase tracked e, quando também `variant="primary"`, um glow colorido (`.shadow-glow-primary`) em toda a plataforma. O "lift" de hover (`hover:scale-[1.03]`) é a única parte condicional: presente no site público, suprimido no admin via `inject(ADMIN_UI_CONTEXT_KEY)` (provido por `layouts/admin.vue`) — ruído visual numa tela com dezenas de botões pill lado a lado; `active:scale-95`/glow/uppercase continuam iguais nos dois contextos. Prop `to` (renderiza como `NuxtLink` em vez de `<button>`, mesmas classes de variante) + `target` (só com `to`, ex.: `"_blank"`, aplica `rel="noopener noreferrer"` automaticamente) |
| `Input` / `Textarea` / `Select` / `Checkbox` / `RadioGroup` | Campos de formulário com estado de erro integrado; foco/hover com `.transition-brand` |
| `Modal` / `Dialog` | Confirmações e edições rápidas; prop `size` (`'md'` default, `'lg'` para conteúdo mais largo — ex.: lightbox de foto da galeria pública) |
| `Tabs` | Headless via Reka UI (`TabsRoot`/`List`/`Trigger`/`Content`), estilo próprio (não um passthrough) — props `tabs: {id, label}[]` + `v-model`, conteúdo via slot nomeado por `id` (mesmo padrão de `Accordion`). Usado nas abas Geral/Aparência/Conteúdo de `/admin/configuracoes`, mas é um componente genérico (fica em `components/ui/`, não `components/admin/`) — reutilizável em qualquer tela, pública ou admin |
| `Toast` / `ToastViewport` | Feedback de ações assíncronas (nunca `alert()` nativo) — estado em `ui.store.ts` (`toasts`), disparado via `useToast().success()/error()/warning()/info()` (tom `warning` e duração por tom — 3500ms/5000ms/6000ms), `ToastViewport` montado uma vez em `app.vue`; toasts entram/saem com transição (`TransitionGroup` + `.transition-brand`) |
| `Chip` | Label + estado opcional de seleção (`selected`), toggle (`clickable`, emite `click`) e remoção (`removable`, emite `remove`) + slot `actions` para botões extras (ex.: editar) — único componente de "pill" da plataforma (categorias de presente, tags de convite, atalhos do wizard de convidados, valores sugeridos de contribuição) |
| `Badge` | Status visual (RSVP confirmado/pendente/recusado) |
| `Card` | Contêiner padrão para itens de lista (convidado, presente); props `radius` (`'xl'` = tratamento premium, **default da plataforma inteira**; `'lg'` = degrau reduzido, só onde cartões densamente empilhados fariam o raio/sombra grandes competirem entre si), `elevation` (`'xl'` default, acompanha `radius="xl"`; `'sm'` no degrau reduzido) e `variant` (`'default'` | `'interactive'` — hover `shadow-md`/`border-primary` no degrau médio | `'highlight'` — leve ênfase `bg-primary/[0.03]` para cards de destaque, ex. prazo de RSVP no dashboard) |
| `Table` | Listagens administrativas com ordenação/paginação; linhas com hover (`hover:bg-surface-muted/60 .transition-brand`) em cada página |
| `Avatar` | Representação visual de convidado/casal |
| `Skeleton` | Estado de carregamento consistente |
| `EmptyState` | Estado vazio ilustrado e padronizado; prop opcional `icon` (ícone lucide acima do título). Reaproveitado também para estado de **erro** de carregamento (título/descrição de erro + botão "Tentar novamente" no slot default chamando `refresh()`) — não é um componente próprio de erro, é o mesmo `EmptyState` com conteúdo diferente |
| `SectionDivider` | Ornamento linha–ponto–losango–ponto–linha, tingido na cor primária do tema (`primary/30`–`primary/60`); puramente decorativo (`aria-hidden`), sem conhecimento de domínio — usado por `PublicEditorialSection`, sempre abaixo do título |
| `Accordion` | Headless via Reka UI (`AccordionRoot`/`Item`/`Header`/`Trigger`/`Content`), `type="single" collapsible`; navegação por teclado e `aria-expanded` nativos do primitive — usado pela seção de FAQ pública. Slot com escopo `#content="{ item }"` (opcional) permite conteúdo rico por item além do texto simples de `item.content` — usado para agrupar as subseções de Aparência em `/admin/configuracoes` e as coordenadas opcionais em `/admin/cronograma` |
| `CountdownTimer` | Contagem regressiva até a data/hora do evento (dias/horas/minutos/segundos); sem conhecimento de domínio (props `targetDateTime`, `variant` — `'cards'` default/caixas, `'inline'` números soltos com separador —, slot `past` para a mensagem de "já aconteceu") — usado no Hero público (`variant="inline"`, condicionado a `theme_config.showCountdown`) e no dashboard admin (`variant="cards"` default, sempre visível) |

### 3.3 Regras de governança

- Nenhum estilo visual (cor, espaçamento, tipografia) é definido diretamente em componentes de domínio — sempre via classes Tailwind mapeadas aos tokens, ou via componente de `components/ui/`.
- Toda nova variante visual passa primeiro pelo Design System antes de ser usada em uma feature específica — proibido criar "botão especial" isolado dentro de uma página.
- Temas por casamento são dados armazenados em `casamentos.config_tema` (jsonb — exclusivamente atributos visuais, nunca comportamento de negócio como `modo_lista_convidados`, ver [`PRODUCT.md`](PRODUCT.md)), aplicados via CSS variables no layout público. Shape atual: `{ presetId?: string, primaryColor: string, secondaryColor: string, titleColor?: string, bodyColor?: string, fontPairId: string, coverImageUrl?: string, storyImageUrl?: string, coverFocalX?: number, coverFocalY?: number, storyFocalX?: number, storyFocalY?: number, showCountdown: boolean, heroButtons?: string[], heroFeaturedButton?: string }` (chaves do JSON permanecem em inglês, camelCase — só o nome da coluna que guarda o JSON mudou). **Todo campo novo do schema precisa ser adicionado também à lista explícita de `server/api/wedding/theme.patch.ts`** — o endpoint enumera as chaves manualmente e descarta silenciosamente as que não conhece (bug já ocorrido duas vezes, ver `docs/CHANGELOG.md`). `presetId` é só um rótulo informativo do último preset aplicado (ou `'custom'` após qualquer edição manual) — nunca usado para resolver a aparência em si, que sempre lê `primaryColor`/`secondaryColor`/`fontPairId` diretamente.
- `config_tema` é gerenciado por um endpoint próprio (`PATCH /api/wedding/theme`, `shared/schemas/theme.ts`), separado dos dados de negócio do evento (`PATCH /api/wedding`, `shared/schemas/wedding.ts`). `coverImageUrl`/`storyImageUrl` ficam de fora até desse schema: são geridos exclusivamente pelos respectivos endpoints de upload/remoção (`cover-upload`/`story-upload`), nunca submetidos junto com o restante do formulário de Aparência, evitando que salvar cor/fonte apague uma foto por engano. As duas fotos são **independentes** — arquivos próprios no mesmo bucket `wedding-covers` (`{casamento_id}/cover.{ext}` e `{casamento_id}/story.{ext}`), cada uma com seu próprio par de endpoints e composable (`useWeddingCoverUpload`, `useWeddingStoryUpload`).
- A paleta do casal é sempre **duas cores** (`primaryColor` + `secondaryColor`, cada uma validada independentemente pela seção 3.4), sempre editáveis por hexadecimal exato. `shared/theme-presets.ts` cataloga temas prontos (`THEME_PRESETS`, cor+cor+par tipográfico combinados) e pares tipográficos (`FONT_PAIRS`, independentes de cor) — presets são só um atalho de largada: escolher um preenche os três campos de uma vez, mas cada um continua editável manualmente depois, e a fonte é sempre uma escolha independente da cor.
- **Personalização avançada**: além da paleta primária/secundária, o casal pode opcionalmente sobrescrever `titleColor`/`bodyColor` — resolvidos para `--color-heading`/`--color-body` (`useWeddingTheme.ts`), tokens que, sem sobrescrita, herdam `--color-text`. É um toggle "Personalização avançada" na tela de Aparência (`app/pages/admin/configuracoes/index.vue`): desligá-lo limpa os dois campos no submit seguinte, em vez de deixar um valor escondido e não-editável. Cada cor é validada por contraste independentemente, como `primaryColor`/`secondaryColor`. Adoção pelos componentes é incremental — `text-heading`/`text-body` (utilities geradas a partir dos tokens) substituem `text-text` onde fizer sentido, não em todo o código de uma vez. Na variante *com* foto de capa do Hero, o texto permanece branco fixo (legibilidade sobre a imagem) — a cor de título do casal não se aplica ali, decisão deliberada.
- `shared/theme-presets.ts` inclui o preset `borgonha-editorial` ("Borgonha Editorial" — Borgonha profundo `#5c1a2b` + Dourado fosco `#8a6a1f`, par `DM Serif Display + DM Sans`).
- **Ferramenta de enquadramento (ponto de foco)**: toda foto que é cortada em proporção fixa (grade da galeria em `aspect-square`, foto da "Nossa História" em `aspect-[4/5]`, foto de capa em `object-cover` de altura de viewport) pode ter seu ponto de foco escolhido na edição da foto (galeria) ou no upload (capa/história), em vez de sempre cortar pelo centro. `ImageFocalPointPicker.vue` (`components/ui/`) é o componente compartilhado — área de seleção mostra a foto **inteira, sem cortar** (clique/arraste mapeia 1:1 para as coordenadas reais da imagem), com um bloco secundário mostrando a prévia do corte real. Aceita teclado (setas, passos de 5%) além de ponteiro. Usado em 3 pontos: `PhotoGalleryManager.vue` (campos `fotos.foco_x`/`foco_y`), `CoverImageUploader.vue`/`StoryImageUploader.vue` (campos `config_tema.coverFocalX`/`coverFocalY`/`storyFocalX`/`storyFocalY`, endpoint próprio `PATCH /api/wedding/theme/focal-point`). Persistência é debounced (400ms) no client; valor default ausente = 50/50 (centro). Um upload novo de capa/história sempre reseta o foco da imagem anterior. Na galeria, o foco é preservado entre syncs pela chave `id_arquivo_origem`; reenviar o mesmo arquivo no Drive gera um `fileId` novo e perde o foco salvo (limitação conhecida).
- `config_conteudo` é uma coluna irmã de `config_tema`, não uma extensão dela: guarda as mensagens narrativas do site público (boas-vindas, história, dress code, manual do convidado, intro de presentes, FAQ), nunca atributos visuais — endpoint próprio (`PATCH /api/wedding/content`, `shared/schemas/content.ts`), nunca misturado ao formulário de Aparência.

### 3.4 Validação automática de contraste

Ao salvar `config_tema`, `primaryColor`, `secondaryColor` e, quando definidas, `titleColor`/`bodyColor` são validadas independentemente contra `--color-surface`/`--color-text` calculando a razão de contraste (fórmula de luminância relativa do WCAG, `shared/utils/contrast.ts#checkColorContrast`). Se qualquer uma ficar abaixo de 4.5:1, a interface administrativa bloqueia o salvamento — evitando que a customização visual quebre a acessibilidade prometida na seção 5. Todo preset de `shared/theme-presets.ts` é coberto por teste de guarda garantindo que as duas cores de cada entrada passam nesse mínimo.

## 4. Componentes Reutilizáveis

### 4.1 Componentes de domínio compartilhados

| Componente | Uso |
|---|---|
| `GuestCard` | Exibição de um convidado (nome, status RSVP, ações rápidas) — usado em listagens e dentro de grupos |
| `GroupTree` | Visualização hierárquica de grupo → convidados |
| `RsvpForm` | Formulário de confirmação de presença, reutilizado no fluxo individual e em grupo |
| `GiftCard` | Exibição de um item da lista de presentes, com estado reservado/disponível |
| `GiftReservationModal` | Fluxo de reserva de presente |
| `StatusBadge` | Badge de status genérico, parametrizado por mapa de cores/labels (RSVP, convite enviado, etc.) |
| `ProgressSummary` | Barra/cartão de progresso (ex: "82 de 120 confirmados") reutilizado no dashboard e em relatórios |
| `CsvImportWizard` | Fluxo de importação de convidados em etapas (upload → mapear colunas → revisar → confirmar) |
| `EditorialSection` | Wrapper padrão de "capítulo" da home pública — prop `eyebrow` (rótulo curto, uppercase, tracked, cor `primary/60`) + título centralizado + `SectionDivider` (nessa ordem: eyebrow → título → divisor), alternância de fundo `bg-surface`/`bg-surface-muted`/`bg-secondary/10` (prop `tone`, aplicada de forma consistente em toda seção pública — nunca ad hoc), reveal-on-scroll via `v-motion`, `id` para âncora de navegação. Toda seção da home o reutiliza |
| `VenueMap` | Embed do Google Maps num `<iframe>` (SSR-safe, sem manipulação de `window`/DOM) — mapa interativo do local de `EventSpotlight.vue`, props `query` (coordenadas ou endereço em texto) e `label`. Aparece sempre que há local/endereço ou coordenadas cadastrados (junto do botão "Abrir no Google Maps"); sem nenhum dos dois, nem mapa nem botão aparecem |
| `AdminSection` (`components/admin/`) | Wrapper padrão de página do admin — slots `title`/`description` (props string, não slot) + `actions` (botões do cabeçalho) + slot default para o conteúdo |
| `AdminStatCard` (`components/admin/`) | Cartão de métrica do dashboard — ícone lucide + label + valor + `tone` opcional (`default`/`primary`/`success`/`warning`/`danger`), valor truncado com `title` para o texto completo no hover |
| `AdminQuickAction` (`components/admin/`) | Atalho de ação do dashboard — ícone + label + link (`NuxtLink`), mesma linguagem visual de `Card` `variant="interactive"` mas construído à parte por não ser um `Card` (é sempre um link) |

### 4.2 Critério para "promover" um componente a reutilizável

Um componente só é extraído para uso compartilhado após aparecer em **pelo menos 2 contextos reais** — evita abstração prematura sobre necessidades hipotéticas.

## 5. Responsividade

- **Mobile-first** obrigatório: a maioria dos convidados acessará o link de RSVP diretamente do WhatsApp no celular.
- Breakpoints padrão do Tailwind (`sm`, `md`, `lg`, `xl`) — sem breakpoints customizados salvo necessidade comprovada.
- Painel administrativo é otimizado primeiro para desktop/tablet (uso típico do casal planejando em casa), mas nenhuma tela pode "quebrar" em mobile — no mínimo, uso funcional garantido. A navegação do admin é uma sidebar (`layouts/admin.vue`, estado `sidebarOpen` em `ui.store.ts`): no desktop, colapsa para uma trilha só de ícones; no mobile, vira um drawer sobreposto (com overlay escurecido) que começa fechado e fecha sozinho ao navegar para outra página.
- Tabelas administrativas em telas estreitas colapsam para formato de cards empilhados, em vez de scroll horizontal forçado como única solução.
- Imagens (galeria do casal, fotos de presentes) sempre com `srcset`/componente de imagem otimizada do Nuxt (`<NuxtImg>`), nunca `<img>` cru com imagem em resolução total — exceção deliberada: fotos da galeria, servidas direto do Google Drive (ver `docs/CHANGELOG.md`).

## 6. Acessibilidade

- Meta: conformidade com **WCAG 2.1 nível AA**.
- Uso de componentes headless acessíveis (Reka UI) como base para Modal, Dialog, Combobox, garantindo gerenciamento correto de foco e navegação por teclado.
- Contraste mínimo de 4.5:1 entre texto e fundo, validado para toda combinação de tema customizado pelo casal (ver seção 3.4).
- Todo elemento interativo é acessível via teclado (`Tab`/`Enter`/`Space`), sem exceções para componentes customizados.
- Formulários (RSVP, cadastro de convidado) com `label` associado a cada campo, mensagens de erro anunciadas via `aria-live`.
- Imagens decorativas com `alt=""`; imagens de conteúdo (fotos do casal) com `alt` descritivo preenchido pelo casal.
- Testado com leitor de tela (NVDA/VoiceOver) nos fluxos críticos antes de cada release maior.

## 7. SEO

- Site público renderizado via **SSR** — essencial para que links compartilhados no WhatsApp gerem preview correto (Open Graph) e para indexação eventual em buscadores.
- Meta tags dinâmicas por casamento: `title`, `description`, `og:image` (foto de capa do casal), geradas via `useSeoMeta`/`useHead` do Nuxt a partir dos dados de `weddings`.
- URLs amigáveis: `meusitecasamento.com/{slug}` como página pública principal (`slug` único por casamento, editável pelo casal).
- `robots.txt` e `sitemap.xml` gerados automaticamente para o domínio público; painel administrativo (`/admin/**`) sempre `noindex, nofollow`.
- Páginas de RSVP individuais (`/rsvp/{code}`) são `noindex` — contêm identificador único e não devem ser indexadas.

## 8. Performance (frontend/visual)

- Imagens sempre servidas via `<NuxtImg>`/`<NuxtPicture>` com formatos modernos (`webp`/`avif`) e lazy loading fora do viewport inicial.
- **`sizes` do NuxtImg exige formato por breakpoint**: todo uso de `sizes` com unidade `vw` em `NuxtImg`/`NuxtPicture` neste projeto precisa listar os 5 breakpoints explicitamente (`@nuxt/image` não aceita a sintaxe crua do HTML — `sizes="100vw"` sozinho silenciosamente gera um `srcset` de ~1-2px de largura, sem nenhum erro visível), ex.: `sizes="sm:100vw md:100vw lg:100vw xl:100vw 2xl:100vw"` (constante) ou `sizes="sm:100vw md:50vw lg:50vw xl:50vw 2xl:50vw"` (variável — a biblioteca desloca cada valor para valer "a partir deste breakpoint até o próximo", não "abaixo deste breakpoint"; sempre conferir o `srcset`/`naturalWidth` renderizado após qualquer mudança). Valores em `px` (ex.: `sizes="400px"`, usado em `GiftCard.vue`) não têm esse problema. Aplica-se a capa/história (`Hero.vue`, `StorySection.vue`) e qualquer novo uso de `NuxtImg`/`NuxtPicture`; não se aplica à Galeria, que usa `<img loading="lazy">` direto do Google. Achado real documentado em `docs/CHANGELOG.md`.
- Dados do painel administrativo paginados no servidor (nunca carregar lista completa de 500 convidados de uma vez) — paginação ou scroll infinito com limite de página razoável (ex: 25–50 itens).
- Uso de `useAsyncData` com chaves de cache adequadas para evitar refetch desnecessário ao navegar entre páginas do admin.
- Bundle do painel administrativo carregado separadamente do bundle do site público (via code-splitting natural de rotas do Nuxt) — um convidado nunca baixa código do admin. O SDK do Supabase (client-side) também é carregado sob demanda, só em `/admin/**` e `/login` (`app/plugins/supabase-auth.client.ts`) — o site público nunca paga o custo desse bundle nem faz as chamadas de auth associadas a ele.

---

*Este documento evolui junto com `components/ui/`, `shared/theme-presets.ts` e `shared/hero-buttons.ts`. Qualquer token/componente novo do Design System deve ser refletido aqui.*
