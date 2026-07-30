-- Trilha de auditoria de ações administrativas sensíveis (CLAUDE.md, seções
-- 11-12, 19.3, 28).

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  actor_id uuid references wedding_members (id) on delete set null,
  actor_type text not null check (actor_type in ('member', 'system')),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_actor_consistency check (
    (actor_type = 'system' and actor_id is null)
    or (actor_type = 'member' and actor_id is not null)
  )
);

comment on table audit_logs is
  'Trilha de auditoria imutável — sem updated_at deliberadamente (log é append-only) e sem policy de UPDATE/DELETE (CLAUDE.md, seção 28).';
comment on column audit_logs.actor_id is
  'Nulo em ações automatizadas do sistema (actor_type=system) — jobs e lembretes nunca "fingem" ser um membro (CLAUDE.md, seção 28).';

create index audit_logs_wedding_id_idx on audit_logs (wedding_id, created_at desc);

alter table audit_logs enable row level security;

-- Somente SELECT e INSERT: um log de auditoria nunca é editado ou apagado.
create policy audit_logs_select_wedding_members
  on audit_logs for select
  using (is_wedding_member(wedding_id));

create policy audit_logs_insert_wedding_members
  on audit_logs for insert
  with check (is_wedding_member(wedding_id));
