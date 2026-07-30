-- Reserva atômica de um presente simples (CLAUDE.md, seções 13, 18.3;
-- docs/ARCHITECTURE.md, seção 4.4). SEM security definer de propósito: roda
-- com o papel de quem chama — service_role no caminho do convidado (que já
-- ignora RLS, CLAUDE.md seção 4.5), e o próprio auth.uid() do casal/
-- colaborador no caminho administrativo, continuando protegido por RLS
-- (defesa em profundidade).

create function reserve_gift(
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
    select wedding_id into v_group_wedding_id from guest_groups where id = p_group_id;
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

comment on function reserve_gift(uuid, uuid, uuid, text) is
  'Reserva atômica: SELECT...FOR UPDATE na linha do presente antes de decrementar quantity_available e inserir a reserva (CLAUDE.md, seção 18.3). Levanta GIFT_NOT_FOUND, GIFT_IS_GROUP_GIFT ou GIFT_UNAVAILABLE — o server/api mapeia essas mensagens para o erro de domínio correspondente (docs/ARCHITECTURE.md, seção 3.5).';
