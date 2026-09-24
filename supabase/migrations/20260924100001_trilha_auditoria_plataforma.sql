-- Fase 6 do Hub: contas e acessos (docs/fase6-contas-e-acessos.md).
--
-- POR QUE UMA TRILHA NOVA, E NÃO UMA LINHA EM trilha_auditoria.
--
-- `trilha_auditoria.casamento_id` é `not null`, e isso não é conveniência: é o
-- que separa a trilha de um tenant da de outro, o que sustenta a policy pela
-- qual o casal lê a própria trilha, e o que a Fase 5 usou para tornar a visita
-- de suporte verificável por quem a recebe. `recordPlatformAuditLog()` diz
-- isso no comentário dele -- "a ação do operador acontece sempre SOBRE um
-- casamento" --, e para as ações que ele registra continua verdade.
--
-- Conceder ou revogar um OPERADOR não é evento de casamento nenhum. Não há
-- `casamento_id` plausível, e inventar um faria a trilha de um casal conter
-- uma ação que não tem nada a ver com ele. Tornar a coluna anulável afrouxaria
-- a garantia em todas as linhas para acomodar um punhado que não é de tenant
-- nenhum; não auditar é impensável numa concessão de privilégio entre tenants
-- (CLAUDE.md seção 11).
--
-- Há precedente no próprio schema: `exclusoes_de_casamento` existe porque
-- excluir um casamento apaga a trilha dele por cascade, então o registro
-- precisou de casa fora do tenant -- e ela DENORMALIZA o que identifica o alvo
-- (nomes_noivos, slug, data_evento) em vez de guardar só FKs, porque um
-- registro que só aponta vira ilegível quando o apontado some.

create table trilha_auditoria_plataforma (
  id uuid primary key default gen_random_uuid(),

  -- Vocabulário fechado, validado no CHECK como o resto do projeto faz
  -- (union de string literal do lado do TypeScript, CLAUDE.md seção 8).
  tipo_acao text not null check (tipo_acao in ('operador.concedido', 'operador.revogado')),

  -- `on delete set null`: a trilha é append-only e sobrevive à saída de quem
  -- agiu -- mesma decisão, e mesmo motivo, de trilha_auditoria.autor_operador_id.
  autor_operador_id uuid references operadores_plataforma (usuario_id) on delete set null,

  -- APONTA PARA auth.users, NUNCA PARA operadores_plataforma. Se apontasse,
  -- revogar um operador apagaria a linha dele e o `on delete set null`
  -- esvaziaria justamente o campo que diz QUEM foi revogado: o registro da
  -- revogação destruído pela revogação que ele registra.
  alvo_usuario_id uuid references auth.users (id) on delete set null,

  -- Denormalizado de propósito, mesma escola de exclusoes_de_casamento: as duas
  -- FKs acima podem virar nulas, e sem isto a linha perde o sujeito.
  --
  -- Não conflita com a regra de "dado pessoal nunca em texto pleno" (CLAUDE.md
  -- seção 11): aquela protege o CONVIDADO, cujo dado o casal custodia e que
  -- nunca consentiu com nada. Aqui o sujeito é a equipe interna, o registro é a
  -- prova de um privilégio que ela mesma recebeu, e a leitura é restrita a
  -- operadores.
  alvo_email text not null,

  metadados jsonb not null default '{}',
  created_at timestamptz not null default now()
);

comment on table trilha_auditoria_plataforma is
  'Trilha append-only das ações administrativas da PLATAFORMA -- as que não pertencem a casamento nenhum (docs/fase6-contas-e-acessos.md seção 3). Nunca confundir com trilha_auditoria, que é por tenant: o que um operador faz DENTRO de um casamento continua lá, para o casal ler no próprio painel.';

create index trilha_auditoria_plataforma_created_at_idx
  on trilha_auditoria_plataforma (created_at desc);

alter table trilha_auditoria_plataforma enable row level security;

-- Leitura só para operador. A subconsulta passa pela RLS de
-- operadores_plataforma, cuja policy permite ao usuário ver a PRÓPRIA linha --
-- então "sou operador?" se responde sem security definer e sem recursão.
create policy trilha_auditoria_plataforma_select_operador on trilha_auditoria_plataforma
  for select
  using (exists (select 1 from operadores_plataforma where usuario_id = auth.uid()));

-- Sem policy de insert/update/delete: deny-by-default, como operadores_plataforma
-- e casamentos. Escrita só por service_role, dentro de rota que já passou por
-- requirePlatformOperator().

-- =========================================================================
-- Conceder e revogar: a regra mora no BANCO, não na aplicação
-- =========================================================================
--
-- Duas razões, as duas já decididas em outro lugar do projeto:
--
-- 1. CONCORRÊNCIA. "Sempre existe pelo menos um operador" é um limite de
--    estoque com piso 1, e a seção 10 do CLAUDE.md é explícita: concorrência em
--    operação de estoque/limite é SEMPRE função Postgres com `for update` numa
--    transação, nunca check-then-write na aplicação. Duas revogações
--    simultâneas leem `2` e as duas passam; a plataforma fica sem operador e o
--    caminho de volta é o script com a chave de produção.
--
-- 2. ATOMICIDADE DA TRILHA. O registro nasce DENTRO da transação, nunca numa
--    chamada depois do commit -- mesma decisão de `criar_casamento_com_dono`.
--    Assim "toda concessão e revogação gera trilha" é verdade por construção, e
--    não um passo que pode falhar sozinho.

create function conceder_operador_plataforma(
  p_alvo uuid,
  p_ator uuid,
  p_alvo_email text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserido boolean;
begin
  if p_ator is null or not exists (select 1 from operadores_plataforma where usuario_id = p_ator) then
    raise exception 'Somente um operador concede acesso de operador.' using errcode = '42501';
  end if;

  insert into operadores_plataforma (usuario_id)
  values (p_alvo)
  on conflict (usuario_id) do nothing;

  -- IDEMPOTENTE: conceder de novo a quem já é operador não duplica a linha
  -- (o `on conflict` cuida) e também não gera segunda linha de trilha -- um
  -- registro de concessão que não concedeu nada é ruído na auditoria.
  v_inserido := found;

  if v_inserido then
    insert into trilha_auditoria_plataforma (tipo_acao, autor_operador_id, alvo_usuario_id, alvo_email)
    values ('operador.concedido', p_ator, p_alvo, p_alvo_email);
  end if;

  return v_inserido;
end;
$$;

comment on function conceder_operador_plataforma(uuid, uuid, text) is
  'Concede acesso de operador e registra na trilha da plataforma, atomicamente. Idempotente: devolve false quando o alvo já era operador, e nesse caso não escreve trilha.';

create function revogar_operador_plataforma(
  p_alvo uuid,
  p_ator uuid,
  p_alvo_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
begin
  if p_ator is null or not exists (select 1 from operadores_plataforma where usuario_id = p_ator) then
    raise exception 'Somente um operador revoga acesso de operador.' using errcode = '42501';
  end if;

  -- Autoalteração proibida, e a regra é sobre o ALVO, não sobre a ação: uma
  -- lista de operações proibidas cresce a cada operação nova e envelhece mal.
  if p_alvo = p_ator then
    raise exception 'Um operador não altera o próprio acesso.' using errcode = '42501';
  end if;

  -- Trava ANTES de contar. Sem isto, duas revogações simultâneas leem o mesmo
  -- total e as duas passam.
  perform 1 from operadores_plataforma for update;

  -- Antes da contagem, de propósito: com um operador só e um alvo que não é
  -- operador, checar o total primeiro faria a função acusar "a plataforma não
  -- pode ficar sem operador" para uma revogação que não removeria ninguém.
  if not exists (select 1 from operadores_plataforma where usuario_id = p_alvo) then
    raise exception 'Este usuário não é operador.' using errcode = 'P0002';
  end if;

  -- ESTA TRAVA SÓ É ALCANÇÁVEL POR CORRIDA, e é para isso que ela existe.
  --
  -- Sequencialmente ela é inalcançável, e vale entender por quê: o ator
  -- precisa ser operador, o alvo precisa ser operador, e os dois precisam ser
  -- pessoas diferentes — logo há pelo menos dois operadores quando a contagem
  -- roda, e `<= 1` nunca dá verdadeiro. A garantia de "sempre sobra alguém",
  -- no caminho normal, vem da proibição de autoalteração logo acima, não daqui.
  --
  -- Em CONCORRÊNCIA é outra história: A revoga B e B revoga A ao mesmo tempo,
  -- as duas transações passam por todas as checagens (as duas são verdadeiras
  -- quando cada uma as faz) e a plataforma fica sem operador nenhum — com o
  -- caminho de volta sendo o script com a chave de produção. O `for update`
  -- acima serializa as duas, e é esta contagem que faz a segunda recuar.
  select count(*) into v_total from operadores_plataforma;
  if v_total <= 1 then
    raise exception 'A plataforma não pode ficar sem operador.' using errcode = 'P0001';
  end if;

  delete from operadores_plataforma where usuario_id = p_alvo;

  insert into trilha_auditoria_plataforma (tipo_acao, autor_operador_id, alvo_usuario_id, alvo_email)
  values ('operador.revogado', p_ator, p_alvo, p_alvo_email);
end;
$$;

comment on function revogar_operador_plataforma(uuid, uuid, text) is
  'Revoga acesso de operador e registra na trilha da plataforma, atomicamente. Recusa revogar o último operador (trava transacional, CLAUDE.md seção 10) e recusa que o ator seja o próprio alvo.';

-- =========================================================================
-- Só o service_role chama estas duas funções
-- =========================================================================
--
-- As duas são `security definer` e recebem o ATOR por parâmetro, porque quem o
-- autentica é `requirePlatformOperator()` em TypeScript -- sob service_role o
-- `auth.uid()` é nulo e não serviria.
--
-- Isso abre um buraco que precisa ser fechado aqui: no Supabase, função nova
-- nasce executável por `public`, então um usuário autenticado qualquer poderia
-- chamá-las por RPC passando como `p_ator` o id de um operador de verdade --
-- que a checagem interna aceitaria -- e se conceder acesso de operador. A
-- validação de `p_ator` prova que o id EXISTE, nunca que quem chamou é ele.
--
-- O portão real é o mesmo do resto do caminho Plataforma (CLAUDE.md seção 4.2):
-- service_role mais checagem explícita em TypeScript. Tirar o EXECUTE de todo
-- mundo é o que torna isso verdade no banco também.
revoke execute on function conceder_operador_plataforma(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function revogar_operador_plataforma(uuid, uuid, text) from public, anon, authenticated;
