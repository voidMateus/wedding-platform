-- Log de eventos unificado do convite (CLAUDE.md, seção 12.1) — alimenta ao
-- mesmo tempo o histórico/auditoria de mudanças de RSVP e a Linha do Tempo
-- visual do convite, evitando manter duas estruturas divergentes para a
-- mesma necessidade (registrar tudo que acontece com um convite).
--
-- event_type é texto livre de propósito: a plataforma nasce cobrindo
-- invite.created, token.generated, token.sent, rsvp.first_access,
-- rsvp.guest_status_changed, rsvp.message_sent, invite.archived, mas a
-- vocabulário pode crescer (QR gerado, site acessado, lista de presentes
-- visualizada...) sem nenhuma migração estrutural nova.

create table invite_events (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  invite_id uuid not null references invites (id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

comment on table invite_events is
  'Log de eventos append-only por convite — histórico/auditoria e Linha do Tempo são duas leituras do mesmo dado. Sem updated_at deliberadamente (log nunca é editado).';
comment on column invite_events.metadata is
  'Específico de cada event_type — ex.: para rsvp.guest_status_changed: guestId, previousStatus, newStatus; para eventos guest-facing: ipAddress, userAgent, source (public_site | admin_panel | api).';

create index invite_events_invite_id_occurred_at_idx on invite_events (invite_id, occurred_at);
create index invite_events_wedding_id_idx on invite_events (wedding_id);

alter table invite_events enable row level security;

-- Somente SELECT e INSERT: um log de eventos nunca é editado ou apagado
-- (mesmo padrão de audit_logs, CLAUDE.md seção 28).
create policy invite_events_select_wedding_members
  on invite_events for select
  using (is_wedding_member(wedding_id));

create policy invite_events_insert_wedding_members
  on invite_events for insert
  with check (is_wedding_member(wedding_id));
