# Plano de Produto — MeuSiteCasamento como Hub Central de Organização

> **Status: documento de decisão.** Isto não é uma proposta a validar — é o
> que decidimos construir e em que ordem, com data de fechamento em cada
> decisão. Só muda por acordo explícito numa próxima conversa, registrado
> aqui como nova decisão datada.

---

## 1. Visão do produto

O produto deixa de ser "site de casamento com algumas ferramentas" e passa a
ser o **sistema operacional do casamento para o casal** — o lugar que
substitui a pasta de planilhas soltas, o WhatsApp com o fornecedor, o PDF
perdido no Drive e o "quanto mesmo eu já paguei nisso?".

Princípio orientador para toda decisão de escopo daqui pra frente:

> **Estrutura pronta + liberdade de planilha.** O sistema já sabe o que
> normalmente precisa ser organizado num casamento, mas nunca engessa —
> categoria nova, tarefa fora do padrão e observação livre sempre cabem.

Dois mundos, sempre separados na navegação mas conectados no dado:

- **Área do Casal** (privada, admin) — organização, decisões, dinheiro.
- **Área Pública** (o que já existe hoje: site, presentes, RSVP) — o que o
  convidado vê.

Extensão já prevista para mais adiante, sem redesenhar nada agora: a Área do
Casal vira a mesma base para um **perfil de planejador profissional**
gerenciando vários casamentos de clientes — compatível com o modelo de dados
atual (`casamento_id` em tudo + RLS), falta só a camada de UI de "múltiplos
eventos" (Fase 4).

---

## 2. Mapa de módulos do Hub

| Área | O que contém | Status |
|---|---|---|
| **Visão** | Dashboard, progresso geral, alertas | 🆕 novo |
| **Financeiro** | Orçamento por categoria, pagamentos/parcelas | 🆕 novo |
| **Convidados** | Pessoas, convites, RSVP, grupos/acompanhantes, **mesas** (novo), **comunicações** (novo) | ✅ existe — mesas e comunicações são as peças novas |
| **Fornecedores** | Pipeline (orçando/contratado/pago), contatos | 🆕 novo |
| **Documentos** | Contratos, comprovantes, referências — **entidade única compartilhada**, exibida filtrada dentro de cada área | 🆕 novo |
| **Cronograma** | Dia do casamento, ordem de eventos, responsáveis | ✅ já existe, sem mudança |
| **Planejamento** | Checklist/tarefas + motor de sugestão simples por regra de prazo | 🆕 novo |
| **Site Público** | Home, presentes, RSVP do convidado | ✅ já existe, sem mudança |

---

## 3. Decisões confirmadas (2026-09-10)

- **Documentos é entidade única compartilhada** (contrato/comprovante/
  referência, `fornecedor_id` opcional) — não duplicada por área.
- **Sugestões automáticas entram no escopo v1**, como motor de regras
  determinístico (prazo → categoria de tarefa sugerida), dentro do módulo
  Planejamento. Não é IA. Fica na **Fase 3**, não é adiada para V2 — só entra
  depois na ordem de construção. (Dizia "Fase 5" até 2026-09-13: resquício da
  ordem anterior, corrigida nesta mesma seção mas não aqui.)
- **Comunicações entra no mapa**, dentro de Convidados — rastreio de status
  de envio (save the date/convite/lembrete), não o canal de envio em si.
- **Ordem de construção**: Financeiro → Convidados → Planejamento →
  Onboarding → Multi-evento/Planejador (ver seção 4). Corrigida em
  2026-09-10 (ordem anterior tinha Onboarding e Multi-evento antes de
  Planejamento).

---

## 4. Ordem de construção

1. **Financeiro** — Orçamento, Fornecedores, Documentos. Só fluxo
   administrativo (JWT + RLS), o caminho mais simples que já existe no
   sistema. Maior dor real do casal (dinheiro). **Refinada em 2026-09-10:
   escopo, modelo de dados e fluxos de UI em
   [`fase1-financeiro.md`](fase1-financeiro.md)** — é lá que vivem as
   decisões desta fase, não aqui.
2. **Convidados (o que falta)** — Mesas e Comunicações. Absorve também
   débitos do roadmap atual (ver seção 5.1). **Refinada em 2026-09-13:
   escopo, modelo de dados e fluxos de UI em
   [`fase2-convidados.md`](fase2-convidados.md)** — é lá que vivem as
   decisões desta fase, não aqui. Três decisões definem o tamanho dela: a v1
   de Comunicações é **WhatsApp assistido + registro** (e-mail de verdade,
   com o lembrete automático, é a entrega seguinte), Mesas entrega **planta
   baixa arrastável** além da lista, e `convites.enviado_em` deixa de ser
   coluna marcada à mão para **derivar do registro de envio**.
3. **Planejamento** — Checklist/tarefas + motor de sugestão simples por
   regra de prazo (determinístico, sem IA). **Refinada em 2026-09-13: escopo,
   modelo de dados e fluxos de UI em
   [`fase3-planejamento.md`](fase3-planejamento.md)** — é lá que vivem as
   decisões desta fase, não aqui. A decisão que define o tamanho dela: o
   sistema usa os fatos dos outros módulos para decidir **o que oferecer**,
   nunca **o que está feito** — nenhuma tarefa é concluída automaticamente.
4. **Onboarding guiado** — o roteiro de Primeiros passos no topo do Início e
   um wizard sobre dados que já existem. Escopo: preencher dados de um
   casamento já criado — **não** é criação de conta self-service (isso é
   Fase 6, depende de decisão de billing ainda não tomada). **Refinada e
   ENTREGUE em 2026-09-14: escopo, modelo de dados e fluxos de UI em
   [`fase4-onboarding.md`](fase4-onboarding.md)** — é lá que vivem as
   decisões desta fase, não aqui. O que define o tamanho dela: o progresso é
   **derivado dos fatos** que o Planejamento já observa (nenhuma coluna,
   nenhum botão de concluir, nem para a etapa em que o casal parou), o wizard
   **não é dono de campo nenhum** (cada etapa renderiza o controle, o schema e
   o endpoint da tela definitiva), e `rascunho` passa a **barrar o site
   público de verdade** — `status_ciclo_vida` não tinha nenhum escritor, e o
   site do casal ia ao ar no instante em que a linha nascia.

   Três decisões vieram do uso real, depois do refinamento: o roteiro encolheu
   para **o básico do básico** (quando, onde, a cara do site, publicar — saíram
   prazo de RSVP, teto do orçamento e montar a lista, que são trabalho de
   módulo), as **seções da home viraram opt-in** (site de casal novo é só a
   capa), e o Início **vira o acolhimento** enquanto não há o que relatar. O
   número estimado de convidados ficou fora: nada o consome.
5. **Multi-evento / Planejador profissional** — camada de UI para múltiplos
   `casamento_id` por login. Absorve o item "papel de planejador" que já
   estava no roadmap de SaaS. **Refinada em 2026-09-15: escopo, modelo de
   dados e fluxos de UI em [`fase5-multievento.md`](fase5-multievento.md)** —
   é lá que vivem as decisões desta fase, não aqui. O pré-requisito técnico
   está **resolvido**: `membros_casamento` tem `unique (casamento_id,
   usuario_id)` — o par, nunca o usuário sozinho —, e o Passo 3 do
   `PLANO-SAAS.md` já entregou rotas `/admin/{slug}/**`, cookie de casamento
   ativo e tela de seleção. Três decisões definem o tamanho dela: o
   planejador é um **papel novo** com alcance em escada (um membro alcança o
   papel abaixo do seu), `/plataforma` ganha **criar casamento** (a ação mais
   sensível do produto deixa de ser um `INSERT` à mão sem registro), e a
   visão entre eventos é **a lista** — o dashboard agregado saiu do escopo e
   virou direção nomeada, porque somar convidados de casais diferentes não
   responde pergunta nenhuma de operação.
6. **V2/V3, não bloqueante** — evolução do motor de sugestão (de regra fixa
   para algo mais adaptativo), templates de cronograma reutilizáveis entre
   eventos, central de inteligência mais ampla (alertas financeiros
   proativos, cruzamento entre módulos), onboarding self-service completo
   (criação de conta do zero), billing, painel de plataforma completo
   (métricas agregadas de uso/storage, suporte).

Cada fase vira uma rodada de refinamento própria (modelo de dados, RLS,
fluxos de UI) antes de qualquer linha de código.

---

## 5. Itens herdados do roadmap atual — mapeados, nada fica pra trás

Levantamento a partir de `docs/ROADMAP.md`. Cada item abaixo tem destino
definido: absorvido numa fase do Hub, ou backlog técnico contínuo (roda em
paralelo, fora da numeração de fases).

### 5.1 Absorvidos pela Fase 2 (Convidados)

Destino de cada um, resolvido no refinamento de 2026-09-13
([`fase2-convidados.md`](fase2-convidados.md)):

- Edição inline na lista de convidados — **entra** (F2.1), para Nome, grupo e
  observação. Acompanhantes fica de fora: agrupar exige dizer *com quem*, o
  que não cabe numa célula — a seleção múltipla já cobre.
- Agrupar visualmente os membros por núcleo na tela do convidado (RSVP) —
  estava "à espera de decisão" no roadmap; decisão: **entra nesta fase**
  (F2.1).
- Convite com geração de link/QR code — **já estava entregue** quando a fase
  foi refinada (`InviteAccessLinkSection.vue`, com geração, reexibição,
  revogação e QR). O roadmap só não tinha sido atualizado.
- Lembretes automáticos de RSVP por e-mail — ficaram para a entrega seguinte,
  junto do envio real por e-mail, e **saíram nela** (2026-09-13,
  [`fase2-convidados.md`](fase2-convidados.md) seção 13): provedor atrás de
  interface, o mesmo texto do WhatsApp dentro de um layout, o log do que
  acontece depois do envio, e os dois avisos automáticos (RSVP ao convidado,
  vencimento ao casal) — nascidos desligados, num cron só.
- Confirmação por WhatsApp (link direto pré-preenchido) — **entra, e virou o
  centro de Comunicações** (F2.3), não um canal alternativo: é o canal real do
  casamento brasileiro e o telefone já está no cadastro.
- Desagrupar em massa (núcleo de acompanhantes) — avaliado: **continua fora**.
  Agrupar em massa existe porque a lista nasce solta; desagrupar não tem gesto
  de origem equivalente.

### 5.2 Absorvidos pela Fase 5 (Multi-evento/Planejador)

Destino de cada um, resolvido no refinamento de 2026-09-15
([`fase5-multievento.md`](fase5-multievento.md)):

- "Papel de planejador de casamentos gerenciando múltiplos eventos"
  (constava na Fase 5 do roadmap antigo) — **entra**: a troca de evento
  dentro do painel (F5.1) e o papel novo em `membros_casamento` (F5.2).
- Parte de "painel de administração da plataforma completo": métricas
  agregadas de uso (storage) — **entra** (F5.5), mas **medida sob demanda**,
  não materializada: `contadores_uso` continua vazia até existir limite de
  plano a aplicar na escrita (Fase 6). No caminho apareceu que o bucket
  `wedding-photos` está morto desde a galeria via Drive — uma métrica que o
  somasse leria zero para sempre.
- Criar um casamento pelo painel interno — **entra** (F5.4), e não estava em
  lista nenhuma: só apareceu ao perguntar quem cria o evento do cliente do
  planejador. Hoje é um `INSERT` à mão no banco de produção, sem registro.

### 5.3 Backlog técnico contínuo (fora da numeração de fases do Hub)

Não bloqueiam nenhuma fase do Hub, mas continuam existindo e precisam de
espaço em algum sprint — sinalizados aqui pra não sumir:

Pagos em 2026-09-13 (detalhe de cada um em `ROADMAP.md` seção 4):

- ~~`prefers-reduced-motion` não respeitado em nenhum lugar da plataforma.~~
- ~~Remover `convites.status_convite`~~ — **absorvido pela Fase 2** (F2.7):
  saiu na migration B, junto de `convites.enviado_em`.
- ~~Corrida entre filtro debounced e clique na linha (`useTableFilters`).~~
- ~~Trava de rolagem do painel no `<body>` em vez do `<html>`.~~
- ~~Auditoria completa de ações administrativas~~ — fechada por uma varredura
  que falha quando uma rota de escrita nasce sem registro, não por uma
  passagem manual que envelheceria no mês seguinte.
- ~~Exportação de dados em CSV/PDF completa.~~ Presentes ganharam CSV; o PDF
  dos dois é a folha imprimível do navegador, sem biblioteca no bundle.

Em aberto:

- ~~Testes E2E cobrindo os fluxos críticos~~ — o buraco era a reserva de
  presente; RSVP e login já tinham teste.
- Internacionalização (i18n) — inglês/espanhol. **É fase, não dívida**:
  traduzir um produto inteiro escrito em pt-BR (textos de tela, e-mails,
  mensagens de erro, conteúdo padrão do site do casal) não cabe num sprint
  nem sai de um sprint sozinho — e nenhum usuário pediu ainda.
- ~~Revisão de performance com dados de casamentos grandes (500+ convidados), e
  o LCP do site público.~~ **Medidos em 2026-09-16** (`ROADMAP.md` seção 5):
  volume de dado não degrada nada — página funda custa o mesmo que a primeira —,
  e o LCP da home fica em 2,53s quando a medição inclui a compressão que a
  hospedagem faz e a montagem local não fazia. Falta só confirmar em campo.
- Observabilidade completa (Sentry + métricas de uso). Depende de escolher
  provedor e política de retenção — a aplicação trata dado pessoal de
  convidado, então não é decisão só de instrumentação.
- ~~Testes de carga nos endpoints públicos.~~ **Rodado em 2026-09-16** contra o
  casamento de 520 convidados: 25,2 req/s, home em 243ms de mediana. O achado
  foi a vitrine de presentes a 3,3s sob a mesma carga, por idas ao banco em
  série — duas viraram paralelas no mesmo dia.
- Revisão de segurança/RLS **por terceiros** — pré-requisito obrigatório
  antes da Fase 6 (abertura multi-tenant self-service), não do Hub em si.
  Não é trabalho de código: é contratar quem olhe de fora.

### 5.4 Descartado permanentemente (decisão já tomada antes, mantida)

- Tela de rascunho "Em consideração" (`GuestListDraftPanel.vue`) — decisão
  do usuário em 2026-09-10, registrada no roadmap: sem necessidade por ora.

### 5.5 Não-decisões que seguem em aberto (ligadas à Fase 6, não à Fase 1-5)

Não bloqueiam nada das Fases 1 a 5 — só precisam ser resolvidas antes da
Fase 6:

- Schema separado por tenant vs. RLS em schema compartilhado.
- Estratégia de billing (Stripe Billing vs. solução própria).
- Classificações etárias por finalidade (alimentação/mesas/recreação) além
  da classificação principal única de hoje.
- Histórico/versão da configuração de faixas etárias.

---

## 6. Como trabalhamos a partir daqui

Para cada fase, na ordem da seção 4:

1. Refinar o problema e o escopo exato da v1 (o que fica de fora de
   propósito, registrado como decisão — não como esquecimento).
2. Desenhar o modelo de dados seguindo as convenções do `CLAUDE.md`
   (nomenclatura em português espelhando coluna, `casamento_id`
   denormalizado, RLS, soft delete onde fizer sentido).
3. Mapear os fluxos de UI e onde entram na navegação existente.
4. Tarefa de desenvolvimento.

Reavaliamos a ordem sempre que necessário, mas como mudança de decisão
registrada aqui — não como "voltar a ser proposta".

---

## 7. Em aberto — só o que realmente não tem dono ainda

- ~~Nome final de exibição das áreas grandes na navegação~~ — resolvido no
  refinamento da Fase 1 (2026-09-10): o módulo se chama **Financeiro** e é a
  5ª aba primária do painel, ao lado de Início, Convidados, Presentes e
  Configurações. Ver [`fase1-financeiro.md`](fase1-financeiro.md) seção 7.
- ~~Catálogo inicial de regras do motor de sugestão (quais prazos/categorias
  entram)~~ — resolvido no refinamento da Fase 3 (2026-09-13): dez fases de
  prazo e ~45 tarefas derivadas do catálogo de gastos, com as sugestões
  dispensadas por fato observado. Ver
  [`fase3-planejamento.md`](fase3-planejamento.md) seção 6.
- ~~Confirmação técnica em `docs/DATABASE.md` sobre `membros_casamento`~~ —
  resolvido no refinamento da Fase 5 (2026-09-15): a restrição é
  `unique (casamento_id, usuario_id)`, então um usuário sempre pôde
  administrar vários casamentos, cada um com seu próprio `papel`. Ver
  [`fase5-multievento.md`](fase5-multievento.md) seção 1.3.
