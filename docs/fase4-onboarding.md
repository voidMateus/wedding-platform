# Refinamento — Fase 4 do Hub: Onboarding guiado

> **Status: documento de decisão.** Refinamento da Fase 4 descrita em
> [`plano-produto-hub-casamento.md`](plano-produto-hub-casamento.md) seção 4,
> seguindo o rito da seção 6 (escopo → modelo de dados → fluxos de UI →
> tarefa). Decisões datadas de **2026-09-14**; só mudam por acordo explícito
> registrado aqui como nova decisão datada.
>
> Não confundir com a "Fase 4 — Preparação para Escala" de
> [`ROADMAP.md`](ROADMAP.md), que é da numeração antiga e trata de performance,
> observabilidade e carga. Esta é a Fase 4 **do Hub**.
>
> É a primeira fase que não constrói um módulo. Financeiro, Convidados e
> Planejamento acrescentaram telas; esta acrescenta uma **porta** — e, para que
> ela tenha onde chegar, paga a dívida que só aparece quando se olha o produto
> do ponto de vista de quem entra nele pela primeira vez: o site já está no ar
> e ninguém publicou nada.

---

## 1. O problema

### 1.1 O que o casal encontra no primeiro acesso

A linha de `casamentos` nasce pela equipe interna com três valores:
`nomes_noivos`, `slug` e `data_evento`. Todo o resto é default ou nulo. O casal
faz login e cai num painel com seis abas e todos os números em zero.

O que está faltando, e que ninguém avisa:

| Ausência | O que acontece por causa dela |
|---|---|
| `horario_evento` nulo | A contagem regressiva mira meia-noite, e o convite não tem hora |
| Nenhuma `etapas_evento` | A linha da data no Hero não tem local, e não existe mapa |
| `prazo_rsvp` nulo | O RSVP fica aberto até o dia do evento, e o painel escreve "Sem prazo definido" |
| `config_tema` no default | O site tem a cara da plataforma, não a do casal |
| `orcamento_total_centavos` nulo | O cabeçalho de Gastos abre sem régua, e a sugestão "definir o orçamento" do Planejamento segue de pé |
| Nenhuma categoria, convidado, presente ou mesa | Cada módulo abre no próprio estado vazio, cada um com um começo diferente |

Nada disso é um erro: é o estado correto de um casamento que acabou de nascer.
O defeito é que o sistema sabe exatamente o que falta e não diz.

### 1.2 Onboarding não é Planejamento

A Fase 3 entregou uma lista de coisas a fazer. Esta entrega outra. Se as duas
não forem distinguidas na primeira frase, viram a mesma tela pela metade:

| | **Planejamento** (Fase 3) | **Onboarding** (esta fase) |
|---|---|---|
| Responde | "o que falta fazer **no mundo**" | "o que falta o **sistema** saber" |
| Item | tarefa — linha em `tarefas` | passo — nada no banco |
| Quem atesta | só o casal | o próprio sistema |
| Termina? | nunca | sim, e por isso some |
| Horizonte | um ano | a primeira semana (mas espera o tempo que precisar) |

E daí sai a consequência que sustenta o desenho inteiro:

> **Um passo do onboarding pode se marcar sozinho. Uma tarefa do Planejamento
> não.**

Isso não contradiz a regra da Fase 3 — é o outro lado dela. Lá, concluir
sozinho exigiria **inferir** um fato do mundo a partir de um dado ("este gasto
contratado na categoria Buffet significa que o buffet foi contratado?"), e
inferência errada apaga trabalho declarado. Aqui não há inferência nenhuma: "o
local está cadastrado" não é indício de outra coisa, **é** a coisa. O passo e o
fato são o mesmo objeto.

### 1.3 Primeiro achado: o site já está no ar, e ninguém publicou nada

`casamentos.status_ciclo_vida` (`rascunho`/`publicado`/`arquivado`) existe desde
a remodelagem de 2026-08-21 e **nenhuma linha de código o escreve**. Não há
tela, endpoint ou ação que o mude.

Pior: nenhuma rota pública o lê. `server/api/public/[slug]/wedding.get.ts` e as
irmãs resolvem o casamento por slug e devolvem o site inteiro,
independentemente do status. Os dois únicos consumidores da coluna são o cron
de lembretes (`status_ciclo_vida === 'publicado'`) e o fato `site_publicado` do
Planejamento.

Na prática: **o site do casal está público desde o instante em que a linha
nasce** — com o tema da plataforma, sem local, sem foto — e o casal não sabe.
E o momento que todo onboarding precisa ter, o "agora está pronto", não existe
no produto.

### 1.4 O teto do orçamento: uma correção, não um achado

O teto global (`casamentos.orcamento_total_centavos`) **tem tela**, e ela está
no lugar certo: o cabeçalho de totais de Gastos mostra o valor com um botão
"Definir"/"Editar" (`FinanceTotalsHeader`), que abre `FinanceBudgetTotalModal`
e salva por `useFinance().definirTetoDoOrcamento()`.

Isto aqui dizia o contrário até 2026-09-14, e a correção fica registrada
porque a conclusão errada quase virou trabalho: uma varredura minha procurou
por nomes que não existem (`updateBudgetTotal`, `tetoGlobal`) em vez do nome
real da ação, não achou chamador, e daí saiu um "achado" de que a Fase 1 teria
fechado com endpoint órfão. Não fechou. A Fase 4 **não precisa** dar casa a
esse campo — ele já tem uma, e é ela que o wizard renderiza, como manda a regra
de 2.3.

O que sobra de verdadeiro, e que importa para o desenho: a etapa do orçamento
existe porque o fato `orcamento_definido` é um dos sete passos, não porque
faltava onde editá-lo.

## 2. Escopo da v1

### 2.1 Entra

| Peça | O que é |
|---|---|
| **O roteiro** | Bloco "Primeiros passos" no topo do Início: os passos que faltam, derivados dos fatos, sem botão de concluir. Some quando todos estão cumpridos |
| **O wizard** | Rota própria (`/comecar`), aberta só pelo roteiro. Um campo por etapa, nenhum obrigatório, salvo ao avançar. Termina **no roteiro**, nunca numa tela de parabéns |
| **Publicar** | `status_ciclo_vida` ganha o primeiro escritor, e `rascunho` passa a barrar o site público de verdade. Situação do site com casa fixa em Configurações → O evento |
| **A prévia do rascunho** | O casal continua vendo o próprio site não publicado — cai da RLS, não de um modo de prévia |

### 2.2 Fica de fora — decisão, não esquecimento

- **Criação self-service de conta/casamento.** É a Fase 6 e depende de decisão
  de billing não tomada. Esta fase preenche um casamento que **já existe**.
- **Perguntar o número estimado de convidados.** Nada consome esse número hoje,
  e perguntar o que ninguém lê é o pedágio que o produto já recusou duas vezes
  (o modal de sete campos do Financeiro, o campo de assunto na tarefa). A lista
  real vira o número no dia em que existir.
- **Semear dado em lote.** O wizard não cria as treze categorias do orçamento
  nem as tarefas da fase atual: os estados vazios de cada módulo já fazem isso,
  e "sugestão nunca é linha no banco" não deixa de valer porque quem clicou
  estava num wizard. O passo leva até lá.
- **Templates de checklist por tipo de casamento** (praia, religioso, mini
  wedding). A Fase 3 apontou este refinamento como o dono natural da pergunta
  ("V2, junto do onboarding"), e a resposta é **não agora**: o onboarding só
  pergunta o que alguém consome, e consumir o tipo exigiria ramificar o
  catálogo de ~45 tarefas em variantes — uma rodada inteira, com o custo de
  manter três listas onde hoje há uma que cobre o tronco comum. Segue V2, agora
  com dono nomeado. Esta fase **não toca** `shared/planejamento-tarefas.ts`: o
  motor de sugestão já saiu inteiro na Fase 3, e o que ela faz é alimentar os
  fatos que ele já lê.
- **Tour guiado da interface** (balões apontando para botões). Ensina onde
  clicar, não o que decidir — e envelhece a cada mudança de tela.
- **Onboarding do colaborador.** Quem é convidado depois entra num casamento já
  configurado; o roteiro que ele vê é o mesmo, com os passos que de fato faltam.
  Um fluxo separado por papel seria duas verdades sobre o mesmo evento.
- **Arquivar.** É o terceiro valor de `status_ciclo_vida` e o outro extremo da
  vida do casamento — precisa decidir o que acontece com o site, com os links já
  compartilhados e com a retenção do dado. Rodada própria.
- **Percentual de conclusão e gamificação.** "Seu casamento está 60% pronto" é
  um número que mede o cadastro e se parece com medir o casamento.

### 2.3 O que o onboarding não duplica

Nenhum passo tem formulário próprio. Cada um renderiza **o mesmo controle, com
o mesmo schema Zod e o mesmo composable** da tela que já é dona daquele dado:

| Passo | Controle reaproveitado | Schema | Ação |
|---|---|---|---|
| Data e horário | `UiDatePicker` + `UiTimePicker` | `weddingSettingsSchema` | `useWedding().updateWedding` |
| Onde vai ser | `AdminLocationField` | `eventSegmentInputSchema` | `useEventSegments().create/update` |
| Prazo de RSVP | `UiDatePicker` + `UiTimePicker` | `weddingSettingsSchema` | `useWedding().updateWedding` |
| Teto do orçamento | o campo novo do topo de Gastos | `budgetTotalSchema` | `useFinance().definirTetoDoOrcamento` |
| A cara do site | `AdminThemePresetPicker` | `themeConfigSchema` | `useWedding().updateWeddingTheme` |

O wizard é a casca: barra de progresso, navegação, "Pular". Lógica de campo,
nenhuma.

## 3. Decisões desta rodada (2026-09-14)

1. **O progresso é derivado, nunca coluna.** Não existe `onboarding_concluido`,
   `onboarding_passo` nem tabela de passos. Cada passo é um fato já observável,
   e o observador já existe: `observarFatosDoPlanejamento()`. Uma coluna de
   progresso seria exatamente o "estado a manter sincronizado" que o produto
   recusa em `status_convite`, em `mesas.ocupacao` e no estado de pagamento.

2. **Não existe "concluir" no roteiro.** Nenhum passo tem caixa de marcar. Quem
   marca é o fato — pela razão de 1.2, que é o que separa este roteiro da
   checklist do Planejamento. Um passo cuja verificação exigisse inferência não
   entra no roteiro; vira tarefa sugerida, que é onde inferência é permitida
   porque lá ela só **oferece**.

3. **O passo reaparece se o fato deixar de valer.** Apagou o local, o passo
   volta. É a mesma regra da sugestão que não se esgota: a conta é
   determinística e não guarda estado, então "voltar" não é um caso especial —
   é a ausência de um.

4. **O wizard não é dono de campo nenhum** (2.3). A consequência prática é uma
   ordem de trabalho: um passo só pode entrar no wizard depois de o campo ter
   casa fixa em algum lugar — e os cinco já têm, incluindo o teto do orçamento
   (1.4).

5. **Autosave é read-modify-write sobre o objeto inteiro.**
   `PATCH /api/wedding` substitui a linha de propósito — a validação de
   continuidade das faixas etárias só vale sobre o conjunto completo, e o
   schema não tem `.default()` justamente para que um corpo incompleto não
   sobrescreva a configuração do casal pelo padrão da plataforma. Então a etapa
   envia o casamento carregado + o campo dela, exatamente como `GeneralTab`
   monta o formulário. **Não se cria um PATCH parcial** para servir o wizard: o
   endpoint parcial teria que abrir exceção para as faixas e viraria uma segunda
   porta para o mesmo dado.

6. **Nada intercepta o primeiro acesso** — mas o Início **vira** o acolhimento
   enquanto não há o que relatar. Sem tela nova, sem modal, sem "pular o
   tutorial" para se arrepender depois: é a mesma página, no seu estado vazio.
   Ver 3.1, que é uma correção posterior ao primeiro uso real.

7. **Retomar é derivado, como o progresso.** O wizard abre na primeira etapa
   cujo fato ainda não vale. Não há "última etapa visitada" gravada: com
   autosave por etapa, o próprio dado diz onde parou.

8. **Publicar vira real, e o portão é por caminho.** RLS para quem lê com a
   anon key, checagem explícita em TypeScript para quem usa `service_role` —
   a mesma divisão da tabela de modelos de confiança do
   [`CLAUDE.md`](../CLAUDE.md) seção 4.2, e não uma escolha de implementação.

9. **Rascunho responde 404, não "em breve".** Uma página de espera é um anúncio
   que o casal não escreveu, e confirma a um estranho que o slug existe. O 404
   já existe e é o mesmo de um slug inexistente.

10. **Não se pergunta o número estimado de convidados** (2.2).

11. **O roteiro tem dois grupos, não sete linhas soltas** (seção 6):
    *Configurar* e *Começar a usar*. A divisão é a mesma que decide quem entra
    no wizard, então é um conceito existente ficando visível — não uma
    taxonomia nova a manter.

12. **"Pulei" é derivado, como tudo o mais** (seção 7, regra 6): etapa vazia
    com etapa posterior preenchida só pode ter sido pulada. O aviso existe sem
    uma linha de estado.

13. **O contador é "3 de 7 concluídos", nunca percentual**, e a etapa do
    orçamento pergunta um número, não abre um módulo (seção 10). Os dois são a
    mesma preocupação: o onboarding mede cadastro, e qualquer frase que soe
    como medida do casamento — ou que prometa uma tela maior do que a que vem —
    faz o casal parar no meio.

### 3.1 A correção do acolhimento (2026-09-14, depois do primeiro uso real)

A decisão 6 foi tomada no abstrato e validada com uma conta de verdade limpa.
O veredito do usuário: *"não tem algo que acolhe, dá bem-vindo e fala onde eu
devo olhar"*. A investigação mostrou que faltava mais do que uma saudação.

**O painel é um relatório, e num casamento recém-criado não há nada a
relatar.** O Início mostrava, para quem acabava de chegar: uma barra de RSVP a
**0% respondido** com "Sem prazo definido", três métricas em **zero**
("Convites enviados 0 · Pessoas na lista 0 · Confirmações hoje 0"), quatro
faixas etárias em **zero** e uma tabela de convites vazia. Sete zeros e duas
caixas vazias disputando atenção com a única coisa que importava ali.

A tela foi desenhada para um casamento em andamento e estava servindo de
primeira impressão para um que ainda não começou. E o produto **já tinha a
regra**, escrita no Financeiro: *indicador sem base é omitido, jamais exibido
como 0%; o resumo degrada, nunca mente*. O Início era o único lugar que a
violava.

A correção não é uma tela nova — é a página no seu estado vazio:

- **Enquanto não existe ninguém na lista** (), o roteiro
  ganha a saudação ("Bem-vindos, Ana & João", com quantos dias faltam em prosa)
  e um botão que **nomeia o próximo passo** ("Começar pelo horário do
  casamento"), em vez de um "Começar" solto num canto. A primeira decisão de
  quem entra não deveria ser adivinhar o que o botão faz.
- **Os blocos de relatório saem de cena** até terem o que dizer, e voltam
  sozinhos quando a lista tem gente. Derivado, como tudo o mais: um casamento
  que perdesse todos os convidados também não mostraria uma barra em 0%.
- **A saudação some no instante em que existir alguém na lista.** "Bem-vindo" é
  para quem está chegando; quem já está trabalhando não precisa ser recebido de
  novo. Não há coluna "já viu as boas-vindas" — a condição é a mesma que
  esconde os zeros.

O que **não** mudou: nada intercepta, não existe tela de parabéns, e o roteiro
continua sendo o que sobrevive ao wizard. A diferença é que agora ele tem a
tela inteira enquanto ela não tem outro uso.

## 4. Modelo de dados

**Nenhuma tabela nova. Nenhuma coluna nova.** É a primeira fase do Hub em que
isso acontece, e é consequência direta da decisão 1: um roteiro derivado não
tem o que gravar.

O que muda no banco é uma policy e uma promoção de linhas:

```sql
-- O site público deixa de servir rascunho. A policy é o portão de TODA rota
-- pública que lê com a anon key: elas resolvem o casamento por slug antes de
-- qualquer outra coisa, então barrar `casamentos` barra o site inteiro numa
-- linha só — sem repetir a checagem em cada endpoint.
drop policy casamentos_select_publico on casamentos;

create policy casamentos_select_publico
  on casamentos for select
  using (status_ciclo_vida = 'publicado');

-- Os casamentos que já existem estão no ar HOJE (seção 1.3). Sem promover
-- nada, a migration tira do ar todo site em produção: o default da coluna é
-- 'rascunho' e ninguém nunca escreveu nela.
--
-- Mas promover TODO rascunho supõe que todo rascunho é site pronto, e não é:
-- um casamento que a equipe cadastrou e ainda não entregou ao casal também
-- está em rascunho, e publicá-lo seria a plataforma decidir por alguém que
-- nunca entrou. A linha divisória é ter dono — sem nenhuma linha em
-- `membros_casamento`, ninguém fez login, ninguém compartilhou link nenhum, e
-- não ir ao ar não quebra nada.
update casamentos c
   set status_ciclo_vida = 'publicado'
 where c.status_ciclo_vida = 'rascunho'
   and exists (select 1 from membros_casamento m where m.casamento_id = c.id);
```

E, **antes** de aplicar em produção, a conferência — que é passo da F4.1, não
cuidado opcional:

```sql
select c.slug, c.data_evento, count(m.id) as membros
  from casamentos c
  left join membros_casamento m on m.casamento_id = c.id
 where c.status_ciclo_vida = 'rascunho'
 group by c.slug, c.data_evento;
```

O caso que a heurística "tem dono" não resolve sozinha é o casamento com membro
cujo cadastro a equipe ainda estava montando: ele seria promovido. Se a
conferência apontar um, a correção é um `update` pontual logo depois do deploy,
**nunca** uma exceção por id dentro da migration — id de produção numa migration
que também roda em dev e no CI é um literal que não significa nada nos outros
dois ambientes.

Duas observações que a migration precisa carregar por escrito:

- **A policy de membro continua intacta.** É ela que faz a prévia do casal
  funcionar sem nenhum modo de prévia: as rotas públicas usam
  `serverSupabaseClient(event)`, que carrega a sessão de quem está pedindo —
  logado e membro, a leitura passa pela policy de membro; qualquer outra
  pessoa, pela pública, que agora exige `publicado`.
- **As policies públicas das tabelas filhas não mudam** — e isso foi
  verificado, não suposto (varredura de 2026-09-14). Exatamente **três** rotas
  públicas leem com a anon key — `wedding.get.ts`, `event-segments.get.ts` e
  `photos.get.ts` — e as três resolvem `casamentos` por slug antes de qualquer
  outra consulta: o `casamento_id` com que elas filtram `etapas_evento` e
  `fotos` vem da consulta que a policy acima acabou de barrar. Todo o resto do
  caminho público usa `service_role`, e é 8.1 quem cobre. A afirmação vale para
  o código de hoje — uma rota pública nova que lesse `etapas_evento` direto por
  id furaria o portão inteiro, em silêncio, e é por isso que a F4.5 trava isso
  com varredura em vez de deixá-lo escrito só aqui.

## 5. O que é derivado, e nunca vira coluna

| # | Passo | Fato | De onde sai |
|---|---|---|---|
| 1 | Confirme a data e o horário | `horario_definido` **(novo)** | `casamentos.horario_evento` não nulo |
| 2 | Diga onde vai ser | `local_definido` | Já existe: etapa com `nome_local` |
| 3 | Defina o prazo de RSVP | `prazo_rsvp_definido` **(novo)** | `casamentos.prazo_rsvp` não nulo |
| 4 | Defina o teto do orçamento | `orcamento_definido` | Já existe: `orcamento_total_centavos > 0` |
| 5 | Dê a cara de vocês ao site | `identidade_visual_definida` **(novo)** | `config_tema.presetId` ou `coverImageUrl` presentes |
| 6 | Monte a lista de convidados | `tem_convidado` | Já existe (e já exclui o rascunho da lista) |
| 7 | Publique o site | `site_publicado` | Já existe: `status_ciclo_vida = 'publicado'` |

**Esta ordem é a única que existe, e ela vive em `shared/onboarding-passos.ts`.**
O roteiro desenha os sete na ordem do catálogo; o wizard é um **filtro** sobre
a mesma lista (os cinco que são campo, na mesma sequência). Nenhuma tela
reordena nada, e não existe uma segunda lista para divergir — é a lição de
`shared/home-sections.ts`, onde um catálogo paralelo ficou com 8 entradas para
11 seções sem nada acusar a falta. Os dois passos que não entram no wizard
ficam onde caem, no fim: montar a lista é trabalho, publicar é ato.

A data do evento **não** é um passo: ela é obrigatória na criação, então um
passo que nasce cumprido para todo mundo só enche a lista. O que falta de
verdade é o horário — que a contagem regressiva, o convite e o cronograma usam.

`identidade_visual_definida` é o único fato com alguma folga: "o casal mexeu na
aparência" não tem uma marca exata, e a que existe (`presetId`, gravado ao
aplicar um preset ou virar `'custom'` em qualquer edição manual) é a melhor
aproximação. O pior caso é mostrar um passo já resolvido, que custa um clique
para conferir — a mesma assimetria da Fase 3.

### 5.1 O vocabulário de fatos passa a ser compartilhado

`FATOS_SIMPLES` vive hoje em `shared/planejamento-tarefas.ts` e o observador em
`server/utils/fatos-do-planejamento.ts`. Com um segundo consumidor, os dois
nomes passam a mentir: os fatos não são do Planejamento, são **do casamento**.

- `shared/fatos-do-casamento.ts` — o vocabulário (`FatoSimples`,
  `FatoObservado`), importado pelos dois catálogos.
- `server/utils/fatos-do-casamento.ts` — `observarFatosDoCasamento()`, uma ida
  ao banco servindo o roteiro e o motor de sugestão.

É o mesmo movimento que renomeou a fila `tarefas` para `fila_processamento` na
Fase 3: quando um nome passa a descrever menos do que a coisa faz, a hora de
trocá-lo é antes de o segundo consumidor existir. O teste que trava catálogo ×
categorias de orçamento não é afetado — ele fala de categorias, não de fatos.

## 6. O roteiro

Bloco no topo do Início, acima dos alertas do Financeiro e do Planejamento
(eles falam de um casamento em andamento; este fala de um que ainda não
começou). Sete linhas, cada uma com rótulo, estado e destino.

```
┌─ Primeiros passos ──────────────── 3 de 7 concluídos ─┐
│  Para o site ficar pronto e os módulos começarem      │
│  a servir vocês.                            [Começar] │
│                                                       │
│  CONFIGURAR                                           │
│  ✓  Data e horário                      12/06 · 16h   │
│  ✓  Onde vai ser                 Espaço Villa Rosa    │
│  ✓  Prazo de RSVP                          30/04      │
│  ○  Teto do orçamento                      definir →  │
│  ○  A cara do site                         definir →  │
│                                                       │
│  COMEÇAR A USAR                                       │
│  ○  Lista de convidados               ir para lista → │
│  ○  Publicar o site                       publicar →  │
└───────────────────────────────────────────────────────┘
```

**Dois grupos, e eles não são decoração:** a divisão entre *Configurar* e
*Começar a usar* é exatamente a que decide quem entra no wizard — os cinco
primeiros são campo (uma pergunta, uma resposta), os dois últimos são trabalho
e ato. Ela já existia no desenho; o agrupamento só a torna visível, em vez de
deixar "Publicar o site" parecendo a sétima pergunta de um formulário. Três
grupos foram considerados (separando "colocar no ar") e recusados: um cabeçalho
para uma linha só ocupa mais do que explica.

**O contador diz "3 de 7 concluídos", nunca um percentual.** "43%" e "seu
casamento está 43% pronto" são a mesma frase para quem lê rápido, e a segunda é
mentira — o roteiro mede cadastro, não casamento. Sete linhas contadas em sete
é um número que não se deixa interpretar como progresso do evento.

- **"Começar"** abre o wizard na primeira etapa pendente (decisão 7). Some
  quando todas as etapas do wizard já têm resposta; sobram as linhas dos passos
  que não são campo.
- **Cumprido mostra o valor, não um selo.** "Espaço Villa Rosa" confirma que o
  sistema entendeu o que o casal quis dizer; "✓ Concluído" só repete o ícone.
- **Dois passos não entram no wizard** porque não são campo: montar a lista é
  trabalho (e tem tela, importador e entrada rápida), publicar é ato. Os dois
  levam ao lugar certo.
- **O bloco some inteiro** quando os sete passos estão cumpridos, e volta se um
  fato deixar de valer (decisão 3). Diferente do bloco do Planejamento, que fica
  para sempre: aquele acompanha um processo contínuo, este fecha uma porta.
- **A rota `/comecar` continua existindo** depois disso, acessível por link
  direto — não é preciso desfazer nada para revisitá-la.

## 7. O wizard

Rota `/admin/[slug]/comecar`, layout `admin`, **sem aba na navegação** — a barra
do celular já mostra quatro destinos e o topo seis; um sétimo item permanente
para uma tela que se usa uma vez é o pior negócio da nav. Entra-se por ele pelo
roteiro.

**Cinco etapas, uma pergunta cada**: data e horário · onde vai ser · prazo de
RSVP · teto do orçamento · a cara do site.

As regras, todas visíveis na tela:

1. **Nada é obrigatório.** "Pular" é botão de primeira classe, do lado de
   "Continuar" — não um link apagado no canto. Quem ainda não fechou o local
   passa direto, e o passo continua no roteiro.
2. **Salva ao avançar**, etapa por etapa (decisão 5). Sair no meio não perde
   nada, e não existe um "Salvar tudo" no fim que possa falhar inteiro.
3. **Erro de validação não trava a saída.** Campo inválido bloqueia o próprio
   salvamento (o schema é o mesmo da tela definitiva), e a etapa continua
   podendo ser pulada. O casal nunca fica preso numa etapa que não sabe
   preencher.
4. **Voltar é sempre possível**, e mostra o que foi salvo.
5. **Termina no roteiro.** A última etapa leva ao Início, com o bloco de
   Primeiros passos no topo mostrando o que ficou. Sem tela de celebração e
   **sem etapa de revisão**: o wizard é a porta, o roteiro é o que continua
   existindo — inclusive para o casal que volta em março. O que a chegada
   precisa ter não é uma tela a mais, é ser **inequívoca**: o botão da última
   etapa diz "Concluir" (não "Continuar"), o roteiro recebe foco ao carregar,
   e um toast confirma o que foi salvo. Confirmação é uma frase, não um passo.
6. **Etapa pulada se anuncia, sem nada gravado.** Se uma etapa está vazia e
   alguma etapa **posterior** está preenchida, o casal necessariamente passou
   por ela e seguiu — então ela abre dizendo "Você pulou esta etapa antes". É
   derivado dos mesmos fatos, como todo o resto: nenhuma "etapa pulada" vai
   para o banco, e mesmo assim o casal não se pergunta por que está vendo
   aquilo de novo. Etapa vazia sem nenhuma posterior preenchida é só o ponto
   onde ele parou, e não ganha aviso nenhum.

A ordem das etapas não é arbitrária: data e local são o que mais gente já sabe
de cor (e o que o site público exibe primeiro), prazo e orçamento exigem uma
decisão, e a aparência é a única em que errar não custa nada — é a etapa certa
para terminar.

## 8. Publicar — o que muda no caminho público

### 8.1 O portão, por caminho

| Caminho | Como lê | O que barra o rascunho |
|---|---|---|
| Site, cronograma, fotos (`/api/public/[slug]/*`) | anon key, resolve por slug | **A policy de RLS** (seção 4) — uma linha cobre as três |
| Presentes (`/api/public/gifts/**`, `[slug]/gifts`) | `service_role` | **Checagem explícita** no endpoint |
| RSVP (`/api/rsvp/**`, busca por nome) | `service_role` | **Checagem explícita** no endpoint |

A divisão não é preferência: `service_role` ignora RLS, então nesses caminhos a
policy não protegeria nada — é o terceiro e o segundo modelo de confiança da
tabela do `CLAUDE.md`, e a Fase 4 não inventa um quarto.

O helper: `garantirCasamentoPublicado(event, weddingId)` em `server/utils/`,
que responde 404 (nunca 403 — "existe mas você não pode ver" é informação que o
caminho público não deve dar). Ele abre uma exceção, e só uma: se
`resolveWeddingContext(event)` devolver uma membership deste casamento, passa.
É o que faz a prévia do casal mostrar a lista de presentes de verdade em vez de
uma seção quebrada. `resolveWeddingContext` já devolve `null` sem sessão e nunca
lança, então a exceção não custa um caminho de erro novo.

Todas as rotas de `service_role` têm o `casamento_id` à mão antes de fazer
qualquer coisa — a varredura conferiu uma a uma. A única que não o carrega
hoje é `rsvp-search/select.post.ts`, que seleciona só `id, convite_id` do
convidado; ela ganha `casamento_id` no `select`, e nada mais muda.

### 8.1.1 O que o portão NÃO barra, e por quê

Duas rotas ficam de fora, e a dispensa é declarada no próprio arquivo (mesmo
padrão da frase `auditoria dispensada:`):

- **`gifts/payments/webhook.post.ts`** — é a InfinitePay contando que um
  pagamento aconteceu. Barrar não impede nada: o dinheiro já saiu da conta do
  convidado. Só faria o efeito de negócio nunca nascer, e um casal que
  despublicasse o site por um dia perderia a reserva de quem pagou na véspera.
- **`gifts/payments/[id]/status.get.ts`** — é o convidado, na tela de retorno
  do checkout, perguntando se o pagamento dele deu certo.

A regra que as duas expõem, e que vale para qualquer rota futura: **o portão
barra quem está começando algo, nunca quem está terminando o que já começou.**
Publicar é o que autoriza entrar; despublicar não desfaz o que já está em
trânsito.

### 8.2 Onde o casal publica

Dois lugares, um deles permanente:

- **Configurações → Geral → O evento** ganha "Situação do site", com o estado
  atual, o efeito em uma frase e o botão. É a casa fixa — continua existindo
  depois de o roteiro sumir.
- **O roteiro** tem a linha "Publicar o site", que faz a mesma chamada.

Despublicar é permitido e fica no mesmo controle. Com convite já enviado, o
botão avisa antes: **o link e o QR que já foram compartilhados param de
funcionar** enquanto o site estiver em rascunho. É um aviso, não um bloqueio —
o casal que precisa tirar o site do ar às pressas tem motivo melhor que o nosso.

### 8.3 O que a publicação liga junto

- O cron de lembretes de RSVP já só envia de casamento publicado — a regra
  existia antes de a coluna ter escritor, e passa a valer de verdade.
- O fato `site_publicado` do Planejamento passa a ser alcançável.
- Nada mais muda: publicar não mexe em tema, convite ou credencial.

## 9. API

| Rota | O que faz |
|---|---|
| `GET /api/onboarding/summary` | Devolve os fatos observados. A lista de passos é derivada no client por `resolverPassosDoOnboarding()` (`shared/onboarding-passos.ts`), fonte única de rótulo, destino e de quais passos são etapa do wizard |
| `PATCH /api/wedding/lifecycle` | `{ statusCicloVida: 'rascunho' \| 'publicado' }`. `arquivado` fica fora do schema até a rodada que desenhar o arquivamento — um valor aceito sem tela que o produza é uma porta sem corredor. Registra em `trilha_auditoria` |

Nenhuma rota nova para o wizard: cada etapa chama o endpoint que já é dono do
seu dado (2.3). O resumo devolve fatos, não passos prontos, porque quem observa
é o servidor e quem sabe desenhar é o catálogo compartilhado — o mesmo arranjo
de `resolveHomeSections()`.

## 10. UI e navegação

- **Início**: o roteiro é o primeiro bloco, acima dos alertas dos módulos.
- **Nav primária**: sem mudança. Nenhuma aba nova, nem no topo nem na barra do
  celular.
- **Configurações → O evento**: ganha a Situação do site.
- **Financeiro → Gastos**: sem mudança. O teto global já é editável pelo
  cabeçalho de totais ( → ), e é
  esse controle que a etapa do wizard renderiza.
- **A etapa do orçamento pergunta um número, não abre um módulo.** O rótulo é
  "Quanto vocês pretendem gastar no total?", nunca "Defina seu orçamento" —
  que promete uma tela de planejamento inteira e faz quem não tem resposta
  pronta abandonar o wizard ali. É o **teto global**
  (`casamentos.orcamento_total_centavos`), o mesmo número que aparece no
  agregado de Gastos no instante seguinte; distribuir por categoria é o
  trabalho que o Financeiro já sabe fazer, e que o roteiro nem menciona.
- **Estado vazio**: não há. O roteiro é ele próprio o estado inicial do painel.
- **Acessibilidade**: o roteiro é uma `<ul>` de itens com estado textual (não só
  ícone); a barra do wizard usa `aria-valuenow`/`aria-valuemax` e cada etapa
  anuncia "Etapa 2 de 5". Os controles são os mesmos já auditados nas telas de
  origem.

## 11. Candidatos a invariante no `CLAUDE.md` (seção 12)

- **O roteiro do primeiro acesso é derivado dos mesmos fatos que o Planejamento
  observa, e por isso se marca sozinho — o que uma tarefa nunca faz.** A
  diferença não é de confiança, é de objeto: um passo de onboarding é um dado
  que vive dentro do sistema ("o local está cadastrado"), não uma afirmação
  sobre o mundo ("o buffet foi contratado"). Onde a verificação exigiria
  inferência, o item não é passo: é sugestão de tarefa, e lá inferência só
  oferece. Não existe coluna de progresso, etapa salva ou tabela de passos;
  passo cujo fato deixou de valer volta a aparecer.
- **Rascunho não serve o site público, e o portão é por caminho:** policy de RLS
  em `casamentos` para o que lê com a anon key (o slug é resolvido antes de
  tudo, então uma policy basta), checagem explícita em TypeScript para presentes
  e RSVP, que usam `service_role`. Rascunho responde **404**, nunca uma página
  de espera. O casal continua vendo o próprio rascunho porque lê pela policy de
  membro — a prévia não é um modo, é uma consequência. E o portão barra **quem
  está começando algo, nunca quem está terminando o que já começou**: o webhook
  de pagamento e a consulta de status do checkout ficam de fora, porque o
  dinheiro já saiu da conta do convidado e despublicar não pode apagar o efeito
  de um pagamento em trânsito.
- **O onboarding não é dono de nenhum campo.** Toda etapa renderiza o controle,
  o schema Zod e o composable da tela que já edita aquele dado; um passo só pode
  entrar no wizard depois de o campo ter casa fixa em outro lugar. Um wizard que
  é o único lugar onde algo se edita vira um formulário ao qual não se volta.

## 12. Ordem de implementação

| Etapa | O que sai | Por que nesta ordem |
|---|---|---|
| **F4.1** | Publicar: a conferência dos rascunhos em produção (seção 4), a migration (policy + promoção com dono), `PATCH /api/wedding/lifecycle`, `garantirCasamentoPublicado()` nas rotas `service_role` com as duas dispensas declaradas, Situação do site em Configurações | É o único item com migration e o único que muda comportamento público — sai primeiro, sozinho, para poder ser verificado sozinho. A conferência vem antes da migration, não depois |
| **F4.2** | Fatos: `shared/fatos-do-casamento.ts`, `observarFatosDoCasamento()`, os três fatos novos | Mexe em código da Fase 3; separado do resto para que o diff dela seja legível |
| **F4.3** | O roteiro: `shared/onboarding-passos.ts`, `GET /api/onboarding/summary`, o bloco no Início | Já se sustenta sem wizard nenhum — cada linha leva à tela que resolve |
| **F4.4** | O wizard: rota, casca de etapas, autosave, retomada derivada, aviso de etapa pulada | Depende do catálogo e do roteiro existirem |
| **F4.5** | Testes, incluindo as duas varreduras | |

**F4.3 e F4.4 vão ao ar juntas.** A ordem acima é de trabalho, não de deploy:
um release parcial deixaria o botão "Começar" apontando para uma rota que não
existe. Se por algum motivo a F4.3 precisar ir sozinha, o botão simplesmente
não é renderizado — o roteiro sem wizard continua servindo, porque cada linha
já leva à tela que resolve o passo. É a diferença entre um recurso adiado e um
botão quebrado.

Os testes de F4.5, nomeados:

- **Unitários** — `resolverPassosDoOnboarding()` sobre cada combinação de fatos
  (inclusive a volta de um passo quando o fato cai, e a ordem, que é a mesma
  para roteiro e wizard); `garantirCasamentoPublicado` com e sem membership.
- **Integração/RLS** — a leitura pública de um casamento em rascunho volta
  vazia; a do mesmo casamento por um membro, não. É o teste que trava a decisão
  8, e o único que verifica a policy de verdade.
- **E2E do wizard** (`onboarding.spec.ts`, entregue) — abrir na etapa pedida,
  pular sem travar, voltar, e o caminho que só o navegador percorre: sair no
  meio e voltar encontrando o que já tinha sido salvo, com a etapa certa aberta
  sem nenhuma "última etapa visitada" gravada.
- **E2E do portão** — `/slug` de rascunho responde 404 e, depois de publicar,
  200. **Fica para quando a migration estiver aplicada no banco de dev**: hoje
  todos os casamentos de lá estão em `rascunho` (nunca houve escritor), então
  o teste descreveria um estado que o ambiente ainda não tem. Escrevê-lo antes
  seria entregar uma suíte vermelha por motivo de infraestrutura.
- **Varredura do portão** (`rotas-publicas-com-portao.spec.ts`) — percorre
  `server/api/public/**` e `server/api/rsvp/**` e falha quando uma rota nasce
  sem portão: ou ela resolve `casamentos` antes de tocar em tabela filha (e aí
  a policy cobre), ou chama `garantirCasamentoPublicado()`, ou declara a
  dispensa no próprio arquivo com o motivo. É o que faz a verificação da seção
  4 continuar verdadeira depois de amanhã, em vez de ser um parágrafo sobre o
  código de hoje.
- **A varredura do consumidor** ("todo endpoint tem tela que o chama") foi
  considerada e **não entra**: a motivação era o achado de 1.4, que se
  revelou falso. Sem nenhum caso real, ela seria exatamente a abstração
  especulativa que o projeto recusa — a varredura da auditoria existe porque
  fechou uma dívida que existia.

## 13. Em aberto

- **Arquivar** (o terceiro valor de `status_ciclo_vida`) segue sem tela e fora
  desta fase (2.2). Quando entrar, herda o portão que a F4.1 constrói.
- **Despublicar depois do convite enviado** fica permitido com aviso (8.2). Se
  aparecer um caso real de casal que despublicou sem entender o efeito, a saída
  é o aviso ficar mais forte — nunca o bloqueio, que decide pelo dono do evento.
- **A migration precisa ir junto do código, não depois.** As duas metades do
  portão vivem em lugares diferentes: a policy barra as rotas de anon key, a
  checagem em TypeScript barra as de `service_role`. Com o código no ar e a
  migration pendente, o casamento em rascunho responde **200 na home e 404 nos
  presentes** — foi exatamente o que aconteceu no ambiente local ao validar
  esta fase, e é o estado que a promoção de linhas resolve. Em produção isso
  significa: um único deploy, com a conferência da seção 4 antes.
- **O slug continua sendo escolhido pela equipe**, e o casal não o vê no
  roteiro. Muda quando a criação virar self-service (Fase 6), que é quem
  precisa perguntar isso.
