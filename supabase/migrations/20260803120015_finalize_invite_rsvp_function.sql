-- Etapa final de revisão do RSVP (CLAUDE.md, seção 16.3/18.2) — grava
-- acompanhante avulso (só em guest_list_mode='open', respeitando
-- max_companions sob bloqueio da linha do convite) e a mensagem única ao
-- casal. Substitui acompanhantes antigos sempre por soft delete, nunca hard
-- delete (histórico/rastreabilidade, CLAUDE.md seção 12.1).

create function finalize_invite_rsvp(
  p_wedding_id uuid,
  p_invite_id uuid,
  p_companions jsonb default '[]'::jsonb,
  p_message text default null,
  p_source text default 'public_site'
)
returns invites
language plpgsql
as $$
declare
  v_guest_list_mode text;
  v_max_companions integer;
  v_new_companions_count integer;
  v_result invites%rowtype;
  v_companion jsonb;
  v_message text;
begin
  if p_source not in ('public_site', 'admin_panel', 'api') then
    raise exception 'finalize_invite_rsvp: source inválido (%)', p_source
      using errcode = 'check_violation';
  end if;

  select guest_list_mode into v_guest_list_mode from weddings where id = p_wedding_id;

  select max_companions into v_max_companions
  from invites
  where id = p_invite_id and wedding_id = p_wedding_id
  for update;

  if not found then
    raise exception 'INVITE_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  update companions set deleted_at = now()
  where invite_id = p_invite_id and deleted_at is null;

  if v_guest_list_mode = 'open' and p_companions is not null then
    v_new_companions_count := coalesce(jsonb_array_length(p_companions), 0);

    if v_max_companions is not null and v_new_companions_count > v_max_companions then
      raise exception 'MAX_COMPANIONS_EXCEEDED' using errcode = 'check_violation';
    end if;

    for v_companion in select * from jsonb_array_elements(p_companions)
    loop
      insert into companions (wedding_id, invite_id, full_name, dietary_restrictions)
      values (
        p_wedding_id,
        p_invite_id,
        v_companion ->> 'fullName',
        v_companion ->> 'dietaryRestrictions'
      );
    end loop;
  end if;

  v_message := nullif(p_message, '');

  update invites
  set
    rsvp_message = v_message,
    rsvp_message_at = case when v_message is not null then now() else rsvp_message_at end
  where id = p_invite_id
  returning * into v_result;

  if v_message is not null then
    insert into invite_events (wedding_id, invite_id, event_type, metadata)
    values (p_wedding_id, p_invite_id, 'rsvp.message_sent', jsonb_build_object('source', p_source));
  end if;

  return v_result;
end;
$$;

comment on function finalize_invite_rsvp(uuid, uuid, jsonb, text, text) is
  'Etapa final de revisão do RSVP: acompanhante avulso (guest_list_mode=open, sob lock do convite) + mensagem única ao casal. Levanta INVITE_NOT_FOUND ou MAX_COMPANIONS_EXCEEDED (CLAUDE.md, seções 13, 16.3, 18.2).';
