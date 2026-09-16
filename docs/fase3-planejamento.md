# Refinamento — Fase 3 do Hub: Planejamento

> **Status: documento de decisão.** Refinamento da Fase 3 descrita em
> [`plano-produto-hub-casamento.md`](plano-produto-hub-casamento.md) seção 4,
> seguindo o rito da seção 6 (escopo → modelo de dados → fluxos de UI →
> tarefa). Decisões datadas de **2026-09-13**; só mudam por acordo explícito
> registrado aqui como nova decisão datada.
>
> É o primeiro módulo do Hub que nasce inteiro — Financeiro ganhou telas novas
> sobre um vocabulário novo, Convidados completou um módulo que já existia.
> Aqui não há nada: nem tabela, nem tela, nem palavra.

---

## 1. O problema

O Hub hoje responde três perguntas bem: **quem vem** (Convidados), **quanto
custa** (Financeiro) e **o que o convidado vê** (Site). Nenhuma delas é a
primeira pergunta que um casal faz.

A primeira é *"por onde eu começo?"*, e ela aparece num momento em que o casal
não tem lista de convidados nem orçamento — tem uma data e um pânico. Do outro
lado da linha do tempo, a duas semanas do evento, a pergunta inverte e vira
*"o que eu esqueci?"*. Entre as duas, durante um ano inteiro, ela é sempre a
mesma: **o que eu faço agora, e estou atrasado?**

Hoje isso vive na checklist que a cerimonial mandou em PDF, num quadro do
Pinterest ou na cabeça de quem dorme pior. O Hub só começa a servir o casal
*depois* que ele se organizou em outro lugar — que é exatamente o problema que
o plano de produto se propôs a resolver.

### 1.1 O ativo que ninguém mais tem, e a armadilha que vem junto

Toda checklist de casamento que existe no mercado é uma lista morta: o casal
marca à mão, e ela não sabe nada sobre o casamento dele. A nossa nasce dentro
de um sistema que já sabe **a data do evento** — e prazo de casamento é sempre
relativo a ela —, quais gastos estão contratados, quais convites saíram,
quantas pessoas falta acomodar, se o site está publicado.

A armadilha é usar esse saber para **marcar tarefa como feita sozinho**.
"Contratar o buffet" só se resolveria por heurística (qual gasto é *o* buffet?
o que está na categoria com esse nome? e se o casal a renomeou?), e uma
checklist que mente destrói exatamente a confiança que a torna útil. Pior: uma
tarefa que se *desmarca* sozinha — porque o casal reclassificou um gasto —
apaga trabalho declarado por causa de uma inferência.

Daí a regra que organiza a fase inteira:

> **O sistema decide o que OFERECER. O casal decide o que EXISTE e o que está
> FEITO.**

A assimetria é de custo do erro. Deixar de sugerir algo que o casal já resolveu
custa quase nada — a sugestão fica a um clique em "ver todas", e a lista dele
continua completa. Concluir uma tarefa que não foi feita custa a tela inteira:
basta acontecer uma vez para o casal voltar a conferir tudo no papel.

É a mesma assimetria que o produto já aplica em dois lugares: *Aberto* é o
único estágio do funil comprovado pelo sistema ([`PRODUCT.md`](PRODUCT.md) 5.1),
e registro de canal `outro` é removível enquanto envio feito pelo sistema não é
([`fase2-convidados.md`](fase2-convidados.md) 3.4).

### 1.2 Planejamento não é Cronograma

Os nomes colidem, e a distinção precisa estar escrita porque é a primeira
confusão que qualquer pessoa nova vai fazer:

| | **Cronograma** (`etapas_evento`) | **Planejamento** (esta fase) |
|---|---|---|
| Responde | "como é o dia do casamento" | "o que falta até lá" |
| Horizonte | horas de um dia | meses de um ano |
| Quem lê | o convidado | só o casal |
| Onde vive | Configurações → Páginas do site | módulo próprio, privado |

Nenhum dado desta fase tem rota pública, pelo mesmo motivo de Mesas e
Financeiro: "ainda não escolhemos o celebrante" não é informação de convidado.

## 2. Escopo da v1

### 2.1 Entra

| Peça | O que é |
|---|---|
| **Tarefa** | Título, prazo, responsável (texto livre), observação e concluída. Criada e editada **na linha** — nunca por modal |
| **As janelas de prazo** | Vencidas / esta semana / este mês / mais adiante / sem prazo, derivadas de `prazo` contra hoje. É o eixo da tela: é ele que responde "estou atrasado?" |
| **Catálogo de sugestões** | ~45 tarefas comuns, cada uma com prazo relativo à data do evento. Mesmas três regras do catálogo de gastos: nunca é linha no banco, não se esgota, não inventa o que é do casal |
| **Motor de dispensa** | A sugestão some quando o fato correspondente já existe no sistema (convite enviado, mesa montada, gasto contratado na categoria). Nunca conclui nada — só deixa de oferecer |
| **Bloco no Início** | Um número só, o que pede providência hoje, no mesmo desenho do alerta do Financeiro |
| **A 6ª aba** | Planejamento entra na nav primária; no celular, Presentes desce para o "Mais" |

### 2.2 Fica de fora — decisão, não esquecimento

- **Conclusão automática a partir de outros módulos.** É a decisão de 1.1, e a
  maior do escopo. Junto com ela fica de fora o vínculo `tarefa → despesa`
  (criar a tarefa na ficha do gasto e concluí-la ao contratar): ali o vínculo
  seria exato, não heurístico, e por isso é a direção nomeada para a V2 — mas
  exige o gesto nos dois módulos e uma regra para o descontratar, o que é uma
  rodada própria.
- **Assunto/categoria na tarefa.** Nem FK para `categorias_orcamento`, nem
  etiqueta livre. Duas razões: somar tarefas por assunto não responde nenhuma
  pergunta que a lista por tempo não responda (diferente de Categorias no
  Financeiro, que sobrevive por ser agregação de dinheiro — `fase1` 23.3), e
  cada campo a mais no gesto mais repetido cobra o pedágio que o modal de sete
  campos já cobrou uma vez (`fase1` 25.3). O eixo é o tempo; o título já diz do
  que se trata.
- **Subtarefas.** Uma checklist de checklist é a forma mais rápida de
  transformar "o que faço agora" em "organizar minha organização". Tarefa grande
  demais o casal quebra em duas linhas, que é o gesto que a edição na linha
  torna barato.
- **Anexos e documentos por tarefa.** `documentos` já existe e é filho do gasto.
  Contrato pendurado em dois lugares diferentes é a volta do Frankenstein que a
  rodada 21 do Financeiro desmontou.
- **Aviso de prazo por e-mail.** Fora da v1 por desenho, não por
  infraestrutura: os avisos automáticos que existem são por-ALVO com marcas de
  dias (um convidado, uma parcela), e um aviso de tarefas seria um **resumo
  por-casal** ("3 tarefas vencem esta semana") — outro mecanismo, outra unidade
  de deduplicação. E o destinatário é quem já abre a tela: é a diferença entre
  lembrar alguém de algo que ele não vê e mandar e-mail sobre a própria lista.
- **Dispensar uma sugestão à mão** ("não vou ter cerimônia religiosa").
  Exigiria uma tabela de dispensas — estado novo a manter para economizar uma
  linha apagada num rodapé. Mesma decisão que o Financeiro tomou ao deixar a
  sugestão de gasto ali para sempre.
- **Tarefa recorrente e dependência entre tarefas** ("só depois de X"). São
  recursos de gerenciador de projeto. Casamento tem um marco só, e ele já é a
  âncora de todos os prazos.
- **Templates de checklist por tipo de casamento** (praia, religioso, mini
  wedding). O catálogo único cobre o tronco comum; variar por tipo exige saber o
  tipo, que é pergunta que o produto não faz. V2, junto do onboarding (Fase 4),
  que é quem naturalmente pergunta isso.
- **Exportar a checklist** (CSV/PDF/`.ics`). O backlog técnico contínuo do plano
  (seção 5.3) já carrega exportação; entra por lá, não por aqui.
- **Quem concluiu a tarefa.** Numa lista compartilhada entre casal e
  colaboradores é informação real, mas `trilha_auditoria` é onde ela pertence, e
  exibi-la na linha é ruído até alguém pedir.

### 2.3 O que o Planejamento deliberadamente NÃO duplica

Regra de fronteira, e o primeiro teste do catálogo: **tarefa não entra no
catálogo quando outro módulo já responde melhor a mesma pergunta.**

"Pagar as parcelas que vencem antes do casamento" é o exemplo. É item clássico
de checklist de casamento, e está fora do nosso catálogo: Pagamentos é o eixo do
tempo do dinheiro, mostra vencidas em vermelho todo dia, e o Início já traz o
alerta. Uma linha na checklist dizendo a mesma coisa seria um segundo número
para reconferir — a "régua de totais repetida por tela" que o Financeiro
aprendeu a não ter (`fase1` 21.4).

## 3. Decisões desta rodada (2026-09-13)

1. **O sistema sugere; o casal conclui.** Nenhuma tarefa é marcada ou desmarcada
   por fato de outro módulo. Os fatos entram na decisão de **o que oferecer**,
   nunca na de **o que está feito** (1.1).
2. **A sugestão ocupa o mesmo eixo da tarefa: o tempo.** Não há duas taxonomias
   na tela. O prazo sugerido (data do evento − N dias) cai numa janela
   exatamente como um prazo digitado pelo casal, e a sugestão aparece no rodapé
   daquela janela — o mesmo desenho do rodapé de categoria no Financeiro, com o
   contêiner trocado de categoria para janela.
3. **Sugestão de janela já passada nunca nasce vencida.** Um casal que descobre
   o produto a quatro meses do casamento veria quinze tarefas vermelhas no
   primeiro segundo — o sistema inventando um atraso que talvez não exista.
   Essas sugestões ficam num grupo próprio ("O que costuma já estar resolvido")
   e, quando criadas, **nascem sem prazo**. Sem prazo é estado válido, não
   pendência.
4. **Concluir é `concluida_em`, nunca `status`.** Terceira aplicação da mesma
   lição (`pago_em`, `enviado_em` derivado): o timestamp é o fato, e "atrasada",
   "para esta semana" e "concluída" são todos derivados dele e de `prazo` contra
   hoje.
5. **Criar tarefa é digitar numa linha, não abrir um formulário.** O gesto se
   repete quarenta vezes; quarenta modais é o que empurra a lista de volta para
   o papel. Terceira vez que o produto aplica isso — Categorias do Financeiro
   (`fase1` 24), Modo Lista (`fase2` F2.1) — e a primeira em que já nasce assim.
6. **Uma tarefa por DECISÃO, não por linha de gasto.** O catálogo de gastos tem
   54 itens porque é a granularidade do **dinheiro** ("Serviço de garçons" é uma
   linha do orçamento). A checklist é a granularidade da **decisão**: "Contratar
   o buffet" é uma tarefa, e garçom, mesa de entradas e lanche da madrugada são
   detalhes dela. Uma caixinha por item de orçamento produziria uma lista de 54
   linhas que ninguém termina.
7. **Responsável é texto livre.** Quem executa tarefa de casamento é a mãe da
   noiva, a irmã, a cerimonial — gente que não tem login e que não deve precisar
   de um para ser citada. Uma FK para `membros_casamento` excluiria justamente a
   maioria e obrigaria a convidar alguém para o painel só para escrever um nome.
   Sem notificação por trás, o campo é um rótulo — e é exatamente isso que ele
   precisa ser.
8. **`tarefas` passa a ser a checklist do casal; a fila de jobs vira
   `fila_processamento`.** Hoje `tarefas` é a fila assíncrona herdada de `jobs` —
   vazia, sem nenhum código chamador, documentada como "ainda não implementada"
   ([`ARCHITECTURE.md`](ARCHITECTURE.md) 3.4). Deixar as duas coexistir como
   `tarefas` (fila) e `tarefas_planejamento` (checklist) seria uma armadilha de
   leitura permanente: no vocabulário do produto, tarefa é o que o casal faz. O
   rename custa uma migration de tabela vazia, um arquivo de teste de RLS e dois
   docs — e nunca será mais barato, pelo mesmo argumento que levou a paleta a
   catorze slots (`fase1` 25.2).
9. **Planejamento é a 6ª aba primária, e Presentes desce para o "Mais" no
   celular.** A barra inferior mostra quatro destinos; a escolha é entre um
   módulo que se configura uma vez e depois se acompanha (Presentes) e o que
   responde "o que eu faço hoje". No desktop nada sai — a nav do cabeçalho
   comporta seis.
10. **O Início ganha um bloco, não uma segunda checklist.** Um número só, o que
    pede providência hoje: vencidas, senão as desta semana, senão o progresso. É
    a regra que o alerta do Financeiro já segue ("o painel mostra no máximo UM
    número do módulo").
11. **Planejamento não tem menu de seção.** Uma tela, um eixo. `adminSectionMenu`
    devolve `[]` e a coluna não existe, dando a largura toda ao conteúdo — como
    já acontece em Presentes.

## 4. Modelo de dados

Convenções obrigatórias aplicadas ([`CLAUDE.md`](../CLAUDE.md) seção 10): PK
`uuid`, `casamento_id` denormalizado, RLS habilitada nascendo sem policy,
policies explícitas só para membros do casamento, `created_at`/`updated_at` por
trigger. Nenhuma tabela desta fase tem policy de leitura pública.

### 4.1 `tarefas` (nova — depois do rename da fila)

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | `uuid` PK | |
| `casamento_id` | `uuid not null` | FK `casamentos`, `on delete cascade` |
| `titulo` | `text not null` | `check (length(trim(titulo)) > 0)` — linha nova em branco é descartada na tela, nunca gravada sem nome |
| `observacao` | `text` | Livre |
| `prazo` | `date` | **Nulo é estado válido**: "quero fazer, não sei quando". A palavra espelha `casamentos.prazo_rsvp`; `vence_em` é de parcela, e tarefa não vence, tem prazo |
| `responsavel` | `text` | Texto livre (decisão 7) |
| `concluida_em` | `timestamptz` | **Única fonte de "feita"** |
| `origem_catalogo` | `text` | Chave estável da sugestão que criou a tarefa; nulo quando o casal digitou do zero |
| `created_at` / `updated_at` | `timestamptz not null` | Trigger `atualizar_timestamp()` |

Índices:

```sql
create index tarefas_casamento_idx on tarefas (casamento_id, prazo);
-- Clique duplo na sugestão não pode virar duas tarefas, e é este índice que
-- faz a sugestão sumir do rodapé de forma confiável — em vez de por
-- comparação de texto, que quebra assim que o casal renomeia a tarefa.
create unique index tarefas_origem_catalogo_key
  on tarefas (casamento_id, origem_catalogo)
  where origem_catalogo is not null;
```

**Exclusão física**, contra a convenção de soft delete e pelo mesmo motivo de
`mesas` e `etapas_evento`: nenhuma outra tabela referencia uma tarefa, e ela não
tem valor histórico próprio — excluir é "eu não vou fazer isso", não "isto
deixou de ter acontecido".

**Por que `origem_catalogo` é chave estável, e não o nome.** O catálogo de
gastos casa por nome de categoria de propósito ("Bebidas do Zé" não é mais a
nossa "Bebidas"). Aqui a relação é outra: a tarefa criada a partir de "Provar o
vestido" **é** aquela sugestão, mesmo depois de o casal renomeá-la para "Provar
o vestido — 2ª prova". Casar por nome faria a sugestão reaparecer no rodapé no
instante em que o casal personalizasse o título, que é justamente o gesto que se
espera dele.

### 4.2 `tarefas` (a fila) → `fila_processamento`

```sql
alter table tarefas rename to fila_processamento;
```

Mais o rename das policies e dos índices para o novo prefixo. A tabela está
vazia e sem chamador; o que acompanha o rename são
`tests/integration/rls/tarefas.spec.ts`, [`ARCHITECTURE.md`](ARCHITECTURE.md)
(seção 3.4 e a tabela de `server/utils/`) e [`DATABASE.md`](DATABASE.md)
seção 2.

### 4.3 O que NÃO entra no modelo

- **`status`/`situacao`** — derivado de `concluida_em` + `prazo` (seção 5).
- **`ordem_exibicao`** — o prazo ordena. Arrastar para reordenar só significa
  algo quando a ordem carrega informação que nenhum campo carrega; aqui ela
  carregaria a mesma coisa que o prazo, em duplicidade.
- **`categoria_id`** — decisão de 2.2.
- **`despesa_id`/`convite_id`** — o vínculo com outros módulos é de sugestão,
  não de dado (decisão 1).

## 5. O que é derivado, e nunca vira coluna

| Derivado | De onde sai | Por que não é coluna |
|---|---|---|
| **Concluída** | `concluida_em is not null` | O timestamp é o fato; uma coluna `status` ao lado seria a segunda verdade que `status_convite` já custou uma migration para remover |
| **Vencida** | `prazo < hoje and concluida_em is null` | Mudaria de valor sozinha à meia-noite; nenhuma escrita a manteria sincronizada |
| **A janela** (esta semana / este mês / mais adiante) | `prazo` contra `hoje` | Idem — e o recorte é do endpoint, porque a lista pode ser longa |
| **Progresso** (`x de y`) | contagem | Contador materializado erra no primeiro caminho que esquecer de atualizá-lo, como `mesas.ocupacao` teria errado |
| **Quais sugestões faltam** | catálogo − tarefas existentes − fatos observados | Semear sugestão como linha é exatamente o que a regra 1 do catálogo de gastos proíbe |

**"Hoje" é sempre recebido como parâmetro**, resolvido no fuso do evento
(`hojeNoFusoDoEvento()`, `shared/utils/orcamento.ts`) — nunca no fuso do
servidor. Em UTC, às 22h de um sábado em São Paulo já é domingo, e uma tarefa
apareceria vencida um dia antes da conta do casal. O cálculo mora em
`shared/utils/planejamento.ts`, o mesmo que a tela e o endpoint usam: dois
lugares decidindo o que é "esta semana" divergem na borda que ninguém testa.

## 6. O catálogo e o motor de sugestão

### 6.1 A estrutura — `shared/planejamento-tarefas.ts`

Duas listas puras, sem nada no banco:

```ts
/** As fases do planejamento, do mais distante ao depois do casamento. */
export const FASES_DO_PLANEJAMENTO = [
  { id: 'doze_meses',    rotulo: '12 meses antes',      diasAntes: 365 },
  { id: 'nove_meses',    rotulo: '9 meses antes',       diasAntes: 270 },
  { id: 'seis_meses',    rotulo: '6 meses antes',       diasAntes: 180 },
  { id: 'quatro_meses',  rotulo: '4 meses antes',       diasAntes: 120 },
  { id: 'tres_meses',    rotulo: '3 meses antes',       diasAntes: 90 },
  { id: 'dois_meses',    rotulo: '2 meses antes',       diasAntes: 60 },
  { id: 'um_mes',        rotulo: '1 mês antes',         diasAntes: 30 },
  { id: 'duas_semanas',  rotulo: '2 semanas antes',     diasAntes: 14 },
  { id: 'semana',        rotulo: 'Semana do casamento', diasAntes: 7 },
  { id: 'depois',        rotulo: 'Depois do casamento', diasAntes: -15 },
] as const

export interface TarefaSugerida {
  /** Chave estável — vai para `tarefas.origem_catalogo` e nunca muda. */
  chave: string
  titulo: string
  fase: FaseId
  /** O fato que torna esta sugestão desnecessária. Ausente = sempre oferecida. */
  dispensadaPor?: FatoObservado
}
```

**Mês é 30 dias por convenção do catálogo, e isso está certo.** O prazo sugerido
é ponto de partida editável, não data legal: que "3 meses antes" caia 90 dias
antes em vez de no mesmo dia do mês é irrelevante para quem vai arrastar a data
de qualquer forma. A única exceção real — a validade de 90 dias da habilitação
de casamento — está resolvida na escolha da fase daquele item, e dita em
comentário no catálogo, não em aritmética de calendário.

**`diasAntes` negativo é depois do evento**, e é por isso que o campo é dias e
não meses: a última fase é a única em que o sinal importa, e um `mesesAntes: -0,5`
seria pior de ler do que `-15`.

### 6.2 As quatro regras da lista

As três do catálogo de gastos (`shared/orcamento-itens.ts`), que se aplicam
igual, mais uma que nasce aqui:

1. **Sugestão não é linha no banco.** Nada vira `tarefas` sozinho — só o clique
   cria. Quarenta e cinco linhas semeadas entrariam no progresso, no bloco do
   Início e no "vencidas" de todo mundo.
2. **A sugestão não se esgota.** Some item a item conforme o casal cadastra,
   volta se ele excluir, e nunca "expira".
3. **Sem duração e sem custo sugeridos.** O catálogo diz *o quê* e *quando*,
   nunca *quanto* — valor é do Financeiro, e "reserve 2 horas para isso" é
   palpite com ar de autoridade.
4. **Sem sugestão que outro módulo já responde** (2.3).

### 6.3 De onde a lista vem

Das treze categorias de `shared/orcamento-categorias.ts` e dos 54 itens de
`shared/orcamento-itens.ts` — as duas listas que já vieram da checklist de uma
cerimonial em atividade, não da nossa imaginação —, **colapsadas para a
granularidade da decisão** (decisão 6), mais as tarefas que não são gasto
nenhum: documentação, lista de convidados, provas, ensaio, o que fica para
depois.

O vínculo com o Financeiro é só de origem: o catálogo de tarefas é uma lista
própria, não gerada em tempo de execução a partir da de gastos. Gerar produziria
títulos que ninguém escreveria ("Contratar Chuva de prata") e obrigaria a um
mapa de prazo por item de qualquer jeito. O que trava o par é teste, não código
compartilhado (seção 10).

### 6.4 O catálogo

`Some quando` é a chave do fato que dispensa a sugestão — nunca o que conclui a
tarefa.

| Quando | Tarefa | Some quando |
|---|---|---|
| 12 meses | Definir o estilo e o tamanho do casamento | — |
| 12 meses | Definir quanto vocês podem gastar | `orcamento_definido` |
| 12 meses | Montar a primeira lista de convidados | `tem_convidado` |
| 12 meses | Escolher e reservar o espaço da festa | `contratado:Espaço e estrutura` |
| 12 meses | Definir o local da cerimônia | `local_definido` |
| 12 meses | Contratar a assessoria ou cerimonial | `contratado:Cerimônia e assessoria` |
| 9 meses | Contratar o buffet | `contratado:Buffet` |
| 9 meses | Contratar fotografia e filmagem | `contratado:Fotografia e vídeo` |
| 9 meses | Fechar a banda ou o DJ | `contratado:Música` |
| 9 meses | Escolher o vestido da noiva | — |
| 9 meses | Reservar o celebrante | — |
| 9 meses | Publicar o site do casamento | `site_publicado` |
| 9 meses | Enviar o save the date | `tem_save_the_date` |
| 6 meses | Contratar a decoração e as flores | `contratado:Decoração e flores` |
| 6 meses | Escolher o bolo e os doces | `contratado:Bolo e doces` |
| 6 meses | Definir o traje do noivo | — |
| 6 meses | Escolher padrinhos e madrinhas | — |
| 6 meses | Fechar a lista de convidados | — |
| 6 meses | Reservar a lua de mel | `contratado:Lua de mel` |
| 4 meses | Encomendar os convites | `contratado:Papelaria e lembranças` |
| 4 meses | Escolher as alianças | — |
| 4 meses | Definir as bebidas e o bar | `contratado:Bebidas` |
| 4 meses | Contratar cabelo e maquiagem | `contratado:Vestuário e beleza` |
| 4 meses | Montar a lista de presentes | `tem_presente` |
| 3 meses | Dar entrada na habilitação no cartório | — |
| 3 meses | Enviar os convites | `tem_convite_enviado` |
| 3 meses | Primeira prova do vestido | — |
| 3 meses | Definir os atrativos da festa | `contratado:Atrativos da festa` |
| 3 meses | Contratar o transporte | `contratado:Transporte` |
| 2 meses | Acompanhar as confirmações de presença | `tem_resposta_rsvp` |
| 2 meses | Escolher as lembrancinhas | — |
| 2 meses | Montar o cronograma do dia | `tem_cronograma` |
| 2 meses | Provar o traje do noivo | — |
| 2 meses | Agendar o ensaio da cerimônia | — |
| 1 mês | Fechar o número de convidados com o buffet | — |
| 1 mês | Montar as mesas e o mapa do salão | `tem_mesa` |
| 1 mês | Última prova do vestido | — |
| 1 mês | Confirmar horários com todos os fornecedores | — |
| 2 semanas | Reconfirmar quem ainda não respondeu | — |
| 2 semanas | Enviar o cronograma para os fornecedores | — |
| 2 semanas | Separar documentos e alianças para o dia | — |
| 2 semanas | Montar o kit de emergência | — |
| Semana | Confirmar o transporte dos noivos | — |
| Semana | Entregar a lista final de mesas ao cerimonial | — |
| Semana | Separar o que vai para o dia (traje, sapatos, documentos) | — |
| Depois | Devolver os trajes alugados | — |
| Depois | Escolher as fotos do álbum | — |
| Depois | Agradecer a padrinhos e convidados | — |
| Depois | Atualizar os documentos com o novo sobrenome | — |

Sobre **"Dar entrada na habilitação no cartório"** em 3 meses e não em 6: a
certidão de habilitação vale 90 dias e o processo leva cerca de 30 (proclamas
incluídos). Pedir cedo demais é tão errado quanto tarde demais, e é o único item
do catálogo em que o prazo não é preferência — por isso ele carrega comentário
próprio no arquivo.

### 6.5 Os fatos observados

Cada `FatoObservado` é uma contagem que o endpoint já sabe fazer, resolvida uma
vez por carregamento:

| Fato | Como é observado |
|---|---|
| `orcamento_definido` | `casamentos.orcamento_total_centavos > 0` |
| `tem_convidado` | ≥ 1 `convidados` não excluído e **não rascunho** (`em_consideracao = false`) |
| `local_definido` | ≥ 1 `etapas_evento` com local resolvido |
| `tem_cronograma` | ≥ 2 `etapas_evento` |
| `site_publicado` | `casamentos.status_ciclo_vida = 'publicado'` |
| `tem_save_the_date` | ≥ 1 `comunicacoes` do tipo save the date |
| `tem_convite_enviado` | ≥ 1 `comunicacoes` do tipo convite |
| `tem_resposta_rsvp` | ≥ 1 `respostas_rsvp` fora de `pendente` |
| `tem_presente` | ≥ 1 `presentes` não excluído |
| `tem_mesa` | ≥ 1 `mesas` |
| `contratado:<Categoria>` | ≥ 1 `despesas` com `valor_centavos` não nulo na categoria de nome igual |

**`contratado:<Categoria>` casa por nome, e a quebra é silenciosa** — categoria
renomeada deixa de dispensar a sugestão, exatamente como deixa de receber
sugestão de gasto. Aqui isso custa ainda menos: o pior caso é oferecer uma
tarefa que o casal já resolveu, e ele a ignora. Como a quebra é silenciosa, o
mesmo teste que o Financeiro tem vale aqui: **toda categoria citada no catálogo
de tarefas precisa existir em `orcamento-categorias.ts`**.

**O rascunho da lista não conta como convidado** — é a mesma regra que já vale
em todo indicador ([`CLAUDE.md`](../CLAUDE.md) seção 12); uma pessoa "em
consideração" não faz a sugestão "montar a lista" desaparecer.

## 7. API

Pastas de rota em inglês, como toda `server/api/**`; colunas e vocabulário de
dados em português.

| Rota | O que faz |
|---|---|
| `GET /api/planning/tasks` | A lista completa + os fatos observados. Sem paginação: o teto real são algumas dezenas de linhas, e paginar quebraria o agrupamento por janela, que é a tela inteira |
| `POST /api/planning/tasks` | Cria. Aceita `titulo`/`prazo`/`responsavel`/`observacao`, **ou** só `chaveCatalogo` |
| `PATCH /api/planning/tasks/[id]` | Edita qualquer campo, inclusive concluir e desconcluir (`concluida_em`) |
| `DELETE /api/planning/tasks/[id]` | Exclusão física |
| `GET /api/planning/summary` | Os números do bloco do Início — vencidas, desta semana, progresso |

**O título e o prazo de uma sugestão são resolvidos no servidor, nunca aceitos
do client.** O `POST` com `chaveCatalogo` lê o catálogo em `shared/`, monta o
título e calcula o prazo a partir de `casamentos.data_evento` — o client manda a
chave e nada mais. É o mesmo princípio que já vale em presentes ("valor e
quantidade são sempre recalculados no servidor"), aplicado ao que o catálogo
promete.

**Chave inexistente é 400, não uma tarefa com título vazio** — e chave de uma
sugestão que já virou tarefa é 409 pelo índice único, não uma segunda linha.

O composable é `usePlanning` (`listTasks`, `createTask`, `updateTask`,
`deleteTask`, `getResumo`), e toda mutação passa por ele: nenhum componente faz
`$fetch` de mutação direto, exceto a linha editável, que chama a própria mutação
pelo mesmo motivo que a linha do Financeiro chama (`CLAUDE.md` §9: componente
self-contained — com o salvamento na página, a linha não saberia que falhou).

## 8. UI e navegação

### 8.1 A aba

`adminPrimaryNav` ganha **Planejamento** entre Início e Convidados, e a ordem
final é Início · Planejamento · Convidados · Financeiro · Presentes ·
Configurações. `AdminBottomTabs` corta nos quatro primeiros, então Presentes
desce para o "Mais" junto de Configurações (decisão 9) — é a ordem que decide
quem fica na barra, não o componente.

Rota: `/admin/[slug]/planejamento`. Sem menu de seção (decisão 11).

### 8.2 A tela

Uma faixa de números no topo (`AdminMetricStrip`), e **um único agregado no
módulo inteiro** — a lição da régua repetida: *X vencidas · Y esta semana ·
Z de W concluídas*.

Abaixo, a lista agrupada por janela, na ordem da urgência:

| Grupo | O que entra | Nota |
|---|---|---|
| **Vencidas** | `prazo < hoje`, não concluída | Só aparece quando existe; um grupo vazio em vermelho é alarme falso |
| **Próximos 7 dias** | hoje … +7 dias | O rótulo nomeia a janela móvel, não o calendário (13.1) |
| **Próximos 30 dias** | +8 … +30 dias | Idem — era "Este mês", e mentia em toda segunda quinzena |
| **Mais adiante** | > 30 dias | |
| **Sem prazo** | `prazo is null` | Depois das com prazo: é a caixa de "quero fazer", não de atraso |
| **De etapas que já passaram** | só sugestões, de fases já passadas | Recolhido por padrão (decisão 3). Não afirma que foram resolvidas — não se sabe |
| **Concluídas** | `concluida_em` preenchido | Recolhido, no fim, com a contagem no rótulo |

Cada linha: caixa de marcar, título, prazo, responsável. Tudo editável no lugar,
com as mesmas quatro regras que a linha do Financeiro já provou (`fase1` 24.3) —
**salva ao sair da LINHA, não do campo**; rascunho local por tarefa; no erro o
rascunho é descartado; título esvaziado volta ao que era, porque excluir é ação
explícita. E **sair de uma linha nova em branco desiste dela**: "+ adicionar" é
barato de clicar por engano.

No rodapé de cada grupo, as sugestões que faltam — apagadas, com borda
tracejada, no desenho já usado no rodapé da categoria: *"Costuma entrar aqui:
+ Contratar o buffet · + Fechar a banda ou o DJ · …"*. **Até cinco por grupo,
com "ver todas"**: a lista completa nunca some, mas trinta sugestões em "Mais
adiante" sequestrariam a tela de quem está a um ano do casamento.

Clicar numa sugestão **cria a tarefa direto**, e ela aparece pronta na janela
certa. É a diferença deliberada em relação ao rodapé do Financeiro, onde o
clique abre a linha com o cursor no valor: lá o valor é o que falta saber, aqui
a sugestão já traz título **e** prazo — não falta nada a digitar, e abrir um
campo seria pedágio.

### 8.3 O bloco no Início

Um cartão, um número, o mesmo desenho do alerta do Financeiro: vencidas
primeiro; sem vencidas, as desta semana; sem nenhuma das duas, o progresso
("12 de 20 concluídas"). Nunca os três. Link para a tela com o grupo
correspondente.

### 8.4 Estado vazio

Quem chega sem nenhuma tarefa não vê uma tela vazia com um botão "criar
tarefa" — vê **as sugestões da fase em que o casamento está**, que é a resposta
literal a "por onde eu começo". "Começar com a checklist sugerida" **não**
existe como botão que cria tudo de uma vez: seria a regra 1 do catálogo violada
por atalho, e quarenta e cinco linhas nascidas juntas fazem o progresso começar
em 0 de 45 — o oposto de acolhedor.

### 8.5 Acessibilidade e tema

Estado por token (`danger`/`warning`/`success`), nunca `text-red-600`; vencida
não pode ser distinguida **só** por cor (o rótulo do grupo já diz, e a linha traz
a data); a caixa de marcar é `<input type="checkbox">` de verdade, com o título
como rótulo; e nada de animação nova enquanto `prefers-reduced-motion` seguir no
backlog.

## 9. Candidatos a invariante no `CLAUDE.md` (seção 12)

1. **O sistema sugere, o casal conclui.** Nenhuma tarefa é marcada ou desmarcada
   por fato de outro módulo; os fatos decidem só o que é oferecido. Errar ao não
   sugerir custa um clique; errar ao concluir custa a tela.
2. **Sugestão nunca é linha no banco** — já vale para gastos, passa a valer para
   tarefas, e é a mesma regra: o catálogo vive em `shared/`, a tela mostra o que
   falta, e só o clique do casal cria.
3. **`concluida_em` é a única fonte de "feita"**, e janela de prazo é sempre
   derivada de `prazo` contra hoje (resolvido no fuso do evento) — nunca coluna
   de status.
4. **Sugestão de fase já passada nasce sem prazo**, nunca vencida: o sistema não
   inventa atraso para quem chegou depois.
5. **Planejamento não duplica pergunta que outro módulo responde melhor** —
   parcela a vencer é Pagamentos, não uma linha da checklist.

## 10. Ordem de implementação

| Etapa | O que sai | Por quê nesta ordem |
|---|---|---|
| **F3.1** | Migration: rename da fila + `tarefas` + RLS. Schemas Zod, API CRUD, `usePlanning` | Fundação; o rename primeiro, enquanto a fila segue sem chamador |
| **F3.2** | A tela: grupos por janela, linha editável, concluir, excluir | É onde o valor aparece, e ela já se sustenta sem catálogo nenhum |
| **F3.3** | `shared/planejamento-tarefas.ts`, os fatos observados, os rodapés de sugestão e o estado vazio | Depende da tela existir para ter onde pendurar o rodapé |
| **F3.4** | A 6ª aba, a troca na barra do celular, o bloco no Início | Navegação por último: mexe em tela entregue, e o destino precisa existir antes |
| **F3.5** | Testes — unitários das janelas e do motor de dispensa; o teste que trava catálogo × categorias; E2E do caminho "sugestão → tarefa → concluída" | |

## 11. Em aberto

- **O rótulo da aba**: "Planejamento" (nome do módulo no plano) ou "Checklist"
  (o termo que o casal usa)? A decisão é de vocabulário visível, e a rodada de
  implementação pode resolvê-la com o casal na tela.
- **Quantas sugestões por grupo antes do "ver todas"** — cinco é o palpite da
  seção 8.2, e é o tipo de número que só a tela cheia confirma.
- **O aviso de prazo**, se e quando o resumo por-casal for desenhado (2.2).
- **O vínculo exato `tarefa → despesa`**, nomeado para a V2 (2.2) — é a única
  porta que esta fase deixa aberta de propósito no modelo de dados, e ela abre
  sem migration estrutural (uma FK opcional a mais).

---

## 12. O que a implementação resolveu (2026-09-13)

A fase saiu inteira — F3.1 a F3.5 — e o refinamento acima sobreviveu quase sem
emenda. O que mudou, e o que o caminho ensinou:

### 12.1 Um bug de framework, achado pelo E2E

Concluir uma tarefa gravava `concluida_em` no banco e **a tela não mudava**. Sem
erro no console, sem requisição falhando: a linha simplesmente continuava no
grupo de origem. Reproduzia em toda execução do E2E.

A causa é `refreshNuxtData`, usado por todos os composables do projeto para
recarregar depois de uma mutação. Ele é o hook `app:data:refresh` precedido de
`await onNuxtReady()` — que é um `requestIdleCallback`. **Essa espera por
ociosidade não tem prazo**: quando ela não chega, a mutação vai ao banco e a
tela fica parada, sem nada para acusar. Curiosamente o mesmo caminho funcionava
na criação de tarefa e travava na conclusão, o que fez o defeito parecer
timing de teste até a instrumentação mostrar que a requisição de refetch nunca
saía.

`usePlanning.atualizarPlanejamento` passa a chamar o hook direto. O raciocínio
vale como regra: **atualizar a tela é consequência direta de um clique do casal,
não trabalho de segundo plano** — não pode depender de a aba estar ociosa.

Fica registrado que **o resto do painel usa `refreshNuxtData`** (Financeiro,
Convidados, Mesas, Comunicações) e portanto carrega o mesmo risco latente. Os
E2E desses módulos passam hoje, então nada foi mexido junto: trocar quatro
composables por causa de um defeito que só se manifestou aqui seria mudança
grande sem evidência: mas quando aparecer "salvei e a tela não mudou" em
qualquer outro módulo, a causa provável está escrita aqui.

### 12.2 Dois ajustes de tela que o uso real pediu

- **O campo de prazo diz "Definir prazo", não "Sem prazo".** Dentro do grupo
  "Sem prazo", cada linha repetia o nome do próprio grupo — e o campo é uma
  ação a tomar, não um estado a reafirmar.
- **A contagem só aparece quando há o que contar.** Um grupo que existe apenas
  para carregar sugestões mostrava "0" ao lado do nome, anunciando uma ausência
  que ninguém tinha perguntado.

### 12.3 O que o typecheck pegou

`z.infer` num schema cujos campos de texto passam por `.transform()` devolve a
SAÍDA — com `observacao` e `responsavel` obrigatórios (`string | null`). Tipar o
composable por ele obrigaria quem cria uma tarefa a mandar `observacao: null`
explicitamente, cerimônia para dizer "não tenho nada a dizer aqui". Os tipos
exportados de `shared/schemas/planejamento.ts` são `z.input`.

### 12.4 Armadilhas registradas

- **Componente em subpasta ganha o prefixo do caminho no auto-import.**
  `components/admin/planning/PlanningQuickAdd.vue` é `<AdminPlanningQuickAdd>`,
  e um componente não resolvido **não** dá erro: o Vue o trata como elemento
  desconhecido e a tela some em silêncio — foi assim que a primeira execução
  mostrou a página sem a linha de entrada e sem nenhum grupo.
- **Página nova precisa de restart do dev server.** O Nitro recarregou os
  endpoints sozinho (`/api/planning/*` já respondia 401), mas a rota de página
  continuou 404 até reiniciar — o que fez a tela parecer quebrada quando só não
  existia ainda.
- **`tests/e2e/financeiro.spec.ts` tem um teste dependente de dado do
  ambiente** ("arquivar fornecedor contratado…" procura o fornecedor "Buffet
  Recanto", que não existe mais no dev). Ele falha na `main` também —
  verificado com as mudanças desta fase fora da árvore. Não é desta fase, mas
  vai continuar falhando até alguém dar fixture própria a ele.

---

## 13. A rodada da auditoria externa (2026-09-15)

A tela foi submetida a uma auditoria de UX feita por um LLM externo, a partir de
uma captura. Ela levantou 19 pontos; **quatro** viraram trabalho, e o resto
sobreviveu ao confronto com o refinamento — o registro do que **não** se fez
está em 13.5, porque os mesmos pedidos vão voltar.

### 13.1 O "bug prioritário" que não existia, e o rótulo que o causou

O achado 🔴 nº 1 da auditoria: tarefas de **5 de outubro** no grupo "Este mês"
com o cabeçalho marcando **2 de julho de 2027** seriam prova de agrupamento
quebrado. Dois enganos somados — `02/07/2027` é a **data do casamento** no
cabeçalho do painel (`layouts/admin.vue`), não hoje; e as janelas são **móveis**
(hoje+7, hoje+30), nunca de calendário.

Não havia bug. Mas havia um rótulo que convidava à leitura errada: "Este mês"
descreve trinta dias corridos, e em qualquer segunda quinzena o grupo mostra
datas do mês seguinte. Quem confere a data conclui que o agrupamento falhou —
foi exatamente o que aconteceu. Os rótulos passam a nomear a janela:
**"Próximos 7 dias"** e **"Próximos 30 dias"**.

Os **ids** (`esta_semana`, `este_mes`) ficam: eles nomeiam o conceito no código,
e trocá-los custaria churn em tela, painel e testes sem mudar nada que o casal
veja.

A janela de calendário que a auditoria propôs no lugar seria pior, e é o motivo
de a móvel ter sido escolhida: em 29 de setembro, uma tarefa de 1º de outubro
cairia em "Próximo mês" e uma de 30 de setembro em "Este mês" — dois dias de
distância desenhados como urgências opostas.

`ja_passou` também deixou de afirmar o que não sabe: **"De etapas que já
passaram"**. A alternativa sugerida ("Sugestões já resolvidas") inverte o
sentido do grupo — quem descobre o produto a quatro meses do casamento talvez
não tenha feito nada daquilo, e é precisamente por isso que a fase 3 decidiu que
essas sugestões nascem sem prazo.

### 13.2 "1 de 5" ganha denominador

A faixa dizia `Concluídas · 1 de 5` e não dizia de quê — e aqui a dúvida é
legítima, não desatenção: **sugestão não é linha no banco**, então o
denominador poderia razoavelmente ser tarefas, sugestões ou a soma. A linha de
apoio do `AdminMetric` (que já existia) nomeia o universo — `1 de 5` ·
*tarefas* — sem acrescentar um segundo número, e usa a mesma palavra do bloco do
Início ("tarefas concluídas").

### 13.3 A linha deixa de parecer planilha

O ponto mais forte da auditoria, e o único de visual que não era gosto: quatro
molduras permanentes por linha (título, prazo, responsável, menu) faziam a tela
ler como formulário administrativo, e o peso ficava todo na estrutura em vez de
no que a tela tem a dizer.

A correção não é nova: é a `variant="quiet"` que o Modo Lista já usa, e que
existe por esse mesmo diagnóstico. Só que a `quiet` pura vale para **tabela de
desktop**, que no celular vira o slot `#stacked` e não desenha campo nenhum — e
a linha do Planejamento não é tabela: ela **empilha** em `sm`, e ali um campo
sem moldura de 32px seria um controle que não se anuncia num alvo de toque
menor. Daí `'quiet-desktop'` em `UiInput` e `UiDatePicker`: `campo` abaixo de
`sm`, `quiet` acima. No seletor de data a seta some junto na variante silenciosa
— o ícone de calendário já diz o que o controle faz.

A `quiet` existente não foi tocada: ela é usada em três telas entregues, e mudar
a variante compartilhada para servir a esta teria mexido no visual de todas.

### 13.4 O responsável autocompleta, e continua texto livre

A auditoria pediu uma lista fechada de responsáveis (noivo, noiva, ambos,
cerimonial). Isso é a decisão 7 ao contrário — quem executa tarefa de casamento
é a mãe da noiva, a irmã, o cerimonial: gente sem login, e que não deve precisar
de um para ser citada.

O atrito real que o pedido descreve, porém, existe: redigitar "Cerimonial Ana"
a cada tarefa. A resposta é um `<datalist>` com os nomes **já usados na
checklist** (`UiInput` ganhou `suggestions`) — autocompleta sem restringir, e a
lista se forma do uso, não de um cadastro. Quem digita um nome novo não é
corrigido nem barrado.

### 13.5 O que a auditoria pediu e continua fora

Todos já estavam decididos, e nenhum argumento novo apareceu:

- **Bloco "Sugestões" separado das tarefas** — decisão 2: duas taxonomias na
  mesma tela é exatamente o que o eixo único evita.
- **Categoria/assunto na tarefa** e **biblioteca de sugestões por categoria** —
  2.2: somar tarefas por assunto não responde nada que a lista por tempo não
  responda.
- **Dependências entre tarefas** e **subtarefas sugeridas** ("talvez você também
  precise de álbum, reunião, horas") — 2.2 e decisão 6: a granularidade é a
  DECISÃO, e a lista de 54 linhas é a que ninguém termina.
- **Estados "Pendente"/"Em andamento"** — não existem, e não é lapso:
  `concluida_em` é a única fonte de "feita" (invariante do `CLAUDE.md`). A
  auditoria leu um estado que a tela nunca mostrou.
- **Cartão "Próximo passo" no topo** — decisão 10: o módulo tem UM agregado, e
  o Início já mostra esse número. A lista já começa pelo mais urgente.
- **Itens no menu da linha** (alterar prazo, alterar responsável) — duplicariam
  a edição no lugar, que é o gesto que a fase inteira comprou.

### 13.6 A checklist passa a morar no painel branco

Fecha o mesmo assunto de 13.3 pelo lado da superfície: a lista estava solta
sobre o fundo da página enquanto Convidados, Presentes e Financeiro põem a
deles dentro de `AdminPanel` — branco, borda de 1px, cantos arredondados. Duas
superfícies diferentes para o mesmo tipo de conteúdo (uma lista de linhas)
faziam esta tela parecer de outro produto.

A linha de entrada virou a **primeira faixa do painel**, separada por divisor,
como a barra de filtros é lá — e perdeu o retângulo tracejado que tinha: ao
lado de um painel branco, ele lia como um segundo painel mais fraco, dois
contêineres para uma coisa só. A composição final (faixa de números cinza sobre
painel branco) é a mesma de Presentes.

### 13.7 O que saiu daqui e serve o painel todo

A contagem regressiva no cabeçalho (`faltam 291 dias`, ao lado da data) nasceu
como ponto 11 desta auditoria e **não é do Planejamento**: é a mesma conta que
define as janelas — por isso `diasAteOEvento`/`rotuloDaContagem` moram em
`shared/utils/planejamento.ts` —, mas quem a exibe é o cabeçalho de todas as
telas do painel, e ela dá escala tanto a uma tarefa vencida quanto a uma parcela
a vencer sem que nenhuma das duas telas repita o número. Some depois do
casamento: contagem regressiva de evento passado não informa, cobra.
