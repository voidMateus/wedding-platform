-- Contribuição parcial em dinheiro para um presente de cota (CLAUDE.md,
-- seções 11-12, 18).

create table gift_contributions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  gift_id uuid not null references gifts (id) on delete cascade,
  guest_id uuid references guests (id) on delete cascade,
  group_id uuid references guest_groups (id) on delete cascade,
  contributor_name text,
  amount_cents integer not null check (amount_cents > 0),
  contributed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gift_contributions_guest_or_group_exclusive check (num_nonnulls(guest_id, group_id) <= 1),
  constraint gift_contributions_identified check (num_nonnulls(guest_id, group_id, contributor_name) >= 1)
);

comment on table gift_contributions is
  'Contribuição parcial para um presente de cota (gifts.is_group_gift=true). O valor arrecadado é sempre SUM(amount_cents) lido no momento da renderização, nunca um contador mantido à parte (CLAUDE.md, seção 18.3).';

create index gift_contributions_wedding_id_idx on gift_contributions (wedding_id);
create index gift_contributions_gift_id_idx on gift_contributions (gift_id);

create trigger gift_contributions_set_updated_at
  before update on gift_contributions
  for each row
  execute function set_updated_at();

-- Garante gift_contributions.wedding_id consistente com gifts.wedding_id.
create function gift_contributions_check_wedding_id()
returns trigger
language plpgsql
as $$
declare
  v_gift_wedding_id uuid;
begin
  select wedding_id into v_gift_wedding_id from gifts where id = new.gift_id;

  if v_gift_wedding_id is null then
    raise exception 'gifts % não encontrado', new.gift_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_gift_wedding_id <> new.wedding_id then
    raise exception 'gift_contributions.wedding_id (%) não bate com gifts.wedding_id (%)',
      new.wedding_id, v_gift_wedding_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger gift_contributions_check_wedding_id_trigger
  before insert or update of wedding_id, gift_id on gift_contributions
  for each row
  execute function gift_contributions_check_wedding_id();

alter table gift_contributions enable row level security;

create policy gift_contributions_select_wedding_members
  on gift_contributions for select
  using (is_wedding_member(wedding_id));

create policy gift_contributions_insert_wedding_members
  on gift_contributions for insert
  with check (is_wedding_member(wedding_id));

create policy gift_contributions_update_wedding_members
  on gift_contributions for update
  using (is_wedding_member(wedding_id))
  with check (is_wedding_member(wedding_id));

create policy gift_contributions_delete_wedding_members
  on gift_contributions for delete
  using (is_wedding_member(wedding_id));
