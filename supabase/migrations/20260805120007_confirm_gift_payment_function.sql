-- Única porta de entrada para efetivar uma reserva/contribuição paga
-- (CLAUDE.md, seção 18/28) — chamada tanto pelo webhook quanto pelo "pull"
-- da página de retorno do convidado, sempre depois de confirmar o pagamento
-- via payment_check (isso acontece em server/utils/gift-payment.ts, nunca
-- aqui: esta função assume que o chamador já confirmou o pagamento e só
-- cuida de efetivar o efeito de negócio de forma atômica e idempotente).
--
-- Importante: uma falha de domínio esperada (ex.: GIFT_UNAVAILABLE, a
-- última unidade foi levada pelo caminho gratuito nesse meio-tempo) NUNCA
-- propaga como exceção não tratada — se propagasse, a atualização de
-- status='failed' feita dentro do bloco de exceção seria revertida junto
-- com o resto da transação da chamada RPC. Por isso o resultado é sempre
-- devolvido como uma linha de gift_payments (status confirmed ou failed),
-- nunca um erro, para esse caso específico.

create function confirm_gift_payment(p_payment_id uuid)
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

  -- Idempotência: webhook duplicado, ou corrida entre webhook e o "pull" do
  -- convidado, é inofensiva — não há nova chamada externa nem novo efeito.
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
        null,
        v_payment.guest_message
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

  -- kind = 'contribution': sem exclusão mútua a proteger (contribuições só
  -- somam, CLAUDE.md seção 18.3) — insert direto, sem bloco de exceção
  -- dedicado, já que não há uma falha de domínio esperada aqui.
  insert into gift_contributions (wedding_id, gift_id, guest_id, group_id, amount_cents, message, quota_count)
  values (v_payment.wedding_id, v_payment.gift_id, null, v_payment.invite_id, v_payment.amount_cents, v_payment.guest_message, v_payment.quota_count)
  returning id into v_contribution_id;

  update gift_payments
  set status = 'confirmed', confirmed_at = now(), resulting_contribution_id = v_contribution_id
  where id = p_payment_id
  returning * into v_payment;

  return v_payment;
end;
$$;

comment on function confirm_gift_payment(uuid) is
  'Efetiva a reserva/contribuição de um gift_payments já confirmado como pago (reverificação via payment_check acontece antes, em código de aplicação). Idempotente; falha de domínio (GIFT_UNAVAILABLE) vira status=failed em vez de exceção, para não ser revertida pelo rollback da própria chamada.';
