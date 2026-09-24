# Fase 6 — Contas e acessos

> Documento de refinamento da **Fase H** do plano da inspeção de usabilidade de 20/09/2026
> (`docs/rodada-usabilidade-2026-09.md`, ponto 2: "sem gestão de usuários no `/plataforma`").
>
> **Status:** arquitetura fechada em 24/09/2026, depois da revisão do dono do produto. Nenhuma
> linha de código escrita ainda.
>
> A fase ganhou documento próprio porque, diferente das outras sete, ela não é só interface: há
> regra de negócio nova a decidir, e uma decisão de schema que o plano da rodada não previu.

---

## 1. O primeiro achado: metade do escopo já existe

O plano da rodada descreve a Fase H a partir do relatório de inspeção, que olhou a **tela**. Ao
conferir o código, dois dos quatro itens do escopo previsto já estão construídos.

| Item previsto no plano | Situação real |
|---|---|
| Operadores da plataforma: listar, conceder e revogar pelo `/plataforma` | **Falta inteiro.** Não há rota de API nem tela; o único caminho é `scripts/criar-operador-plataforma.mjs`. |
| Contas de cliente: ver quem tem acesso a qual evento, com qual papel | **Falta.** `/plataforma/index.vue` lista casamentos e o bloco "Atenção"; nada sobre pessoas. |
| Acesso de suporte: conceder pelo painel interno com validade | **Já existe.** `server/api/platform/weddings/[id]/support-access.post.ts` e `.delete.ts`, com a interface correspondente em `app/pages/plataforma/[id].vue`. |
| Assessoria como cliente: uma tela onde a assessoria veja seus eventos | **Existe em parte.** `/admin` já lista os eventos de quem entra, e `useMinhasMemberships` separa o que é posse do que é acesso de suporte. O que não existe é a visão de **carteira** (progresso, prazos, o que precisa de atenção em cada evento), que é produto novo e não correção de lacuna. |

Isso reduz a fase, e é bom que reduza: o relatório acertou o diagnóstico ("não há gestão de
usuários") e errou o inventário, porque descreveu o que não se vê em vez do que não existe.

---

## 2. O que a fase precisa resolver

**A. Operadores da plataforma têm um caminho oficial que só existe numa máquina.**
`operadores_plataforma` nasceu deny-by-default e sem UI — a própria migration (`20260824090001`)
diz "primeira linha inserida manualmente via `service_role`". O script existe, é cuidadoso e está
versionado desde a Fase A, mas exige a `SUPABASE_SERVICE_ROLE_KEY` na mão e o `--ref` do projeto
na linha de comando. Enquanto for o único caminho, conceder acesso interno é operação de quem tem
a chave de produção — e revogar, idem.

**B. Ninguém responde "quem tem acesso a quê" sem abrir casamento por casamento.**
O dado existe (`membros_casamento`), mas só é legível de dentro de cada evento. Para a equipe
interna a pergunta natural é a transversal: *este e-mail alcança quais eventos, com qual papel?*

---

## 3. A trilha da plataforma

O plano diz, sobre operadores: *"com trilha de auditoria (`tipo_autor = 'operador'`, que já
existe)"*. Isso vale para o que um operador faz **dentro de um casamento** —
`recordPlatformAuditLog()` já registra assim, e o comentário dele é explícito: *"`casamento_id`
continua obrigatório e continua certo: a ação do operador acontece sempre SOBRE um casamento"*.
Não vale para a gestão de operadores em si.

`trilha_auditoria.casamento_id` é **`not null`**. A coluna não é conveniência: é o que separa a
trilha de um tenant da de outro, o que sustenta a policy pela qual o casal lê a própria trilha, e
o que a Fase 5 usou para tornar a visita de suporte verificável por quem a recebe.

**Conceder ou revogar um operador não é evento de casamento nenhum.** Três saídas:

1. **Tornar `casamento_id` anulável.** Recusada — afrouxa a garantia em **todas** as linhas para
   acomodar um punhado que não é de tenant nenhum.
2. **Não auditar.** Recusada — é concessão de privilégio entre tenants, o tipo exato de ação que
   a seção 11 do CLAUDE.md manda registrar.
3. **Trilha própria da plataforma.** Escolhida.

**E há precedente no próprio repositório.** `exclusoes_de_casamento` existe pela mesma razão:
excluir um casamento apaga a trilha dele por cascade, então o registro precisou de casa fora do
tenant. Ela também **denormaliza** o que identifica o alvo (`nomes_noivos`, `slug`, `data_evento`,
`contagem_convidados`) em vez de guardar só FKs — porque um registro que só aponta vira ilegível
quando o apontado some. A trilha nova segue a mesma escola.

### 3.1 Esboço do schema

```sql
create table trilha_auditoria_plataforma (
  id uuid primary key default gen_random_uuid(),
  tipo_acao text not null,               -- 'operador.concedido' | 'operador.revogado'
  autor_operador_id uuid
    references operadores_plataforma (usuario_id) on delete set null,
  alvo_usuario_id uuid
    references auth.users (id) on delete set null,
  alvo_email text not null,              -- denormalizado, ver 3.2
  metadados jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

Nomes em português e `metadados`/`created_at` iguais aos de `trilha_auditoria`, pela seção 6 do
CLAUDE.md — a tabela espelha vocabulário de banco, não é organização interna de código.

**Duas correções em relação ao esboço da revisão**, e as duas importam:

- A PK de `operadores_plataforma` é **`usuario_id`**, não `id` (é extensão 1:1 de `auth.users`,
  mesmo padrão de `contadores_uso`). A FK precisa apontar para ela.
- **`alvo_usuario_id` NÃO pode referenciar `operadores_plataforma`.** Se referenciasse, revogar um
  operador apagaria a linha dele e o `on delete set null` esvaziaria justamente o campo que diz
  *quem* foi revogado — o registro da revogação destruído pela revogação que ele registra. O alvo
  aponta para `auth.users`, que sobrevive à revogação.

### 3.2 Por que o e-mail vai em texto na trilha

`alvo_usuario_id` fica nulo se a conta for apagada, e aí a linha perde o sujeito. `alvo_email` é a
mesma decisão que `exclusoes_de_casamento` tomou ao guardar `nomes_noivos`: a trilha é
append-only e precisa continuar legível sozinha.

Isso **não** conflita com a seção 11 do CLAUDE.md ("dado pessoal de convidado nunca logado em
texto pleno"). Aquela regra protege o **convidado**, cujo dado o casal custodia e que nunca
consentiu com nada. Aqui o sujeito é um membro da equipe interna, o registro é a prova de uma
concessão de privilégio que ele mesmo recebeu, e o acesso à tabela é restrito a operadores. Fica
escrito aqui para que ninguém leia a regra pela metade depois.

### 3.3 RLS

`enable row level security`, `select` só para operador (`exists (select 1 from
operadores_plataforma where usuario_id = auth.uid())`), e **nenhuma** policy de `insert`, `update`
ou `delete`: escrita só por `service_role`, dentro da rota que já passou por
`requirePlatformOperator()`. É o mesmo desenho da própria `operadores_plataforma`.

---

## 4. As sete decisões, fechadas

| # | Decisão | Fechamento |
|---|---|---|
| 4.1 | Operador concede operador? | **Sim, modelo plano.** Sem escada; a equipe cabe numa sala, e um "operador-chefe" acrescenta conceito sem caso de uso. |
| 4.2 | O último operador pode ser removido? | **Não.** Trava obrigatória — e **transacional**, ver §5. |
| 4.3 | Conceder cria a conta? | **Convite por e-mail**, reaproveitando `server/utils/usuario-por-email.ts`. Conta existente é vinculada; conta nova é convidada. |
| 4.4 | O operador pode se remover? | **Não.** |
| 4.5 | A visão transversal altera acessos? | **Não. Só leitura.** |
| 4.6 | O suporte aparece nessa visão? | **Sim, separado da membership**, com a validade à vista. |
| 4.7 | O operador pode alterar o próprio privilégio? | **Não. Autoalteração proibida**, de qualquer forma — não só a remoção. |

**4.7 substitui 4.4 e é mais larga de propósito.** "Não pode se remover" é um caso; a regra é que
nenhuma operação de operador pode ter o próprio ator como alvo. Uma regra sobre o *alvo* é uma
linha de código e um teste; uma lista de ações proibidas cresce a cada ação nova e envelhece mal.

**Sobre 4.5**, o motivo é estrutural e vale repetir: a Fase 5 decidiu que a equipe interna entra
no casamento por um **vínculo real e identificável**, para que toda ação apareça na trilha do
casal. Se o `/plataforma` pudesse remover `membros_casamento` direto, existiria um segundo caminho
administrativo por fora desse modelo — e a accountability que a Fase 5 comprou some. Então:

- **Plataforma:** "quem tem acesso?" → consulta.
- **Dentro do casamento:** "alterar acesso" → operação autorizada e auditada naquele contexto.

---

## 5. A trava do último operador é do banco, não do TypeScript

Uma API que faz `select count(*)` → `count > 1` → `delete` não garante nada: duas requisições
concorrentes leem `2` e as duas apagam, e a plataforma fica sem operador nenhum. O caminho de
volta seria o script com a chave de produção.

O CLAUDE.md já decidiu esta classe de problema na seção 10: *"concorrência em operação de
estoque/limite é **sempre** função Postgres com `SELECT ... FOR UPDATE` numa transação — nunca
check-then-insert na aplicação"*. A trava do último operador é literalmente um limite de estoque
com piso 1.

```sql
create function revogar_operador_plataforma(p_alvo uuid, p_ator uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_restantes int;
begin
  if p_alvo = p_ator then
    raise exception 'Um operador não revoga a si mesmo.' using errcode = '42501';
  end if;

  -- Trava as linhas ANTES de contar: sem isso, duas revogações simultâneas
  -- leem o mesmo total e as duas passam.
  perform 1 from operadores_plataforma for update;

  select count(*) into v_restantes from operadores_plataforma;
  if v_restantes <= 1 then
    raise exception 'A plataforma não pode ficar sem operador.' using errcode = 'P0001';
  end if;

  delete from operadores_plataforma where usuario_id = p_alvo;
end;
$$;
```

A checagem em TypeScript continua existindo — para dar mensagem boa antes de tentar —, mas quem
**garante** é o banco. Mesma divisão da trava do último dono.

---

## 6. A visão transversal: três coisas, não uma

A tela não trata tudo como "acesso", e **a API também não** — transformar suporte em
pseudo-membership para facilitar a listagem seria criar a confusão no modelo de dados para
resolvê-la na tela.

```
Pessoa
  joao@exemplo.com

Acessos efetivos          (membros_casamento, sem vínculo de suporte)
  Evento A — dono
  Evento B — assessoria
  Evento C — colaborador

Suporte                   (membros_casamento com acesso_suporte_expira_em)
  Evento D — válido até 30/09/2026
```

"Assessoria" é o rótulo de tela do papel `planejador`, como já é no painel do casal — o código
continua usando `planejador` (CLAUDE.md §6). E o suporte **vencido** não entra em nenhuma das duas
listas: `is_membro_casamento` já o ignora na leitura, então mostrá-lo como acesso seria a tela
afirmando o contrário do banco.

---

## 7. Invariantes de segurança

Isto é o contrato da fase. Cada linha vira teste antes de a tela existir.

1. **Sempre existe pelo menos um operador ativo** — garantido no banco, não na aplicação.
2. **Um operador não revoga a si próprio.**
3. **Nenhuma operação de operador aceita o próprio ator como alvo** (a regra larga, da qual 2 é
   um caso).
4. **Toda concessão e revogação de operador gera linha em `trilha_auditoria_plataforma`.**
5. **A trilha da plataforma sobrevive à revogação e à exclusão do autor e do alvo** — nenhuma FK
   com `cascade`, e o e-mail do alvo denormalizado.
6. **Membership e suporte são vínculos distintos** na API e na tela, nunca fundidos.
7. **A visão transversal não modifica `membros_casamento`** — nenhuma rota de escrita nasce dela.
8. **O bootstrap continua sendo o script.** A tela exige um operador logado; o primeiro operador
   de um ambiente novo não tem quem o conceda.
9. **Conceder operador é idempotente** — conceder de novo a quem já é operador não duplica linha,
   não dispara segundo convite e não gera segunda linha de trilha.
10. **Nenhuma operação da plataforma usa um casamento como tenant artificial** para caber num
    registro que não é de casamento.

---

## 8. Contratos de API

Todas sob `requirePlatformOperator()`, todas com `service_role` (o caminho Plataforma é
deliberadamente cross-tenant, CLAUDE.md §4.2).

| Rota | O que faz | Invariantes que exerce |
|---|---|---|
| `GET /api/platform/operators` | Lista operadores com e-mail e data de concessão; marca qual é "você". | — |
| `POST /api/platform/operators` | Concede por e-mail. Conta existente vincula; nova recebe convite. Idempotente. | 4, 9 |
| `DELETE /api/platform/operators/[userId]` | Revoga, pela função do banco. | 1, 2, 3, 4, 5 |
| `GET /api/platform/access?email=` | Acessos efetivos e suportes de uma pessoa, em listas separadas. | 6, 7 |

**Matriz de permissões**

| Ação | Operador (outro alvo) | Operador (si mesmo) | Não-operador |
|---|---|---|---|
| Ver lista de operadores | ✅ | ✅ | ❌ 403 |
| Conceder operador | ✅ | ✅ *(idempotente, sem efeito)* | ❌ 403 |
| Revogar operador | ✅ *(salvo se for o último)* | ❌ 403 | ❌ 403 |
| Ver acessos de uma pessoa | ✅ | ✅ | ❌ 403 |
| Alterar acesso de alguém a um casamento | ❌ *(não existe rota)* | ❌ | ❌ |

---

## 9. Fora de escopo, e por quê

- **Cadastro self-service de casal** e **cobrança** — dependem de billing.
- **Carteira da assessoria** (progresso e pendências por evento) — produto novo, não lacuna.
- **Papéis novos** em `membros_casamento` — a escada de três tem par em SQL e varredura de teste;
  nada nesta fase pede.

---

## 10. Ordem de construção

1. **Migration**: `trilha_auditoria_plataforma` + `revogar_operador_plataforma()`.
2. **Testes dos invariantes**, antes das rotas — é o que o §7 existe para permitir.
3. **API**: as quatro rotas do §8.
4. **Tela**: operadores e a consulta transversal em `/plataforma`.
5. **README**: o script passa de "caminho oficial" a "caminho do primeiro operador de um ambiente
   novo". Ele não é aposentado.
