-- Confirmação/recusa de RSVP com bloqueio do grupo contra max_members
-- (CLAUDE.md, seções 13, 16.4, 17.3). Idempotente: upsert por guest_id OU
-- group_id, conforme weddings.rsvp_mode.
--
-- p_companions é um array JSON de objetos { "fullName": "...",
-- "dietaryRestrictions": "..." } — contrato do payload vindo do
-- server/api/rsvp/[code].post (docs/ARCHITECTURE.md, seção 7.2).

create function confirm_rsvp(
  p_wedding_id uuid,
  p_guest_id uuid,
  p_group_id uuid,
  p_status text,
  p_dietary_notes text default null,
  p_message text default null,
  p_companions jsonb default '[]'::jsonb
)
returns rsvp_responses
language plpgsql
as $$
declare
  v_group_id uuid;
  v_max_members integer;
  v_existing_companions integer;
  v_new_companions_count integer;
  v_rsvp_response_id uuid;
  v_result rsvp_responses%rowtype;
  v_companion jsonb;
begin
  if num_nonnulls(p_guest_id, p_group_id) <> 1 then
    raise exception 'confirm_rsvp: informe exatamente um entre guest_id e group_id'
      using errcode = 'check_violation';
  end if;

  if p_status not in ('confirmed', 'declined') then
    raise exception 'confirm_rsvp: status deve ser confirmed ou declined'
      using errcode = 'check_violation';
  end if;

  -- max_members é um limite de grupo — mesmo em modo per_guest, o grupo do
  -- convidado é quem trava (CLAUDE.md, seção 16.4).
  if p_group_id is not null then
    v_group_id := p_group_id;
  else
    select group_id into v_group_id
    from guests
    where id = p_guest_id and wedding_id = p_wedding_id;

    if v_group_id is null then
      raise exception 'GUEST_NOT_FOUND' using errcode = 'no_data_found';
    end if;
  end if;

  select max_members into v_max_members
  from guest_groups
  where id = v_group_id and wedding_id = p_wedding_id
  for update;

  if not found then
    raise exception 'GROUP_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  if p_guest_id is not null then
    insert into rsvp_responses (wedding_id, guest_id, status, dietary_notes, message, responded_at)
    values (p_wedding_id, p_guest_id, p_status, p_dietary_notes, p_message, now())
    on conflict (guest_id) where guest_id is not null
    do update set
      status = excluded.status,
      dietary_notes = excluded.dietary_notes,
      message = excluded.message,
      responded_at = now()
    returning id into v_rsvp_response_id;
  else
    insert into rsvp_responses (wedding_id, group_id, status, dietary_notes, message, responded_at)
    values (p_wedding_id, p_group_id, p_status, p_dietary_notes, p_message, now())
    on conflict (group_id) where group_id is not null
    do update set
      status = excluded.status,
      dietary_notes = excluded.dietary_notes,
      message = excluded.message,
      responded_at = now()
    returning id into v_rsvp_response_id;
  end if;

  -- Recusar nunca carrega acompanhantes — reenvio de "sim" para "não"
  -- também limpa os que já existiam (CLAUDE.md, seção 16.3).
  delete from companions where rsvp_response_id = v_rsvp_response_id;

  if p_status = 'confirmed' then
    v_new_companions_count := coalesce(jsonb_array_length(p_companions), 0);

    select coalesce(sum(c.cnt), 0) into v_existing_companions
    from (
      select count(*) as cnt
      from companions co
      join rsvp_responses r on r.id = co.rsvp_response_id
      where r.status = 'confirmed'
        and r.id <> v_rsvp_response_id
        and (
          r.group_id = v_group_id
          or r.guest_id in (select id from guests where group_id = v_group_id)
        )
    ) c;

    if v_existing_companions + v_new_companions_count > v_max_members then
      raise exception 'GROUP_LIMIT_EXCEEDED' using errcode = 'check_violation';
    end if;

    for v_companion in select * from jsonb_array_elements(p_companions)
    loop
      insert into companions (wedding_id, rsvp_response_id, full_name, dietary_restrictions)
      values (
        p_wedding_id,
        v_rsvp_response_id,
        v_companion ->> 'fullName',
        v_companion ->> 'dietaryRestrictions'
      );
    end loop;
  end if;

  select * into v_result from rsvp_responses where id = v_rsvp_response_id;
  return v_result;
end;
$$;

comment on function confirm_rsvp(uuid, uuid, uuid, text, text, text, jsonb) is
  'Upsert idempotente de rsvp_responses com SELECT...FOR UPDATE em guest_groups para validar max_members sob concorrência (CLAUDE.md, seções 13, 16.4). Levanta GUEST_NOT_FOUND, GROUP_NOT_FOUND ou GROUP_LIMIT_EXCEEDED.';
