-- Usuários com acesso administrativo a um casamento (CLAUDE.md, seções 11-12, 14.4).
-- Esta migration também adiciona as RLS policies de `weddings`, porque elas
-- dependem de wedding_members existir (ver comentário na migration anterior).

create table wedding_members (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'collaborator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_id, user_id)
);

comment on table wedding_members is
  'Usuários com acesso administrativo a um casamento (casal, colaboradores). RBAC simplificado (CLAUDE.md, seção 14.4).';
comment on column wedding_members.role is
  'owner: acesso total ao wedding, único papel que pode gerenciar colaboradores e excluir o evento (CLAUDE.md, seção 19.3). collaborator: demais membros administrativos.';

create index wedding_members_wedding_id_idx on wedding_members (wedding_id);
create index wedding_members_user_id_idx on wedding_members (user_id);

create trigger wedding_members_set_updated_at
  before update on wedding_members
  for each row
  execute function set_updated_at();

alter table wedding_members enable row level security;

-- Funções auxiliares reutilizadas pelas policies de todas as tabelas
-- filhas de weddings. SECURITY DEFINER: leem wedding_members ignorando a
-- própria RLS da tabela, evitando o problema clássico de policy que
-- referencia a própria tabela para checar associação de tenant — o
-- resultado exposto ao chamador é só um booleano, nunca dados crus.
create function is_wedding_member(p_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from wedding_members
    where wedding_id = p_wedding_id
      and user_id = auth.uid()
  );
$$;

create function is_wedding_owner(p_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from wedding_members
    where wedding_id = p_wedding_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

comment on function is_wedding_member(uuid) is
  'Predicado reutilizado pelas RLS policies do caminho administrativo (CLAUDE.md, seção 4.5): true se auth.uid() pertence ao wedding.';
comment on function is_wedding_owner(uuid) is
  'Predicado reutilizado pelas RLS policies do caminho administrativo: true se auth.uid() é owner do wedding (CLAUDE.md, seção 19.3).';

-- Policies de wedding_members
create policy wedding_members_select_own_wedding
  on wedding_members for select
  using (is_wedding_member(wedding_id));

create policy wedding_members_insert_owner_only
  on wedding_members for insert
  with check (is_wedding_owner(wedding_id));

create policy wedding_members_update_owner_only
  on wedding_members for update
  using (is_wedding_owner(wedding_id))
  with check (is_wedding_owner(wedding_id));

create policy wedding_members_delete_owner_only
  on wedding_members for delete
  using (is_wedding_owner(wedding_id));

-- Policies de weddings (criadas aqui porque dependem das funções acima)
create policy weddings_select_own_wedding
  on weddings for select
  using (is_wedding_member(id));

-- Sem policy de insert: criação de wedding é manual/via seed (service_role)
-- nesta fase — self-service nasce só na Fase 5 (CLAUDE.md, seção 33.2).
create policy weddings_update_own_wedding
  on weddings for update
  using (is_wedding_member(id))
  with check (is_wedding_member(id));

create policy weddings_delete_owner_only
  on weddings for delete
  using (is_wedding_owner(id));
