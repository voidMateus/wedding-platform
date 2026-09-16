# Refinamento — Fase 5 do Hub: Multi-evento e o planejador profissional

> **Status: documento de decisão.** Refinamento da Fase 5 descrita em
> [`plano-produto-hub-casamento.md`](plano-produto-hub-casamento.md) seção 4,
> seguindo o rito da seção 6 (escopo → modelo de dados → fluxos de UI →
> tarefa). Decisões datadas de **2026-09-15**; só mudam por acordo explícito
> registrado aqui como nova decisão datada.
>
> Não confundir com a "Fase 5 — Transição para SaaS Multi-Tenant" de
> [`ROADMAP.md`](ROADMAP.md), que é da numeração antiga e trata de
> self-service, billing e planos. Esta é a Fase 5 **do Hub**, e ela para
> deliberadamente na porta do billing — que é a Fase 6.
>
> É a segunda fase que não constrói um módulo. A Fase 4 acrescentou uma porta
> para o casal; esta acrescenta um **segundo tipo de gente** ao painel — quem
> organiza casamento como profissão —, e paga a dívida que só aparece quando
> se pergunta quem cria o evento dele: hoje, ninguém. É um `INSERT` à mão no
> banco de produção.

---

## 1. O problema

### 1.1 Três ausências que são a mesma ausência

O produto sempre soube que um login pode administrar vários casamentos — o
schema diz isso desde a primeira migration. O que nunca existiu foi alguém
para quem isso fosse o caso normal.

| Ausência | O que acontece por causa dela |
|---|---|
| Nenhuma troca de evento dentro do painel | Sair do casamento A para o B exige voltar a `/admin` pela URL; o cabeçalho do painel não sabe que existe um B |
| Nenhum papel que descreva o profissional | A assessora entra como `colaborador`, a mesma etiqueta do irmão da noiva que ajuda com a lista — mesmo poder, e o casal não tem como distinguir os dois na tela de Colaboradores |
| Nenhum caminho para criar um casamento | `casamentos` não tem policy de `INSERT` e não existe endpoint nenhum. Cliente novo é uma linha escrita à mão no banco, sem registro de quem fez |

As três são a mesma ausência vista de ângulos diferentes: **o sistema modela um
casamento com várias pessoas, e nunca modelou uma pessoa com vários
casamentos.**

E há uma quarta, do outro lado do balcão: o painel interno (`/plataforma`)
mede o porte de um casamento por contagem de convidados. Convidado é linha de
texto — o que de fato cresce, e o que de fato custa, é arquivo. Storage não
aparece em lugar nenhum.

### 1.2 O que esta fase não é

A palavra "planejador" aparece no modelo de monetização do
[`ROADMAP.md`](ROADMAP.md) seção 8 como um **plano pago**. Não é isso que
entra aqui, e a distinção precisa estar na primeira página:

| | **Fase 5 (esta)** | **Fase 6** |
|---|---|---|
| Pergunta | quem é o profissional, e como ele trabalha em N eventos | quem paga, e por quanto |
| Criação de evento | equipe interna cria, pelo painel interno | qualquer um cria, sozinho |
| Limite de eventos | nenhum — `planos.max_casamentos` continua sem leitor | limite por plano, checado na criação |
| Depende de | nada que não exista hoje | decisão de billing, ainda não tomada |

Esta fase entrega **o profissional**, não **a assinatura dele**.

### 1.3 O pré-requisito do plano, resolvido

O [`plano-produto-hub-casamento.md`](plano-produto-hub-casamento.md) seção 7
deixou um item aberto para ser resolvido no início deste refinamento:
confirmar se `membros_casamento` suporta um usuário em mais de um
`casamento_id`.

**Suporta, e sempre suportou.** A restrição da tabela é
`unique (casamento_id, usuario_id)` — o par, nunca o usuário sozinho. Um
`auth.users` pode ter quantas linhas quiser, uma por casamento, cada uma com
seu próprio `papel`.

Mais do que isso: o Passo 3 do [`PLANO-SAAS.md`](PLANO-SAAS.md) já construiu a
maior parte da fundação, em 2026-08-25, e ela está em produção desde então.

| Peça | Estado |
|---|---|
| `resolveWeddingContext()` com mais de uma membership | ✅ existe — cookie `casamento_ativo`, sempre cruzado contra as memberships reais antes de usar |
| Rotas `/admin/{slug}/**` | ✅ existem — as 11 páginas já carregam o casamento na URL |
| `memberships[]` na sessão | ✅ existe — `/api/auth/session` devolve a lista, `auth.store.ts` expõe |
| Tela de seleção pós-login | ✅ existe — `app/pages/admin/index.vue`, exibida só com zero ou mais de uma |
| Convite de membro por e-mail | ✅ existe — `POST /api/wedding/members`, e já aceita `papel` no corpo |
| E2E de troca de casamento ativo | ✅ existe — `tests/e2e/casamento-ativo.spec.ts`, autossuficiente |

O que falta não é a fundação. É o andar de cima.

---

## 2. Escopo da v1

### 2.1 Entra

Cada entrega tem uma **natureza**, e ela é o que decide a ordem — não o
tamanho nem a visibilidade. Multi-evento é a espinha dorsal da fase;
planejador, criação e storage são capacidades construídas sobre ela.

| # | Entrega | Natureza |
|---|---|---|
| **F5.0** | Escopo de contexto por casamento — cache, stores e todo estado do painel (seção 5.2) | **Correção estrutural** |
| **F5.1** | Troca de evento no cabeçalho + lista de eventos (seção 5) | Multi-evento |
| **F5.2** | O papel `planejador` e a escada de papéis (seção 4) | Autorização |
| **F5.3** | Ator operador na trilha de auditoria (seção 7) | Governança |
| **F5.4** | `/plataforma` cria casamento (seção 6) | Operação |
| **F5.5** | Storage no painel interno (seção 8) | Observabilidade |
| **F5.6** | A ficha do casamento: editar, acessos, arquivar e excluir (seção 6.6) | Operação |
| **F5.7** | Acesso de suporte ao painel do casal (seção 6.7) | Operação |

**F5.0 vem primeiro e não depende de nada.** O defeito que ela corrige já está
no produto hoje e não tem relação nenhuma com o papel de planejador — pôr uma
correção conhecida de consistência atrás de uma funcionalidade que não é
necessária para corrigi-la seria trocar a ordem certa pela ordem narrativa.

### 2.2 Fica de fora — decisão, não esquecimento

- **Painel com números somados entre eventos.** Decidido em 2026-09-15: a
  visão entre eventos é **a lista**, não um agregado. Somar convidados de
  casais diferentes não responde nenhuma pergunta de operação — ninguém
  organiza "os 340 convidados dos meus quatro clientes". A pergunta boa é "o
  que precisa de mim hoje, e em qual evento", e ela se desenha depois de haver
  um profissional real usando a lista; antes disso seria inventar o alerta e o
  usuário no mesmo movimento. Fica como **direção nomeada**, não como dívida.
- **Permissões granulares por funcionalidade.** O papel novo é um degrau na
  mesma escada, nunca uma matriz de "vê Financeiro, não vê Presentes". O
  `ROADMAP.md` (Fase 2) já registrou a decisão de manter o modelo simples até
  haver demanda real, e um terceiro valor num `CHECK` não a reabre.
- **Mudar o papel de um membro já existente.** Não há `PATCH` de membro hoje —
  o papel se escolhe no convite, e trocar é remover e convidar de novo. Com
  três valores isso continua suficiente: a superfície nova seria um endpoint,
  um formulário e uma regra de escalada de privilégio, para um gesto que
  acontece uma vez por casamento.
- **Billing, planos, limite de eventos, criação self-service.** Fase 6, inteira.
- **`contadores_uso` populado por gatilho.** Storage entra como **medida**, não
  como contador materializado — o porquê está na seção 8.2.
- **Identidade da assessoria no site público do cliente** (logo, rodapé
  "organizado por"). O site é do casal; nada do profissional aparece nele.

---

## 3. Decisões desta rodada (2026-09-15)

| # | Decisão | Alternativa recusada |
|---|---|---|
| 1 | O planejador é um **papel novo** em `membros_casamento` | Reaproveitar `colaborador` — o schema aguentaria, mas o casal não teria como distinguir a assessoria do cunhado na tela de Colaboradores, e o profissional não teria como trazer a própria equipe |
| 2 | Papel é **escada, não matriz**: um membro alcança o papel abaixo do seu | Matriz de permissão por funcionalidade — decisão já adiada no `ROADMAP.md`, e um papel novo não é motivo para reabri-la |
| 3 | **`/plataforma` ganha "criar casamento"** | Criação self-service pelo planejador — é o coração da Fase 6 e depende de billing; e continuar criando por SQL deixa a ação mais sensível do produto sem registro nenhum |
| 4 | A visão entre eventos é **a lista** | Painel agregado com alertas entre eventos (seção 2.2) |
| 5 | **Storage entra**, medido sob demanda | Popular `contadores_uso` por gatilho (seção 8.2) |
| 6 | A trilha de auditoria ganha `tipo_autor = 'operador'` | Dispensar a rota de criação com `auditoria dispensada:` — seria a primeira dispensa concedida à ação mais grave do sistema |
| 7 | O escopo de contexto (F5.0) é **correção estrutural e vem primeiro** | Entregá-lo junto da troca de evento — o defeito já existe, e não precisa do planejador para ser corrigido |
| 8 | A escada de papéis é **autoridade única**: nenhuma rota reimplementa a hierarquia (seção 4.6) | Deixar cada rota comparar `papel` na mão — é assim que duas versões da mesma regra nascem |
| 9 | O **slug é a chave de idempotência** da criação de casamento (seção 6.3) | Chave de idempotência própria — o `unique` que já existe resolve o caso real (duplo clique), e uma chave nova pediria tabela nova |
| 10 | O usuário do dono é resolvido **antes** da transação; Auth fica fora dela (seção 6.2) | Deixar "em transação" sugerir que o convite de e-mail é revertível — não é, e o implementador descobriria isso em produção |
| 11 | A função de storage devolve **bytes**; a UI formata (seção 8.2) | Devolver `storage_mb` — acoplaria a camada de dados à apresentação, e é a mesma regra dos centímetros da planta de mesas |
| 12 | A métrica de storage tem **allowlist explícita de buckets** (seção 8.3) | Somar `storage.objects` inteiro — o bucket criado daqui a seis meses entraria sozinho, ou ficaria de fora sozinho, sem nada acusar |
| 13 | A assessoria gerencia **colaboradores do evento**, não "os próprios" (seção 4.1) | Vincular colaborador à assessoria que o trouxe — é modelo de dados novo, com herança e órfão a resolver, entrando de carona numa fase sobre multi-evento |
| 14 | A tela fala de **membro**, e para de enumerar permissões em prosa (seção 4.7) | Manter "Convidar colaborador" e a descrição atual — que já está errada hoje, e ninguém percebeu porque nenhum teste falha quando uma frase envelhece |

---

## 4. O papel `planejador` — escada, não matriz

### 4.1 O que separa o planejador do colaborador

Não é "vê menos". Uma assessora vê **mais** dinheiro que o irmão da noiva —
ela é quem negocia com o fornecedor. A diferença é outra:

> **O planejador traz equipe e responde pelo evento. O colaborador só ajuda.**

Daí sai o único privilégio que muda de mão: **gente**. O planejador convida e
remove **colaboradores do evento** (a assistente, o cerimonialista do dia) sem
precisar pedir ao casal a cada contratação. Todo o resto do que ele faz é o que
um colaborador já faz hoje — as policies de `is_membro_casamento` não mudam uma
linha.

> **"Colaboradores do evento", não "os próprios colaboradores".** A diferença
> não é de redação: o modelo não tem — e não vai ter nesta fase — nenhuma
> relação entre um colaborador e a assessoria que o trouxe.

A consequência, dita antes de ser descoberta em produção: num casamento com
duas assessorias, **qualquer uma delas remove o colaborador da outra**. Todos
são `papel = 'colaborador'`, e a escada só compara postos.

Isso é **decisão, não descuido**. Uma "equipe própria" exigiria uma segunda
relação (`membros_casamento.convidado_por`, ou um nó de equipe), com as
perguntas que ela arrasta: o que acontece com a equipe quando a assessoria sai,
quem herda colaborador de assessoria removida, o dono enxerga as duas equipes
como uma lista ou como duas. Nada disso deve entrar escondido dentro de uma
fase cujo assunto é multi-evento — e o caso que o justificaria (duas assessorias
no mesmo casamento, com equipes que se ignoram) ainda não aconteceu uma vez.
Fica registrado na seção 13 como o que é: uma pergunta em aberto com gatilho
próprio.

### 4.2 A regra única

Cada papel tem um posto:

| Papel | Posto | Alcança |
|---|---|---|
| `dono` | 3 | todos os papéis, **inclusive outros donos** |
| `planejador` | 2 | só `colaborador` |
| `colaborador` | 1 | ninguém |

Um membro alcança todo papel **abaixo** do seu — e o dono alcança também os
outros donos, porque o casal são dois e um precisa poder remover o outro (é o
comportamento de hoje, e perdê-lo seria uma regressão silenciosa).

Três consequências que a regra dá de graça, e que uma lista de permissões
escrita à mão teria de lembrar:

- **Ninguém se promove.** O papel do convidado também precisa ser alcançável
  pelo convidante, então um planejador não cria outro planejador, e muito menos
  um dono.
- **O planejador nunca é dono.** Ele não entra na contagem de donos, então a
  regra "não é possível remover o único dono" continua valendo intacta e um
  casamento nunca fica órfão por troca de assessoria.
- **Excluir o casamento continua só do dono.** A policy
  `casamentos_delete_dono` não é tocada: quem contratou a assessoria pode
  demiti-la; a assessoria não pode apagar o casamento.

### 4.3 Modelo de dados

Uma migration, três mudanças, nenhuma tabela nova:

```sql
-- 1. O CHECK ganha o terceiro valor.
alter table membros_casamento drop constraint membros_casamento_papel_check;
alter table membros_casamento add constraint membros_casamento_papel_check
  check (papel in ('dono', 'planejador', 'colaborador'));

-- 2. O predicado da escada, irmão de is_membro_casamento/is_dono_casamento.
create function pode_gerenciar_papel(p_wedding_id uuid, p_papel_alvo text)
returns boolean language sql stable security definer set search_path = public as $BODY$
  select exists (
    select 1 from membros_casamento
    where casamento_id = p_wedding_id
      and usuario_id = auth.uid()
      and (
        posto_do_papel(papel) > posto_do_papel(p_papel_alvo)
        or papel = 'dono'
      )
  );
$BODY$;

-- 3. As três policies de membros_casamento trocam is_dono_casamento(casamento_id)
--    por pode_gerenciar_papel(casamento_id, papel). O UPDATE checa nos dois
--    lados (using E with check): sem isso, um planejador editaria a própria
--    linha para 'dono'.
```

`posto_do_papel(text)` é a função de ordenação em SQL, e tem um **par em
TypeScript**: `shared/papeis-de-membro.ts`, com `PAPEIS_DE_MEMBRO`,
`postoDoPapel()` e `podeGerenciarPapel()`, usado pelo client (que opções de
papel o formulário oferece, se o botão de convidar aparece) e pelo server (a
checagem explícita antes do `service_role`). É o mesmo tipo de par que
`TAMANHO_PALETA_CATEGORIAS` já tem com o `generate_series` das funções de cor:
**os dois se movem juntos ou a regra passa a ter duas versões.** Um teste
unitário trava a tabela de postos contra o `CHECK` da migration.

### 4.4 Por que RLS *e* TypeScript

Os dois endpoints de membro usam `service_role` — RLS não protege nada neles,
e é por isso que `POST /api/wedding/members` já checa `context.role !== 'dono'`
em TypeScript hoje. Essa checagem passa a ser
`podeGerenciarPapel(context.role, input.papel)`.

A policy continua existindo mesmo assim, como última linha de defesa
(`CLAUDE.md` 4.2): o dia em que uma tela do painel escrever em
`membros_casamento` pelo client autenticado, a escada já está lá.

### 4.5 A escada é a autoridade única — nenhuma rota a reimplementa

Hoje a hierarquia cabe num `if`, e é por isso que ela está escrita à mão em
dois lugares (`context.role !== 'dono'`, nos dois endpoints de membro). Com
três papéis isso deixa de ser aceitável: a próxima rota que precisar da regra
vai comparar strings de novo, e no dia em que a escada mudar — porque a Fase 6
traz plano e assinatura para perto de permissão — haverá duas versões dela,
uma das quais ninguém vai lembrar de atualizar.

> **Regra: `podeGerenciarPapel()` é a única autoridade semântica sobre "quem
> pode gerenciar quem".** Nenhuma rota compara `papel`/`role` diretamente para
> decidir autorização.

Isso não se garante por combinado — se garantisse, a dívida de auditoria não
teria existido. Garante-se por **varredura**, no mesmo molde de
`auditoria-completa.spec.ts`: `tests/unit/server/escada-de-papeis.spec.ts`
percorre `server/api/**` e falha quando um arquivo compara papel na mão
(`=== 'dono'`, `!== 'dono'`, `'colaborador'`, `'planejador'`) sem passar pelo
helper. A dispensa, se um dia precisar existir, é declarada no próprio arquivo
com o motivo — o mesmo rito de `auditoria dispensada:`.

O mesmo vale do lado do banco: `pode_gerenciar_papel()` é o predicado das
policies, e nenhuma policy nova escreve `papel = 'dono'` no `using`.

### 4.6 Onde o papel aparece na tela

| Lugar | Hoje | Depois |
|---|---|---|
| Configurações › Colaboradores | selo "Dono"/"Colaborador" | três selos; o formulário de convite só oferece papéis que o convidante alcança |
| Cabeçalho do painel | "Dono" ou "Colaborador" | o papel real |
| Lista de eventos (`/admin`) | "Dono" ou "Colaborador" | o papel real, por evento — o mesmo login pode ser dono de um e planejador de outro |

O rótulo visível é **"Assessoria"**, não "Planejador": é como o casal chama a
profissional na vida real. `planejador` é o nome no código e na coluna — mesma
separação que "Acompanhantes" (UI) e "núcleo" (código) já têm.

#### O rótulo é o default, não a definição do papel

"Assessoria" foi escolhida sabendo que ela **não cobre todo mundo que vai usar
este papel**, e a decisão é ficar com ela mesmo assim — com uma saída nomeada.

No mercado brasileiro as duas palavras não são sinônimos:

| | **Assessoria / cerimonial** | **Wedding planner** |
|---|---|---|
| O que vende | pacote guarda-chuva, normalmente incluindo a execução do dia | concepção, orçamento e fornecedores ao longo de meses |
| Equipe no evento | quase sempre própria | às vezes nenhuma — terceiriza o cerimonial |
| Como se posiciona | serviço fechado | trabalho de meses, vendido como categoria acima do "só o dia" |

O produto serve os dois igualmente bem — Financeiro, Fornecedores e
Planejamento cobrem o ciclo inteiro, que é exatamente o que a planner
reivindica. **O risco não é técnico, é de autoidentificação:** uma planner que
abre o painel e lê "Assessoria" no próprio selo pode concluir que o produto não
fala a língua dela, e no discurso comercial dela a palavra chega a significar a
categoria inferior àquela que ela vende.

Duas saídas foram consideradas e recusadas. Um segundo papel (`assessoria` e
`planejador` como valores distintos) inventaria uma diferença de **permissão**
onde só existe diferença de **posicionamento comercial** — os dois fazem a
mesma coisa no sistema. Um rótulo genérico ("Profissional", "Organização")
evitaria a ofensa não reconhecendo ninguém.

A decisão (2026-09-15) é: **"Assessoria" continua o default**, porque é a
palavra que o casal usa — e o selo aparece na tela do casal, não na da
profissional. E fica aberta no `ROADMAP.md` a direção de tornar esse texto
**configurável pela própria profissional**, que é quem sabe como quer ser
chamada. Nada disso entra na v1: o rótulo é uma constante em
`shared/papeis-de-membro.ts` até haver uma profissional real reclamando dele.

### 4.7 A tela de acesso, papel a papel

A tela existe hoje (`components/admin/settings/MembersTab.vue`) e foi escrita
para dois papéis. Três mudanças, e a primeira é uma correção que independe
desta fase.

#### O texto já está errado hoje

A descrição atual diz:

> "Colaboradores podem editar o site e a lista de convidados. Só o dono altera
> pagamentos e acessos."

**Só a segunda metade da segunda frase é verdade.** "Acessos" sim — é a única
coisa que o dono faz sozinho. "Pagamentos" não: o Financeiro inteiro está atrás
de `is_membro_casamento`, sem nenhum portão de dono, então um colaborador
sempre pôde lançar parcela e marcar gasto como pago. A frase descreve uma
permissão que o sistema nunca teve.

Isso é a demonstração do problema, não um detalhe: **texto de tela que enumera
permissões envelhece sem nada acusar** — não há teste que falhe quando uma
policy muda e uma frase não. Então a tela para de enumerar:

| | Hoje | Depois |
|---|---|---|
| Título | "Convidar colaborador" | **"Convidar membro"** |
| Descrição | "Colaboradores podem editar o site e a lista de convidados. Só o dono altera pagamentos e acessos." | **"Adicione pessoas para ajudar na organização deste evento. O acesso de cada uma varia conforme o papel."** |
| Rótulo do campo | "E-mail do colaborador" | **"E-mail"** |
| Sucesso/erro | "Colaborador convidado…" | "Membro convidado…" |

"Convidar colaborador" deixa de descrever a operação no instante em que o
dropdown oferece três papéis — e mantê-lo faria "Assessoria" parecer uma
variação de colaborador, que é exatamente o contrário do que o papel significa.
"Quem tem acesso" e "N pessoas neste evento" ficam como estão: já são neutros.

#### O que cada papel vê

| Papel de quem olha | Convida? | Papéis que pode conceder |
|---|---|---|
| Dono | sim | Dono, Assessoria, Colaborador |
| Assessoria | sim | Colaborador |
| Colaborador | **não** — a área de convite não aparece | — |

| Papel de quem olha | Pode remover |
|---|---|
| Dono | Dono¹, Assessoria, Colaborador |
| Assessoria | Colaborador |
| Colaborador | ninguém — a lista é só leitura |

¹ Menos o último: a linha continua marcada "Não pode ser removido", como hoje.

Nada disso é uma segunda matriz de permissão na tela. As duas tabelas são a
mesma pergunta, feita duas vezes:

```ts
podeGerenciarPapel(meuPapel, papelAlvo)
```

— para popular o dropdown (filtrando os papéis concedíveis) e para decidir se a
linha ganha "Remover". O `isOwner` que hoje gateia as duas coisas some; e some
com ele o risco de a tela e o servidor discordarem, porque passam a consultar a
mesma função (seção 4.5). Continua sendo só UX: a autorização é do endpoint
(`CLAUDE.md` 4.2).

Um efeito colateral bom da troca: hoje um colaborador vê a lista sem botão
nenhum, o que é o comportamento certo, mas por acidente — `isOwner` é falso
para ele pelo mesmo motivo que seria falso para uma assessoria. Com a escada,
isso passa a ser o resultado da regra, e não uma coincidência de dois papéis.

---

## 5. A troca de evento

### 5.1 Onde ela vive

O bloco de identidade do casamento no cabeçalho do painel (monograma + nomes +
data) vira o ponto de troca — **e só quando há mais de uma membership**. Com
uma só, ele continua exatamente o que é hoje: texto, sem menu, sem seta, sem
afordância que leve a lugar nenhum. É a mesma regra que a tela de seleção já
segue desde o Passo 3.

O menu lista os outros casamentos e termina em "Ver todos" → `/admin`.

**Trocar é navegar.** O destino é `/admin/{slug}` e nada mais: o middleware já
sincroniza o cookie `casamento_ativo` com o slug da URL a cada navegação, e o
servidor já resolve o contexto a partir dele. Nenhum estado novo, nenhum
endpoint novo, nenhuma action de store.

### 5.2 F5.0 — o escopo de contexto, que é correção estrutural

Este é o achado técnico da fase, ele não é hipotético, e **já está no produto
hoje** — só não tem quem o exercite, porque ninguém administra dois casamentos
ainda. Por isso é F5.0 e não parte da troca de evento: a correção não precisa
do planejador, nem da troca, nem de nada desta fase.

#### O que é, exatamente

O servidor resolve o casamento pelo **cookie**; a URL carrega o **slug**. A
requisição em si não leva casamento nenhum — `/api/wedding`,
`/api/dashboard/summary` e `/api/guests` são a mesma URL para todos os
casamentos. E o estado do client foi escrito como se a URL bastasse.

Vale dizer com precisão o que isto **não** é, para a gravidade não ser nem
inflada nem subestimada: **não é vazamento de autorização.** O servidor nunca
devolve o casamento errado, e quem vê o dado de A já tinha acesso a A — é
membro dos dois. RLS não é burlada em lugar nenhum.

É **vazamento de contexto**: o dado certo na tela errada. E o que faz disso um
defeito sério, e não cosmético, é o que vem depois da leitura — o profissional
lê a lista de A acreditando estar em B, e **age**. A mutação vai para o
servidor, que resolve pelo cookie e escreve corretamente em B. A decisão foi
tomada sobre o dado de um casal e aplicada ao de outro, sem erro nenhum na
tela.

#### Três instâncias, e só uma é `useFetch`

| Onde | O quê | Por que fica preso |
|---|---|---|
| `useFetch`/`useAsyncData` | `key: 'wedding'`, `'dashboard-summary'`, `'guest-overview'`, `guests-<params>` | Chave global para payload que é por casamento |
| `app/layouts/admin.vue` | `getWedding()` roda no setup do **layout**, que não desmonta ao trocar de `/admin/a/**` para `/admin/b/**` | O setup não roda de novo; a ref é a mesma, e com ela os nomes, a data e **o tema** |
| `app/stores/auth.store.ts` | `weddingContext` (id, `papel`, `memberId` do casamento **ativo**) | Só é populado por `fetchSession()`, que o middleware chama apenas quando não há usuário — nunca na troca |

A terceira é a mais interessante, porque não é cache: é Pinia, e carrega
`papel`. Um profissional que é dono de A e colaborador de B, ao trocar para B,
continua com `weddingContext.role === 'dono'` — e `MembersTab.vue` decide por
ele se mostra o botão de convidar. O servidor recusa (ele resolve pelo cookie),
então de novo não é furo de autorização; é uma tela que promete o que o
servidor nega. `uiStore.themeConfig` tem o mesmo formato de problema: estado
derivado do casamento, guardado em store que sobrevive à navegação.

#### A correção, por construção e não por lembrança

Duas mudanças, e as duas removem a necessidade de alguém lembrar de algo:

1. **A chave carrega o slug** — `wedding-${slug}`, `dashboard-summary-${slug}`,
   … Chave que muda com a rota invalida sozinha. Um `refresh` manual na troca
   seria uma linha que alguém precisa lembrar de escrever no próximo
   composable, e o próximo composable é sempre o que ninguém lembra.
2. **`weddingContext` deixa de ser estado e vira derivado.** Ele já é calculável
   sem ida ao servidor: `memberships` (que a sessão devolve) tem
   `weddingId`, `papel`, `memberId` e `slug` de cada casamento; o ativo é o que
   casa com o slug da rota. Um `computed` não envelhece — é a mesma escolha que
   o projeto já fez em faixa etária, status de convite e estado de pagamento.

#### O contrato que sai daqui

Corrigir as três instâncias não impede a quarta. Hoje é `key: 'wedding'`;
amanhã é um `useState('convidadoSelecionado')` ou um
`useAsyncData('finance-summary')`, e o defeito volta com outro nome. Então a
regra não é sobre `useFetch`:

> **Contrato de contexto do painel: todo estado que sobrevive a uma navegação
> é escopado ao casamento ativo — ou é derivado dele, ou carrega o slug na
> chave.** Vale para `useAsyncData`/`useFetch`, `useState`, stores Pinia,
> qualquer armazenamento do navegador e qualquer dado calculado a partir do
> casamento. A exceção é o que pertence à **pessoa**, não ao evento: a
> preferência de menu recolhido do operador atravessa a troca de propósito.

Hoje o produto não usa `useState` nem `localStorage` em lugar nenhum (o que
torna a hora de escrever a regra exatamente agora, antes do primeiro uso), e o
único estado de pessoa em Pinia é `menuDaSecaoRecolhido`.

Fica uma aresta conhecida e aceita: o cookie é a verdade do servidor e o slug é
a do client, sincronizados por um middleware só. Passar o slug em cada uma das
~59 chamadas seria trocar um ponto de sincronização por 59.

### 5.3 A lista de eventos

`app/pages/admin/index.vue` deixa de ser um desempate e passa a ser a casa de
quem tem mais de um casamento. Continua **lista** (decisão 4): nome, data com
quanto falta, status do ciclo de vida, papel neste evento.

Ordenada pela data do evento, o mais próximo primeiro — a ordem de operação de
quem organiza é sempre "qual é o próximo". Arquivados por último, sempre, mesmo
que a data caia antes.

Nada de números de convidado, dinheiro ou RSVP: cada um deles exigiria uma
consulta por casamento para responder uma pergunta que a tela não faz.

---

## 6. Criar um casamento pelo painel interno

### 6.1 O que o endpoint faz

`POST /api/platform/weddings` — `requirePlatformOperator()` como portão real,
depois `service_role`, o mesmo desenho de `GET /api/platform/overview`.

Entrada (Zod, `shared/schemas/platform-wedding.ts`): `slug`, `nomesNoivos`,
`dataEvento`, `emailDono`.

1. Valida o slug contra o formato (`CHECK` de `casamentos`) e contra
   `is_slug_reservado()` — as duas garantias já existem no banco desde o Passo
   1; o endpoint só deixa de descobri-las por erro 500.
2. **Resolve o usuário do dono, fora da transação**: reaproveita `auth.users`
   se o e-mail já existir, senão `admin.inviteUserByEmail`. É exatamente o que
   `POST /api/wedding/members` já faz, e o helper sai de lá para
   `server/utils/usuario-por-email.ts` em vez de ser copiado.
3. **Dentro de `criar_casamento_com_dono()`, em transação**: insere
   `casamentos` (**sem tocar em `status_ciclo_vida`** — o default é
   `rascunho`), insere `membros_casamento` com `papel = 'dono'`, e registra na
   trilha de auditoria como **operador** (seção 7).

As três escritas do passo 3 precisam valer juntas — um casamento sem dono é um
tenant que ninguém alcança, visível no painel interno e em lugar nenhum além
dele. Vai numa função Postgres pelo mesmo motivo que reserva de presente vai:
transação, não sequência de `INSERT` na aplicação.

### 6.2 A fronteira transacional para no Auth — e a ordem existe por causa disso

A transação garante atomicidade das **entidades do banco**. Ela não alcança o
Supabase Auth: `inviteUserByEmail` cria uma linha em `auth.users` e **dispara
um e-mail**, e nem uma coisa nem a outra volta atrás com um `rollback`. Ler
"em transação" como "tudo é revertível" é o erro que este parágrafo existe para
impedir.

É daí que sai a ordem — resolver o usuário **antes**, nunca depois:

| Falha | Com o usuário antes (a decisão) | Com o casamento antes |
|---|---|---|
| Auth falha | Nada foi criado no nosso schema. Retentar é limpo | — |
| A transação falha | Sobra, no pior caso, um `auth.users` convidado que não pertence a casamento nenhum | Sobra **um casamento sem dono**: um tenant órfão, visível só no painel interno |

O único efeito externo não revertível é, então, **um convite de e-mail enviado
a alguém que ainda não tem casamento nenhum** — e ele é autocurável: a próxima
tentativa com o mesmo e-mail reaproveita o usuário pelo caminho de busca que já
existe, e quem clicar no convite cai no estado vazio de `/admin` ("Nenhum
casamento vinculado"), que já está implementado e escrito para exatamente esta
situação.

Nenhuma compensação automática, portanto — a estratégia é **deixar o resíduo
no lado barato**. O que não pode acontecer é o resíduo cair do lado do tenant.

### 6.3 Duplo envio: o slug é a chave de idempotência

Criar casamento é mais perigoso que um CRUD comum — cria tenant, posse e
registro de uma vez —, então o comportamento sob envio repetido precisa ser
**decidido**, não descoberto. O operador clica duas vezes, o navegador repete a
requisição, a conexão cai no meio: os três acontecem.

Decisão: **o `unique` de `casamentos.slug` é a chave de idempotência.** A
segunda criação com o mesmo slug não cria um segundo tenant — falha na
constraint, e o endpoint a traduz em **409**, com mensagem dizendo que o
endereço já está em uso. Duplo clique, requisição repetida e corrida entre dois
operadores desembocam todos no mesmo lugar: exatamente um casamento.

Não há chave de idempotência própria, e é decisão: ela exigiria tabela nova
para cobrir um caso que a restrição existente já cobre. O botão desabilitado
durante o envio é cortesia de UI — a garantia é a constraint.

O que o 409 **não** resolve, e fica dito: dois casais diferentes com o mesmo
slug desejado é um conflito legítimo, não um envio repetido, e chega na mesma
mensagem. Na escala de hoje — equipe interna criando eventos — isso é
aceitável; quando a criação virar self-service (Fase 6), sugerir um slug
alternativo passa a ser trabalho de produto.

### 6.4 Criar nunca publica

A linha nasce `rascunho`, e desde a Fase 4 rascunho **barra o site público de
verdade** — a policy de RLS de `casamentos` e o `garantirCasamentoPublicado()`
dos caminhos de `service_role`. O endereço do casal responde 404 até ele mesmo
publicar, pelos Primeiros passos.

Isso não é um detalhe de implementação, é a propriedade que torna a criação
pelo painel interno segura de fazer: **a equipe interna cria o evento; só o
casal o coloca no ar.**

### 6.5 O operador pode criar um casamento para si mesmo

A pergunta desconfortável: `/plataforma` é deliberadamente um caminho de
**leitura** entre tenants (`CLAUDE.md` 4.2, 5º modelo de confiança). Um
endpoint de criação que aceita um e-mail de dono qualquer permite ao operador
informar o próprio e-mail e sair com acesso de painel a um tenant novo.

Decisão: **permitido, e sempre registrado.** Recusar o próprio e-mail não
fecha nada — quem tem `service_role` já podia escrever a linha à mão — e
empurraria o caso legítimo (a equipe criando um casamento de teste em `dev`,
que é como o ambiente de hoje funciona) de volta para o SQL, que é o único
caminho onde não sobra registro nenhum.

O que fecha é o registro: toda criação deixa uma linha com
`tipo_autor = 'operador'` e o operador identificado. A trilha é do casamento,
então o casal lê no próprio painel quem criou o evento dele — e isso é honesto,
não um vazamento.

### 6.6 A ficha do casamento (decisões de 2026-09-15, segunda rodada)

Criar sem poder corrigir é meia ferramenta: e-mail de dono digitado errado,
endereço com typo, casal que perdeu acesso. A ficha é **rota própria**
(`/plataforma/{id}`), pelo mesmo motivo que a ficha do gasto é uma página no
Financeiro — o que a equipe precisa saber sobre um evento não cabe numa célula
da listagem, e espremer isso ali transformaria a mesa de trabalho num
formulário.

Ela mostra porte (convidados, storage, convites enviados), quem tem acesso, e
as últimas 20 linhas da trilha daquele casamento.

#### Trocar o slug: permitido, com o estrago medido

O link do convidado é `/{slug}/rsvp/{código}`. Trocar o endereço invalida todo
convite enviado e todo QR impresso — a mesma razão pela qual o envio nunca
rotaciona a credencial que já existe (`CLAUDE.md` seção 12).

Decisão: **permitir sempre, com aviso**, não bloquear. Quem opera aqui é equipe
treinada, e às vezes o endereço está errado mesmo depois do envio; travar
empurraria a correção de volta para o SQL, onde não sobra registro. O que a
tela faz é medir o estrago antes — quantos convites já saíram, quantas
credenciais estão ativas — e dizer que um QR na mão de alguém não se reimprime.
Quando nada saiu, o aviso diz isso também, em vez de assustar à toa. O registro
guarda slug anterior, slug novo e o número de convites já enviados: sem esse
número, "o slug mudou" não conta nada.

#### Arquivar sim, publicar não — e desarquivar devolve para rascunho

`statusCicloVida` aceita `arquivado` e `rascunho`, nunca `publicado`. Pôr o
site de um casal no ar é decisão dele, e a plataforma que cria o evento é a
mesma que não o divulga.

Daí a consequência que parece estranha e é deliberada: **desarquivar devolve
para rascunho**, mesmo que o casamento estivesse publicado antes. Restaurar
direto para `publicado` seria a equipe interna republicando o site de alguém —
e o casal republica com um clique no painel dele.

#### Acessos: o operador está fora da escada

A escada de papéis descreve quem, **dentro** de um casamento, alcança quem. O
operador não é membro de casamento nenhum: está fora dela, e por isso concede
qualquer papel pela ficha. O que continua valendo é a trava que impede o
casamento de ficar órfão — **nunca remover o último dono**. No caso de suporte
que motivou a tela (e-mail errado no cadastro), a ordem é vincular o dono certo
primeiro e só então remover o errado, e a mensagem de erro diz isso.

#### Excluir: o registro precisa sobreviver ao que ele apaga

As 34 FKs que apontam para `casamentos` têm `on delete cascade`, então a linha
leva junto convidados, convites, respostas, presentes, pagamentos, mesas,
documentos — **e a própria `trilha_auditoria`**.

É aí que está o problema real: o registro da exclusão não pode morar na trilha,
porque ele morreria junto com o que descreve. Um registro assim não é registro.
Por isso existe `exclusoes_de_casamento`, fora do cascade, append-only, com a
fotografia do que havia: slug, nomes, data, status e porte no instante da
exclusão — depois não há como recontar. `excluir_casamento()` fotografa e apaga
na mesma transação.

Duas coisas ficam de fora do banco, e a ordem entre elas é decisão:

- **os arquivos de storage** não estão no grafo de relações, então saem por
  fora — e **depois** do banco, nunca antes. Na ordem inversa, uma falha
  deixaria um casamento vivo com as imagens quebradas; nesta, o pior caso é
  arquivo órfão, que a própria métrica de storage mostra e que se apaga depois.
  É o mesmo princípio do convite de e-mail na criação: **o resíduo fica do lado
  barato**;
- **a confirmação é digitar o endereço**, não um "tem certeza?". Um clique a
  mais vira reflexo, e esta é a única ação do produto sem desfazer.

### 6.7 Acesso de suporte ao painel do casal (2026-09-15, terceira rodada)

A equipe interna precisa entrar no painel de um casamento para dar suporte. A
pergunta não é se pode — é **por onde**.

#### Só havia dois caminhos, e um está proibido

Medindo antes de desenhar: **123 das 128 rotas do painel usam o client com
RLS**. Não é defesa em profundidade, é a autorização de verdade. Então um
"contexto especial de operador" em `resolveWeddingContext()` não seria um furo
de segurança — seria simplesmente **quebrado**: toda lista voltaria vazia e
toda escrita seria recusada, porque `is_membro_casamento(auth.uid())` é falso.

O outro caminho seria acrescentar `is_operador_plataforma()` às ~90 policies —
e é exatamente o que o `CLAUDE.md` seção 4.2 proíbe: *"nunca uma policy que
qualquer tenant possa acidentalmente herdar"*.

Resta o que foi feito: **o operador ganha um vínculo real e temporário** em
`membros_casamento` (`acesso_suporte_expira_em` preenchido, papel `dono`). Nada
muda nas 123 rotas, nada muda nas policies, e a autorização continua sendo a
mesma para todo mundo — que é o que a torna confiável.

#### A expiração vale na leitura, não numa varredura

`is_membro_casamento`, `is_dono_casamento` e `pode_gerenciar_papel` passaram a
ignorar vínculo vencido. É a diferença entre uma expiração de verdade e uma
decorativa: com limpeza periódica, uma linha vencida continuaria abrindo o
painel até alguém apagá-la.

Daí também não haver cron novo — o plano da hospedagem limita quantos existem
(`CLAUDE.md` seção 12), e linha vencida é **inerte**, não perigosa. A limpeza
acontece de carona, quando um acesso novo é aberto.

Duração: **4 horas**, em `shared/acesso-de-suporte.ts`. Suporte a casal é uma
sessão de trabalho, não uma relação contínua. E há botão para encerrar antes:
a validade cobre o esquecimento, o botão cobre a intenção — uma não substitui a
outra.

#### Silencioso na tela, nunca na trilha

Decisão de produto: o vínculo **não aparece** na tela de acessos do casal
(`GET /api/wedding/members` o filtra) e **não conta** na contagem de donos —
um casamento cujo único "dono" fosse a equipe interna estaria órfão do mesmo
jeito.

Mas conceder e encerrar ficam registrados na trilha do casamento como
`operador`, e **o casal lê a própria trilha**. Isso é deliberado: ocultar
também o registro removeria a accountability que torna a expiração verificável,
e o `CLAUDE.md` seção 11 restringe leitura de dado pessoal de convidado a
*membros autenticados daquele `casamento_id`* — que é precisamente o que o
vínculo real satisfaz, e o que um bypass sintético violaria.

---

## 7. A trilha de auditoria ganha um terceiro ator

`trilha_auditoria` hoje não consegue representar o que a seção 6 precisa
registrar: `tipo_autor` só aceita `membro`/`sistema`, e `autor_id` aponta para
`membros_casamento` — um operador de plataforma não é membro de casamento
nenhum, e não pode virar um só para caber na coluna.

A migration da Fase 5:

```sql
alter table trilha_auditoria
  add column autor_operador_id uuid
    references operadores_plataforma (usuario_id) on delete set null;

-- tipo_autor: membro | sistema | operador
-- Consistência: cada tipo tem exatamente uma forma de autor.
--   sistema  -> os dois nulos
--   membro   -> autor_id preenchido, autor_operador_id nulo
--   operador -> autor_operador_id preenchido, autor_id nulo
```

`recordPlatformAuditLog()` entra em `server/utils/audit-log.ts`, ao lado de
`recordAuditLog` e `recordSystemAuditLog`. `casamento_id` continua obrigatório
e continua certo: a ação do operador sempre acontece **sobre** um casamento, e
o registro é escrito depois de ele existir.

Sem isso, `tests/unit/server/auditoria-completa.spec.ts` pegaria a rota nova e
a única saída seria declarar `auditoria dispensada:` — concedendo a primeira
dispensa da história do projeto justamente à ação mais grave que o sistema
sabe fazer.

---

## 8. Storage no painel interno

### 8.1 Onde o storage realmente está

Antes de medir, é preciso saber o que existe. São quatro buckets, e **um deles
está morto**:

| Bucket | Privado? | Quem escreve | Vivo? |
|---|---|---|---|
| `wedding-covers` | não | capa, história, monograma, dress code | sim |
| `wedding-event-segments` | não | imagem de etapa do cronograma | sim |
| `wedding-documents` | **sim** | documentos do Financeiro | sim |
| `wedding-photos` | não | — | **não** |

`wedding-photos` não tem mais nenhum escritor desde a Fase Galeria via Google
Drive: a galeria **espelha** uma pasta do Drive do casal, nunca copia. A única
ocorrência do nome no código é uma coincidência de chave de cache
(`useFetch('/api/photos', { key: 'wedding-photos' })`).

A consequência para esta fase é direta: uma métrica de storage que somasse
`wedding-photos` mostraria zero para sempre, enquanto as fotos — o maior volume
de arquivo de qualquer casamento — nunca tocam nossa infraestrutura. **O painel
precisa dizer isso**, não deixar a equipe concluir que casamento consome 4MB.

Os três buckets vivos gravam com o caminho `{casamento_id}/…`, sem exceção, o
que torna a soma por casamento uma questão de prefixo.

### 8.2 Medido, não contado

`contadores_uso` existe desde a v1 com `storage_used_mb`, e nenhum gatilho
jamais a populou. A tentação óbvia é populá-la agora. **Não.**

Este projeto remove contador materializado toda vez que encontra um:
`mesas.ocupacao` nunca existiu porque sentar e tirar acontecem em vários
caminhos; `convites.status_convite` e `convites.enviado_em` saíram do schema
porque o fato é a linha em `comunicacoes`; o estado de pagamento é derivado de
`pago_em`. A regra por trás é sempre a mesma: **contador que precisa ser
lembrado em seis caminhos de escrita erra no primeiro que esquecer.** Upload
tem seis caminhos, e exclusão de arquivo tem mais.

Storage é medido **sob demanda**, no endpoint do painel interno: leitura
interna, de baixa frequência, de uma equipe que quer o número de agora.

Implementação: uma função Postgres `uso_de_storage_por_casamento()` que soma
`storage.objects` agrupando pelo primeiro segmento do caminho. O schema
`storage` não é exposto ao PostgREST, e listar bucket por bucket pela API de
Storage seria três chamadas por casamento. `security definer`, `execute`
revogado de `anon`/`authenticated` e concedido só a `service_role` — a função
lê entre tenants, exatamente como o resto do caminho Plataforma, e por isso
nunca pode ser alcançável por uma sessão de casal.

**A função devolve bytes**, nunca megabytes:

```text
casamento_id | bytes
```

Quem decide entre "12,4 MB" e "1,83 GB" é a tela. É a mesma regra que a planta
de mesas já segue — coordenada é **centímetro**, e pixel é `cm × zoom`, só na
renderização (`CLAUDE.md` seção 12). Uma função que devolvesse `storage_mb`
acoplaria a camada de dados à apresentação e perderia precisão no caminho, para
poupar uma divisão.

`contadores_uso` continua vazia e continua com propósito: ela volta a fazer
sentido quando existir um **limite a aplicar no momento da escrita** (Fase 6),
que é uma pergunta diferente de "quanto este casamento ocupa hoje".

### 8.3 A allowlist de buckets, e por que ela falha alto

A função **não** soma `storage.objects` inteiro. Ela soma uma lista explícita:
`wedding-covers`, `wedding-event-segments`, `wedding-documents`.

Somar tudo parece mais simples e é pior das duas maneiras: o bucket que alguém
criar daqui a seis meses entra na conta sem ninguém decidir que deveria, e um
bucket que passe a existir fora do padrão de caminho `{casamento_id}/…` soma no
grupo errado, em silêncio. A seção 8.1 mostra que a lista real de buckets já
divergiu da lista de buckets vivos uma vez — `wedding-photos` ficou para trás
sem nada acusar.

Uma allowlist sozinha tem o defeito espelhado: o bucket novo fica **de fora** e
ninguém percebe. Então ela vem com uma varredura, no mesmo molde das outras
deste projeto: `tests/integration/storage-buckets.spec.ts` compara a allowlist
com `storage.buckets` e **falha quando aparece um bucket que a lista não
conhece** — obrigando quem o criou a decidir, ali, se ele conta ou não, e a
registrar o porquê.

É o mesmo mecanismo de `auditoria-completa.spec.ts`: a dívida não se paga
conferindo a lista hoje, e sim garantindo que ela não possa envelhecer calada.

### 8.4 O que a tela mostra

Duas colunas novas na tabela de `/plataforma` — storage e uma linha de total da
plataforma no topo — e uma nota fixa dizendo que fotos de galeria vivem no
Drive do casal e não entram na conta. Sem gráfico, sem série histórica: não há
série, porque não há nada acumulando medição.

---

## 9. API

| Rota | Método | Portão | O que faz |
|---|---|---|---|
| `/api/platform/weddings` | `POST` | `requirePlatformOperator` | Cria casamento + dono, em transação; audita como operador |
| `/api/platform/weddings/[id]` | `GET` | `requirePlatformOperator` | A ficha: acessos, porte, o que já saiu daqui e a trilha |
| `/api/platform/weddings/[id]` | `PATCH` | `requirePlatformOperator` | Nomes, data, slug e arquivar — **nunca publicar** |
| `/api/platform/weddings/[id]` | `DELETE` | `requirePlatformOperator` | Exclusão física; registra em `exclusoes_de_casamento`, fora do cascade |
| `/api/platform/weddings/[id]/members` | `POST` | `requirePlatformOperator` | Vincula acesso em qualquer papel |
| `/api/platform/weddings/[id]/members/[memberId]` | `DELETE` | `requirePlatformOperator` | Remove acesso, menos o último dono |
| `/api/platform/weddings/[id]/support-access` | `POST` | `requirePlatformOperator` | Abre acesso de suporte com validade; idempotente |
| `/api/platform/weddings/[id]/support-access` | `DELETE` | `requirePlatformOperator` | Encerra o acesso de suporte deste operador |
| `/api/platform/overview` | `GET` | `requirePlatformOperator` | **muda**: ganha storage por casamento e o total |
| `/api/wedding/members` | `POST` | escada de papéis | **muda**: `context.role !== 'dono'` vira `podeGerenciarPapel(context.role, input.papel)` |
| `/api/wedding/members/[id]` | `DELETE` | escada de papéis | **muda**: mesma troca, contra o papel do alvo |
| `/api/auth/session` | `GET` | sessão | **muda**: `memberships[]` ganha `dataEvento` e `statusCicloVida` para a lista de eventos |

Nenhuma rota pública, nenhuma rota de convidado. Nada desta fase tem caminho
sem autenticação.

---

## 10. UI e navegação

| Tela | Mudança |
|---|---|
| Cabeçalho do painel | Bloco de identidade vira troca de evento — **só com mais de uma membership** |
| `/admin` | Lista de eventos: nome, data com contagem, status, papel; ordenada pela data, arquivados por último |
| Configurações › Colaboradores | "Convidar **membro**"; três papéis, o dropdown só oferece o que o convidante alcança; "Remover" por linha pela mesma regra; selo "Assessoria"; a descrição para de enumerar permissões (seção 4.7) |
| `/plataforma` | Botão "Criar casamento" + formulário; colunas de storage; nota do Drive; "Abrir" leva à ficha |
| `/plataforma/{id}` | A ficha do casamento: porte, dados do evento, acessos, trilha, arquivar e excluir (seção 6.6) |

Nenhuma aba primária nova. O planejador usa o mesmo painel que o casal — é a
mesma ferramenta, e um evento por vez continua sendo o modo de trabalhar nela.

---

## 11. Candidatos a invariante no `CLAUDE.md` (seção 12)

1. **Nada do painel atravessa a troca de casamento.** Todo estado que sobrevive
   a uma navegação é escopado ao casamento ativo — derivado dele, ou com o slug
   na chave. Vale para `useAsyncData`/`useFetch`, `useState`, stores Pinia e
   qualquer armazenamento do navegador; a exceção é o que pertence à **pessoa**
   e não ao evento (a preferência de menu recolhido). O servidor resolve o
   casamento pelo cookie e a API não leva casamento na URL, então quem separa o
   dado de um casal do de outro é o client — e a falha é **muda**: dado certo
   na tela errada, e uma decisão tomada sobre o casamento anterior.
2. **Papel de membro é escada, não matriz.** Um membro alcança o papel abaixo
   do seu; o dono alcança também os outros donos; o planejador nunca é dono e
   nunca entra na contagem que impede o casamento de ficar órfão. A ordem vive
   em `shared/papeis-de-membro.ts` e tem par em SQL — os dois se movem juntos —,
   e `podeGerenciarPapel()` é a **autoridade única**: nenhuma rota compara
   `papel` na mão para decidir autorização.
3. **Criar um casamento nunca o publica.** A linha nasce `rascunho`; quem põe
   o site no ar é o casal, pelos Primeiros passos. A equipe interna cria o
   evento e não o divulga. E a atomicidade é das entidades do banco: o convite
   de e-mail do Auth fica **fora** da transação, resolvido antes dela, para que
   a falha deixe resíduo do lado barato — nunca um tenant sem dono.
4. **Storage é medido, nunca contado por gatilho, e sempre em bytes.** Somado
   de `storage.objects` no momento da leitura interna, sobre uma allowlist
   explícita de buckets; a unidade de exibição é decisão da tela.
   `contadores_uso` só volta a existir quando houver limite a aplicar na
   escrita.
5. **Ação de operador de plataforma se registra como operador.** `/plataforma`
   deixa de ser só leitura, e a escrita nasce com ator próprio na trilha —
   nunca fingindo ser membro, nunca dispensada.

---

## 12. Ordem de implementação

| # | Entrega | Natureza | Depende de | Migration |
|---|---|---|---|---|
| **F5.0** | Chaves com slug, `weddingContext` derivado de `memberships`, `themeConfig` sem sobrevida entre eventos | Correção estrutural | — | — |
| **F5.1** | Troca de evento no cabeçalho, lista de eventos | Multi-evento | F5.0 | — |
| **F5.2** | Papel `planejador`: `CHECK`, `posto_do_papel`, `pode_gerenciar_papel`, as 3 policies, `shared/papeis-de-membro.ts`, os 2 endpoints, varredura da autoridade única, e a tela de acesso papel a papel (seção 4.7) | Autorização | — | A |
| **F5.3** | Ator operador na trilha de auditoria | Governança | — | B |
| **F5.4** | `POST /api/platform/weddings` + `criar_casamento_com_dono()` + formulário em `/plataforma` | Operação | F5.3 | B |
| **F5.5** | `uso_de_storage_por_casamento()`, allowlist de buckets, colunas no painel interno | Observabilidade | — | C |
| **F5.6** | A ficha do casamento: editar, acessos, arquivar e excluir (seção 6.6) | Operação |
| **F5.7** | Acesso de suporte ao painel do casal (seção 6.7) | Operação | F5.4 | D |
| **F5.7** | Acesso de suporte ao painel do casal (seção 6.7) | Operação | F5.6 | E |

**F5.0 não depende de F5.1**, e é essa a razão de ela existir separada: o
defeito de contexto já está no produto, a correção não precisa da troca de
evento para ser feita, e uma correção conhecida não espera uma funcionalidade.
Na prática, F5.0 é a única entrega da fase que faz sentido mergear sozinha.

O selo de papel de F5.1 sai com "Dono"/"Colaborador" até F5.2 chegar — a lista
de eventos não fica esperando a escada.

Testes que a fase obriga:

- `tests/e2e/casamento-ativo.spec.ts` — cresce para o **invariante de
  não-vazamento** (abaixo), não só para "o nome do cabeçalho mudou".
- `tests/unit/shared/papeis-de-membro.spec.ts` — a escada, incluindo o dono
  sobre dono e a impossibilidade de autopromoção; e a trava contra o `CHECK`.
- `tests/unit/server/escada-de-papeis.spec.ts` — a varredura da seção 4.5:
  nenhuma rota compara `papel` na mão.
- `tests/integration/rls/membros-casamento.spec.ts` — cresce para os três
  papéis; a suíte de RLS é 28/28 arquivos sem exceção.
- `tests/integration/rls/trilha-auditoria.spec.ts` — o terceiro tipo de ator.
- `tests/integration/storage-buckets.spec.ts` — a allowlist contra
  `storage.buckets` (seção 8.3).
- `tests/integration/rls/acesso-de-suporte.spec.ts` — a prova que sustenta a
  seção 6.7: vínculo vencido deixa de valer **com a linha ainda existindo**,
  verificado com client autenticado contra as policies reais.
- `tests/integration/api/platform-wedding-ficha.spec.ts` — o portão, a edição
  do slug com o anterior na trilha, a recusa de publicar, o desarquivar que
  volta para rascunho, a trava do último dono, e a exclusão cujo registro
  sobrevive ao cascade.
- `auditoria-completa.spec.ts` e `rotas-publicas-com-portao.spec.ts` pegam a
  rota nova sozinhos — nenhuma dispensa nova é concedida.

### 12.1 O invariante de não-vazamento entre eventos

"O nome no cabeçalho mudou" é um bom começo e um teste fraco: ele passa
enquanto o dashboard, a lista de convidados e o tema continuam sendo os do
casamento anterior. O defeito é perigoso exatamente por ser **silencioso**, e
um teste que olha um campo só reproduz o mesmo ponto cego.

O que o E2E assere, depois de navegar de A para B:

> **Nenhum dado de A permanece visível ou em cache em B.**

Concretamente, e nesta ordem: nomes dos noivos, data do evento, tokens de tema
aplicados (a cor primária no `:root`), o resumo do dashboard, a lista de
convidados, e o papel exibido no cabeçalho. Cada um é uma origem diferente —
layout, store de UI, `useFetch` de página, store de auth —, e é por cobrirem
origens diferentes que valem mais do que seis asserções sobre o mesmo campo.

O teste vai adiante e volta (**A → B → A**): meia correção — invalidar ao
entrar, mas não ao voltar — passa num caminho só de ida.

Isto é invariante da fase, não detalhe do spec: qualquer estado novo do painel
nasce com a pergunta "isto atravessa a troca?", e a resposta certa é sempre
não, exceto para o que pertence à pessoa e não ao evento.

---

## 13. Em aberto

- **"Não deixar o casamento sem dono" continua só em TypeScript.** Com um
  terceiro papel mexendo em gente, vale avaliar um trigger que recuse a última
  saída de dono no próprio banco. Não é escopo desta fase: o planejador não
  alcança dono, então a fase não aumenta o risco — só o torna mais visível.
- **O rótulo do papel, configurável pela profissional** (seção 4.6) —
  registrado no `ROADMAP.md` seção 11 como direção a validar, não como dívida.
  Uma consequência a resolver quando chegar a hora: hoje **nada no produto é
  por conta**. `conta_id` existe em `assinaturas` e
  `funcionalidades_habilitadas`, sempre apontando direto para `auth.users` (não
  há tabela `contas`), e nenhuma delas guarda atributo que apareça na tela.
  Um rótulo escolhido pela profissional seria o primeiro — e ele é texto de
  usuário exibido no painel de **outra pessoa**, o que traz junto limite de
  tamanho, a proibição de `v-html` e a pergunta de o que acontece quando o
  texto está vazio.
- **Equipe própria da assessoria** (seção 4.1). Hoje colaborador é colaborador,
  e duas assessorias no mesmo casamento removem o pessoal uma da outra. Dar
  equipe a cada uma é relação nova (`convidado_por`, ou um nó de equipe) e traz
  junto: o que acontece com a equipe quando a assessoria sai, quem herda
  colaborador de assessoria removida, e se o dono vê uma lista ou duas.
  **Gatilho**: o primeiro casamento real com duas assessorias — até lá, é
  complexidade para um caso que não aconteceu.
- **O painel entre eventos com alertas** (seção 2.2) — direção nomeada, sem
  data. O gatilho para retomá-la é um profissional real usando a lista e
  dizendo qual pergunta ela não responde.

### 13.1 Dois achados da implementação (2026-09-15)

Nenhum dos dois é escopo desta fase; os dois apareceram ao construí-la e ficam
registrados para não sumirem.

- **Criar casamentos em sequência esbarra no limite de e-mail do Supabase
  Auth.** `inviteUserByEmail` é o que vincula o dono, e o SMTP embutido do
  Supabase limita o envio (2/hora no projeto `dev`) — a criação devolve
  `email rate limit exceeded`, com o casamento **não** criado, porque o convite
  acontece antes da transação. Na escala de hoje (equipe interna, um cliente de
  cada vez) é aceitável; um mutirão de cadastro não é. A saída é a mesma que o
  produto já escolheu para o convidado: SMTP próprio via Resend, que já está
  integrado atrás de `server/utils/email-provider.ts` mas ainda não provisionado.
  O teste de integração evita o caminho de propósito (cria o usuário do dono
  antes), para falhar por regressão e nunca por rate limit.

- **O painel administrativo NÃO é `ssr: false`, ao contrário do que o
  `CLAUDE.md` seção 4.3 afirma.** Não existe `ssr: false` nem `routeRules` em
  `nuxt.config.ts`, nem `definePageMeta({ ssr: false })` em página alguma: o
  `/admin` é renderizado no servidor como o resto do app. A consequência
  apareceu no E2E — a lista fica visível alguns instantes antes de o Vue
  hidratar, e um clique nessa janela move o foco sem acionar handler nenhum.
  Não foi corrigido aqui porque desligar o SSR do painel é mudança de
  comportamento com alcance próprio (LCP, hidratação, os testes que dependem
  do HTML inicial) — e porque a decisão é entre **mudar o código para casar com
  o documento** ou **mudar o documento para casar com o código**, que não é
  escolha de uma fase sobre multi-evento.
