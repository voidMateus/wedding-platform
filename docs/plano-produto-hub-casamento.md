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
  Planejamento. Não é IA. Fica na Fase 5, não é adiada para V2 — só entra
  depois na ordem de construção.
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
2. **Convidados (o que falta)** — Mesas (extensão de grupos/acompanhantes
   existentes) e Comunicações. Absorve também débitos do roadmap atual (ver
   seção 5.1).
3. **Planejamento** — Checklist/tarefas + motor de sugestão simples por
   regra de prazo (determinístico, sem IA).
4. **Onboarding guiado** — wizard sobre dados que já existem (data, local,
   nº de convidados). Escopo: preencher dados de um casamento já criado —
   **não** é criação de conta self-service (isso é Fase 6, depende de
   decisão de billing ainda não tomada). Pode já alimentar o motor de
   sugestão da Fase 3, já que roda depois dela.
5. **Multi-evento / Planejador profissional** — camada de UI para múltiplos
   `casamento_id` por login + dashboard agregado entre eventos. Absorve o
   item "papel de planejador" que já estava no roadmap de SaaS. Pré-requisito
   técnico a verificar antes de começar: confirmar em `docs/DATABASE.md` se
   `membros_casamento` já suporta um usuário em mais de um `casamento_id`.
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

- Edição inline completa na lista de convidados (hoje só a coluna Categoria
  tem; falta Nome, grupo, acompanhantes, observação).
- Agrupar visualmente os membros por núcleo na tela do convidado (RSVP) —
  estava "à espera de decisão" no roadmap; decisão: **entra nesta fase**.
- Convite com geração de link/QR code.
- Lembretes automáticos de RSVP por e-mail.
- Confirmação por WhatsApp (link direto pré-preenchido) como canal
  alternativo ao e-mail.
- Desagrupar em massa (núcleo de acompanhantes) — avaliar nesta fase se a
  necessidade real já apareceu; se não, permanece fora.

### 5.2 Absorvidos pela Fase 5 (Multi-evento/Planejador)

- "Papel de planejador de casamentos gerenciando múltiplos eventos"
  (constava na Fase 5 do roadmap antigo).
- Parte de "painel de administração da plataforma completo": métricas
  agregadas de uso (storage) — o que falta além da fundação mínima já
  entregue em `/plataforma`.

### 5.3 Backlog técnico contínuo (fora da numeração de fases do Hub)

Não bloqueiam nenhuma fase do Hub, mas continuam existindo e precisam de
espaço em algum sprint — sinalizados aqui pra não sumir:

- `prefers-reduced-motion` não respeitado em nenhum lugar da plataforma.
- Remover `convites.status_convite` (coluna obsoleta, precisa de migration
  própria por causa da janela de deploy).
- Corrida entre filtro debounced e clique na linha (`useTableFilters`) —
  bug reproduzido, causa raiz identificada, conserto pendente.
- Trava de rolagem do painel no `<body>` em vez do `<html>`.
- Auditoria completa de ações administrativas.
- Testes E2E cobrindo os fluxos críticos (RSVP, reserva de presente, login).
- Internacionalização (i18n) — inglês/espanhol.
- Exportação de dados em CSV/PDF completa (falta presentes, e PDF para os
  dois — convidados em CSV já está entregue).
- Revisão de performance com dados de casamentos grandes (500+ convidados).
- Observabilidade completa (Sentry + métricas de uso).
- Testes de carga nos endpoints públicos (RSVP, reserva de presentes).
- Revisão de segurança/RLS por terceiros — **pré-requisito obrigatório
  antes da Fase 6** (abertura multi-tenant self-service), não do Hub em si.

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
- Catálogo inicial de regras do motor de sugestão (quais prazos/categorias
  entram) — resolve no refinamento da Fase 5.
- Confirmação técnica em `docs/DATABASE.md` sobre `membros_casamento` —
  resolve no início do refinamento da Fase 5.
