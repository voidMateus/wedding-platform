-- Tabela central do pagamento Pix real de presentes via InfinitePay
-- (CLAUDE.md, seção 18/28) — uma linha por tentativa de checkout. Nenhum
-- efeito de negócio (reserva/contribuição) nasce diretamente de uma
-- requisição do convidado: só confirm_gift_payment() (próxima migration)
-- populates gift_reservations/gift_contributions, e só depois de uma
-- reverificação servidor-a-servidor (payment_check) — nunca a partir do
-- corpo do webhook sozinho, que a InfinitePay não assina.

create table gift_payments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  gift_id uuid not null references gifts (id) on delete cascade,
  invite_id uuid not null references invites (id) on delete cascade,
  kind text not null check (kind in ('reservation', 'contribution')),
  quota_count integer check (quota_count is null or quota_count > 0),
  amount_cents integer not null check (amount_cents > 0),
  guest_message text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed', 'expired')),
  failure_reason text,
  provider_order_nsu text not null unique,
  provider_checkout_url text,
  provider_transaction_nsu text unique,
  last_provider_response jsonb,
  confirmed_at timestamptz,
  resulting_reservation_id uuid references gift_reservations (id) on delete set null,
  resulting_contribution_id uuid references gift_contributions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gift_payments_quota_only_contribution check (quota_count is null or kind = 'contribution'),
  constraint gift_payments_result_matches_kind check (
    (kind = 'reservation' and resulting_contribution_id is null)
    or (kind = 'contribution' and resulting_reservation_id is null)
  ),
  constraint gift_payments_confirmed_has_result check (
    status <> 'confirmed'
    or resulting_reservation_id is not null
    or resulting_contribution_id is not null
  )
);

comment on table gift_payments is
  'Tentativas de checkout Pix (InfinitePay) para presentear/contribuir. status só vira ''confirmed'' dentro de confirm_gift_payment(), depois de payment_check confirmar o pagamento servidor-a-servidor — nunca a partir do corpo do webhook isolado (CLAUDE.md, seção 28).';
comment on column gift_payments.provider_order_nsu is
  'Identificador que nós geramos (= id::text) e enviamos como order_nsu no link de checkout — usado para localizar esta linha a partir do webhook/payment_check, nunca para decidir se está pago.';
comment on column gift_payments.last_provider_response is
  'Última resposta bruta recebida da InfinitePay (webhook ou payment_check), só para depuração — não é fonte de verdade de status.';
comment on column gift_payments.failure_reason is
  'Preenchido quando status=''failed'' — ex.: pagamento confirmado mas reserve_gift() falhou por concorrência com o caminho gratuito (última unidade levada nesse meio-tempo). Exige resolução manual do casal.';

create index gift_payments_wedding_id_idx on gift_payments (wedding_id);
create index gift_payments_gift_id_idx on gift_payments (gift_id);
create index gift_payments_invite_id_idx on gift_payments (invite_id);

create trigger gift_payments_set_updated_at
  before update on gift_payments
  for each row
  execute function set_updated_at();

-- Garante wedding_id consistente com gifts.wedding_id e kind consistente com
-- gifts.is_group_gift (mesmo padrão de gift_reservations_check_wedding_id).
create function gift_payments_check_gift_consistency()
returns trigger
language plpgsql
as $$
declare
  v_gift gifts%rowtype;
begin
  select * into v_gift from gifts where id = new.gift_id;

  if not found then
    raise exception 'gifts % não encontrado', new.gift_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_gift.wedding_id <> new.wedding_id then
    raise exception 'gift_payments.wedding_id (%) não bate com gifts.wedding_id (%)',
      new.wedding_id, v_gift.wedding_id
      using errcode = 'check_violation';
  end if;

  if new.kind = 'reservation' and v_gift.is_group_gift then
    raise exception 'gift_payments.kind=reservation exige gifts.is_group_gift=false'
      using errcode = 'check_violation';
  end if;

  if new.kind = 'contribution' and not v_gift.is_group_gift then
    raise exception 'gift_payments.kind=contribution exige gifts.is_group_gift=true'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger gift_payments_check_gift_consistency_trigger
  before insert or update of wedding_id, gift_id, kind on gift_payments
  for each row
  execute function gift_payments_check_gift_consistency();

alter table gift_payments enable row level security;

-- Só leitura para membros do casamento — sem policy de insert/update/delete
-- para ninguém, nem o owner (CLAUDE.md, seção 28): a única forma de mutar
-- esta tabela é a lógica verificada em confirm_gift_payment(), executada
-- pelo service_role (que ignora RLS por design no caminho do convidado,
-- CLAUDE.md seção 4.5). Isso é deliberado, não uma lacuna.
create policy gift_payments_select_wedding_members
  on gift_payments for select
  using (is_wedding_member(wedding_id));
