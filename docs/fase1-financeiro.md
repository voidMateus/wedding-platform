# Refinamento — Fase 1 do Hub: Financeiro

> **Status: documento de decisão.** Refinamento da Fase 1 descrita em
> [`plano-produto-hub-casamento.md`](plano-produto-hub-casamento.md) seção 4,
> seguindo o rito da seção 6 (escopo → modelo de dados → fluxos de UI →
> tarefa). Decisões datadas de **2026-09-10**; só mudam por acordo explícito
> registrado aqui como nova decisão datada.
>
> **Implementado em 2026-09-10** (F1.1 a F1.5, seção 9) e **redesenhado em
> 2026-09-11** (seção 12), quando o uso real mostrou que planejar e pagar
> precisavam de telas separadas. O que a implementação decidiu por conta
> própria está na seção 11.

---

## 1. O problema

O casal já tem site, lista de convidados e presentes na plataforma, mas o
dinheiro — a parte que mais dói — continua numa planilha. As três perguntas
que a planilha responde mal, e que este módulo existe para responder:

1. **Quanto isso tudo vai custar, e quanto eu já comprometi?**
2. **Quanto eu já paguei, e quanto ainda devo?**
3. **O que vence agora?** — a que a planilha nunca responde sozinha, porque
   ninguém abre planilha para ser avisado.

Princípio do plano aplicado aqui: **estrutura pronta + liberdade de
planilha**. O sistema chega com as categorias que todo casamento tem, mas
categoria nova, despesa fora do padrão e observação livre sempre cabem — e
nenhuma delas é obrigatória.

### 1.1 O módulo responde decisões, não registra lançamentos

Registrar é meio; o fim é decidir. A vantagem sobre a planilha não está em
guardar os mesmos números com mais rigor — está em responder, na primeira
tela, o que a planilha só responde depois de alguém montar uma fórmula. Uma
planilha deixa escrever "Buffet: R$ 20.000"; o Hub precisa dizer "faltam
R$ 26.600 do que vocês planejaram para virar contrato".

O módulo inteiro se organiza pelos **estágios do mesmo dinheiro**, nesta
ordem (revisto em 2026-09-11, seção 12):

| Estágio | A pergunta do casal | De onde sai |
|---|---|---|
| **Orçado** | Quanto reservamos para isso? | `categorias_orcamento.valor_previsto_centavos` |
| **Estimado** | Quanto achamos que vai custar? | `despesas.valor_estimado_centavos` |
| **Contratado** | Por quanto fechamos? | `despesas.valor_centavos` (nulo até fechar) |
| **Pago** | Quanto já saiu? | parcelas com `pago_em` |
| **A pagar** | Quanto ainda sai, e quando? | contratado − pago |

A leitura mais útil não é nenhum estágio isolado — é a **distância entre
eles**. Estimado menos contratado é *trabalho que falta* (decisões a tomar);
contratado menos pago é *dinheiro que falta*. São as duas distâncias que a
planilha não mostra sozinha, e é nelas que este módulo se diferencia.

E cada distância vive na SUA tela (seção 12): o Orçamento é onde se planeja,
Fornecedores é onde se cota e contrata, Pagamentos é onde o dinheiro sai. Uma
tela só para os três momentos foi exatamente o erro da primeira versão.

## 2. Escopo da v1

### 2.1 Entra

| Peça | O que é |
|---|---|
| **Orçamento** (planejar) | Teto do casamento, categorias com valor orçado e gastos com **custo estimado** e **custo final**. Sem parcela nenhuma — aqui não se paga |
| **Fornecedores** (contratar) | Contato, estágio e cotação, agrupados por categoria. Contratar preenche o custo final de um gasto planejado |
| **Pagamentos** (pagar) | As parcelas do que foi contratado: pago, a vencer, vencido, e a baixa na própria linha |
| **Documentos** | Entidade única compartilhada (contrato/comprovante/referência), arquivo enviado **ou** link externo |
| **Entradas (só leitura)** | Quanto já entrou pela lista de presentes — bloco separado, não abate orçamento |

### 2.2 Fica de fora — decisão, não esquecimento

- **Fontes de recursos** (recursos próprios, ajuda dos pais, presentes) como
  entidade editável. Fica de fora da v1, mas **não como "receita" descartada
  e sim como direção nomeada para a V2**: a pergunta "temos dinheiro
  suficiente para bancar isso?" é diferente de "quanto já gastamos?", e
  merece desenho próprio (Orçamento × Recursos planejados × Diferença), não
  uma tabela de lançamentos enfiada no módulo de saídas. O primeiro degrau
  dessa escada entra agora e é barato: o teto global (4.0), que já responde
  "cabe no que temos?" com um número só. Receita digitada linha a linha, sem
  extrato para conciliar, é a planilha de volta.
- **Divisão de quem paga** (noiva / noivo / pais dela / pais dele). Dor real,
  mas multiplica cada número do quadro por quatro. Volta quando o quadro
  simples estiver em uso.
- ~~**Despesa em dois estados (`prevista` vs `contratada`)**~~ — **entrou em
  2026-09-11** (seção 12). A v1 tinha um valor só por gasto, e isso obrigava o
  casal a escrever o número do contrato antes de existir contrato: a tela de
  planejar só funcionava depois de planejar em outro lugar. Agora são dois
  valores (`valor_estimado_centavos` e `valor_centavos`), e é o segundo que
  transforma o gasto em compromisso.
- **Comparativo de cotações lado a lado.** O fornecedor guarda
  `valor_proposto_centavos`; comparar é olhar a lista filtrada por categoria.
  Tela de comparação é V2.
- **Lembrete de vencimento por e-mail/cron.** O alerta da v1 é a tela. Envio
  depende da infraestrutura de e-mail que a Fase 2 (Comunicações) vai montar.
- **Exportação CSV/PDF do financeiro** — segue no backlog técnico contínuo do
  plano (seção 5.3), junto com a exportação de presentes.
- **Conciliação bancária, integração com banco, moeda diferente de BRL.**
- **Documento ligado a uma parcela específica.** A ligação da v1 é fornecedor
  e despesa (ver 4.5); parcela é granularidade que ninguém pediu ainda.
- **Qualquer exposição no site público.** Nenhum dado deste módulo tem rota
  pública, nem hoje nem previsto: contrato tem CPF e valor.

## 3. Decisões desta rodada (2026-09-10)

1. **O dinheiro tem três níveis: categoria → despesa → parcela.** Confirma o
   "orçamento por categoria, pagamentos/parcelas" do plano. É o que permite
   "vence em 7 dias" sem uma coluna de status a manter sincronizada.
2. **A lista de presentes aparece como entrada, em bloco separado e só
   leitura.** O dado já existe (`pagamentos_presentes` confirmados); não
   entra em nenhum total de orçamento e não vira receita editável.
3. **Documento aceita arquivo enviado *ou* link externo** (XOR entre as duas
   colunas, padrão já usado em `assinaturas`). Cobre quem já guarda tudo no
   Drive sem obrigar quem não guarda nada a arrumar um lugar primeiro.
4. **O módulo se chama "Financeiro" e é a 5ª aba primária do painel.**
   Resolve a pendência de copy da seção 7 do plano. A barra do celular já
   comporta (quatro abas + "Mais").
5. **Fornecedor não guarda o valor do contrato.** Guarda contato, estágio e
   cotação. Três fornecedores concorrentes na mesma categoria inflariam o
   orçamento se cada proposta contasse como compromisso.
6. **"Pago" nunca é estágio de fornecedor.** Os estágios manuais são
   `pesquisando → em_negociacao → contratado`, mais `descartado`. A situação
   financeira (sem despesa / a pagar / quitado) é **derivada** das parcelas —
   mesma lição do funil de convites (CLAUDE.md seção 12): estado que os fatos
   já contam nunca vira coluna a sincronizar.
7. **Categoria é uma taxonomia só**, compartilhada por despesa e fornecedor.
   Duas listas de categoria ("Buffet" de despesa ≠ "Buffet" de fornecedor)
   seria a mesma classe de bug do catálogo de atalhos do Hero.
8. **Existe um teto global do casamento, opcional e separado da soma das
   categorias** (`casamentos.orcamento_total_centavos`, ver 4.0). "Temos
   R$ 100 mil" é a primeira frase financeira de todo casal, dita antes de
   existir uma única categoria; a distribuição por categoria vem depois e
   quase nunca soma exatamente o teto. Tratar os dois como o mesmo número
   perde a pergunta "já distribuí tudo que tenho?".
9. **A v1 mostra as duas distâncias, não só os quatro saldos.** *A contratar*
   (planejado − contratado) e *a pagar* (contratado − pago) entram no resumo
   como números de primeira classe, com o percentual de avanço. É a diferença
   entre o módulo descrever o passado e ajudar a decidir o próximo passo.
10. **Quatro números grandes, o resto como frase de apoio.** O resumo tem oito
    leituras possíveis (teto, planejado, contratado, pago, a pagar, a
    contratar, não distribuído, % contratado) e mostrar as oito com o mesmo
    peso é uma parede de números que não decide nada. Hierarquia fixa:
    **Planejado · Contratado · Pago · A pagar** em destaque; as derivadas
    aparecem como uma linha de apoio dentro do bloco a que pertencem ("62% do
    planejado · faltam R$ 37.000 para contratar").
11. **O resumo degrada, nunca mente.** Casal que não preencheu previsto
    nenhum não pode ver "0% contratado" nem "100% acima do planejado": os
    blocos de planejamento simplesmente não aparecem, e o convite para
    definir o previsto aparece no lugar. Mesma regra para o teto global
    ausente. Um indicador calculado sobre denominador vazio é pior que
    indicador nenhum.
12. **"A pagar" é contratual — `valor da despesa − pago` —, nunca a soma das
    parcelas em aberto.** As duas fórmulas discordam sempre que o
    parcelamento está incompleto, e é o caso normal: despesa de R$ 20.000 com
    entrada de R$ 5.000 paga e o resto "a combinar" tem R$ 15.000 a pagar e
    **zero** parcelas em aberto. A soma das parcelas só acerta quando o
    parcelamento está completo; o valor da despesa acerta sempre, exceto no
    caso patológico de parcelas acima do valor — que não se resolve trocando
    a fórmula, e sim sinalizando (5.1).
13. **Todo piso em zero é aplicado por linha, antes de somar.** "A pagar" do
    resumo é a soma de `max(0, valor − pago)` de cada despesa, nunca
    `soma(valores) − soma(pagos)`; "a contratar" é a soma por categoria, não
    a diferença dos totais. Somar primeiro faz uma despesa paga a mais
    compensar outra em aberto — e as duas anomalias desaparecem justo do
    número que deveria denunciá-las.

## 4. Modelo de dados

Convenções obrigatórias aplicadas a todas as tabelas abaixo (CLAUDE.md seção
10): PK `uuid`, `casamento_id` denormalizado e **derivado/validado por
trigger** (nunca definido de forma independente da hierarquia), RLS habilitado
com policies explícitas por `is_membro_casamento(casamento_id)`,
`created_at`/`updated_at` com trigger `atualizar_timestamp()`, enum como
`CHECK` sobre `text`, índice em toda FK, `COMMENT ON` em tabela e coluna não
óbvia.

### 4.0 `casamentos.orcamento_total_centavos` (coluna nova)

`integer null, check ≥ 0`. O teto global que o casal tem para o casamento
inteiro — a resposta a "quanto podemos gastar?", que vem antes de qualquer
categoria existir.

- **Nulo é um estado normal, não pendência.** Sem teto definido, o resumo
  simplesmente não exibe o bloco de teto, e "planejado" passa a ser o número
  de topo. Nada no módulo exige que ele exista.
- **Nunca é a soma dos previstos por categoria** — é justamente a comparação
  entre os dois que interessa ("distribuí R$ 54.000 dos R$ 100.000"). Uma
  coluna que fosse só o total derivado seria denormalização sem ganho.
- Coluna própria em `casamentos`, não uma chave em `config_tema`: `config_tema`
  é exclusivamente visual (CLAUDE.md seção 13), e isto é comportamento de
  negócio.
- Editável na tela do Financeiro (não em Configurações) — é um número que o
  casal revisa junto com o orçamento, não uma configuração de evento que se
  define uma vez.

### 4.1 `categorias_orcamento`

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid pk | |
| `casamento_id` | uuid not null → `casamentos` (cascade) | |
| `nome` | text not null | |
| `valor_previsto_centavos` | integer not null default 0, check ≥ 0 | o teto planejado — **não** é a soma das despesas |
| `ordem_exibicao` | integer not null default 0 | |
| `excluido_em` | timestamptz null | soft delete: `despesas.categoria_id` e `fornecedores.categoria_id` referenciam |

- Índice único parcial `(casamento_id, lower(nome)) where excluido_em is null`
  — "Buffet" duas vezes quebra o total mental do casal antes de quebrar
  qualquer código.
- **Catálogo de categorias sugeridas** em `shared/orcamento-categorias.ts`
  (fonte única): Espaço, Buffet, Bebidas, Bolo e doces, Fotografia e vídeo,
  Música, Decoração e flores, Vestuário e beleza, Papelaria e convites,
  Celebrante e cartório, Lembrancinhas, Transporte, Lua de mel, Outros. Elas
  **não** nascem com o casamento: são um botão no estado vazio ("Começar com
  as categorias sugeridas") que insere em lote e deixa tudo editável. Criar
  linhas por trigger tiraria a liberdade sem pedir licença.

### 4.2 `despesas`

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid pk | |
| `casamento_id` | uuid not null (denormalizado) | |
| `categoria_id` | uuid null → `categorias_orcamento` (restrict) | nulo = "Sem categoria", agrupado no fim da lista |
| `fornecedor_id` | uuid null → `fornecedores` (restrict) | |
| `descricao` | text not null | |
| `valor_estimado_centavos` | integer null, check ≥ 0 | custo **estimado** — o número do planejamento |
| `valor_centavos` | integer null, check ≥ 0 | custo **final** (contratado). **Nulo** enquanto o gasto é só planejamento |
| `observacao` | text null | |
| `excluido_em` | timestamptz null | soft delete — valor histórico financeiro |

- Categoria **opcional** de propósito: obrigar a criar categoria antes do
  primeiro gasto é a fricção que faz o casal voltar pra planilha.
- Trigger `despesas_verificar_casamento_id`: categoria e fornecedor precisam
  ser do mesmo casamento, no padrão de `convidados_verificar_casamento_id`.
- `CHECK despesas_tem_algum_valor` (`num_nonnulls(...) >= 1`): um gasto sem
  estimado **e** sem final não diz nada nem ao planejamento nem ao caixa.
- **Preencher `valor_centavos` é o ato que move o gasto de estágio.** Só o que
  tem custo final conta como contratado, aceita parcela e aparece em
  Pagamentos — e é por isso que a coluna aceita nulo em vez de zero: zero é um
  valor fechado de graça, nulo é a ausência de contrato.

### 4.3 `parcelas_despesa`

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid pk | |
| `casamento_id` | uuid not null | **derivado** da despesa por trigger |
| `despesa_id` | uuid not null → `despesas` (cascade) | |
| `numero` | smallint not null | rótulo "2 de 3"; único por `(despesa_id, numero)` |
| `vence_em` | date not null | |
| `valor_centavos` | integer not null, check > 0 | |
| `pago_em` | date null | **a única fonte do estado "pago"** |
| `forma_pagamento` | text null check (`pix`\|`cartao`\|`transferencia`\|`dinheiro`\|`boleto`\|`outro`) | |
| `observacao` | text null | |

- **Sem soft delete e sem coluna de status.** "Paga / a vencer / vencida" é
  sempre derivado de `pago_em` e `vence_em` contra a data de hoje — uma
  parcela vencida vira vencida sozinha, à meia-noite, sem job nenhum.
- Índice `(casamento_id, vence_em) where pago_em is null` — é a consulta de
  "próximos vencimentos", a mais repetida do módulo.
- **A soma das parcelas não é forçada a bater com `despesas.valor_centavos`.**
  Entrada paga + saldo "a combinar com o fornecedor" é o caso normal, não o
  excepcional. A divergência é **exibida** ("R$ 2.000 ainda não parcelados"),
  nunca bloqueada — um `CHECK` aqui só ensinaria o casal a mentir o valor.
- Nada aqui é operação de estoque/limite: não há concorrência a resolver, logo
  sem `SELECT ... FOR UPDATE` (diferente de reserva de presente).

### 4.4 `fornecedores`

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid pk | |
| `casamento_id` | uuid not null | |
| `categoria_id` | uuid null → `categorias_orcamento` (restrict) | mesma taxonomia da despesa |
| `nome` | text not null | |
| `estagio` | text not null check (`pesquisando`\|`em_negociacao`\|`contratado`\|`descartado`) default `pesquisando` | **nunca** tem valor "pago" |
| `valor_proposto_centavos` | integer null, check ≥ 0 | cotação; não entra em nenhum total |
| `nome_contato`, `telefone`, `email` (citext), `site_url`, `observacao` | text null | |
| `excluido_em` | timestamptz null | soft delete — referenciado por despesas e documentos |

Índice `(casamento_id, estagio)`.

### 4.5 `documentos`

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid pk | |
| `casamento_id` | uuid not null | |
| `titulo` | text not null | |
| `tipo` | text not null check (`contrato`\|`comprovante`\|`referencia`\|`outro`) | |
| `fornecedor_id` | uuid null → `fornecedores` (restrict) | |
| `despesa_id` | uuid null → `despesas` (restrict) | |
| `caminho_storage` | text null | |
| `url_externa` | text null | |
| `nome_arquivo`, `tipo_mime` | text null | só no upload |
| `tamanho_bytes` | integer null | só no upload |

- `CHECK (num_nonnulls(caminho_storage, url_externa) = 1)` — padrão XOR do
  projeto (`assinaturas`), nunca duas colunas opcionais soltas.
- **Sem soft delete**: excluir um documento enviado precisa apagar o objeto no
  Storage, e "registro escondido com arquivo vivo" é pior que exclusão franca.
  Mesmo raciocínio de `etapas_evento` — nada referencia esta linha.
- `despesa_id` **amplia** a decisão de 2026-09-10 do plano (que previa só
  `fornecedor_id`): é uma coluna nullable e um filtro, e é o que faz o
  comprovante aparecer dentro da despesa que ele comprova. Registrada aqui
  como decisão nova, não como desvio silencioso.

### 4.6 Bucket `wedding-documents` — o primeiro bucket privado do projeto

Os três buckets atuais (`wedding-covers`, `wedding-photos`,
`wedding-event-segments`) são públicos: são imagens do site do casamento. Um
contrato tem CPF, valor e assinatura — então:

- `public = false`, `file_size_limit` 10 MB, MIME allowlist
  `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
- Path `{casamento_id}/{uuid}.{ext}` — primeiro segmento é o casamento, como
  nos outros buckets, e o **nome é regenerado no servidor** (CLAUDE.md seção
  11), nunca reaproveitado do upload.
- Policies só de membro
  (`is_membro_casamento((storage.foldername(name))[1]::uuid)`) para
  select/insert/update/delete. **Nenhuma policy pública** — é o que diferencia
  este bucket dos outros três, e a diferença precisa estar no comentário da
  migration, senão o próximo bucket copia o modelo errado.
- Leitura sempre por **URL assinada de curta duração** gerada em
  `server/utils/` — o client nunca monta URL de storage privado.

## 5. O que é derivado, e nunca vira coluna

| Derivação | De onde sai |
|---|---|
| Situação da parcela (`paga`/`a_vencer`/`vencida`) | `pago_em` e `vence_em` contra hoje |
| Pago de uma despesa | soma das parcelas com `pago_em` |
| A pagar | `max(0, valor_centavos − pago)`, **por despesa** (ver 5.1 e decisão 13) |
| **Agendado** | soma das parcelas **sem** `pago_em` — o que já tem vencimento |
| **Não parcelado** | `max(0, a pagar − agendado)` — o saldo ainda sem vencimento |
| **A contratar** | `max(0, previsto − contratado)`, **por categoria** |
| **Acima do planejado** | `max(0, contratado − previsto)`, **por categoria** — o outro lado do mesmo desvio |
| **% contratado** | `contratado ÷ planejado` (só quando planejado > 0) |
| **Não distribuído** | `orcamento_total_centavos − planejado` (só quando o teto existe) |
| Situação financeira do fornecedor (sem despesa / a pagar / quitado) | parcelas das despesas ligadas a ele |
| Vencidos / vence em 30 dias | parcelas sem `pago_em`, por `vence_em` — sempre **valor e contagem**, nunca só a contagem |
| Entradas de presentes | `pagamentos_presentes` com `status_pagamento = 'confirmado'` |

Regras que essas derivações precisam respeitar, e que são fáceis de errar:

- **Piso em zero sempre por linha, antes de somar** (decisão 13). A soma dos
  pisos e o piso da soma dão números diferentes justamente quando há algo
  errado para mostrar.
- **"A contratar" e "acima do planejado" são dois números, nunca um com
  sinal.** A categoria que estourou não reduz o trabalho de contratar a que
  ainda nem começou: Buffet R$ 2.000 acima e Música R$ 6.000 sem contratar
  são "faltam R$ 6.000 para contratar" **e** "R$ 2.000 acima do planejado",
  não "faltam R$ 4.000".
- **Denominador vazio não produz indicador.** Planejado zero não gera "0%"
  nem divisão por zero: a função devolve `null` e a tela omite a linha
  (decisão 11). Vale para `% contratado`, `% pago` e estouro de categoria.
- **"Hoje" é uma entrada da função, não `new Date()` lá dentro.** A situação
  da parcela é calculada contra uma data recebida — é o que torna o cálculo
  testável e o que evita servidor e navegador discordarem por fuso na virada
  do dia.

### 5.1 As três somas de uma despesa

Permitir divergência entre o valor da despesa e as parcelas (4.3) cria três
somas que precisam ficar nomeadas, senão viram KPIs concorrentes na tela:

```
valor_centavos = 20.000     o que foi acordado
  pago          =  5.000     parcelas com pago_em
  agendado      =  9.000     parcelas sem pago_em (têm vencimento)
  não parcelado =  6.000     saldo sem vencimento definido

  a pagar = pago? não: 15.000 = agendado + não parcelado
```

**A identidade `a pagar = agendado + não parcelado` é o que impede a
duplicação.** "A pagar" é o saldo financeiro da despesa — o KPI. "Não
parcelado" é uma *parte* dele, a que ainda não tem data: informação
secundária, que vive na linha da despesa ("R$ 6.000 ainda não parcelados") e
nunca disputa espaço com os quatro números do resumo. A identidade vale como
teste unitário.

**Quando a divergência inverte o sinal, o sistema avisa e não bloqueia** —
mesma decisão de 4.3, agora nos dois sentidos:

| Situação | O que é | O que a tela faz |
|---|---|---|
| parcelas > valor da despesa | quase sempre erro de digitação, ou valor da despesa desatualizado após reajuste | avisa na linha ("as parcelas somam R$ 2.000 a mais que o valor da despesa"); "não parcelado" é zero, nunca negativo |
| pago > valor da despesa | reajuste pago mas não lançado no valor | avisa na linha; "a pagar" é zero, nunca negativo |

Nenhum dos dois impede salvar, e nenhum dos dois altera a fórmula de "a
pagar" (decisão 12): trocar a base para a soma das parcelas consertaria o
caso raro quebrando o comum.

Todo cálculo vive em **funções puras em `shared/utils/orcamento.ts`**, usadas
pelo endpoint e pela tela. É o que impede o total do cabeçalho de discordar da
soma das linhas — o mesmo motivo que levou a faixa etária para
`shared/utils/faixa-etaria.ts`.

**Sem view.** View é último recurso no projeto, e a razão que justificou as
duas existentes (paginação) não se aplica: a lista de despesas de um casamento
é de dezenas de linhas e **não é paginada na v1**, então agregar no endpoint é
seguro. Gatilho de revisão registrado: se aparecer casamento com mais de ~300
despesas, a listagem pagina e aí sim o resumo por despesa vira view com
`security_invoker = true`.

## 6. API

Rotas em inglês (convenção do projeto para pasta de rota), corpo validado por
Zod em `shared/schemas/finance.ts`, tudo atrás de `requireWeddingContext` —
caminho administrativo puro, `casamento_id` sempre do JWT, nunca do body.

```
GET    /api/finance/summary                     os quatro estágios + distâncias + atenção + por categoria + entradas
PATCH  /api/finance/budget-total                só casamentos.orcamento_total_centavos
GET    /api/finance/categories
POST   /api/finance/categories                  (+ ?sugeridas=1 insere o catálogo em lote)
PATCH  /api/finance/categories/[id]
DELETE /api/finance/categories/[id]             soft delete; recusa se houver despesa ativa
GET    /api/finance/expenses                    despesas + parcelas embutidas
POST   /api/finance/expenses                    despesa e, opcionalmente, N parcelas geradas
PATCH  /api/finance/expenses/[id]
DELETE /api/finance/expenses/[id]               soft delete
POST   /api/finance/expenses/[id]/installments  gera/adiciona parcelas
PATCH  /api/finance/installments/[id]           inclui marcar como paga (grava pago_em)
DELETE /api/finance/installments/[id]
GET|POST /api/finance/vendors      ·  PATCH|DELETE /api/finance/vendors/[id]
GET|POST /api/finance/documents    ·  PATCH|DELETE /api/finance/documents/[id]
POST   /api/finance/documents/upload            multipart → bucket privado
GET    /api/finance/documents/[id]/url          URL assinada curta
```

- Criar despesa com parcelas são dois statements (despesa, depois lote de
  parcelas). Se o segundo falhar, sobra uma despesa **sem** parcelas — estado
  válido e corrigível na UI, então não justifica função Postgres.
- `recordAuditLog` em toda mutação: dinheiro é ação administrativa sensível
  (CLAUDE.md seção 11).
- **O teto global ganha endpoint próprio em vez de entrar em
  `PATCH /api/wedding`**: aquele endpoint reescreve o conjunto completo de
  configurações do evento de uma vez (é o "salvar" da tela de Configurações),
  e mandar o formulário inteiro a partir do Financeiro é como um campo alheio
  acaba sobrescrito por um valor velho carregado noutra tela.
- `GET /api/finance/summary` devolve a narrativa pronta, não linhas cruas:
  `{ teto, planejado, contratado, pago, aPagar, agendado, naoParcelado,
  aContratar, percentualContratado, naoDistribuido, atencao: { vencidos:
  {valor, quantidade}, proximos30Dias: {valor, quantidade},
  acimaDoPlanejado: {valor, quantidade} }, porCategoria: [...],
  entradasPresentes }`. Os campos derivados são `null` quando não têm base
  (decisão 11), nunca zero — é o `null` que a tela usa para omitir a linha em
  vez de exibir um indicador falso. **As três linhas de `atencao` têm a mesma
  forma `{valor, quantidade}`**: o valor é o que decide, a quantidade é o
  contexto.

## 7. UI e navegação

**Nav primária** (`app/utils/admin-nav.ts`): Início · Convidados · Presentes ·
**Financeiro** · Configurações. No celular, quatro abas + "Mais" — Financeiro
entra na barra, Configurações vai para o "Mais".

**Menu da seção** (mesmo padrão do módulo Convidados, rotas todas sob
`/admin/[slug]/financeiro/*`):

```
Financeiro
  Visão geral    /financeiro            (exact)
  Orçamento      /financeiro/orcamento
Gerenciar
  Fornecedores   /financeiro/fornecedores
  Documentos     /financeiro/documentos
```

**Telas**

1. **Visão geral** — a narrativa dos quatro estágios (1.1) em três blocos, na
   ordem em que o casal pergunta:

   ```
   ORÇAMENTO                                    R$ 100.000  [editar]
   distribuído em categorias: R$ 54.000 · R$ 46.000 ainda sem destino

   Planejado        Contratado        Pago             A pagar
   R$ 54.000        R$ 33.450         R$ 12.700        R$ 20.750
                    62% do planejado  38% do           R$ 6.000 ainda
                    faltam R$ 20.550  contratado       não parcelados
                    para contratar

   ⚠ PRECISA DA SUA ATENÇÃO
   R$ 4.200      vencidos                    3 parcelas
   R$ 8.750      nos próximos 30 dias        4 parcelas
   R$ 5.000      acima do planejado          2 categorias

   SEU CASAMENTO                     [ver no Orçamento →]
   Categoria      Planejado  Contratado    Pago   A pagar
   Espaço            15.000      15.000   5.000    10.000
   Buffet            25.000      22.000  10.000    12.000
   Fotografia         8.000       8.000   3.000     5.000
   Música             6.000           —       —         —
   Sem categoria          —         450     450         —

   ENTRADAS — LISTA DE PRESENTES                  R$ 3.400
   não abate o orçamento · ver em Presentes
   ```

   Quatro números em destaque, derivadas como linha de apoio embaixo de cada
   um (decisão 10). Cada linha da tabela leva para a categoria já aberta em
   `/financeiro/orcamento?categoria=<id>` — a Visão geral responde "como
   estamos", o Orçamento responde "por quê", e a ponte entre as duas é um
   clique, não uma busca.

   **O bloco de atenção é o "o que precisa de nós agora?"** — três linhas com
   a mesma forma (valor primeiro, porque dinheiro é a unidade do módulo;
   quantidade como contexto), e cada uma leva ao recorte correspondente: os
   vencidos e os próximos 30 dias abrem o Orçamento filtrado por vencimento,
   o estouro abre as categorias acima do planejado. Linha sem ocorrência
   **não aparece zerada** — some; sem nenhuma das três, o bloco inteiro some,
   e essa ausência é a informação ("está tudo em dia").

   **Degradação (decisão 11)**: sem teto definido, o bloco de topo vira um
   convite discreto ("Defina quanto vocês têm para gastar") e "Planejado"
   assume o topo; sem nenhum previsto por categoria, somem as colunas de
   planejamento, o "% do planejado", o "a contratar" e o alerta de estouro —
   sobra a narrativa de compromisso/caixa/futuro, que funciona sozinha. Sem
   nada cadastrado, a tela é só o convite às categorias sugeridas.
2. **Orçamento** — a planilha, navegável em três níveis. A categoria repete o
   cabeçalho dos quatro estágios, agora no seu próprio recorte, e abre nas
   despesas; a despesa abre nas parcelas:

   ```
   ▼ BUFFET          25.000   22.000   10.000   12.000   [88% contratado]
     ▼ Buffet contratado                        R$ 22.000
         1/4  10/03  R$ 5.500  ✓ paga (Pix)
         2/4  10/04  R$ 5.500  ● vencida há 3 dias      [marcar paga]
         3/4  10/05  R$ 5.500
         4/4  10/06  R$ 5.500
     ▷ Taxa de rolha                            R$    800
         sem parcelas definidas
   ▷ FOTOGRAFIA       8.000    8.000    3.000    5.000
   ```

   Marcar parcela como paga é ação da própria linha (sem modal); criar/editar
   despesa é modal, com "à vista", "parcelado em N a partir de" ou "definir
   depois". A divergência entre valor da despesa e parcelas aparece na linha
   da despesa nos dois sentidos (5.1) — "R$ 800 ainda não parcelados" ou "as
   parcelas somam R$ 2.000 a mais que o valor" —, sempre como aviso, nunca
   como erro que impeça salvar. Chegando com `?categoria=<id>`, a categoria
   correspondente já vem aberta.
3. **Fornecedores** — tabela com estágio em chip, categoria, cotação,
   situação financeira derivada e contato rápido (telefone/WhatsApp/e-mail);
   filtro por estágio; painel do fornecedor listando despesas e documentos
   ligados.
4. **Documentos** — lista com tipo, fornecedor, data; upload por arraste ou
   link externo; download por URL assinada. A lista é um componente que recebe
   filtro (`fornecedor_id`/`despesa_id`), e é isso que permite embuti-la em
   outras áreas depois sem duplicar tela — o "entidade única compartilhada" do
   plano.

**Reuso obrigatório**: `UiCurrencyInput`, `UiDatePicker`, `AdminTable`,
`AdminSection`, `AdminStatCard`, `AdminFilterChips`, `formatCentsToBRL`.
Nenhum estilo novo fora de `components/ui/`; estados usam os tokens
`danger`/`success`/`warning` da plataforma, nunca `text-red-600` e afins.
Componentes em `app/components/admin/finance/`, composables `useFinance*`
(inglês, como todo o resto).

## 8. Candidatos a invariante no CLAUDE.md (seção 12)

Entram junto com a implementação, não antes:

- Fornecedor nunca tem estágio "pago" — situação financeira é derivada das
  parcelas.
- `pago_em` é a única fonte do estado de pagamento; não existe coluna de
  status de parcela.
- Cotação de fornecedor nunca entra em total de orçamento.
- A soma das parcelas pode divergir do valor da despesa: a divergência é
  exibida, nunca bloqueada.
- Teto global e soma dos previstos por categoria são números distintos — um
  nunca é derivado do outro.
- "A pagar" é `valor da despesa − pago`, nunca a soma das parcelas em aberto;
  e `a pagar = agendado + não parcelado`.
- Piso em zero é aplicado por linha, antes de qualquer soma.
- "A contratar" e "acima do planejado" são dois números independentes, nunca
  o mesmo com sinal trocado.
- Indicador sem base (planejado zero, teto ausente) é omitido, nunca exibido
  como 0% ou 100%.
- Nenhum dado do Financeiro tem rota pública.

## 9. Ordem de implementação

| # | Entrega | Conteúdo |
|---|---|---|
| F1.1 | Fundação de dados | Migration (4 tabelas + `casamentos.orcamento_total_centavos` + bucket privado + RLS + triggers + índices), tipos, `shared/utils/orcamento.ts` com testes unitários — incluindo os casos de borda das derivações: planejado zero, contratado acima do planejado, teto ausente, parcela vencendo hoje, parcelas somando mais que a despesa, pago acima do valor, e a identidade `a pagar = agendado + não parcelado` |
| F1.2 | Orçamento ponta a ponta | Endpoints de categorias/despesas/parcelas + `summary` + teto global, composables, telas Visão geral (o resumo dos quatro estágios) e Orçamento (a árvore de três níveis) |
| F1.3 | Fornecedores | CRUD, pipeline, situação derivada, ligação com despesas |
| F1.4 | Documentos | Upload no bucket privado, link externo, URL assinada, lista reutilizável |
| F1.5 | Costura | Nav primária + menu da seção, cartão no dashboard, auditoria, atualização de `CLAUDE.md` §12, `docs/DATABASE.md`, `docs/PRODUCT.md` (nova seção) e `docs/ROADMAP.md` |

## 10. Em aberto

- Desenho das **fontes de recursos** (Orçamento × Recursos planejados ×
  Diferença) — direção nomeada para a V2 (2.2), com o teto global da v1 como
  primeiro degrau. Vira rodada de refinamento própria quando a v1 estiver em
  uso, não antes: é lá que se decide se "recurso" é entidade ou só um campo a
  mais ao lado do teto.
- Embutir a lista de documentos dentro do fornecedor e da despesa. O
  componente já recebe filtro e o endpoint já aceita o recorte — falta só o
  lugar na tela, que espera uso real para não nascer no ponto errado.

## 11. O que a implementação resolveu (2026-09-10)

Decisões tomadas ao construir, todas dentro do que o refinamento já previa:

- **Rótulos dos estágios de fornecedor** (pendência do F1.3): "Pesquisando /
  Em negociação / Contratado / Descartado". Nenhum deles é `success` no mapa
  de estados — estágio é escolha do casal, não desfecho; "Contratado" é
  `primary`, porque diz o papel do fornecedor, e quitação é a outra coluna.
- **O painel recebe um número do Financeiro** (pendência do F1.5), e só com
  urgência: vencidos, ou o total a vencer em 30 dias quando não há vencido.
  Sem nenhum dos dois a faixa não existe. Repetir o quadro inteiro faria do
  painel dois dashboards concorrentes.
- **Categoria sem previsto nunca acusa estouro.** Descoberto pelo teste de
  `linhaDeCategoria`: "Sem categoria" com R$ 450 gastos aparecia como R$ 450
  "acima do planejado". Não está acima de nada — está fora do planejamento.
  É a decisão 11 aplicada também por categoria.
- **Parcela que vence hoje é `a_vencer`, não `vencida`** — o casal tem o dia
  todo para pagar, e o contrário transformaria o bloco de atenção num alarme
  falso diário.
- **A geração de parcelas divide o SALDO, não o valor cheio**: 3x sobre uma
  despesa de R$ 20.000 com R$ 5.000 já pagos criaria R$ 25.000 de
  compromisso. Parcela paga nunca é alterada nem substituída.
- **Despesa de categoria arquivada cai em "Sem categoria"** em vez de sumir:
  perder R$ 20.000 de um resumo financeiro por causa de um arquivamento seria
  pior que exibi-los sem rótulo.
- **Upload que falha ao gravar a linha remove o objeto do bucket** — objeto
  órfão é lixo invisível que ainda consome o storage do casal.
- **Editar despesa não mexe em parcelamento.** Renegociar é ação da própria
  linha (que sabe o que já foi pago), nunca um formulário de edição
  reescrevendo histórico por baixo.

## 12. Redesenho de 2026-09-11 — planejar e pagar em telas separadas

Pedido do usuário depois de usar a v1: *"a gente precisa separar o que é
planejamento e o que é de fato pagamento; deixar tudo em um local apenas fica
ruim"*. Ele está certo, e o diagnóstico é mais fundo do que layout: a v1
tratava um gasto como um número só, então **não existia lugar para planejar** —
a árvore de categoria → despesa → parcela pedia o valor do contrato antes de
existir contrato.

**As decisões desta rodada:**

1. **Um gasto tem dois valores**: `valor_estimado_centavos` (planejamento) e
   `valor_centavos` (contrato, nulo até fechar). O segundo é o que transforma
   estimativa em compromisso.
2. **Três telas, uma por momento do dinheiro**, nesta ordem no menu:
   **Orçamento** (planejar) → **Fornecedores** (cotar e contratar) →
   **Pagamentos** (pagar). Documentos serve às três e fica em "Gerenciar".
3. **A "Visão geral" deixou de existir como tela.** O quadro de totais virou o
   cabeçalho do Orçamento, e os alertas de vencimento moraram em Pagamentos,
   onde se age sobre eles. Um quarto lugar repetindo os mesmos números só
   adicionava cliques.
4. **Contratar preenche um gasto que já existe**, em vez de criar outro: o
   casal planeja "Buffet, estimado R$ 12.000", cota três fornecedores e, ao
   fechar com um, diz a qual gasto aquilo corresponde. O valor fechado vira o
   custo final, o fornecedor é vinculado, o estágio dele vai para
   `contratado` e as parcelas nascem — `POST /api/finance/vendors/[id]/contract`.
5. **O teto continua na categoria, e o estimado nos gastos.** São dois níveis
   de planejamento de propósito: "quero gastar 15 mil em Recepção" é dito antes
   de existir qualquer item, e a diferença entre o teto e a soma dos estimados
   é o que denuncia o estouro **antes** de ele virar contrato.
6. **Pagamentos só lista o que foi contratado.** Gasto em planejamento não
   aparece lá — não há o que pagar num valor que ninguém fechou. É a separação
   que a tela existe para manter, e está coberta por teste E2E.
7. **Fornecedores agrupa e filtra por categoria**, com a soma das cotações por
   grupo: comparar três buffets é uma pergunta dentro de uma categoria, e com
   os concorrentes espalhados entre fotógrafos e bandas ninguém compara nada.
8. **Categoria arquivada tem volta** (`POST /api/finance/categories/[id]/archive`
   com `{arquivada}`, mesmo desenho de `grupos`). Na v1 ela sumia da tela sem
   caminho de retorno.

**O que NÃO mudou, e por quê:** a cotação do fornecedor continua fora de todo
total (três concorrentes somariam três vezes o mesmo gasto); "pago" continua
não sendo estágio de fornecedor; `pago_em` continua sendo a única fonte do
estado de pagamento; e todo cálculo continua em `shared/utils/orcamento.ts`,
agora com `contratado` podendo ser nulo.

## 13. Rodada de conexão (2026-09-11, tarde)

Quatro apontamentos do uso real, e o que cada um virou:

1. **Fornecedor arquivado não ia para lugar nenhum** — mesmo furo que as
   categorias tinham. Ganhou `POST /api/finance/vendors/[id]/archive` e a
   seção de restauração no fim da tela.

   No caminho apareceu a causa raiz do sintoma que já tinha aparecido nas
   categorias: **duas chamadas `useFetch` para a mesma rota, distinguidas só
   por uma query, empatavam no cache e a lista de arquivados chegava vazia —
   sem erro nenhum para acusar**. A correção é estrutural: a listagem traz
   ativos E arquivados numa requisição só, e a tela separa os dois. Uma
   requisição a menos, e o estado deixa de depender de qual das duas respondeu
   por último.

2. **Padrões do Modo Lista aplicados às três telas.** As tabelas artesanais
   (`<table>` escrito à mão, que a governança do Design System não admite)
   viraram `AdminTable`: blocos recolhíveis por categoria/gasto, filtro e
   ordenação no cabeçalho de cada coluna com o estado na URL, barra de filtros
   ativos, cabeçalho fixo, "Recolher tudo" e o formato empilhado do celular —
   tudo de graça, e igual ao resto do painel.

3. **O quadrado vazio do cabeçalho virou "A pagar".** Ele estava escondido
   como nota de rodapé do Pago, e é uma das perguntas que o casal mais repete.
   O "Orçado" saiu dos cartões (já é o assunto do bloco de cima), deixando a
   linha com os quatro momentos do gasto: Estimado, Contratado, Pago, A pagar.

4. **A conexão entre as três telas**, que era o pedido de fundo:
   - o fornecedor passou a cotar **um gasto** (`fornecedores.despesa_id`), e a
     tela de Fornecedores se organiza por gasto — as propostas concorrentes
     ficam lado a lado, com a menor destacada e a diferença para ela em cada
     linha. É o que torna a comparação possível;
   - a proposta em PDF fica visível na linha da cotação (contagem de
     documentos anexados ao fornecedor);
   - **contratar leva o gasto para Pagamentos mesmo sem parcela definida.**
     Era o furo mais grave: quem escolhia "defino depois" não via o
     compromisso em lugar nenhum. Agora o saldo sem data aparece como uma
     linha `Sem data`, com o botão "Agendar" — e o resumo tem um indicador
     próprio para ele.

---

## 14. Rodada de refino visual (2026-09-11, noite)

Pedido: *"refinar o encaixe dos elementos e botões, bem como nas cores e
contrastes e tamanhos. Tem que ser uma navegação fluida e não pode ser
poluída. Atenção àquilo que o casal precisa ver em destaque."*

A auditoria cruzou as quatro telas com `docs/DESIGN-SYSTEM.md` e com a tela de
referência (Modo Lista de convidados), e a medição foi feita no DOM
renderizado, não no código — é o único jeito de ver contraste e alvo de toque
de verdade.

**Contraste não era o problema:** zero violações de 4,5:1 nas quatro telas, nas
duas larguras. Os tokens de estado (`danger` 6,2:1, `success` 7,4:1, `warning`
6,9:1) já passavam com folga. O que estava errado era **hierarquia, encaixe e
repetição**.

### 14.1 Um bug funcional, achado antes do visual

As três telas declaravam `sort` nas colunas e **nenhuma ordenava**: filtravam à
mão e ignoravam `sortKey`. A `AdminTable` desenhava o menu "Ordenar" — com
`aria-sort`, ícone aceso e chip na barra de filtros — e clicar em "Maior a
menor" não movia uma linha. As três passaram a usar `applyTableFilters`
(`app/utils/table-rows.ts`), como o Modo Lista, com um acessor por coluna. É a
regra do Design System §2 em vigor: *filtro que não filtra de verdade é pior
que filtro ausente, já que quem usa confia nele*. Coberto por E2E.

### 14.2 O que o casal precisa ver em destaque

- **"A pagar" virou o número grande do Orçamento** (fundo próprio, `text-2xl`),
  e Estimado/Contratado/Pago desceram para `text-lg`. Os quatro tinham
  exatamente o mesmo peso, e o maior número da tela era o teto — uma
  configuração digitada uma vez.
- **O estouro de categoria era calculado, entregue pela API e invisível.** O
  único sinal era um pedaço de string cinza concatenado na faixa da categoria,
  e o recorte `?recorte=estouro` não tinha nenhum produtor no app. Agora é uma
  faixa `danger` no cabeçalho (que também é o link que faltava) e um selo na
  faixa de cada categoria estourada (`AdminTableSection.badge`).
- **Pagamentos passou a ter dois níveis:** Vencidos, Próximos 30 dias e Sem
  data em cima, em `text-2xl`; Pago e A pagar viraram uma linha de rodapé. Os
  cinco disputavam atenção no mesmo tamanho, distinguidos só pela cor do
  número — "Pago" competindo com "Vencidos".
- **O vencimento ganhou coluna própria**, com ordenação por data. Numa tela
  cujo assunto é "o que vence e o que está atrasado", a data era texto de 12px
  dentro de uma coluna chamada "Detalhes".
- **As cotações chegam em ordem de preço** dentro do bloco do gasto, e a
  diferença para a mais barata subiu de 12px cinza para 14px `warning`. É o
  número que decide a compra.

### 14.3 Botões

A forma canônica do CTA (`Adicionar <entidade>` + `lucide:plus`, com
`Novo <entidade>` reservado ao título do modal) não era seguida por nenhuma das
quatro telas, e a mesma ação tinha dois nomes dentro da mesma página ("Novo
gasto" no cabeçalho, "Adicionar gasto" no rodapé do bloco). Agora é um nome por
ação, em toda parte — inclusive nos submits dos modais.

Duas ações estavam com o peso trocado:

- **"Registrar valor"** — o gesto que transforma plano em compromisso — era um
  link sublinhado de 12px em minúscula. Virou botão, o mesmo que o celular já
  usava.
- **"Contratar"** era um ícone de 26px sem rótulo no desktop e um botão escrito
  no celular: as duas larguras discordavam sobre o que ela é. Virou botão nas
  duas, e some na linha que já foi contratada.

E os rodapés dos modais saíram do corpo rolável para o slot `#footer`: em
formulário longo (a cotação tem 10 campos), Cancelar e Salvar rolavam para fora
da vista.

### 14.4 Poluição e encaixe

- Cada categoria repetia três botões de texto no rodapé; agora é
  "+ Adicionar gasto" mais dois ícones.
- A linha de Fornecedores tinha até sete controles; caiu para três, e o
  WhatsApp/e-mail — que é o que se usa **com** o celular na mão — passou a
  existir no celular, onde não existia.
- A borda direita de Pagamentos era serrilhada, porque a lixeira sumia nas
  linhas sem parcela; agora ela fica desabilitada no lugar.
- O painel de arquivados, duplicado palavra por palavra em duas telas, virou
  `AdminArchivedList`; a ponte "ver em Pagamentos" saiu do Orçamento (o menu da
  seção já leva, e o número já está na parada "A pagar" logo acima); e o link
  "Ir para o orçamento" saiu da posição do CTA primário de Pagamentos.
- Os filtros ativos entraram no painel da tabela que descrevem, e os slots do
  celular ganharam o preenchimento que faltava — as linhas encostavam na borda
  da tela.
- Em Documentos, a fileira de filtros aparecia durante o carregamento e por
  cima do estado vazio: seis recortes para recortar nada.

### 14.5 Detalhes que mudaram de cor

`UiBadge tone="primary"` estava sendo usado como estado em "Contratado", contra
a regra do próprio componente (*primary é identidade/papel, nunca estado*) — e,
sendo a única variante sem preenchimento, deixava o estado mais importante da
coluna como o mais apagado. Passou a seguir o mapa da plataforma: "A contratar"
neutral, "Contratado" warning (ainda há dinheiro a sair — o mesmo tom que
`a_pagar` do fornecedor já usava), "Quitado" success. E os 11 "Cancelar" em
`variant="outline"` viraram `ghost`: dentro de um modal branco, `outline` põe um
segundo botão na cor do tema ao lado do primário.
