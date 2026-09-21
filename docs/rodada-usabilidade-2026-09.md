# Rodada de usabilidade — setembro/2026

> **Origem:** relatório de inspeção de usabilidade de 20/09/2026 (Mateus Silva), 30 pontos
> levantados percorrendo a plataforma de ponta a ponta: criação do casamento pela equipe
> interna, primeiro acesso do casal, os módulos do painel e o site do convidado.
>
> **O que este documento é:** o plano de resolução de cada um dos 30 pontos, com o
> diagnóstico já confirmado no código. Cada item diz **o que está acontecendo** (com o
> arquivo onde está), **o que vamos fazer** e **o que fica de fora** — e nada aqui é
> "melhorar a tela": onde o pedido é vago, o plano escolhe uma forma concreta.
>
> **O que este documento não é:** especificação de produto. Regra de negócio nova vai para
> o documento do módulo (`docs/fase1-financeiro.md`, `docs/fase4-onboarding.md`…) quando a
> mudança acontecer; aqui fica a decisão e o motivo.
>
> **Status:** plano fechado em 21/09/2026 — as cinco decisões que dependiam do dono do
> produto foram tomadas e estão registradas na seção final, já incorporadas aos itens que
> elas afetam (C2, C5, F1, B4 e a posição da Fase H). Cada fase é um PR (ou uma sequência
> curta deles); a ordem entre fases é deliberada e está justificada na seção 3. Nenhuma fase
> começa com escopo em aberto.

---

## 1. O que a rodada revelou

Os 30 pontos não são 30 problemas independentes. Lidos juntos, quatro padrões explicam a
maior parte deles — e é por isso que a ordem de execução não é a ordem do relatório.

### 1.1 Seis bugs reais, confirmados no código

A inspeção encontrou defeitos de verdade, não só desconforto. Cada um foi reproduzido na
leitura do código, e nenhum depende de interpretação.

| Ponto | Sintoma relatado | Causa confirmada |
|---|---|---|
| 5 | Link mágico não leva ao login | `signInWithOtp` sem `emailRedirectTo`, e não existe rota de callback que troque o `code` por sessão |
| 7 | "Concluí os primeiros passos e nada foi marcado" | `useOnboarding.atualizarRoteiro()` invalida a chave `'onboarding'`, mas o `useFetch` está registrado como `'onboarding@<slug>'` |
| 14 | Gasto entrou duas vezes | `salvarNova()` é chamada por `keyup.enter` **e** por `focusout`, e só limpa a linha depois do `await` |
| 16 | "Some e aparece várias telas antes de salvar" | Contratar sem fornecedor faz 2 mutações em série, cada uma disparando 4 refetches — 9 releituras com a modal aberta |
| 26 | Menu do site não tem lista de presentes | `NavBar.vue` tem uma lista fixa de 5 destinos, paralela ao catálogo de 11 seções |
| 27 | "Confirmar presença" duas vezes na capa | A barra fixa do celular não sabe que o Hero está na tela |

O ponto 7 e o ponto 16 apontam para o mesmo débito transversal: **o Financeiro ainda usa
`refreshNuxtData`**, que é o hook `app:data:refresh` precedido de `requestIdleCallback` —
uma espera sem prazo, já documentada como armadilha no Planejamento (`usePlanning.ts`) e
corrigida lá e no onboarding. Enquanto `useFinance.atualizarFinanceiro()` continuar assim,
qualquer tela do módulo pode mostrar número velho sem erro nenhum para acusar.

> **Trabalho transversal da Fase A:** padronizar as três famílias de composables no hook
> direto, e travar com teste que nenhum composable novo volte a usar `refreshNuxtData`.

### 1.2 A terceira lista paralela

O `CLAUDE.md` já registra a lição: `shared/home-sections.ts` é a fonte única das seções da
home, e `shared/hero-buttons.ts` é **derivado** dela — porque um catálogo paralelo ficou com
8 entradas para 11 seções sem nada acusar a falta.

O ponto 26 mostra que existe uma terceira lista, escrita à mão, dentro de `NavBar.vue`.
A correção não é "adicionar Presentes ao menu": é **derivar o menu do mesmo catálogo**, para
que a próxima seção nova apareça sozinha e a regra não tenha mais por onde escapar.

### 1.3 O caminho de entrada nunca foi percorrido inteiro

Os pontos 1 a 6 descrevem uma sequência: a equipe cria o casamento → o dono recebe um e-mail
→ ele tenta entrar. Hoje essa sequência **não fecha**. O e-mail é o template cru do Supabase,
o link não leva ao login, não existe definição de senha, e a raiz do domínio responde uma
página neutra em vez de um caminho para entrar.

Cada peça isolada parece pequena; juntas, são o motivo pelo qual nenhum casal real
conseguiria entrar sem ajuda. É a fase que vem logo depois dos bugs.

### 1.4 O que é bug, o que é acabamento e o que é produto novo

Três pontos do relatório não são correção — são escopo novo, e precisam ser tratados como
tal para não contaminarem a estimativa das fases:

- **Ponto 2** (usuários e permissões no painel interno): existe modelo de dados
  (`membros_casamento` com a escada dono/planejador/colaborador, `operadores_plataforma`),
  mas não existe tela. É uma fase de produto, não um ajuste.
- **Ponto 8** (ajuda por tela) e **ponto 12** (tooltips): são um *sistema*, não uma lista de
  textos. Sem um mecanismo único, viram 40 implementações diferentes.
- **Ponto 28** (o site como Save the Date): é posicionamento de produto — agrega valor, e
  por isso merece decisão explícita, não um ajuste de configuração padrão.

---

## 2. Conflitos com decisões já documentadas

Dois pedidos do relatório contrariam decisões registradas no `CLAUDE.md`. Isso não os
invalida — o dono do produto decide — mas a mudança precisa ser deliberada, e o documento
correspondente tem de mudar junto.

**Ponto 13 — Categorias como primeira tela do Financeiro.**
O `CLAUDE.md` seção 12 fixa a ordem do menu como "a ordem do dinheiro na vida do casal —
listar, planejar, pagar", com Gastos em primeiro. O relatório argumenta o contrário: "se faz
o orçamento macro primeiro, depois os gastos micro". **Os dois estão certos sobre coisas
diferentes** — a ordem atual descreve o uso recorrente (o casal volta ao Financeiro para ver
gastos), o pedido descreve o primeiro uso (nunca planejou nada ainda).

**Decidido em 21/09/2026: a ordem fica.** O conflito se resolve pelo nome e pelo caminho
(item C2) — a tela passa a se chamar "Planejamento por categoria" e o estado vazio de Gastos
leva até ela. O `CLAUDE.md` seção 12 continua valendo como está.

**Ponto 9 — Modelo padrão de tarefas.**
O `CLAUDE.md` seção 12 diz: "Sugestão nunca é linha no banco… só o clique do casal cria a
tarefa". Um "modelo padrão" que cria 30 tarefas de uma vez **não viola** essa regra desde que
seja um clique explícito do casal — a regra proíbe semear sem pedir, não aplicar um modelo a
pedido. O item D2 mantém essa fronteira e a torna explícita no documento do módulo.

---

## 3. Ordem de execução

| Fase | Pergunta que ela responde | Pontos do relatório | Tamanho |
|---|---|---|---|
| **A · Destravar** | O que está quebrado agora? | 5, 7, 14, 16, 26, 27 | M |
| **B · A porta de entrada** | Um casal novo consegue entrar sozinho? | 1, 3, 4, 6 | M |
| **C · Financeiro inteiro** | O módulo mais usado está completo? | 10, 11, 13, 15, 17, 18, 19, 20 | G |
| **D · Não deixar o casal sozinho** | Ele sabe o que fazer em cada tela? | 8, 9, 12 | G |
| **E · Casa arrumada** | As telas grandes ainda cabem em si? | 21, 22 | M |
| **F · O convite e o convidado** | O fluxo mais importante está bom? | 24, 25, 28, 29 | G |
| **G · Velocidade** | A plataforma responde rápido? | 23, 30 | M |
| **H · Contas e permissões** | Quem é quem na plataforma? | 2 | G |

**Por que esta ordem.** A é primeiro porque é o único bloco onde o sistema mente para o
usuário. B vem logo atrás porque, sem ela, ninguém chega às outras fases. C antes de D
porque a ajuda contextual (D) precisa descrever telas que já estejam no formato final. G
fica perto do fim porque medir antes de mexer em C/E/F seria medir algo que vai mudar. H
fica por último por decisão de 21/09/2026: a plataforma termina de servir bem o casal antes
de servir quem revende, e a equipe interna convive com o script manual de operador até lá.

---

## Fase A · Destravar

Seis defeitos confirmados no código. Nenhum é de opinião.

**Progresso** — branch `fix/rodada-usabilidade-fase-a`, iniciada em 21/09/2026.

| Item | Ponto | O que é | Situação |
|---|---|---|---|
| A1 | 5 | Link mágico não leva ao login | ✅ concluído — com limite conhecido (ver abaixo) |
| A2 | 7 | Primeiros passos não se marcam | ✅ concluído |
| A3 | 14 | Gasto entra duas vezes | ✅ concluído |
| A4 | 16 | Tela pisca ao registrar contrato | ✅ concluído |
| A5 | 26 | Menu do site sem lista de presentes | ✅ concluído |
| A6 | 27 | "Confirmar presença" duplicado na capa | ✅ concluído |
| A7 | — | Script de operador fora do repositório (higiene) | ✅ concluído |

**A7, concluído em 21/09/2026:** `scripts/criar-operador-plataforma.mjs` entrou no
repositório e ganhou instruções no `README.md`, junto da configuração de Redirect URLs que o
A1 exige. Ele é o caminho oficial de criar operador até a Fase H, e estava só na máquina de
uma pessoa.

### A1 · Ponto 5 — o link mágico não leva ao login ✅

**Concluído em 21/09/2026 — com uma pendência de configuração.** Existe `app/pages/auth/callback.vue`,
que troca o `code` por sessão e redireciona para `?next=` (padrão `/admin`), tratando link
expirado, já usado e — a causa mais comum — link aberto em outro navegador, que o PKCE recusa
porque o verificador ficou em quem pediu. `needsSupabaseAuth()` passou a incluir `/auth`, sem
o que não haveria client para fazer a troca. A troca em si vive no composable
(`completarAcessoPorLink`), não na página, e espera o usuário reativo aparecer antes de
navegar — a mesma corrida que o login por senha já tratava e que mandaria a pessoa de volta
ao login logo depois de ela ter entrado. `next` só aceita caminho interno: um destino absoluto
faria deste callback um redirecionador aberto.

> **Pendência que não é código:** cada ambiente precisa ter `<origem>/auth/callback` na
> allowlist de **Redirect URLs** do projeto Supabase (Authentication → URL Configuration).
> Sem isso o Supabase ignora o `emailRedirectTo`. Documentado no `README.md`.
> Aplicado no projeto de desenvolvimento em 21/09/2026.

**O que o teste em 21/09/2026 revelou, e que não estava no diagnóstico.** Com a allowlist
configurada, o link deixou de morrer na raiz e passou a chegar ao callback — mas a troca falhou
com `PKCE code verifier not found in storage`.

Não é defeito da correção — e a causa, medida no navegador em 21/09/2026, é mais estreita e
mais grave do que "outro navegador":

1. O verificador **é** gravado ao pedir o link (três cookies: o slot do fluxo, o índice e a
   chave fixa), **sobrevive** ao SSR do callback, e `Secure` não atrapalha em `localhost`.
2. O link do e-mail **não carrega identificação do fluxo** — a flag que faria isso
   (`appendPkceFlowIdToRedirects`) é experimental e vem desligada. Sem ela, a troca lê a
   **chave fixa**, que o próprio `auth-js` documenta como espelho do **fluxo mais recente**.
3. Logo: **pedir um segundo link invalida o primeiro**, no mesmo navegador e dentro do prazo.
   Quem pede de novo porque "o e-mail não chegou" queima o link que estava a caminho.
4. E o verificador é **apagado** quando o pedido falha (um 500 do provedor de e-mail, por
   exemplo), deixando o link que chegou sem par.

Some a isso o que já se sabia: o verificador vive no navegador que pediu, então **o casal que
pede no computador e abre o e-mail no celular nunca entra**. Esse é o caso normal do produto,
não a exceção.

A saída é o fluxo que o próprio Supabase recomenda para aplicação com servidor: o link carrega
`token_hash` e a verificação acontece no **servidor** (`verifyOtp`), sem depender de storage de
navegador nenhum. Ela exige mudar o template do e-mail — que é exatamente o item **B2**, onde
os templates serão reescritos de qualquer forma.

**Decidido em 21/09/2026: fica para a Fase B.** O que este PR entrega continua valendo — o
link sai do e-mail e chega a uma tela que tenta a troca e **explica o resultado**, em vez de
morrer numa página neutra. A tela passou a mostrar a resposta crua do provedor abaixo da
mensagem amigável: traduzir toda falha para "o link expirou" é confortável e inútil, porque
cada causa pede uma ação diferente — foi ela que revelou este diagnóstico em vez de escondê-lo.
Até a Fase B, o caminho garantido de entrada é **e-mail e senha**.

**Diagnóstico.** `app/composables/useAuth.ts:30` chama `supabase.auth.signInWithOtp({ email })`
sem `emailRedirectTo`. O link do e-mail cai no `site_url` do projeto Supabase — a raiz do
domínio — com `?code=...` na query. E a raiz (`app/pages/index.vue`) é uma página neutra que
não troca esse código por sessão. Pior: o plugin de auth (`app/plugins/supabase-auth.client.ts:26`)
só inicializa o client em `/admin`, `/login` e `/plataforma`, então **nem haveria com o que
trocar** — o código chega e morre ali. É exatamente a tela que o relatório fotografou.

**Decisão.** Criar a rota de callback que hoje não existe, e mandar todo link de e-mail para
ela. O destino final continua parametrizável (`?next=`), porque o mesmo callback vai servir
ao convite (item B2) e à definição de senha (item B3).

**Escopo.**
- `app/pages/auth/callback.vue` — troca `code` por sessão (`exchangeCodeForSession`), trata
  link expirado/já usado com mensagem própria, e redireciona para `next` (padrão `/admin`).
- `needsSupabaseAuth()` passa a incluir `/auth` — sem isso o client não sobe na rota.
- `signInWithMagicLink` passa `emailRedirectTo` apontando para o callback.
- Conferir no projeto Supabase: `site_url` e a allowlist de **Redirect URLs** precisam
  incluir o callback nos três ambientes (local, preview, produção). É configuração de
  projeto, não do repositório — mesma natureza do SMTP do Auth.
- E2E: pedir link mágico, abrir o link, cair logado em `/admin`.

### A2 · Ponto 7 — os primeiros passos não se marcam ✅

**Concluído em 21/09/2026.** A chave foi içada para `chaveRoteiro` e o refresh passou a
invalidá-la **resolvida** — o `useFetch` e a invalidação agora falam de `onboarding@<slug>`,
a mesma coisa. A varredura de `tests/unit/app/escopo-por-casamento.spec.ts` ganhou um segundo
bloco, que cobre a **invalidação** e não só a chave de requisição; confirmado que ele falha
com o código antigo (`invalidação de "'onboarding'" não usa uma chave de useWeddingScopedKey
resolvida`) e passa com o novo. As duas etapas mortas do wizard saíram junto: −2.666 caracteres
em `comecar.vue`, e os comentários de etapa foram renumerados para as três que existem.

**Diagnóstico.** `app/composables/useOnboarding.ts:33` dispara `app:data:refresh` com a chave
literal `onboarding`. Mas o `useFetch` da linha 15 registra a chave escopada por casamento,
que resolve para `onboarding@<slug>` (`app/utils/wedding-scoped-key.ts:16`). **As chaves não
batem**: o refresh não atinge requisição nenhuma. O roteiro fica com os fatos que leu quando a
página montou — por isso o casal responde as etapas, volta ao Início e vê "0 de 4 concluídos".
O `usePlanning.ts:44` faz certo (chave resolvida), o que confirma o lapso.

**Decisão.** Corrigir a chave e impedir a recaída — o erro é invisível: nenhum aviso, nenhum
erro, só a tela parada.

**Escopo.**
- `atualizarRoteiro()` passa a usar a chave resolvida.
- Teste unitário: a chave invalidada é a mesma que o `useFetch` registra.
- Varredura (na linha de `tests/unit/app/escopo-por-casamento.spec.ts`): toda chamada a
  `app:data:refresh` usa chave escopada resolvida, nunca string literal.
- **Débito relacionado, no mesmo PR:** `app/pages/admin/[slug]/comecar.vue` tem dois blocos
  de etapa mortos (`prazo-rsvp` e `orcamento`). `PASSOS_DO_WIZARD` filtra por `noWizard`, e
  esses dois passos saíram do catálogo em 2026-09-14 — o template nunca os renderiza. São
  ~40 linhas descrevendo um wizard de 5 etapas que não existe há uma fase inteira.

### A3 · Ponto 14 — o gasto entra duas vezes ✅

**Concluído em 21/09/2026.** A linha nova sai da tela **antes** do `await` (e volta com o
texto digitado se a criação falhar), mais uma guarda de reentrância que cobre a janela entre
o envio e a resposta — `criandoNova` para a linha nova, `salvandoIds` para as existentes. Os
dois gatilhos continuam salvando, que é o que faz a edição no lugar funcionar. Entrou junto a
confirmação que faltava: um check discreto na linha por 2,5s, com largura reservada para não
empurrar o layout ao aparecer, e `sr-only` para quem não vê a tela. E2E novo em
`tests/e2e/financeiro.spec.ts` reproduz o gesto exato do relatório (Enter seguido de clique
fora) e afirma `toHaveCount(1)` na tela e depois de recarregar.

**Diagnóstico.** `app/components/admin/finance/FinanceCategoryExpenses.vue:219-221`: a linha
nova salva por `@keyup.enter` **e** por `@focusout`. `salvarNova()` só zera a linha **depois**
do `await criarDespesa(...)`. Entre o Enter e a resposta do servidor o rascunho continua
preenchido — então o clique fora (ou o segundo Enter) entra de novo e cria o segundo gasto.
Exatamente o que o relatório descreve. `salvar()` tem a mesma janela, mas como é PATCH do
mesmo id o efeito é idempotente e passa despercebido.

**Decisão.** Fechar a janela de reentrância no componente — e não desligar um dos dois
gatilhos: Enter e sair da linha **devem** salvar, é o que faz a edição no lugar funcionar.

**Escopo.**
- Limpar o rascunho da linha nova **antes** do await (restaurando no erro, junto do toast).
- Guarda de reentrância por linha, cobrindo também `salvar()`.
- Confirmação visível do salvamento na linha — hoje o casal não sabe se o Enter fez algo, o
  que é metade do motivo de ele ter clicado fora em seguida.
- E2E: digitar nome, Enter, clicar fora, esperar **um** gasto.

### A4 · Ponto 16 — a tela pisca antes de salvar o contrato ✅

**Concluído em 21/09/2026.** A lógica inteira da contratação mudou-se para
`server/utils/contratar-gasto.ts`, e as duas portas passaram a usá-la: a rota do fornecedor,
que já existia, e a nova `POST /api/finance/expenses/:id/contract` — a rota do **objeto
certo**, já que é o gasto que ganha custo final. O client faz uma chamada e **um**
`atualizarFinanceiro()`, no lugar de duas mutações em série com quatro releituras cada.
`contratarFornecedor` saiu do composable (virou código morto com a unificação).

Duas coisas entraram junto, e as duas são a seção 1.1 em ato:

- **`atualizarFinanceiro()` migrou de `refreshNuxtData` para o hook direto.** Era o último
  módulo a depender de a aba ficar ociosa para mostrar o que o casal acabou de salvar.
- **A varredura de auditoria ganhou uma terceira declaração**, `auditoria delegada:`, que
  nomeia o util responsável — e o teste **abre o destino** para confirmar que ele registra.
  Não é dispensa: é afirmação verificável, no mesmo espírito de `auditoria em transação:`.
  Sem isso, delegar teria silenciado a trilha das duas rotas.

**Diagnóstico.** Registrar valor fechado num gasto sem fornecedor
(`useFinance.registrarContratacao`, `app/composables/useFinance.ts:119`) faz duas mutações em
série — `atualizarDespesa` e depois `gerarParcelasDaDespesa` — e **cada uma** chama
`atualizarFinanceiro()`, que são quatro releituras (linhas 86-93). Somando o
`atualizarFornecedores()` da página, são cerca de nove releituras encadeadas com a modal ainda
aberta. A ficha remonta no meio do caminho, em estados intermediários (contratado sem parcela,
depois com parcela): é o "some e aparece várias telas e modais" do relatório.

**Decisão.** Uma contratação é **um** ato: uma chamada ao servidor e uma releitura.

**Escopo.**
- Endpoint único para registrar valor fechado sem fornecedor, gravando custo e parcelas na
  mesma transação — espelhando o que `/vendors/:id/contract` já faz com fornecedor.
- `registrarContratacao` passa a fazer uma chamada e **um** `atualizarFinanceiro()` no fim.
- Fechar a modal só depois do sucesso, com o botão em estado de salvamento — sem tela
  intermediária.
- `atualizarFinanceiro()` migra de `refreshNuxtData` para o hook direto (o débito da
  seção 1.1), alinhando o módulo com Planejamento e Onboarding.

### A5 · Ponto 26 — o menu do site não tem a lista de presentes ✅

**Concluído em 21/09/2026.** O menu passou a ser derivado de `resolveHomeSections()`, com a
ordem que o casal salvou (o layout passou a informar `sectionOrder`, que o NavBar não
recebia). A curadoria virou dado: o catálogo ganhou `noMenu`, hoje só em Boas-vindas e
Versículo — que não são destino de navegação. **A barra mantém o teto de cinco links de
texto**, que é medição registrada no próprio componente (cinco destinos + botão ≈ 990px, com
folga em 1280px); o que passa disso vai para o painel do menu, que agora também abre no
desktop quando há excedente. A reescrita dos testes revelou que a divergência era maior do
que o relatado: a lista fixa discordava do catálogo **também na ordem** — o teste afirmava
`manual-convidados` antes de `rsvp`, e na home o RSVP vem primeiro. Os destinos esperados nos
testes passaram a ser derivados do catálogo, e dois testes novos cobrem a regra: todo destino
ligado tem caminho (barra ou painel), e a lista de presentes continua no menu quando o
destaque do casal é outro — o ponto 26 na forma exata em que foi relatado.

**Diagnóstico.** `app/components/public/NavBar.vue:78-90`: os links do menu são uma lista fixa
de cinco destinos, escrita à mão, filtrada por `activeSections`. Presentes só aparece se for o
**atalho em destaque** do casal — no site testado o destaque era "Confirmar Presença", então a
lista de presentes sumiu do menu inteiro. Dress Code, FAQ, Boas-vindas e Cronograma nunca
estiveram lá.

**Decisão.** Derivar o menu de `resolveHomeSections()`, como o Hero já faz. É a terceira lista
paralela do projeto e a segunda a quebrar do mesmo jeito (seção 1.2).

**Escopo.**
- Os links passam a ser derivados do catálogo (ordem, rótulo e visibilidade vindos de lá).
- Curadoria vira **dado**, não código: a seção diz se entra no menu, e o casal continua
  mandando pelo que liga em `activeSections`.
- Presentes continua com tratamento de CTA, mas deixa de ser a única forma de chegar lá.
- Teste: toda seção visível tem caminho no menu (o teste que teria pego o bug dos 8 atalhos
  para 11 seções).

### A6 · Ponto 27 — "Confirmar presença" duas vezes na capa ✅

**Concluído em 21/09/2026.** A barra só entra depois que a capa sai da viewport
(IntersectionObserver sobre `[data-capa]` no Hero, com transição curta). O estado inicial é
**derivado da rota**, não medido: no servidor não há viewport, e um palpite diferente do
cliente seria divergência de hidratação — só a home tem capa, então o HTML já sai sem a barra
ali e com ela nas outras páginas. O espaçador continua de pé mesmo com a barra escondida: ele
vive no fim da página, e criar 80px de altura no instante em que a barra entra empurraria o
conteúdo debaixo do dedo de quem rola.

**Correção do plano:** o item previa aplicar a mesma regra ao `ScrollToTopButton` — ele **já
a tinha** (`SHOW_AFTER_PX = 480`, com o comentário explicando que evita pousar em cima desta
mesma barra). Nada a fazer ali.

**Diagnóstico.** `app/components/public/MobileCtaBar.vue:21` decide só por `activeSections` —
a barra é `fixed` e está visível desde o primeiro pixel. Com o Hero mostrando o mesmo botão (e
o relatório fotografou os dois a três dedos de distância), a primeira impressão do site é um
pedido repetido.

**Decisão.** A barra existe para quem **já rolou** e ficou longe do CTA. Enquanto o Hero
estiver na tela, ela não tem função.

**Escopo.**
- A barra só entra depois que o Hero sai da viewport (IntersectionObserver), com transição
  curta — aparecer de supetão é pior que estar sempre lá.
- Mesma regra para o `ScrollToTopButton`, que tem o mesmo direito de não competir com a capa.
- Sem mexer no espaçador: ele continua reservando altura para o rodapé não ficar coberto.

---

## Fase B · A porta de entrada

Hoje o caminho "equipe cria → dono recebe e-mail → dono entra" não fecha (seção 1.3).

### B1 · Ponto 1 — endereço do site: sugerir e confirmar

**Diagnóstico.** `app/components/platform/PlatformWeddingCreateModal.vue:61` tem só `:error` —
validação negativa. Nada confirma que o endereço está bom, e nada sugere um a partir do nome
do casal, embora o campo do nome esteja logo acima. A colisão de endereço só aparece no 409
do servidor, depois do Criar.

**Decisão.** O campo passa a responder enquanto se digita, nos dois sentidos.

**Escopo.**
- Sugestão derivada do nome do casal ("Lucas Almeida e Maria Almeida" vira `lucas-e-maria`),
  preenchida enquanto o operador não tiver digitado o endereço à mão — e nunca sobrescrevendo
  o que ele escreveu.
- Estado de validade visível: formato ok **e** endereço disponível, checado no servidor com
  debounce, mostrando o endereço final que o casal vai usar.
- O 409 continua sendo a garantia real (é a chave de idempotência do `unique`) — a checagem
  prévia é conveniência, não autoridade.

### B2 · Ponto 3 — o e-mail de convite é o template cru do Supabase

**Diagnóstico.** "You've been invited / Accept invitation" é o template padrão do Supabase
Auth. A plataforma já tem layout de e-mail próprio (`server/utils/email-layout.ts`:
tipografia, cor do casamento, rodapé explicando por que a pessoa recebeu aquilo) — mas ele só
é usado nas comunicações do casal, nunca no caminho de autenticação.

**Decisão.** O primeiro e-mail que o casal recebe da plataforma não pode ser o mais feio.
Aproveitar o layout que já existe.

**Escopo.**
- Templates do Auth (convite, link mágico, recuperação, confirmação) reescritos com o mesmo
  layout, marca e tom das nossas mensagens.
- **Migrar o link para `token_hash` + `verifyOtp` no servidor** (achado de 21/09/2026, ver
  item A1): com PKCE, o link só funciona no navegador que o pediu **e só enquanto for o
  pedido mais recente** — pedir de novo queima o anterior. O template é justamente onde essa troca se faz
  (`{{ .TokenHash }}` no lugar do `{{ .ConfirmationURL }}`), então as duas coisas andam
  juntas — e é por isso que o A1 parou onde parou.
- Conteúdo do convite: quem criou o evento, o que é a plataforma, o que fazer agora, e um
  botão único que leva ao callback (A1).
- Os templates do Auth são **configuração do projeto Supabase**, não do repositório:
  versionar o HTML em `supabase/templates/` com um README dizendo onde colar, para não
  existirem só no dashboard. Aplicar nos três ambientes.

### B3 · Ponto 4 — não existe definir nem redefinir senha

**Diagnóstico.** `app/pages/login.vue` oferece senha **ou** link mágico. Não há "esqueci minha
senha", não há tela de definir senha, e o convite não leva a lugar nenhum (A1). Na prática o
casal só entra por link mágico — e, com o ponto 5, nem isso.

**Decisão.** Fechar o ciclo: convite → definir senha → entrar; e esqueci → redefinir.

**Escopo.**
- `app/pages/auth/senha.vue` — define/redefine senha a partir de uma sessão de recuperação
  (que chega pelo callback do A1), com as regras do schema Zod de auth.
- "Esqueci minha senha" no login, disparando `resetPasswordForEmail` com o mesmo callback.
- O convite (B2) leva direto para definir senha; o link mágico continua existindo como
  caminho alternativo, não como único.
- Trocar a própria senha entra em Configurações (conta), não no wizard.

### B4 · Ponto 6 — landing page com acesso ao login

**Diagnóstico.** `app/pages/index.vue` é uma página neutra `noindex` que diz "acesse pelo link
do casamento que você recebeu". Foi escrita para o convidado que erra o endereço — e hoje é
também o que o **casal** vê quando digita o domínio, sem nenhum caminho para entrar.

**Decisão (fechada em 21/09/2026).** Uma landing enxuta, com o Login como ação principal. Não
é a página de vendas — é a porta. A página comercial (posicionamento, preços, prova social,
cadastro self-service) fica **nomeada no roadmap** como trabalho próprio, para quando billing
existir: ela não é uma versão maior desta página, é outra coisa.

**Escopo.**
- Capa curta: o que é a plataforma, para quem é, e **Entrar** em destaque.
- O aviso atual continua, como segunda leitura — o convidado perdido ainda chega aqui.
- Continua `noindex`. Indexar é decisão da página comercial, não desta.
- Registrar a página comercial em `docs/ROADMAP.md`, junto do que já depende de billing.
- Cuidado de performance: esta página **não** pode carregar o SDK do Supabase (ver o achado
  de bundle em `nuxt.config.ts`) — o botão Entrar é um link para `/login`, não um formulário.

---

## Fase C · Financeiro inteiro

Oito pontos, todos no módulo mais denso do painel. Dois temas os organizam: **planejar tem de
ser barato** (C1-C4) e **o fornecedor é um objeto de primeira classe** (C5-C8).

### C1 · Ponto 10 — "categorias sugeridas" devolve uma tela de zeros

**Diagnóstico.** `app/pages/admin/[slug]/financeiro/index.vue:328`: `comecarComSugeridas()`
cria as categorias, mostra um toast e **fica em Gastos**. O estado vazio some (agora existem
categorias), mas a lista de gastos continua vazia — o casal clicou em "começar" e recebeu a
mesma tela, agora com zeros. Não há nada errado no dado; o erro é o destino.

**Decisão.** A ação leva para onde o trabalho continua: Categorias. Semear categorias é o
começo do planejamento, e o planejamento acontece lá.

**Escopo.**
- Depois de semear, navegar para `/financeiro/categorias`.
- Chegar lá pela primeira vez mostra uma linha de explicação — o que é esta tela, o que fazer
  com ela — que some quando a primeira categoria tiver gasto (mesma lógica de acolhimento do
  Início, não um modal).
- A categoria vem aberta, com o campo de gasto pronto para digitar: o casal cai no gesto, não
  numa lista para contemplar.

### C2 · Ponto 13 — a tela de Categorias não diz que serve para planejar

**Diagnóstico.** O nome "Categorias" descreve o **objeto**, não a **pergunta**. Quem entra em
Financeiro vê Gastos primeiro (`app/utils/admin-nav.ts:308-318`) e não tem pista de que o
planejamento por categoria existe. O relatório pede inverter a ordem do menu.

**Decisão (fechada em 21/09/2026).** Resolver pelo **nome e pelo caminho**, não pela ordem.
Inverter o menu penalizaria todo uso recorrente do módulo para ajudar o primeiro — e o
primeiro uso já tem um caminho melhor: o estado vazio.

**Escopo.**
- Renomear a tela para dizer o que ela responde — "Planejamento por categoria" no menu, com
  "Onde o dinheiro está indo" continuando como título da tela (a pergunta do agregado).
- O estado vazio de Gastos (C1) é a porta: quem nunca planejou entra por lá.
- Atualizar `CLAUDE.md` seção 12 e `docs/fase1-financeiro.md` com o nome novo e o motivo —
  a ordem "listar, planejar, pagar" continua valendo e passa a estar explicada no lugar certo.
- Conferir que o nome novo cabe no menu recolhido e na barra de abas do celular; se não
  couber inteiro, o menu abrevia e o título da tela carrega a frase completa.

### C3 · Ponto 11 — nome de categoria não cabe

**Diagnóstico.** `app/pages/admin/[slug]/financeiro/categorias.vue:245` fixa a coluna do nome
em `sm:w-44` com `truncate`. "Cerimônia e assessoria" vira "Cerimônia e asses…" — e são nomes
do **nosso** catálogo de sugeridas, não nomes que o casal inventou. O relatório é preciso: ao
menos as sugeridas têm de caber.

**Decisão.** A largura serve ao nome mais longo do catálogo; acima disso, o nome completo fica
acessível sem depender do olho.

**Escopo.**
- Largura da coluna calibrada pelo maior nome de `shared/orcamento-categorias.ts`, com a barra
  de proporção cedendo espaço (ela é comparativa, não precisa de largura absoluta).
- Nome customizado longo continua truncando, mas com o nome completo em `title` e em
  `aria-label` — tooltip nativo, sem componente novo (o sistema de tooltips é o item D3).
- Teste de regressão: nenhum nome do catálogo de sugeridas trunca na largura mínima suportada.

### C4 · Ponto 15 — não dá para excluir um gasto de dentro da categoria

**Diagnóstico.** `FinanceCategoryExpenses.vue:206` tem uma única ação por linha: abrir a ficha.
Para apagar um gasto criado por engano — ou uma das duas linhas duplicadas do ponto 14 — é
preciso abrir a ficha, rolar até Detalhes e usar "Excluir gasto". Três telas para desfazer um
gesto que custou um Enter.

**Decisão.** A tela onde criar é barato precisa ter o desfazer igualmente barato.

**Escopo.**
- Menu de linha (`AdminRowMenu`, que o Modo lista de Convidados já usa) com Abrir ficha e
  Excluir — mesmo vocabulário de interação das outras listas do painel.
- Excluir pede confirmação só quando o gasto tem algo pendurado (fornecedor, parcela,
  documento); gasto só planejado sai direto, com desfazer no toast.
- A exclusão continua sendo soft delete, como o resto do módulo.

### C5 · Ponto 17 — contratar sem proposta não cria fornecedor

**Diagnóstico.** `useFinance.registrarContratacao` (`app/composables/useFinance.ts:119`): sem
`fornecedorId`, ele só grava `valorCentavos` na despesa e gera parcelas. **Nenhum fornecedor é
criado ou vinculado** — e a modal de contrato nem pergunta o nome. Como o relatório observa, o
casal que fecha com o buffet sem ter cadastrado proposta fica sem fornecedor para relacionar
depois, e sem a quem vincular documentos.

**Decisão (fechada em 21/09/2026).** Todo contrato tem um fornecedor, e o campo é
**obrigatório** — é o que o `CLAUDE.md` já afirma ("contratar grava o vínculo nos **dois**
sentidos"). O que falta é o caminho por onde o fornecedor nasce quando não veio de uma
proposta.

**Escopo.**
- A modal de contrato passa a pedir **quem** — campo de fornecedor com autocompletar sobre os
  já existentes no casamento e criação inline pelo nome digitado.
- Nome vazio deixa de ser aceito: quem fecha um valor sabe com quem fechou, e um contrato sem
  contraparte é o buraco que este ponto descreve. O atrito é de um campo, e ele vem com o
  nome sugerido quando há proposta.
- O schema Zod da contratação passa a exigir fornecedor (id existente **ou** nome novo), para
  que a regra valha no servidor e não só na tela.
- Na mesma transação do C/A4: criar fornecedor, marcar contratado, gravar custo, gerar
  parcelas — um ato, uma chamada.
- Migração dos gastos já contratados sem fornecedor: ficam como estão (não inventamos nome),
  e a ficha mostra o campo vazio convidando a preencher.

### C6 · Ponto 18 — falta a lista de fornecedores

**Diagnóstico.** Fornecedor hoje só existe **dentro** da ficha do gasto — decisão deliberada e
documentada ("Fornecedor não tem lista própria… é uma proposta DENTRO da ficha do gasto que
disputa"). O relatório traz um caso de uso que essa decisão não previu: **passar a lista para
a cerimonialista** — quem é o buffet, quem é o DJ, telefone de cada um, no dia do evento.

**Decisão.** A decisão original continua certa para o **cadastro** (fornecedor órfão não
existe), e errada para a **leitura**. É o mesmo critério que o módulo já usa: tela nova se
justifica por eixo novo ou por agregação. Aqui é agregação — os mesmos fornecedores somados
por casamento respondem uma pergunta que a lista de gastos não responde.

**Escopo.**
- Tela de leitura em `/financeiro/fornecedores`: quem, de que gasto, contato, valor fechado,
  situação de pagamento derivada das parcelas.
- **Sem cadastro solto**: o botão de criar continua sendo o da ficha do gasto. Esta tela lista
  e exporta, não cria — é o que mantém a garantia de que nenhuma cotação existe órfã.
- Exportar/imprimir (o caso da cerimonialista), reaproveitando `PrintButton` e o exportador
  de convidados.
- Atualizar `CLAUDE.md` seção 12 e `docs/fase1-financeiro.md`: a frase "fornecedor não tem
  lista própria" passa a ser "fornecedor não tem **cadastro** próprio".

### C7 · Ponto 19 — a ordem da ficha do gasto é ao contrário

**Diagnóstico.** `app/pages/admin/[slug]/financeiro/gastos/[id].vue`: Propostas (421) →
Contrato (508) → Pagamentos (536) → Documentos (580) → **Detalhes (625)**. O nome, a categoria
e o valor estimado — o que o casal escreveu primeiro e o que ele revisa mais — estão no fim,
depois de quatro painéis.

**Decisão.** A ficha segue a vida do gasto: planejo, cotei, fechei, anexei. Detalhes primeiro.

**Escopo.**
- Nova ordem: **Detalhes → Propostas → Contrato → Pagamentos → Documentos**. Pagamentos fica
  depois de Contrato porque só existe a partir dele (e some quando não há contrato, como hoje).
- Detalhes deixa de ser um formulário com botão "Salvar alterações" no rodapé da página e
  passa a salvar como o resto do módulo já salva (edição no lugar) — caso contrário ele vira
  a primeira coisa que a tela pede e a última que ela confirma.
- "Excluir gasto" sai do meio dos campos e vai para o menu do cabeçalho da ficha, junto das
  outras ações destrutivas do painel.

### C8 · Ponto 20 — falta ver o que já paguei e o que vou pagar

**Diagnóstico.** A tela de Pagamentos existe e é o eixo do tempo do módulo. O que o relatório
não encontrou é o **fechamento**: sinal pago, parcelas quitadas, o que vem a seguir. Hoje o
topo do módulo mostra contratado e pago (`FinanceTotalsHeader`), mas a leitura "quanto já saiu
e quanto falta, e quando" não está em nenhum lugar de forma direta.

**Decisão.** Não é tela nova — é o resumo que a tela de Pagamentos deveria abrir e não abre.

**Escopo.**
- Resumo no topo de Pagamentos: **pago** (quanto, em quantas parcelas), **a vencer nos
  próximos 30 dias**, **vencido**, e o saldo contratado ainda sem data (que o módulo já trata
  como linha `a_definir`).
- Cada número é um filtro da lista abaixo — nenhum deles abre outra tela.
- Todos os pisos em zero aplicados **por linha antes de somar**, como o `CLAUDE.md` exige; e
  indicador sem base é omitido, nunca exibido como zero.
- Na ficha do gasto, o painel Pagamentos ganha a mesma leitura no recorte daquele gasto.

---

## Fase D · Não deixar o casal sozinho

Três pedidos que, tratados como lista de textos, viram 40 implementações diferentes. Tratados
como sistema, são um mecanismo e um catálogo.

### D1 · Ponto 8 — ajuda por tela, no primeiro acesso

**Diagnóstico.** O Início tem acolhimento (o roteiro de Primeiros passos) e o Financeiro tem
estado vazio bem escrito. Fora isso, quem abre Convidados, Mesas, Comunicações ou Presentes
pela primeira vez recebe uma tela pronta para quem já sabe o que ela faz.

**Decisão.** Um mecanismo único, com o mesmo formato em todas as telas: **o que esta tela
responde, o que dá para fazer aqui, por onde começar**. Não é tour guiado (que interrompe e é
ignorado), não é modal (que precisa ser fechado antes de qualquer coisa): é um bloco no topo,
dispensável, que volta pelo ponto de interrogação do cabeçalho.

**Escopo.**
- Catálogo em `shared/ajuda-de-tela.ts` — uma entrada por tela, com texto, e derivado por
  rota. Fonte única, pelo mesmo motivo de `home-sections.ts` (seção 1.2).
- Componente `AdminScreenHelp`, no topo do conteúdo, acima dos filtros.
- "Visto" é **por pessoa e por tela**, não por casamento: é preferência de quem usa
  (`CLAUDE.md` seção 12 — o que pertence à pessoa atravessa a troca de evento).
- Ponto de interrogação fixo no cabeçalho do painel reabre a ajuda da tela atual.
- O estado vazio de cada tela continua existindo e **não** é substituído pela ajuda: um
  descreve a tela, o outro descreve a ausência de dado.

### D2 · Ponto 9 — modelo padrão de tarefas, organizado em meses

**Diagnóstico.** `app/pages/admin/[slug]/planejamento/index.vue` abre com a checklist vazia por
decisão registrada, e oferece sugestões no rodapé de cada janela. O relatório diz que, na
prática, o casal "cai aqui perdido demais" e cita o concorrente que entrega um cronograma
pronto. Além disso, as janelas atuais (Próximos 7 dias / Mais adiante / De etapas que já
passaram) não conversam com a forma como se fala de casamento: "10 meses antes".

**Decisão.** Dois movimentos, e nenhum deles quebra a regra de que sugestão não é linha no
banco (seção 2): **aplicar um modelo continua sendo um clique explícito do casal**.

**Escopo.**
- **Modelo padrão aplicável:** um botão no estado vazio ("Começar com o cronograma padrão")
  que cria as tarefas do catálogo com prazos calculados a partir da data do evento. Requer
  confirmação com a contagem ("vai criar 28 tarefas"), e é reversível.
- **Janelas por contagem regressiva:** os grupos passam a ser "12 meses antes", "9 meses
  antes", "6 meses antes"… derivados do prazo de cada tarefa contra a data do evento — o eixo
  continua sendo o tempo, muda a régua. Tarefa vencida e desta semana continuam no topo:
  quem tem algo atrasado não quer ler "6 meses antes" primeiro.
- O catálogo `shared/planejamento-tarefas.ts` ganha as tarefas que faltam para o modelo ser
  um cronograma de verdade, com as janelas em meses.
- **Sugestão de fase já passada continua nascendo sem prazo** — quem descobre o produto a
  quatro meses do casamento não recebe quinze linhas vermelhas.
- Atualizar `docs/fase3-planejamento.md` com a fronteira: catálogo sugere, modelo é aplicado a
  pedido, nada nasce sozinho.

### D3 · Ponto 12 — tooltips onde fazem falta

**Diagnóstico.** O relatório pede uma análise detalhada, e ele está certo em não listar: hoje
não existe componente de tooltip no design system, então cada caso viraria uma solução local.

**Decisão.** Primeiro o componente, depois o inventário. Sem o componente, o inventário produz
40 implementações; com ele, produz 40 linhas de texto.

**Escopo.**
- `UiTooltip` no design system (Reka UI já traz a primitiva), com as regras de acessibilidade
  que o `CLAUDE.md` seção 13 exige — e a lição registrada lá: **nome acessível nunca se apoia
  em id** sob SSR; o conteúdo do tooltip é descrição, nunca o nome do controle.
- Inventário por tela, priorizando: rótulos truncados (C3), ícones sem texto, números
  derivados (estimado x contratado x pago, estágio do convite, faixa etária), e toda coluna
  cujo cabeçalho é uma palavra que só o produto entende.
- Em toque, tooltip não existe: onde a informação for necessária no celular, ela vira texto
  visível, não gesto escondido.
- Documentar no `docs/DESIGN-SYSTEM.md` quando usar tooltip e quando o texto tem de estar na
  tela.

---

## Fase E · Casa arrumada

Duas telas que cresceram além do formato em que nasceram.

### E1 · Ponto 21 — Presentes sem menu de seção

**Diagnóstico.** `app/utils/admin-nav.ts:204`: Presentes é um destino simples da nav primária,
e `adminSectionMenu()` não tem um ramo para ele — por isso a coluna não aparece. A tela única
acumula hoje o arrecadado, os pagamentos com falha, a lista de presentes e as categorias.
Convidados e Financeiro já migraram para menu de seção; Presentes ficou.

**Decisão.** Dar a Presentes o mesmo tratamento — mas pelo critério do módulo, não por
simetria: cada item do menu precisa ser **eixo novo ou agregação**, senão vira filtro
promovido a tela (o erro que o Financeiro já corrigiu ao sair de quatro telas para três).

**Escopo.**
- **Lista** — os presentes, o objeto do módulo (inclui as categorias como filtro, não como
  tela).
- **Recebidos** — eixo novo: o dinheiro que entrou, por presente e por convidado, com os
  pagamentos que falharam (hoje um número solto no topo, sem lugar para investigar).
- **Como aparece no site** — o que o convidado vê: ordem, texto, e o que está publicado.
- Sem tela de categorias: assim como no Financeiro, categoria é atributo. Se a agregação por
  categoria provar valor depois, entra pelo mesmo critério de Categorias no Financeiro.

### E2 · Ponto 22 — Configurações grandes demais

**Diagnóstico.** `SETTINGS_ASSUNTOS` (`app/utils/admin-nav.ts:99-151`) tem 5 assuntos e 13
seções — e a ordem atual é a ordem em que foram construídas, não a ordem em que o casal
precisa delas. Quem acabou de entrar precisa de O evento, Branding e publicar; "Opções
avançadas" e "Classificação etária" estão no mesmo nível de destaque.

**Decisão.** Ordenar pelo uso real, e dar dois caminhos de acesso direto — busca e índice —
em vez de tentar encolher a tela.

**Escopo.**
- **Reordenar** os assuntos pela sequência de uso: O evento → Aparência → Conteúdo → RSVP e
  convidados → Avisos → Colaboradores → Avançado. Dentro de cada assunto, o mesmo critério.
- **Busca de configuração:** `GlobalSearch.vue` já existe no painel — estender o índice dela
  para as seções e os campos de Configurações, em vez de criar uma segunda busca. Digitar
  "countdown" ou "contagem" leva à seção certa.
- **Índice** no topo da tela: os assuntos como âncoras, para quem navega olhando em vez de
  digitando.
- **Sem separar em "básico/avançado"**: a decisão de ser completo em personalização está
  tomada (`CLAUDE.md` seção 13), e esconder metade das opções atrás de um botão troca um
  problema de tamanho por um de descoberta.

---

## Fase F · O convite e o convidado

O fluxo por onde o produto começou, revisto com o que aprendemos depois.

### F1 · Ponto 24 — registrar envio sem opções, e o convite que não abre

**Diagnóstico.** `app/pages/admin/[slug]/comunicacoes/index.vue:155`: `registrarPorFora()`
grava canal `outro` com a data de agora, sem perguntar nada. A modal com canal, tipo e data
existe no fluxo do convite, mas não aqui — e, como todos os convites do teste estavam "sem
telefone", o botão da linha era sempre "Registrar". Falta também um caminho para **abrir o
convite** a partir da linha: ver o que o convidado vai receber.

O envio por WhatsApp **já existe** (`enviarPorWhatsApp`, linha ~95, com `wa.me` e a mensagem
do modelo) — ele só não aparece para quem não tem telefone cadastrado, que era o caso inteiro
da amostra. A "rotina de envio" que o relatório pede é outra coisa: gatilho automático.

**Decisão (fechada em 21/09/2026).** Separar as três coisas que o ponto junta: **registrar com
precisão**, **abrir o convite** e **dar ritmo ao envio** — este último **sem API oficial**. A
plataforma continua abrindo o WhatsApp com a mensagem pronta (um gesto humano por convite), e
o que ganha é a fila: quem falta, um de cada vez, registrando conforme avança.

**Escopo.**
- Registrar por fora abre a mesma modal do convite: canal (WhatsApp, e-mail, papel, outro),
  tipo e **data** — um envio feito semana passada é registrado com a data de semana passada.
- Ação "Abrir convite" na linha, levando à ficha do convite (`/convites/[id]`), e pré-visualizar
  a mensagem exatamente como o convidado recebe.
- Deixar evidente na tela o que bloqueia o envio: "sem telefone" vira um caminho para
  completar o contato, não um estado terminal (o link já existe no topo e não é visível na
  linha).
- **Envio guiado:** "Enviar para os que faltam" abre a fila dos convites pendentes daquele
  tipo e canal — um por vez, com o avanço automático depois de cada registro e o progresso
  visível ("7 de 19"). A fila é interrompível e retomável: ela é derivada de quem ainda não
  tem registro, não de um estado salvo.
- O bloqueio de pop-up continua tratado como está hoje (sem aba, sem registro) — é o que
  impede a fila de marcar como enviado algo que não saiu.

**Fora desta fase, por decisão comercial.** O **gatilho automático** de envio em massa exige
API oficial do WhatsApp Business: conta verificada, templates aprovados pela Meta e custo por
conversa iniciada. Fica registrado aqui como trabalho nomeado, não como acabamento pendente —
e depende de billing existir para fazer sentido no preço.

### F2 · Ponto 25 — a tela de confirmação precisa ser revista

**Diagnóstico.** `app/components/rsvp/RsvpInviteFlow.vue`: no celular, os pares de botões
(Estarei lá / Não poderei ir) empilham por pessoa e o "Revisar e enviar" fica logo abaixo — o
relatório descreve botões agrupados demais e um fluxo pouco intuitivo. É o fluxo mais
importante do site e o mais antigo do produto: foi desenhado antes de acompanhantes, faixas
etárias, núcleos e mesas existirem.

**Decisão.** Revisão completa do fluxo, no celular primeiro. Não é ajuste de espaçamento.

**Escopo.**
- Uma pessoa por vez no celular, com progresso visível ("2 de 4"), em vez de todos os pares
  na mesma dobra.
- Estado de cada resposta legível sem interpretar cor de botão — quem já respondeu, quem
  falta.
- Revisão final que mostra o que vai ser enviado, com caminho de volta para cada pessoa.
- Respeitar o que o produto aprendeu depois: acompanhantes, restrição alimentar, e o prazo
  (`prazo_rsvp`) explicado quando estiver perto de vencer.
- Alvos de toque e contraste conferidos com a suíte de acessibilidade que já existe.

### F3 · Ponto 28 — o site como Save the Date

**Diagnóstico.** Com cronograma, contagem regressiva e capa, o site já serve de Save the Date
— mas só se o casal souber montar isso sozinho, ligando as seções certas em
`config_tema.activeSections` (que nascem **todas desligadas**, por decisão registrada).

**Decisão.** Transformar em caminho explícito o que hoje é possível por acaso. É agregação de
valor ao produto, então merece nome, não uma dica.

**Escopo.**
- Preset "Save the Date" na Aparência: liga as seções que fazem sentido (capa, contagem,
  cronograma), com pré-visualização antes de aplicar.
- Sugestão no momento certo: casamento publicado, data longe e lista ainda vazia é
  exatamente quem precisa de um Save the Date — e o Início já sabe todos esses fatos
  (`shared/fatos-do-casamento.ts`).
- Compartilhamento: o Open Graph do site já existe; conferir que a prévia no WhatsApp mostra
  nomes, data e capa (é a forma real de circular um Save the Date).
- **Sem seção nova no catálogo:** o preset combina o que existe. Seção nova entraria pela
  regra de `home-sections.ts`, e este ponto não pede nenhuma.

### F4 · Ponto 29 — responsividade em telas menores de desktop

**Diagnóstico.** O site público foi construído para celular e para desktop largo. Entre os
dois — notebooks de 13", janelas não maximizadas, ~1024-1280px — o relatório descreve "pouco
ou quase nada" de adaptação. O painel tem o mesmo risco na faixa em que o menu de seção e o
conteúdo disputam largura.

**Decisão.** Tratar a faixa intermediária como um alvo de verdade, não como consequência.

**Escopo.**
- Varredura das seções públicas nas larguras 1024, 1152, 1280 e 1366, corrigindo o que
  quebrar (tipografia que não escala, grids de duas colunas que deveriam ser uma, imagens que
  estouram).
- Mesma varredura no painel, com atenção à faixa em que o menu de seção recolhe.
- Fixar os pontos de controle em teste visual para não regredir — a suíte E2E já roda
  contra o build de produção.

---

## Fase G · Velocidade

### G1 · Ponto 23 — o painel demora milissegundos perceptíveis

**Diagnóstico.** Sintoma consistente com o que o módulo já faz: cada tela do painel monta
vários `useFetch` e cada mutação dispara releituras em bloco (`atualizarFinanceiro()` são
quatro de uma vez). Não há medição sistemática do caminho administrativo — a auditoria de
performance já feita mirou o site público.

**Decisão.** Medir antes de otimizar, e medir **depois** das fases C e E, que mudam justamente
as telas mais pesadas.

**Escopo.**
- Medir navegação entre telas do painel e tempo até interação, por rota.
- Alvos prováveis, a confirmar com dado: releituras em bloco que poderiam ser pontuais,
  endpoints que devolvem mais do que a tela usa, e `useFetch` que poderiam compartilhar chave
  (o layout e o Início já fazem isso com `wedding`).
- Registrar os números no `docs/CHANGELOG.md`, como foi feito com o LCP do site público.

### G2 · Ponto 30 — auditoria de performance do site público

**Diagnóstico.** O site já passou por uma rodada séria (o `nuxt.config.ts` documenta a remoção
do plugin Supabase das rotas públicas e o corte do prefetch do SDK, ~61 kB gzip por
convidado). O pedido agora é manter isso verdadeiro enquanto o site cresce.

**Decisão.** Transformar a auditoria pontual em porta de CI.

**Escopo.**
- Orçamento de performance por rota pública (peso de JS, LCP, CLS), medido no build de
  produção.
- CI falha quando o orçamento é estourado — o mesmo espírito dos gates que já existem
  (tipos vs migrations, auditoria de rotas, escopo por casamento).
- Foto do estado atual antes da Fase F, para que a revisão do RSVP e o preset de Save the
  Date sejam medidos contra ela.

---

## Fase H · Contas e permissões (ponto 2)

**Diagnóstico.** A plataforma já tem o modelo: `membros_casamento` com a escada
dono > planejador > colaborador (`shared/papeis-de-membro.ts`, com par em SQL), acesso de
suporte com validade (`acesso_suporte_expira_em`) e `operadores_plataforma` para a equipe
interna. O que não existe é **tela**: operador da plataforma só nasce por script
(`scripts/criar-operador-plataforma.mjs`, hoje nem versionado), e não há lugar no
`/plataforma` para ver ou gerenciar quem é quem. O relatório está certo em pedir que os tipos
de usuário e as permissões sejam planejados — mas boa parte já está decidida e implementada;
falta expor.

**Decisão (fechada em 21/09/2026).** Uma fase própria, com documento próprio
(`docs/fase6-contas-e-acessos.md`), porque envolve regra de negócio nova e não só interface —
e **por último**, depois de todas as outras. A plataforma termina de servir bem o casal antes
de servir quem revende; até lá a equipe interna convive com o script manual de operador.

Uma consequência prática de ficar por último: `scripts/criar-operador-plataforma.mjs` hoje
nem está versionado. Se ele é o caminho oficial por mais algumas fases, precisa entrar no
repositório com instruções — um caminho oficial que só existe na máquina de uma pessoa é um
risco de continuidade, não uma pendência de conforto. **Isso entra na Fase A**, como higiene,
não espera a Fase H.

**Escopo previsto (a refinar no documento da fase).**
- **Operadores da plataforma:** listar, conceder e revogar pelo `/plataforma`, com trilha de
  auditoria (`tipo_autor = 'operador'`, que já existe). Fim do script manual.
- **Contas de cliente:** ver quem tem acesso a qual evento, com qual papel — hoje isso só é
  visível dentro de cada casamento.
- **Assessoria como cliente de verdade:** o papel `planejador` existe e alcança colaboradores,
  mas não há tela onde uma assessoria veja seus eventos como carteira.
- **Acesso de suporte:** conceder pelo painel interno com validade, em vez de `INSERT` manual
   — o vínculo temporário já é lido corretamente (`is_membro_casamento` ignora vínculo vencido).
- **O que fica fora:** cadastro self-service de casal e cobrança. Dependem de billing.

---

## Índice: os 30 pontos e onde cada um foi parar

| # | Ponto do relatório | Fase | Item | Natureza |
|---|---|---|---|---|
| 1 | Endereço do site sem confirmação nem sugestão | B | B1 | Acabamento |
| 2 | Sem gestão de usuários no `/plataforma` | H | — | Produto novo |
| 3 | E-mail de convite sem graça | B | B2 | Acabamento |
| 4 | Convite não leva ao login; sem definir senha | B | B3 | **Bug** |
| 5 | Link mágico não redireciona para o login | A | A1 | **Bug** |
| 6 | Falta landing page com acesso ao login | B | B4 | Produto novo |
| 7 | Primeiros passos não marcam o que foi feito | A | A2 | **Bug** |
| 8 | Falta ajuda contextual por tela | D | D1 | Produto novo |
| 9 | Planejamento sem modelo padrão, e sem meses | D | D2 | Produto novo |
| 10 | Categorias sugeridas devolvem tela de zeros | C | C1 | **Bug de fluxo** |
| 11 | Nome de categoria não cabe na tela | C | C3 | Acabamento |
| 12 | Falta tooltip em muitos lugares | D | D3 | Produto novo |
| 13 | Categorias não parece ser planejamento | C | C2 | Decisão fechada |
| 14 | Gasto adicionado duas vezes | A | A3 | **Bug** |
| 15 | Não dá para excluir gasto pela categoria | C | C4 | Acabamento |
| 16 | Telas e modais piscam ao registrar contrato | A | A4 | **Bug** |
| 17 | Contratar sem proposta não cria fornecedor | C | C5 | **Bug** |
| 18 | Falta lista de fornecedores | C | C6 | Produto novo |
| 19 | Ordem da ficha do gasto está invertida | C | C7 | Acabamento |
| 20 | Falta visão do pago e do que falta pagar | C | C8 | Produto novo |
| 21 | Presentes sem menu de seção | E | E1 | Acabamento |
| 22 | Configurações grandes demais | E | E2 | Produto novo |
| 23 | Painel lento em alguns momentos | G | G1 | Performance |
| 24 | Registrar envio sem opções; convite não abre | F | F1 | **Bug de fluxo** |
| 25 | Tela de confirmação de presença precisa melhorar | F | F2 | Produto novo |
| 26 | Menu público sem lista de presentes | A | A5 | **Bug** |
| 27 | Confirmar presença aparece duas vezes na capa | A | A6 | **Bug** |
| 28 | Site como Save the Date | F | F3 | Produto novo |
| 29 | Sem responsividade em telas menores | F | F4 | Acabamento |
| 30 | Falta auditoria de performance do site público | G | G2 | Performance |

**Contagem:** 8 bugs (6 confirmados no código, 2 de fluxo), 7 de acabamento, 11 de produto
novo, 2 de performance, 1 decisão de produto, 1 fase inteira. As cinco decisões que dependiam
do dono do produto foram fechadas em 21/09/2026 — ver a seção seguinte.

---

## Decisões fechadas — 21/09/2026

As cinco decisões que dependiam do dono do produto foram tomadas antes do início da execução.
Nenhuma fase começa com escopo em aberto.

| # | Decisão | Resposta | Efeito |
|---|---|---|---|
| 1 | Ordem do menu do Financeiro (ponto 13) | **Renomear, manter a ordem** | Gastos continua primeiro; a tela vira "Planejamento por categoria" e o estado vazio leva até ela. `CLAUDE.md` seção 12 fica como está |
| 2 | Fornecedor ao contratar (C5) | **Obrigatório** | A modal passa a exigir quem, com criação inline; a regra vale também no schema do servidor |
| 3 | Rotina de envio de convites (F1) | **Envio guiado, sem API** | Fila de quem falta, um por vez, sobre o `wa.me` que já existe. API oficial fica nomeada no roadmap |
| 4 | Prioridade da Fase H | **Por último** | Contas e permissões depois de todas; o script de operador entra no repositório na Fase A como higiene |
| 5 | Landing na raiz (B4) | **Porta agora, produto depois** | Capa com Entrar, `noindex`; a página comercial vira item de roadmap ligado a billing |

**O que nenhuma delas mudou:** a Fase A. Os seis bugs são independentes de qualquer uma
destas escolhas, e é por onde a execução começa.

### Registradas no roadmap, fora desta rodada

Duas escolhas acima empurram trabalho para depois. Ele fica **nomeado**, não esquecido:

- **Página comercial da plataforma** — posicionamento, preços, prova social, cadastro
  self-service. Depende de billing (`docs/ROADMAP.md`, modelo de monetização).
- **Envio automático por WhatsApp Business API** — conta verificada, templates aprovados pela
  Meta, custo por conversa. Depende de billing para caber no preço.

---

## Como este documento se relaciona com os outros

- Regra de negócio nova vai para o documento do módulo quando a fase for executada
  (`docs/fase1-financeiro.md` para C, `docs/fase3-planejamento.md` para D2,
  `docs/fase4-onboarding.md` para A2, `docs/PRODUCT.md` para F).
- Regra crítica que mude (ordem do Financeiro, fornecedor obrigatório, lista de fornecedores)
  vai para o `CLAUDE.md` **no mesmo PR** da mudança — o `CLAUDE.md` prevalece, então um
  documento desatualizado em relação a ele é o documento que está errado.
- O que foi **descoberto** durante a execução (bug real, reversão de escopo) vai para
  `docs/CHANGELOG.md`, que é onde a história das decisões não óbvias mora.
- Este documento não é atualizado item a item conforme as fases andam: ele é o retrato do
  levantamento de 20/09/2026 e do plano que saiu dele. O estado atual de cada módulo vive no
  documento do módulo.
