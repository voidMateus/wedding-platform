-- Tabelas de preparação para o modelo SaaS multi-tenant, criadas desde a v1
-- mesmo sem cobrança ativa e sem UI de gestão (CLAUDE.md, seção 33.5). RLS
-- fica habilitada e sem nenhuma policy nesta fase (deny-by-default) — nada
-- na aplicação ainda lê/escreve aqui pelo caminho autenticado; policies
-- reais entram quando estas tabelas forem de fato conectadas a uma feature
-- (Fase 5, CLAUDE.md seção 32).

create table plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  max_guests integer,
  max_gifts integer,
  storage_limit_mb integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table plans is
  'Catálogo de planos (nome, limites). Sem cobrança ativa nem UI de gestão na v1 (CLAUDE.md, seção 33.5). Limite nulo = ilimitado.';

create trigger plans_set_updated_at
  before update on plans
  for each row
  execute function set_updated_at();

alter table plans enable row level security;

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null unique references weddings (id) on delete cascade,
  plan_id uuid not null references plans (id),
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table subscriptions is
  'Vínculo entre wedding e plan — hoje todo wedding fica em um único plano padrão interno, sem billing real (CLAUDE.md, seção 33.5).';

create index subscriptions_plan_id_idx on subscriptions (plan_id);

create trigger subscriptions_set_updated_at
  before update on subscriptions
  for each row
  execute function set_updated_at();

alter table subscriptions enable row level security;

create table usage_counters (
  wedding_id uuid primary key references weddings (id) on delete cascade,
  guest_count integer not null default 0,
  storage_used_mb numeric not null default 0,
  updated_at timestamptz not null default now()
);

comment on table usage_counters is
  'Contadores materializados por wedding_id, para checagem rápida de limite de plano sem count(*) sob demanda (CLAUDE.md, seção 33.5). Ainda não populados por nenhum trigger/job nesta fase.';

create trigger usage_counters_set_updated_at
  before update on usage_counters
  for each row
  execute function set_updated_at();

alter table usage_counters enable row level security;

create table entitlements (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  key text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_id, key)
);

comment on table entitlements is
  'Feature flags por wedding/plano (ex.: domínio customizado) — evita espalhar `if (plan === "pro")` pelo código quando o billing chegar (CLAUDE.md, seção 33.5).';

create index entitlements_wedding_id_idx on entitlements (wedding_id);

create trigger entitlements_set_updated_at
  before update on entitlements
  for each row
  execute function set_updated_at();

alter table entitlements enable row level security;
