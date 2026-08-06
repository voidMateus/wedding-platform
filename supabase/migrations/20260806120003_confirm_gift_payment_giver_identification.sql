-- confirm_gift_payment() passa a repassar giver_name/giver_phone (coletados
-- no checkout, CLAUDE.md seção 18) para gift_reservations/gift_contributions
-- — mesma lógica da migration anterior (reserve_gift ganhou p_giver_phone),
-- só ajustando quem chama.

create or replace function confirm_gift_payment(p_payment_id uuid)
returns gift_payments
language plpgsql
as $$
declare
  v_payment gift_payments%rowtype;
  v_reservation gift_reservations%rowtype;
  v_contribution_id uuid;
begin
  select * into v_payment from gift_payments where id = p_payment_id for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  if v_payment.status = 'confirmed' then
    return v_payment;
  end if;

  if v_payment.status <> 'pending' then
    raise exception 'PAYMENT_NOT_PENDING' using errcode = 'check_violation';
  end if;

  if v_payment.kind = 'reservation' then
    begin
      select * into v_reservation from reserve_gift(
        v_payment.gift_id,
        null,
        v_payment.invite_id,
        v_payment.giver_name,
        v_payment.guest_message,
        v_payment.giver_phone
      );
    exception when others then
      update gift_payments
      set status = 'failed', failure_reason = sqlerrm
      where id = p_payment_id
      returning * into v_payment;
      return v_payment;
    end;

    update gift_payments
    set status = 'confirmed', confirmed_at = now(), resulting_reservation_id = v_reservation.id
    where id = p_payment_id
    returning * into v_payment;

    return v_payment;
  end if;

  insert into gift_contributions (wedding_id, gift_id, guest_id, group_id, amount_cents, message, quota_count, contributor_name, giver_phone)
  values (v_payment.wedding_id, v_payment.gift_id, null, v_payment.invite_id, v_payment.amount_cents, v_payment.guest_message, v_payment.quota_count, v_payment.giver_name, v_payment.giver_phone)
  returning id into v_contribution_id;

  update gift_payments
  set status = 'confirmed', confirmed_at = now(), resulting_contribution_id = v_contribution_id
  where id = p_payment_id
  returning * into v_payment;

  return v_payment;
end;
$$;
