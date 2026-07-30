-- Itens da lista de presentes, incluindo presentes de cota (CLAUDE.md,
-- seções 11-12, 18).

create table gifts (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  category_id uuid references gift_categories (id) on delete set null,
  title text not null,
  description text,
  price_cents integer check (price_cents >= 0),
  image_url text,
  quantity_available integer,
  is_group_gift boolean not null default false,
  target_amount_cents integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gifts_mode_fields check (
    (
      is_group_gift = true
      and target_amount_cents is not null
      and target_amount_cents > 0
      and quantity_available is null
    )
    or (
      is_group_gift = false
      and target_amount_cents is null
      and quantity_available is not null
      and quantity_available >= 0
    )
  )
);

comment on table gifts is
  'Itens da lista de presentes. is_group_gift=false usa gift_reservations (reserva exclusiva); is_group_gift=true usa gift_contributions (soma até target_amount_cents) — nunca as duas ao mesmo tempo (CLAUDE.md, seção 12.2).';
comment on column gifts.quantity_available is
  'Só se aplica a presentes simples (is_group_gift=false); decrementado atomicamente por reserve_gift().';
comment on column gifts.target_amount_cents is
  'Só se aplica a presentes de cota (is_group_gift=true) — valor-alvo somado por gift_contributions.amount_cents.';

create index gifts_wedding_id_idx on gifts (wedding_id);
create index gifts_category_id_idx on gifts (category_id);

create trigger gifts_set_updated_at
  before update on gifts
  for each row
  execute function set_updated_at();

-- Garante gifts.wedding_id consistente com a categoria referenciada, quando houver.
create function gifts_check_category_wedding_id()
returns trigger
language plpgsql
as $$
declare
  v_category_wedding_id uuid;
begin
  if new.category_id is null then
    return new;
  end if;

  select wedding_id into v_category_wedding_id
  from gift_categories
  where id = new.category_id;

  if v_category_wedding_id is null then
    raise exception 'gift_categories % não encontrada', new.category_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_category_wedding_id <> new.wedding_id then
    raise exception 'gifts.wedding_id (%) não bate com gift_categories.wedding_id (%)',
      new.wedding_id, v_category_wedding_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger gifts_check_category_wedding_id_trigger
  before insert or update of wedding_id, category_id on gifts
  for each row
  execute function gifts_check_category_wedding_id();

alter table gifts enable row level security;

create policy gifts_select_wedding_members
  on gifts for select
  using (is_wedding_member(wedding_id));

create policy gifts_insert_wedding_members
  on gifts for insert
  with check (is_wedding_member(wedding_id));

create policy gifts_update_wedding_members
  on gifts for update
  using (is_wedding_member(wedding_id))
  with check (is_wedding_member(wedding_id));

create policy gifts_delete_wedding_members
  on gifts for delete
  using (is_wedding_member(wedding_id));
