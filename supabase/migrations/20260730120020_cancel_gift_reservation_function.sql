-- Cancelamento de reserva, devolvendo a unidade ao estoque atomicamente
-- (CLAUDE.md, seção 18.3).

create function cancel_gift_reservation(
  p_reservation_id uuid,
  p_guest_id uuid default null,
  p_group_id uuid default null,
  p_skip_ownership_check boolean default false
)
returns void
language plpgsql
as $$
declare
  v_reservation gift_reservations%rowtype;
begin
  select * into v_reservation from gift_reservations where id = p_reservation_id;

  if not found then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  -- Caminho do convidado: a posse só pode ser provada pelo guest_id/group_id
  -- resolvido do próprio token (CLAUDE.md, seção 4.5) — nunca confiar
  -- apenas no reservation_id. Caminho administrativo: p_skip_ownership_check
  -- é usado explicitamente pelo server/api após validar via RLS/wedding_id
  -- que o membro tem acesso ao wedding do presente.
  if not p_skip_ownership_check then
    if v_reservation.guest_id is distinct from p_guest_id
      or v_reservation.group_id is distinct from p_group_id then
      raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
    end if;
  end if;

  perform 1 from gifts where id = v_reservation.gift_id for update;

  update gifts set quantity_available = quantity_available + 1 where id = v_reservation.gift_id;

  delete from gift_reservations where id = p_reservation_id;
end;
$$;

comment on function cancel_gift_reservation(uuid, uuid, uuid, boolean) is
  'Cancela uma reserva e devolve a unidade a quantity_available na mesma transação. Toda remoção de gift_reservations deve passar por aqui — nunca um DELETE direto, sob risco de descasar o estoque (CLAUDE.md, seção 18.3).';
