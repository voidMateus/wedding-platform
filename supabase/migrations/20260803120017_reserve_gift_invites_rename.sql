-- reserve_gift() tinha uma referência literal a guest_groups no corpo
-- plpgsql (não é resolvida automaticamente pelo rename de tabela — só
-- identificadores usados fora de corpos de função seguem por OID). Sem esta
-- correção, reservar um presente por group_id passaria a falhar em runtime
-- com "relation guest_groups does not exist" a partir desta fase.

create or replace function reserve_gift(
  p_gift_id uuid,
  p_guest_id uuid default null,
  p_group_id uuid default null,
  p_contributor_name text default null
)
returns gift_reservations
language plpgsql
as $$
declare
  v_gift gifts%rowtype;
  v_reservation gift_reservations%rowtype;
  v_guest_wedding_id uuid;
  v_group_wedding_id uuid;
begin
  if num_nonnulls(p_guest_id, p_group_id) > 1 then
    raise exception 'reserve_gift: informe apenas guest_id OU group_id, nunca os dois'
      using errcode = 'check_violation';
  end if;

  if num_nonnulls(p_guest_id, p_group_id, p_contributor_name) = 0 then
    raise exception 'reserve_gift: é preciso identificar guest_id, group_id ou contributor_name'
      using errcode = 'check_violation';
  end if;

  select * into v_gift from gifts where id = p_gift_id for update;

  if not found then
    raise exception 'GIFT_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  if v_gift.is_group_gift then
    raise exception 'GIFT_IS_GROUP_GIFT' using errcode = 'check_violation';
  end if;

  if v_gift.quantity_available <= 0 then
    raise exception 'GIFT_UNAVAILABLE' using errcode = 'check_violation';
  end if;

  if p_guest_id is not null then
    select wedding_id into v_guest_wedding_id from guests where id = p_guest_id;
    if v_guest_wedding_id is null or v_guest_wedding_id <> v_gift.wedding_id then
      raise exception 'GUEST_NOT_IN_WEDDING' using errcode = 'check_violation';
    end if;
  end if;

  if p_group_id is not null then
    select wedding_id into v_group_wedding_id from invites where id = p_group_id;
    if v_group_wedding_id is null or v_group_wedding_id <> v_gift.wedding_id then
      raise exception 'GROUP_NOT_IN_WEDDING' using errcode = 'check_violation';
    end if;
  end if;

  update gifts set quantity_available = quantity_available - 1 where id = p_gift_id;

  insert into gift_reservations (wedding_id, gift_id, guest_id, group_id, contributor_name)
  values (v_gift.wedding_id, p_gift_id, p_guest_id, p_group_id, p_contributor_name)
  returning * into v_reservation;

  return v_reservation;
end;
$$;
