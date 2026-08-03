-- Dados de desenvolvimento local (CLAUDE.md, seção 11; docs/ARCHITECTURE.md,
-- seção 4.7). Roda depois das migrations via `supabase db reset`.
--
-- wedding_members não é semeada aqui: precisa de uma linha real em
-- auth.users, que só existe depois de criar um usuário local (Studio ou
-- `supabase auth admin`). Depois de criar um, associe-o manualmente:
--
--   insert into wedding_members (wedding_id, user_id, role)
--   values ('11111111-1111-1111-1111-111111111111', '<id do auth.users>', 'owner');

insert into weddings (id, slug, couple_names, event_date, rsvp_deadline, theme_config)
values (
  '11111111-1111-1111-1111-111111111111',
  'ana-e-joao',
  'Ana & João',
  '2026-12-12',
  '2026-11-01T00:00:00Z',
  '{"primaryColor": "#6b4a35"}'::jsonb
);

insert into event_segments (wedding_id, title, venue_name, venue_address, starts_at, ends_at, display_order)
values
  ('11111111-1111-1111-1111-111111111111', 'Cerimônia', 'Igreja São José', 'Rua das Flores, 100', '2026-12-12T16:00:00Z', '2026-12-12T17:00:00Z', 1),
  ('11111111-1111-1111-1111-111111111111', 'Recepção', 'Espaço Jardim', 'Av. Central, 500', '2026-12-12T19:00:00Z', '2026-12-13T02:00:00Z', 2);

-- Convite: quem recebeu o mesmo convite (CLAUDE.md, seção 12.1).
insert into invites (id, wedding_id, name, internal_code, notes)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Família Silva',
  'CONV-SEED0001',
  'Sentar próximo à mesa dos padrinhos'
);

-- Maria e Pedro são Acompanhantes um do outro (guest_parties) e pertencem
-- ao mesmo convite acima.
insert into guest_parties (id, wedding_id)
values ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111');

insert into guests (id, wedding_id, invite_id, party_id, party_order, full_name, email, phone, dietary_restrictions)
values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 0, 'Maria Silva', 'maria@example.com', '+55 11 90000-0001', null),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 1, 'Pedro Silva', 'pedro@example.com', '+55 11 90000-0002', 'vegetariano');

update invites set responsible_guest_id = '33333333-3333-3333-3333-333333333333'
where id = '22222222-2222-2222-2222-222222222222';

-- Token de acesso do convite Família Silva para testes locais de RSVP.
-- Código em texto plano só existe aqui, no seed — nunca em produção
-- (CLAUDE.md, seção 14.5). Código: DEV-LOCAL-SEED-TOKEN-0001
insert into guest_access_tokens (wedding_id, invite_id, code_hash)
values (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  encode(digest('DEV-LOCAL-SEED-TOKEN-0001', 'sha256'), 'hex')
);

insert into gift_categories (id, wedding_id, name, display_order)
values ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Cozinha', 1);

insert into gifts (wedding_id, category_id, title, description, price_cents, quantity_available, is_group_gift)
values (
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555555',
  'Jogo de panelas',
  'Jogo de panelas antiaderentes, 5 peças',
  89900,
  2,
  false
);

insert into gifts (wedding_id, title, description, is_group_gift, target_amount_cents)
values (
  '11111111-1111-1111-1111-111111111111',
  'Lua de mel',
  'Cota para a viagem de lua de mel',
  true,
  500000
);
