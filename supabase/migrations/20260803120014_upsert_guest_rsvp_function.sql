-- Salvamento automático do RSVP (CLAUDE.md, seção 16.3) — chamada a cada
-- toque em "Estarei lá"/"Não poderei ir" no fluxo público, e reaproveitável
-- pelo painel administrativo para status administrativos (waitlisted/
-- removed). Não precisa de lock de convite: cada convidado é independente
-- (o único limite compartilhado é o de acompanhante avulso, tratado à parte
-- em finalize_invite_rsvp). Grava o evento em invite_events na mesma
-- transação — nenhuma mudança de status fica sem rastro.

create function upsert_guest_rsvp(
  p_wedding_id uuid,
  p_guest_id uuid,
  p_status text,
  p_dietary_restrictions text default null,
  p_ip text default null,
  p_user_agent text default null,
  p_source text default 'public_site'
)
returns rsvp_responses
language plpgsql
as $$
declare
  v_invite_id uuid;
  v_previous_status text;
  v_result rsvp_responses%rowtype;
begin
  if p_status not in ('pending', 'confirmed', 'declined', 'waitlisted', 'removed') then
    raise exception 'upsert_guest_rsvp: status inválido (%)', p_status
      using errcode = 'check_violation';
  end if;

  if p_source not in ('public_site', 'admin_panel', 'api') then
    raise exception 'upsert_guest_rsvp: source inválido (%)', p_source
      using errcode = 'check_violation';
  end if;

  select invite_id into v_invite_id
  from guests
  where id = p_guest_id and wedding_id = p_wedding_id
  for update;

  if not found then
    raise exception 'GUEST_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  if v_invite_id is null then
    raise exception 'GUEST_WITHOUT_INVITE' using errcode = 'check_violation';
  end if;

  select status into v_previous_status from rsvp_responses where guest_id = p_guest_id;

  update guests set dietary_restrictions = p_dietary_restrictions where id = p_guest_id;

  insert into rsvp_responses (wedding_id, guest_id, invite_id, status, responded_at)
  values (p_wedding_id, p_guest_id, v_invite_id, p_status, now())
  on conflict (guest_id) do update set
    status = excluded.status,
    invite_id = excluded.invite_id,
    responded_at = now()
  returning * into v_result;

  insert into invite_events (wedding_id, invite_id, event_type, metadata)
  values (
    p_wedding_id,
    v_invite_id,
    'rsvp.guest_status_changed',
    jsonb_build_object(
      'guestId', p_guest_id,
      'previousStatus', v_previous_status,
      'newStatus', p_status,
      'ipAddress', p_ip,
      'userAgent', p_user_agent,
      'source', p_source
    )
  );

  return v_result;
end;
$$;

comment on function upsert_guest_rsvp(uuid, uuid, text, text, text, text, text) is
  'Autosave de RSVP por convidado — upsert em rsvp_responses + evento em invite_events na mesma transação. Levanta GUEST_NOT_FOUND ou GUEST_WITHOUT_INVITE (CLAUDE.md, seção 16.3).';
