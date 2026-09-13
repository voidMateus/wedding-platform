# Refinamento — Fase 2 do Hub: Convidados (o que falta)

> **Status: documento de decisão.** Refinamento da Fase 2 descrita em
> [`plano-produto-hub-casamento.md`](plano-produto-hub-casamento.md) seção 4,
> seguindo o rito da seção 6 (escopo → modelo de dados → fluxos de UI →
> tarefa). Decisões datadas de **2026-09-13**; só mudam por acordo explícito
> registrado aqui como nova decisão datada.
>
> O módulo Convidados **já existe** — esta fase não o reconstrói. Ela fecha o
> que ficou pela metade (seção 5.1 do plano) e acrescenta as duas peças que o
> mapa de módulos marcou como novas: **Mesas** e **Comunicações**.

---

## 1. O problema

O módulo Convidados resolve bem duas perguntas — *quem eu vou convidar?* (a
lista, os grupos, os acompanhantes) e *quem confirmou?* (o RSVP e o funil de
estágios do convite). Entre uma e outra, e depois das duas, há três perguntas
que hoje voltam para o WhatsApp e para a planilha:

1. **Eu já mandei o convite para essa pessoa?** — o sistema tem um checkbox
   "Marcar como enviado" que o casal precisa lembrar de clicar, e o trabalho
   real (achar o telefone, copiar o link, escrever a mensagem, mandar) não
   acontece aqui. Para oitenta convites, são oitenta idas e voltas entre
   quatro telas.
2. **Quem senta onde?** — a pergunta que só aparece nas últimas três semanas
   e que hoje não tem lugar nenhum no produto. O casal desenha num papel, a
   cerimonialista redesenha noutro lugar, e quando três pessoas desistem
   ninguém sabe quais mesas ficaram com buraco.
3. **Por que ainda preciso abrir um formulário para trocar um nome?** — o
   Modo Lista se propõe "planilha inteligente" e só a coluna Categoria se
   edita na linha. Nome, grupo e observação exigem modal, que é exatamente a
   fricção que empurra a lista de volta para o Excel.

### 1.1 As três peças têm a mesma origem

Não são três assuntos soltos: são o **ciclo de vida de um convidado** depois
que ele já está cadastrado — *avisar* → *acompanhar* → *acomodar*. O produto
hoje cobre bem só o meio. Comunicações é a entrada do ciclo (o convite sai da
plataforma), Mesas é a saída (o convidado vira um lugar no salão), e a edição
na linha é o atrito de manutenção que atravessa os dois.

Princípio do plano aplicado aqui — **estrutura pronta + liberdade de
planilha**: o sistema já sabe que existe convite, lembrete e mesa, mas nunca
exige que o casal use o caminho dele. Registrar que o convite foi entregue em
mãos é caminho de primeira classe, exatamente como uma resposta de RSVP
registrada por telefone já é (`PRODUCT.md` seção 5.2).

## 2. Escopo da v1

### 2.1 Entra

| Peça | O que é |
|---|---|
| **Edição na linha** (Modo Lista) | Nome, categoria e observação editáveis na célula, no mesmo padrão já provado em Categorias do Financeiro (`fase1-financeiro.md` seção 24). Grupo não entra: a tela já agrupa em blocos por grupo (ver 11.9) |
| **RSVP agrupado por núcleo** | Os membros de um convite aparecem agrupados por Acompanhantes na tela do convidado, em vez de N nomes soltos |
| **Comunicações** | Registro de cada envio (save the date / convite / lembrete) por canal, e o WhatsApp assistido: mensagem pronta com o link, aberta no número do responsável |
| **Modelo de mensagem** | Um texto por tipo, com variáveis, editável pelo casal — a mesma fonte que o e-mail vai usar quando chegar |
| **Mesas** | Mesa com nome, capacidade e medidas; quem senta; ocupação derivada; o que falta acomodar |
| **Planta do salão** | As mesas posicionadas em coordenadas reais, arrastáveis no desktop, com teclado como caminho equivalente e impressão |
| **Elementos do salão** | Pista, palco, buffet, bolo, entrada — referências que não sentam ninguém, mas sem as quais a planta é um punhado de círculos flutuando |
| **Limpeza dos fios soltos** | Os itens de menu que prometem tela inexistente, o painel de rascunho sem usuário, `convites.status_convite` |

### 2.2 Fica de fora — decisão, não esquecimento

- **Envio real por e-mail** (provedor, domínio verificado, template HTML,
  bounce) e, com ele, **o lembrete automático de RSVP**. Decisão de
  2026-09-13: a v1 de Comunicações é WhatsApp + registro. O motivo não é
  fugir da infraestrutura — é que o canal do casamento brasileiro é o
  WhatsApp, o telefone já está no cadastro, e o e-mail entrega um valor novo
  (**trabalhar sozinho**) que não depende de nada do que esta fase constrói,
  exceto do modelo de mensagem, que ela já deixa pronto. Fica nomeado como a
  entrega seguinte, não como backlog difuso: é dela que dependem o lembrete
  de RSVP (`ROADMAP.md` Fase 2) e o lembrete de vencimento do Financeiro
  (`fase1-financeiro.md` seção 2.2), os dois já dependurados nesta fase.
- **WhatsApp Business API** (envio automático, sem humano). Exige conta
  comercial, aprovação de template e custo por mensagem. O `wa.me` cobre a
  intenção real com zero infraestrutura.
- **SMS.** Nenhum casal pediu, e o canal praticamente morreu no Brasil para
  esse uso.
- **Pixel de rastreamento de abertura.** A coluna `comunicacoes.aberto_em`
  existia para isso e **sai** (4.5): o sistema já tem um sinal de abertura
  melhor e não invasivo — o evento `rsvp.first_access`, que é acesso real ao
  convite e é o que já alimenta o estágio *Aberto*.
- **"Encontre sua mesa" no site público.** Nenhum dado de Mesas tem rota
  pública nesta v1: quem senta com quem é informação social delicada, e
  publicá-la é decisão de privacidade própria, não efeito colateral de
  existir a tabela. Fica nomeada para a V2, com a decisão a tomar.
- **Cadeira numerada.** A mesa tem lugares, não assentos identificados —
  ninguém marca cadeira em casamento, e numerar obrigaria a resolver
  "cadeira 3 de uma mesa que virou de 8 para 10".
- **Perguntas extras no RSVP** (restrição alimentar, transporte, hospedagem)
  — o que o item de menu "Formulários" insinuava sem nunca entregar. O item
  sai do menu nesta fase (7.5); a funcionalidade vira direção nomeada para
  uma rodada própria, porque mexe no fluxo do convidado e no schema de
  resposta, não na lista do casal.
- **Desagrupar em massa** (núcleo de Acompanhantes). Reavaliado nesta fase,
  como o plano pedia: **continua fora**. Agrupar em massa existe porque a
  lista nasce solta — dezenas de nomes entram por entrada rápida ou colados
  da planilha, e o agrupamento vem depois. Desagrupar não tem gesto de
  origem equivalente: desfazer é tirar o acompanhante pelo cadastro, e com
  dois membros isso já dissolve o núcleo.
- **Acompanhantes editáveis na célula** do Modo Lista. Agrupar exige dizer
  *com quem*, o que não cabe numa célula sem virar um seletor de pessoas
  dentro de uma linha de tabela; a seleção múltipla + "Agrupar como
  acompanhantes" já cobre isso e é o gesto certo. A coluna continua sendo o
  rótulo derivado, em leitura.
- **Mais de uma planta por casamento** (cerimônia e festa em salões
  distintos). Uma planta por casamento na v1; a segunda vira uma FK a mais
  quando alguém precisar, sem migration estrutural.
- **Exportação em PDF** do mapa de mesas. A v1 entrega CSV e uma folha
  imprimível pelo navegador; PDF segue no backlog técnico contínuo do plano
  (seção 5.3), junto com os outros.

## 3. Decisões desta rodada (2026-09-13)

1. **`convites.enviado_em` deixa de ser coluna e passa a ser derivado do
   registro de envio.** É a mesma lição do funil de estágios (`CLAUDE.md`
   seção 12): estado que os fatos já contam nunca vira coluna a sincronizar.
   Hoje o fato "mandei o convite" tem uma representação frouxa (um timestamp
   marcado à mão); a partir de Comunicações ele tem uma de verdade (a linha
   de `comunicacoes`), e manter as duas recria exatamente o problema que
   `status_convite` criou. "Marcar como enviado" vira **"Registrar envio"**,
   com canal — e o canal `outro` é o que preserva o gesto de hoje para quem
   entregou em mãos.
2. **Registrar um envio feito fora da plataforma é caminho de primeira
   classe**, não uma concessão. Convite em papel, entregue na mão, mandado
   pela cerimonialista — tudo isso é envio, e o funil nunca exigiu jornada
   digital. Simétrico com a resposta de RSVP registrada pelo casal.
3. **Abrir o WhatsApp É a declaração de envio.** O clique em "Enviar" abre o
   `wa.me` com a mensagem pronta **e** grava o registro na mesma ação, com
   desfazer na própria linha. Voltar da aba do WhatsApp para confirmar em
   cada convite dobraria o número de gestos numa tarefa que se faz oitenta
   vezes seguidas — e o sistema nunca comprovou entrega mesmo, nem antes.
4. **Registro de canal `outro` é removível; envio feito pelo sistema não
   é.** Um é declaração do casal (e declarar por engano precisa ter saída),
   o outro é fato que aconteceu. Mesma assimetria de "*Aberto* é o único
   estágio comprovado pelo sistema".
5. **Um modelo de mensagem por tipo, compartilhado entre canais.** O texto
   vive em `casamentos.config_comunicacao`, com um catálogo fechado de
   variáveis. É o que impede o e-mail de nascer, na entrega seguinte, com um
   segundo texto que diverge do WhatsApp no primeiro ajuste.
6. **O envio gera a credencial de acesso se ela não existir, e nunca
   rotaciona uma que exista.** O link é o ponto do envio, então exigir que o
   casal passe antes pela tela do convite seria um pedágio inútil; e
   rotacionar invalidaria QR já impresso — a regra que
   `guest-access-tokens/index.post.ts` já protege.
7. **Convite sem telefone não é erro, é trabalho a fazer.** A tela de
   Comunicações mostra quantos convites não têm como receber por WhatsApp e
   leva para completar o contato. Bloquear o envio em massa por causa deles
   travaria os setenta que dão certo.
8. **Arrastar posiciona a MESA; sentar é atributo da PESSOA.** A planta
   responde "como o salão está montado"; quem senta onde se resolve abrindo
   a mesa e escolhendo, com busca. Arrastar pessoas para dentro de círculos
   é um segundo caminho para a mesma mutação, que só funciona no desktop e
   que precisaria conviver com o primeiro de qualquer jeito.
9. **A planta é uma segunda representação, nunca a única.** A lista de mesas
   faz tudo — criar, renomear, sentar, tirar, ver ocupação — e é ela que
   funciona no celular e com leitor de tela. A planta acrescenta a camada
   espacial. Uma tela só, duas vistas (`?vista=planta|lista`): é o mesmo
   objeto e o mesmo eixo, e trocar de representação nunca foi trocar de tela
   (mesmo critério de `fase1-financeiro.md` seção 21).
10. **Coordenadas em centímetros, nunca em pixels.** O salão tem medidas
    reais, a mesa redonda de 8 lugares tem 1,80 m, e é a comparação entre as
    duas que responde "cabe?". Em pixels, a planta muda de significado
    quando muda o tamanho da tela e nunca conversa com a planta que o buffet
    mandou. Pixel é `centímetro × zoom`, resolvido só na renderização.
11. **Capacidade excedida é avisada, nunca bloqueada.** Dez pessoas numa
    mesa de oito é um estado real do planejamento ("depois eu resolvo"), e o
    produto que recusa gravar isso obriga o casal a sair dele para pensar.
    Mesma regra da divergência entre parcelas e valor do contrato.
12. **Quem recusou não é retirado da mesa automaticamente.** É sinalizado na
    mesa ("2 nesta mesa não vão") e sai do "falta acomodar". Retirar sozinho
    apagaria trabalho do casal por causa de uma resposta que ainda pode
    mudar.
13. **Acompanhante avulso ocupa lugar.** Em `modo_lista_convidados =
    'aberta'` existem pessoas confirmadas que não são linha de `convidados`;
    sem elas, a ocupação da mesa mente justamente no evento que mais precisa
    de controle de lugar.
14. **Rascunho da lista (`em_consideracao`) nunca senta**, pelo mesmo motivo
    de nunca receber convite — e com a mesma garantia, uma constraint, e não
    um filtro que cada endpoint novo precise lembrar.
15. **Ocupação é sempre contagem, nunca coluna.** Não existe
    `mesas.ocupacao`: sentar e tirar acontecem em vários caminhos (a mesa, a
    lista, a exclusão de convidado, a importação), e um contador
    materializado erraria no primeiro que esquecesse de atualizá-lo.
16. **Mesa não pertence a etapa do evento.** Só a recepção tem mesas, e
    amarrá-las a `etapas_evento` criaria uma escolha obrigatória ("de qual
    etapa é esta mesa?") cuja resposta é sempre a mesma.

## 4. Modelo de dados

Convenções obrigatórias aplicadas a todas as tabelas abaixo (`CLAUDE.md`
seção 10): PK `uuid`, `casamento_id` denormalizado e preenchido por trigger,
RLS habilitada nascendo sem policy, policies explícitas só para membros do
casamento, `created_at`/`updated_at` por trigger. Nenhuma tabela desta fase
tem policy de leitura pública.

### 4.1 `mesas` (nova)

| Coluna | Tipo | Nota |
|---|---|---|
| `nome` | `text not null` | "Mesa 7", "Mesa dos Pais", "Cabeceira" — livre, porque nem toda mesa é numerada |
| `capacidade` | `int not null check (capacidade > 0)` | Lugares, não assentos identificados |
| `formato` | `text not null check (formato in ('redonda','retangular'))` | Union type no TS, espelhando o CHECK |
| `largura_cm` / `profundidade_cm` | `int not null` | Na redonda, os dois são o diâmetro — `check (formato <> 'redonda' or largura_cm = profundidade_cm)` |
| `posicao_x_cm` / `posicao_y_cm` | `int not null default 0` | Origem no canto superior esquerdo do salão |
| `rotacao_graus` | `int not null default 0 check (between 0 and 359)` | Só a retangular usa; a UI oferece "girar 90°" |
| `observacao` | `text` | "perto do ar-condicionado", "cadeira de rodas" |

Índice único parcial em `(casamento_id, lower(nome))` — duas "Mesa 7" no
mesmo salão é sempre erro de digitação, e descobrir isso na hora de imprimir
o mapa é tarde.

**Exclusão é física, contra a convenção de soft delete, e de propósito.** A
regra do `CLAUDE.md` pede soft delete "para entidades com valor histórico
próprio", e a mesa não tem: ela é rascunho de layout, criada e desfeita
dezenas de vezes enquanto o salão é montado, e o dado que importa (quem é
convidado) nunca mora nela. Soft delete aqui criaria um estado fantasma —
pessoas com `mesa_id` apontando para uma mesa invisível, sumindo da ocupação
sem reaparecer em "falta acomodar". Com `on delete set null`, o banco devolve
essas pessoas à fila sozinho; a confirmação diz antes quantas são, e a ação
entra em `trilha_auditoria`.

### 4.2 `elementos_planta` (nova)

Pista, palco, buffet, bolo, entrada, bar, outro — `tipo` + `nome` opcional
(o tipo já rotula; o nome existe para o `outro` e para quem quiser precisar),
mais as mesmas medidas, posição e rotação de `mesas`. **Sem capacidade e sem
ninguém sentado**: são referência espacial, e é por causa delas que "não
coloque a tia Cléia na mesa colada na caixa de som" é uma decisão que a
planta permite tomar. Exclusão física, mesma razão.

### 4.3 `casamentos.planta_largura_cm` / `planta_profundidade_cm` (colunas novas)

`int`, nulas. **Nulo é estado válido**: sem as medidas, a planta se ajusta ao
conteúdo e não desenha parede nenhuma. Definir as medidas desenha o salão e
passa a avisar o que ficou fora dele. Um padrão gravado sozinho ("20 × 15 m")
faria o casal olhar para um número que ele nunca digitou e tentar entender de
onde saiu.

### 4.4 `convidados.mesa_id` e `acompanhantes_avulsos.mesa_id` (colunas novas)

FK para `mesas`, `on delete set null`, nulas, indexadas.

**Coluna, e não uma tabela `assentos` de junção**: uma pessoa senta em no
máximo uma mesa, então a junção modelaria um N:N que o domínio não tem — e a
alternativa com XOR entre `convidado_id` e `acompanhante_avulso_id` seria
cerimônia para guardar exatamente a mesma informação. É o desenho de
`grupo_id`, e o significado é o mesmo: **um quarto vínculo do convidado,
independente dos outros três**. Mesa não se deriva de convite nem de grupo —
parentes do mesmo convite sentam separados o tempo todo, e é comum uma mesa
juntar gente de convites diferentes.

Constraint `convidados_em_consideracao_sem_mesa`
(`check (not em_consideracao or mesa_id is null)`), irmã da
`convidados_em_consideracao_sem_convite`: é ela, e não a memória de quem
escrever o próximo endpoint, que sustenta a decisão 14.

### 4.5 `comunicacoes` (remodelada)

A tabela existe desde a Fase 0 e **nunca teve uma linha escrita** — nada no
código a lê ou grava. A remodelagem é livre, e o que ela tinha estava errado
para o uso real:

| Antes | Depois | Por quê |
|---|---|---|
| `credencial_id not null` | `convite_id not null` | Comunicação é do convite (a unidade de comunicação, `PRODUCT.md` 5.1). Presa à credencial, rotacionar o código dispersaria o histórico entre linhas — e um envio de canal `outro` não precisa de credencial nenhuma |
| — | `convidado_id` (nulo) | O destinatário quando o envio vai para uma pessoa: telefone e e-mail são por pessoa, nunca herdados de quem responde pelo convite |
| `aberto_em` | removida | Só se preencheria com pixel de rastreamento (2.2); `rsvp.first_access` é o sinal melhor e já existe |
| `canal text` | `check (canal in ('whatsapp','email','outro'))` | `email` já entra no CHECK — o registro existe antes do envio automático |
| `tipo text` | `check (tipo in ('save_the_date','convite','lembrete'))` | |
| `enviado_em` nulo | `not null default now()` | A linha nasce no momento do envio; comunicação não enviada não é uma linha, é a ausência dela |
| `updated_at` | removida | Log de fato, como `historico_convite`: não se edita |

Mais `registrado_por` (`membros_casamento`, nulo para o que o sistema vier a
enviar sozinho) e índice em `(casamento_id, convite_id, tipo)`.

**Sem coluna de destino** (o número/e-mail usado). Seria dado pessoal
duplicado numa segunda tabela, e um telefone velho guardado no histórico não
responde nenhuma pergunta do casal — o destinatário é `convidado_id`, e o
contato atual se lê dele.

### 4.6 `casamentos.config_comunicacao` (coluna nova, `jsonb`)

Os modelos de mensagem, um por tipo, validados por Zod
(`shared/schemas/comunicacoes.ts`). Terceiro `jsonb` de configuração do
casamento, e os três não se misturam: `config_tema` é exclusivamente visual,
`config_conteudo` é texto exibido no site público, e este é **texto que sai
da plataforma para o convidado por canal privado**.

As variáveis são um catálogo fechado — `{{nome}}`, `{{casal}}`, `{{data}}`,
`{{local}}`, `{{prazo}}`, `{{link}}` — resolvido por
`shared/utils/modelo-comunicacao.ts`, em `shared/` porque a mesma renderização
roda no editor (pré-visualização no navegador) e no servidor (o texto que
realmente vai). Variável fora do catálogo fica literal no texto: é erro de
digitação do casal, não motivo para recusar um envio.

### 4.7 O que sai de `convites`

- **`enviado_em`** — vira derivado (decisão 1): o primeiro registro de
  `comunicacoes` com `tipo = 'convite'`.
- **`status_convite`** — a dívida que o `ROADMAP.md` já carregava, obsoleta
  desde 2026-09-10.

**Duas migrations, não uma, e em merges diferentes.** As migrations são
aplicadas em produção no merge, em paralelo com o deploy — existe uma janela
em que o código antigo roda contra o schema novo, e nela um `update` numa
coluna removida falha. A ordem:

1. **Migration A** (com a entrega): cria `comunicacoes` na forma nova, copia
   cada `convites.enviado_em` preenchido para uma linha
   (`canal = 'outro'`, `tipo = 'convite'`), e recria `convites_com_resumo`
   derivando `enviado_em`. As colunas continuam lá, sem ninguém escrevendo.
2. **Migration B** (merge posterior, quando nenhuma versão em voo escrever):
   dropa `enviado_em` e `status_convite`.

É o mesmo cuidado que já tinha adiado `status_convite` uma vez — agora com as
duas saindo juntas.

## 5. O que é derivado, e nunca vira coluna

| Número | De onde sai |
|---|---|
| Ocupação da mesa | Contagem de `convidados` + `acompanhantes_avulsos` com aquele `mesa_id` (ativos) |
| Lugares livres / excedidos | `capacidade − ocupação`, com o sinal decidindo qual dos dois é exibido |
| "N nesta mesa não vão" | Ocupantes com `status_rsvp = 'recusado'` |
| Falta acomodar | Convidados ativos, não-rascunho, sem `mesa_id`, **exceto os recusados** |
| Capacidade total / sentados / livres | Somas das mesas do casamento |
| `convites.enviado_em` | `min(comunicacoes.enviado_em)` com `tipo = 'convite'` — na view, preservando ordenação e filtro da listagem |
| Último contato do convite | `max(comunicacoes.enviado_em)`, qualquer tipo |
| Nunca recebeu nada | Convite sem nenhuma linha em `comunicacoes` |
| Pode receber por WhatsApp | Responsável do convite com telefone normalizável para E.164 |
| Estágio do convite, faixa etária | Já derivados, e continuam — nada nesta fase os toca |

O cálculo de mesas vive em `shared/utils/mesas.ts` (função pura sobre as
linhas, testada com os casos de borda: mesa vazia, mesa cheia, mesa acima da
capacidade, ocupante recusado, avulso sem convidado correspondente). A
normalização de telefone vive em `shared/utils/telefone.ts` — DDI 55 quando
ausente, máscara removida, e **recusa explícita** quando o número não der
E.164, porque um `wa.me` para um número inválido abre uma conversa com
ninguém e o casal só descobre depois de mandar.

## 6. API

Rotas em inglês (convenção do projeto para pasta de rota), corpo validado por
Zod, tudo atrás de `requireWeddingContext` — caminho administrativo puro,
`casamento_id` sempre do JWT. `recordAuditLog` em toda mutação.

```
GET    /api/seating                    mesas + ocupantes + elementos + medidas do salão + os agregados
POST   /api/seating/tables             ·  PATCH|DELETE /api/seating/tables/[id]
PATCH  /api/seating/tables/[id]/position     posição e rotação, só
POST   /api/seating/assign             sentar/tirar em lote
POST   /api/seating/elements           ·  PATCH|DELETE /api/seating/elements/[id]
PATCH  /api/seating/floorplan          largura/profundidade do salão
GET    /api/seating/export             CSV do mapa, no motor do export de convidados

GET    /api/communications             por convite: último envio de cada tipo, canal, contato disponível
POST   /api/communications             registra um envio
DELETE /api/communications/[id]        só canal 'outro'
POST   /api/communications/message     texto renderizado + link + telefone E.164
PATCH  /api/wedding/communication-templates
```

- **`POST /api/seating/assign` é em lote** (`{ mesaId | null, convidadoIds,
  avulsoIds }`) e não um `PATCH` por pessoa: sentar uma família é um gesto
  só, e N requisições fariam a ocupação piscar por estados intermediários que
  nunca foram uma intenção do casal. `mesaId: null` é o "tirar da mesa" —
  mesma rota, porque é a mesma mutação.
- **Posição tem endpoint próprio.** Arrastar gera muitos salvamentos, e um
  `PATCH` gordo carregaria junto nome e capacidade lidos quando a tela
  montou — é assim que um campo alheio acaba sobrescrito por um valor velho.
  Mesma lição do teto global do Financeiro não entrar em `PATCH /api/wedding`.
  O arrastar salva ao **soltar**, nunca durante o movimento.
- **`POST /api/communications/message`, e não um GET.** Ele pode criar a
  credencial de acesso que faltava (decisão 6), e rota que escreve não é
  leitura, por mais que pareça.
- **`DELETE /api/communications/[id]` recusa canal diferente de `outro`**
  (409), pela decisão 4 — a regra mora no servidor, não na ausência do botão.
- `GET /api/seating` devolve a narrativa pronta (capacidade total, sentados,
  livres, falta acomodar, mesas acima da capacidade), não linhas cruas para a
  tela somar: a lista é a mesma em duas vistas, e cada uma somando por conta
  própria é como as duas divergem.

## 7. UI e navegação

### 7.1 Menu da seção Convidados

```
Convidados
  Visão Geral    /convidados            (exact)
  Modo lista     /convidados/lista
  Importar       /convidados?importar=1
Gerenciar
  Grupos         /grupos
  Convites       /convites
  Comunicações   /comunicacoes
  Mesas          /mesas
  Faixas etárias → /configuracoes?secao=faixas-etarias
```

`ROTAS_DO_MODULO_CONVIDADOS` ganha `/mesas` e `/comunicacoes` — é a lista
única que faz a aba "Convidados" continuar acesa nas telas do módulo que não
têm aba própria. Nenhuma aba nova no topo: a barra do celular já está cheia
com Financeiro.

### 7.2 Comunicações

Uma linha por convite, com uma coluna por tipo de envio:

```
CONVITES                            81 · 62 com convite enviado · 19 sem nada
12 convites sem telefone cadastrado                  [completar contatos →]

Convite             Contato      Save the date   Convite        Lembrete
Família Mateus      (31) 9····   12/03 whats     02/06 whats    —          [Enviar ▾]
Tia Cléia           —            —               10/06 outro    —          [Registrar ▾]
```

- O botão principal é **Enviar** quando há telefone e **Registrar** quando
  não há — o mesmo lugar, a ação que aquele convite comporta.
- Enviar abre o `wa.me` com a mensagem pronta e grava o registro no mesmo
  gesto (decisão 3), com **desfazer na própria linha** enquanto a tela não
  recarrega.
- **A fila é uma lista que avança, não um botão que dispara tudo**: o
  navegador só permite abrir uma aba por gesto do usuário, e essa limitação é
  a razão do desenho — "faltam 19" com o próximo destacado, e cada clique
  avança um.
- Filtros da própria coluna, como nas outras quatro telas com tabela:
  por tipo, por canal, por "ainda não recebeu nada".
- O **modelo de mensagem** se edita aqui (não em Configurações): é onde ele é
  usado, e a pré-visualização precisa de um convite real para resolver as
  variáveis.

### 7.3 Mesas — uma tela, duas vistas (`?vista=planta|lista`)

**Lista** (o caminho completo, e o único no celular):

```
MESAS                      12 mesas · 96 lugares · 84 sentados · 12 livres
Falta acomodar: 23 pessoas          (confirmados e pendentes, sem mesa)

▼ Mesa 1 — Pais                 8 lugares    8 sentados          [cheia]
    Antônio · Maria · Cléia · …
▷ Mesa 2                       10 lugares    6 sentados · 2 não vão
▷ Mesa 3                        8 lugares   10 sentados          [2 a mais]
```

**Planta**: as mesas nas coordenadas reais, ocupação escrita dentro da forma,
cor por estado com os tokens da plataforma (`success` cheia, `warning` acima
da capacidade, neutro com lugar). Réguas em metros, zoom e "ajustar à tela".

- Arrastar com o ponteiro **salva ao soltar**.
- **Teclado é caminho equivalente, não consolo**: mesa focável, setas movem
  10 cm, `Shift` + setas 1 cm, `Enter` abre o painel. Arrastar é o atalho de
  mouse, e ele nunca pode ser a única forma de fazer algo (o mesmo raciocínio
  que já faz o nome do convidado ser um `<button>` no Modo Lista, com o
  clique na linha como conveniência).
- **No celular a planta é só leitura** — pan, zoom, toque abre a mesa. Editar
  layout arrastando num retângulo de 390 px é pior que a lista, que já faz
  tudo.
- **Imprimir**: uma folha com a planta e outra com a lista por mesa, via CSS
  de impressão. É o formato em que a mesa vai para a mão da cerimonialista no
  dia, e é por isso que a exportação CSV entra na mesma entrega.

**Painel da mesa** (aberto pelos dois lados): nome, capacidade, formato e
medidas, observação, e quem senta — com busca para adicionar e os dois
atalhos que o modelo já permite, **"sentar o convite inteiro"** e **"sentar
os acompanhantes"**. Aviso de excesso e aviso de quem recusou aparecem aqui,
como texto, nunca como bloqueio.

### 7.4 Modo Lista — a edição na linha

Nome, categoria e observação editáveis na célula, com as regras já provadas em
`fase1-financeiro.md` seção 24.3, e pelos mesmos motivos:

- **Salva ao sair da LINHA, não do campo** — passar do nome para a observação é
  continuar na mesma linha, e salvar ali dispara um refetch no meio da
  digitação.
- **Rascunho local por convidado**; toda mutação refaz a lista, e sem isso
  salvar uma linha apagaria o que estava sendo escrito na vizinha.
- **No erro o rascunho também é descartado** — manter no campo um valor que o
  servidor recusou é pior, porque o casal segue lendo como salvo.
- **Nome vazio volta ao que era**; excluir é ação explícita.

A coluna Observação é nova na tabela (editar na linha algo invisível não faz
sentido), entra truncada antes de Ações, e é a primeira a sair quando faltar
largura. Acompanhantes continua em leitura (2.2).

### 7.5 A limpeza dos fios soltos

Quatro promessas que a interface faz hoje e não cumpre:

- **"Núcleos", no menu** — o `title` diz "tela própria em breve", e a tela foi
  **descartada, não adiada** (`PRODUCT.md` 3.7: o núcleo não tem nome e o
  rótulo dele muda quando alguém entra ou sai). O item sai.
- **"Formulários" e "Integrações"** — dois itens inertes sem nada por trás. Os
  dois saem, e o grupo "Configurações" do menu da seção sai com eles.
- **`GuestListDraftPanel.vue`** — componente com zero usuários desde que a
  tela de rascunho foi descartada (plano, 5.4). Sai do repositório; o git
  guarda, e a coluna, o CHECK, o filtro da API e o contador continuam
  prontos para quem retomar.
- **O contador "em consideração"** aparece na faixa do Modo Lista e é sempre
  zero: nenhuma tela grava `em_consideracao` (só o `POST /api/guests` aceita
  o campo, e ninguém o manda). Um número que nunca muda e não leva a lugar
  nenhum é ruído — some junto, e volta com a tela, se ela voltar.

## 8. Candidatos a invariante no `CLAUDE.md` (seção 12)

Entram junto com a implementação, não antes:

- Mesa é o quarto vínculo do convidado, independente de convite, grupo e
  núcleo — nunca derivada de nenhum dos três.
- Ocupação de mesa é sempre contagem; não existe coluna de ocupação.
- Capacidade excedida é exibida, nunca bloqueada.
- Quem recusou continua sentado e é sinalizado; só sai de "falta acomodar".
- Acompanhante avulso ocupa lugar; rascunho da lista nunca senta (constraint).
- Coordenadas da planta são centímetros; pixel é `cm × zoom`, só na
  renderização.
- A planta nunca é o único caminho: tudo que ela faz, a lista faz — e o
  teclado faz o que o arrastar faz.
- `convites.enviado_em` é derivado do primeiro registro de comunicação do
  tipo convite; não existe coluna de envio a marcar à mão.
- Registro de envio de canal `outro` é removível; envio feito pelo sistema
  não é.
- Envio gera a credencial que falta e nunca rotaciona a que existe.
- O modelo de mensagem é um só por tipo, compartilhado entre canais.
- Nenhum dado de Mesas ou de Comunicações tem rota pública.

## 9. Ordem de implementação

| # | Entrega | Conteúdo |
|---|---|---|
| F2.1 | Acabamento da lista | Edição na linha (nome, categoria, observação) no Modo Lista, RSVP agrupado por núcleo na tela do convidado, e a limpeza da seção 7.5. Nenhuma tabela nova — é a entrega que dá valor no primeiro dia |
| F2.2 | Comunicações: fundação | Migration A (4.5, 4.6, 4.7), `convites_com_resumo` derivando `enviado_em`, registro de envio (`POST`/`DELETE`), "Registrar envio" substituindo "Marcar como enviado" no detalhe do convite |
| F2.3 | Comunicações: WhatsApp e a tela | `shared/utils/telefone.ts` + `modelo-comunicacao.ts` com testes, editor de modelos, `POST /message`, a tela com a fila e os filtros |
| F2.4 | Mesas: fundação e lista | Migration (4.1, 4.4), `shared/utils/mesas.ts` com os casos de borda, endpoints de mesa e `assign`, a vista Lista completa, exportação CSV |
| F2.5 | Mesas: a planta | Coordenadas, arrastar, teclado, zoom, medidas do salão (4.3), folha imprimível |
| F2.6 | Mesas: elementos do salão | `elementos_planta` (4.2) — a entrega cortável desta fase: sem ela a planta funciona, só fica mais pobre |
| F2.7 | Costura | Migration B (dropa `enviado_em` e `status_convite`), nav, cartão no dashboard, `CLAUDE.md` §12, `docs/DATABASE.md`, `docs/PRODUCT.md` (duas seções novas) e `docs/ROADMAP.md` |

F2.1 não depende de nenhuma outra e pode sair sozinha. F2.2 é pré-requisito
de F2.3; F2.4 é pré-requisito de F2.5 e F2.6. Migration B (F2.7) só entra num
merge posterior ao de F2.2, nunca no mesmo.

## 10. Em aberto

- **Provedor de e-mail** para a entrega seguinte. O `ROADMAP.md` nomeia
  Resend na análise de risco, mas a decisão de provisionamento (Marketplace
  da Vercel ou conta direta, domínio de envio, custo) fica para o começo
  daquela rodada — nada nesta fase depende dela.
- **"Encontre sua mesa" no site público.** Fora da v1 por privacidade (2.2);
  se voltar, volta como decisão própria, com o recorte do que o convidado vê
  (só a própria mesa? a lista toda?).
- **Restrição alimentar por mesa.** As colunas `restricoes_alimentares`
  existem em `convidados` e `acompanhantes_avulsos` e estão fora da API desde
  2026-09-04. Mesas é o lugar onde o dado voltaria a fazer sentido — o buffet
  pede por mesa —, mas reabri-lo é decisão de produto própria, não efeito
  colateral desta fase.
- **Classificação etária por finalidade (mesas)** — já registrada como
  não-decisão ligada à Fase 6 (`ROADMAP.md` seção 11). A v1 de Mesas usa a
  classificação principal, e a composição por faixa aparece na mesa como
  leitura.
- **O exemplo "Mesa 01" nas etiquetas de convite** (`DATABASE.md` e
  `PRODUCT.md` 5.2) vira armadilha assim que Mesas existir: duas formas de
  dizer mesa, uma delas sem capacidade e sem planta. O exemplo sai na costura
  (F2.7); as etiquetas continuam sendo "VIP", "Padrinhos" e afins.

---

## 11. O que a implementação resolveu — F2.1 (2026-09-13)

Primeira entrega da fase, sem tabela nova. O que ela decidiu por conta própria,
e que o refinamento não previa:

1. **A Categoria deixou de gravar sozinha.** Ela salvava no
   `@update:model-value` desde que nasceu. Com nome, grupo e observação salvando
   ao sair da linha, a mesma linha gravaria em três momentos diferentes e o
   casal não teria como saber qual valia. Os quatro campos viraram uma
   transação só, com um único salvamento.
2. **`row-clickable` saiu do Modo Lista, e o lápis voltou.** O nome era um
   `<button>` que abria o cadastro — e era ele o alvo acessível, já que
   `row-click` é só conveniência de mouse. Virando campo, sobrou a coluna Ações
   como caminho, e clicar numa linha cheia de campos passou a ser editar, não
   navegar.
3. **Mudar de grupo abre o bloco de destino** (e o pai dele, quando é
   subdivisão). Sem isso a linha desaparecia no instante seguinte ao
   salvamento, sem dizer para onde foi.
4. **Nem toda alteração recarrega tudo.** Grupo e categoria mexem nas contagens
   dos blocos e da faixa de números; nome e observação, não. Recarregar grupos e
   overview a cada nome corrigido seriam duas requisições que nunca mudariam de
   resposta.
5. **A chave do bloco do RSVP é o `guestId` do primeiro membro, nunca o
   `partyId`.** Com o id do núcleo, uma ordem que chegasse com o núcleo partido
   em dois trechos produziria chaves duplicadas no `v-for` — um defeito de
   renderização escondido atrás de um defeito de ordenação. O agrupamento saiu
   do componente para `app/utils/rsvp-blocos.ts` justamente para esse caso ter
   teste.
6. **`AdminTable` ganhou `row-blur` e `UiInput` ganhou `variant="quiet"`.** O
   guarda de `relatedTarget` mora no componente de tabela, não em cada página:
   foco que vai para outro campo da mesma `<tr>` é navegação interna dela. A
   variante discreta do campo é a que o `UiSelect` já tinha, pelo mesmo motivo
   escrito lá.
7. **`PATCH /api/guests/[id]` nasceu estreito e com teste do que ele NÃO faz.**
   O teste de integração manda `conviteId` no corpo e confere que a coluna
   continua nula — é o que impede o endpoint de virar, mais adiante, uma porta
   lateral para convite e núcleo.
8. **Dois achados vieram da verificação, não do desenho.** O primeiro é de
   acessibilidade e **já existia antes desta fase**: os botões "Estarei lá" /
   "Não poderei ir" do RSVP são idênticos para todas as pessoas, e num convite
   de seis há doze deles. Com um cartão por pessoa, quem enxerga se orientava
   pelo nome logo acima; quem navega botão a botão ouvia o mesmo rótulo sem
   dono. O agrupamento tornou isso visível (o teste E2E quebrou por *strict
   mode violation*), e os botões ganharam `aria-label` com o nome depois do
   texto visível (WCAG 2.5.3). O segundo é de layout: com a coluna Observação a
   tabela passou a 1312px contra 1182 visíveis, jogando a coluna de **ações**
   para fora da vista. A causa não era margem nenhuma — é que um `<input>` sem
   `size` tem largura intrínseca de ~20 caracteres, e numa tabela de layout
   automático é ela que dita a largura da coluna. `w-full min-w-0` na variante
   `quiet` faz a largura do campo vir da coluna, e não o contrário.
9. **Grupo não virou coluna — e a que existia saiu** (pedido do usuário ao ver
   a tela pronta). O refinamento previa nome, grupo e observação na célula; a
   tela desmentiu a parte do grupo. Esta tela **agrupa a lista em blocos por
   grupo**: a pessoa já está dentro do bloco dela, e a coluna repetia linha a
   linha, truncada ("Amigos do ..."), o que o cabeçalho mostra por extenso —
   gastando 160px de que o nome precisava. Sem ela a tabela passou a caber
   exatamente na largura visível (1182px, sem rolagem horizontal) e a coluna de
   nome ganhou 44px.

   O que a remoção **não** custou: mover de grupo continua na seleção em massa
   ("Mover para grupo") e no cadastro; e o recorte "quem está no grupo X?"
   continua na **Visão Geral**, que é paginada, não tem blocos e filtra por
   grupo no servidor. É a divisão que as duas telas já tinham — "quem é esta
   pessoa?" contra "como está a minha lista?" (`PRODUCT.md` 3.1.1). A
   exportação desta tela deixou de mandar `groupId` junto: um filtro que a tela
   não tem faria o arquivo divergir do que está à vista.

   Na mesma passada, dois rótulos que não cabiam: "Mover para gru..." na barra
   de seleção (`w-40` não comporta "Mover para grupo") e "Adolescen..." na
   célula de categoria, que passou a ocupar a coluna inteira em vez de uma
   largura fixa.

---

## 12. O que a implementação resolveu — F2.2 a F2.6 (2026-09-13)

O que a construção decidiu por conta própria, e que o refinamento não previa:

1. **A função `comunicacoes_verificar_casamento_id` já existia** — herdada do
   rename para português (20260821090003), onde nasceu como
   `communications_check_wedding_id`. O `drop table` não a leva junto (derruba
   só o trigger), então `create function` falhou e a migration parou pela
   metade. `create or replace` resolve, e o corpo antigo — que comparava o
   casamento com o de `credenciais_acesso_convite` — era justamente o que
   precisava sair.
2. **A view `convidados_com_status` congelou as colunas no `c.*`.** `*` numa
   view não é dinâmico: o Postgres o expande UMA VEZ, na criação. `mesa_id` não
   a alcançou, e a tela de Mesas quebrou no primeiro carregamento com "column
   convidados_com_status.mesa_id does not exist". A consequência que fica
   registrada: **toda coluna nova em `convidados` exige recriar essa view**, e o
   sintoma é sempre esse erro, nunca um dado errado em silêncio — que é o que
   mantém `c.*` valendo a pena.
3. **A aba do WhatsApp precisa abrir ANTES do await.** Navegador só permite
   abrir aba durante o gesto do usuário; abrir depois da resposta do servidor
   cai no bloqueador, e o casal veria "enviado" sem nada ter aberto. A janela é
   aberta vazia no clique e recebe o endereço quando a mensagem fica pronta — e
   quando o bloqueador impede até isso, **o envio não é registrado**: marcar
   como enviado algo que nunca saiu é pior que não registrar.
4. **Mesa nova não pode nascer em (0,0).** Doze mesas criadas em sequência
   ficariam empilhadas no mesmo ponto, e o casal teria que arrastar uma a uma só
   para ver que existem doze. Elas nascem na próxima vaga de uma grade — lugar
   arbitrário, mas visível e separado dos vizinhos.
5. **"Ajustar à tela" tem que olhar os dois eixos.** Ajustando só pela largura,
   um salão de 10 × 8 m cabe na horizontal e desce oitocentos pixels abaixo da
   dobra. E a medição precisa de um `nextTick`: no `onMounted` o contêiner ainda
   não tem largura final, e a planta abria com as mesas do tamanho de moedas
   enquanto o botão "Ajustar à tela" parecia não fazer nada.
6. **Um arrasto termina em `click` também.** Sem uma marca de "moveu", soltar a
   mesa no lugar novo abriria o painel dela por cima, todas as vezes. A
   tolerância é medida em centímetros, não em pixels, para não depender do zoom.
7. **Com o zoom afastado, o rótulo da mesa estoura a forma.** Abaixo de 70 px o
   texto some e sobra só a ocupação; o `aria-label` continua completo, então o
   leitor de tela não perde nada.
8. **Dois testes existentes pegaram buracos reais.** O de Linha do Tempo
   (`Record<InviteEventType, ...>`) recusou compilar sem uma frase para
   `comunicacao.enviada` — sem ele, o envio apareceria como "Evento registrado".
   E o de navegação cobrou os itens novos do menu. Um terceiro buraco foi meu:
   o teste de "quem recusou" inseria `respostas_rsvp` sem `convite_id`
   (obrigatório), o insert falhava em silêncio e o teste passava a afirmar que
   ninguém tinha recusado — verdade, mas por acidente. O erro do setup agora é
   conferido.

### 12.1 O que ficou para o merge seguinte, de propósito

A **migration B** — `drop column convites.enviado_em` e
`convites.status_convite`. As migrations são aplicadas em produção no merge, em
paralelo com o deploy, e existe uma janela em que o código antigo roda contra o
schema novo; nela, um `update` numa coluna removida falharia. A view já deriva
`enviado_em` do registro de envio, e o `coalesce` com a coluna física cobre
exatamente essa janela — quando ela fechar, o coalesce sai junto com a coluna.
É o mesmo cuidado que já tinha adiado `status_convite` uma vez.
