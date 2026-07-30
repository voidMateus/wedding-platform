-- Um casamento/evento — unidade central de particionamento (CLAUDE.md, seções 11-12).
-- RLS é habilitada aqui mas as policies só entram na migration de wedding_members,
-- porque toda policy de weddings depende da existência dessa tabela (ver
-- docs/ARCHITECTURE.md, seção 4.3: nasce com RLS habilitada e nenhuma policy).

create table weddings (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  couple_names text not null,
  event_date date not null,
  rsvp_mode text not null default 'per_group' check (rsvp_mode in ('per_group', 'per_guest')),
  rsvp_deadline timestamptz,
  theme_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weddings_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

comment on table weddings is
  'Um casamento/evento. Unidade central de particionamento lógico (wedding_id) em todo o schema.';
comment on column weddings.rsvp_mode is
  'Comportamento de negócio (per_group | per_guest) — deliberadamente separado de theme_config, que é só visual (CLAUDE.md, seção 16.2/22.3).';
comment on column weddings.theme_config is
  'Exclusivamente atributos visuais (cor primária, fonte, foto de capa) — nunca comportamento de negócio (CLAUDE.md, seção 22.3).';

create trigger weddings_set_updated_at
  before update on weddings
  for each row
  execute function set_updated_at();

alter table weddings enable row level security;
