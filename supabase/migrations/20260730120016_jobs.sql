-- Fila de processamento assíncrono (importação de CSV, envio de e-mail em
-- lote) — CLAUDE.md, seções 3, 11.1, 27; docs/ARCHITECTURE.md, seção 3.4.

create table jobs (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references weddings (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0,
  last_error text,
  run_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table jobs is
  'Fila baseada em tabela, consumida pelo worker (docs/ARCHITECTURE.md, seção 3.4). wedding_id é nullable porque jobs futuros de plataforma (Fase 5) podem não pertencer a um wedding específico.';
comment on column jobs.payload is
  'Formato específico por jobs.type — validado pelo handler correspondente em server/utils/jobs/handlers/, não pelo banco.';

create index jobs_status_run_at_idx on jobs (status, run_at);
create index jobs_wedding_id_idx on jobs (wedding_id);

create trigger jobs_set_updated_at
  before update on jobs
  for each row
  execute function set_updated_at();

alter table jobs enable row level security;

-- Enfileirar (INSERT) e acompanhar progresso (SELECT) são ações do caminho
-- administrativo; transições de status são exclusivas do worker, que roda
-- com service_role e portanto ignora RLS — por isso não há policy de
-- UPDATE/DELETE aqui (docs/ARCHITECTURE.md, seção 3.4).
create policy jobs_select_wedding_members
  on jobs for select
  using (wedding_id is not null and is_wedding_member(wedding_id));

create policy jobs_insert_wedding_members
  on jobs for insert
  with check (wedding_id is not null and is_wedding_member(wedding_id));
