-- sync_guest_party() atribuía party_order final (0..n) diretamente em cada
-- UPDATE individual — como (party_id, party_order) tem índice único, uma
-- reordenação que reusa valores já ocupados por OUTRO membro do mesmo grupo
-- (ex.: trocar quem é a posição 0 com quem é a posição 1) colide em uma
-- UPDATE intermediária, mesmo dentro da mesma transação (o índice não é
-- deferrable). Corrigido com duas passagens: primeiro desloca todos os
-- membros atuais do grupo para uma faixa alta (nunca colide com 0..n),
-- depois atribui os valores finais.

create or replace function sync_guest_party(
  p_wedding_id uuid,
  p_primary jsonb,
  p_companions jsonb default '[]'::jsonb,
  p_removed_guest_ids uuid[] default '{}',
  p_invite jsonb default null
)
returns jsonb
language plpgsql
as $$
declare
  v_primary_id uuid;
  v_party_id uuid;
  v_existing_invite_id uuid;
  v_invite_id uuid;
  v_companion jsonb;
  v_companion_id uuid;
  v_order smallint := 1;
  v_removed_id uuid;
  v_tag_id uuid;
begin
  v_primary_id := nullif(p_primary ->> 'id', '')::uuid;

  if v_primary_id is not null then
    select party_id, invite_id into v_party_id, v_existing_invite_id
    from guests
    where id = v_primary_id and wedding_id = p_wedding_id
    for update;

    if not found then
      raise exception 'PRIMARY_GUEST_NOT_FOUND' using errcode = 'no_data_found';
    end if;
  end if;

  if jsonb_array_length(coalesce(p_companions, '[]'::jsonb)) > 0 and v_party_id is null then
    insert into guest_parties (wedding_id) values (p_wedding_id) returning id into v_party_id;
  end if;

  -- Desloca todos os membros atuais do grupo para uma faixa alta antes de
  -- reatribuir as posições finais (evita colisão do índice único).
  if v_party_id is not null then
    update guests set party_order = party_order + 1000 where party_id = v_party_id;
  end if;

  if v_primary_id is null then
    insert into guests (
      wedding_id, full_name, nickname, sex, birth_date, photo_path,
      wedding_role, dietary_restrictions, notes, group_id, party_id, party_order
    ) values (
      p_wedding_id,
      p_primary ->> 'fullName',
      nullif(p_primary ->> 'nickname', ''),
      nullif(p_primary ->> 'sex', ''),
      nullif(p_primary ->> 'birthDate', '')::date,
      nullif(p_primary ->> 'photoPath', ''),
      nullif(p_primary ->> 'weddingRole', ''),
      nullif(p_primary ->> 'dietaryRestrictions', ''),
      nullif(p_primary ->> 'notes', ''),
      nullif(p_primary ->> 'groupId', '')::uuid,
      v_party_id,
      0
    ) returning id into v_primary_id;
  else
    update guests set
      full_name = p_primary ->> 'fullName',
      nickname = nullif(p_primary ->> 'nickname', ''),
      sex = nullif(p_primary ->> 'sex', ''),
      birth_date = nullif(p_primary ->> 'birthDate', '')::date,
      photo_path = nullif(p_primary ->> 'photoPath', ''),
      wedding_role = nullif(p_primary ->> 'weddingRole', ''),
      dietary_restrictions = nullif(p_primary ->> 'dietaryRestrictions', ''),
      notes = nullif(p_primary ->> 'notes', ''),
      group_id = nullif(p_primary ->> 'groupId', '')::uuid,
      party_id = v_party_id,
      party_order = 0
    where id = v_primary_id;
  end if;

  for v_companion in select * from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb))
  loop
    v_companion_id := nullif(v_companion ->> 'id', '')::uuid;

    if v_companion_id is null then
      insert into guests (
        wedding_id, full_name, nickname, sex, birth_date, photo_path,
        wedding_role, dietary_restrictions, notes, group_id, party_id, party_order, invite_id
      ) values (
        p_wedding_id,
        v_companion ->> 'fullName',
        nullif(v_companion ->> 'nickname', ''),
        nullif(v_companion ->> 'sex', ''),
        nullif(v_companion ->> 'birthDate', '')::date,
        nullif(v_companion ->> 'photoPath', ''),
        nullif(v_companion ->> 'weddingRole', ''),
        nullif(v_companion ->> 'dietaryRestrictions', ''),
        nullif(v_companion ->> 'notes', ''),
        nullif(v_companion ->> 'groupId', '')::uuid,
        v_party_id,
        v_order,
        v_existing_invite_id
      );
    else
      update guests set
        full_name = v_companion ->> 'fullName',
        nickname = nullif(v_companion ->> 'nickname', ''),
        sex = nullif(v_companion ->> 'sex', ''),
        birth_date = nullif(v_companion ->> 'birthDate', '')::date,
        photo_path = nullif(v_companion ->> 'photoPath', ''),
        wedding_role = nullif(v_companion ->> 'weddingRole', ''),
        dietary_restrictions = nullif(v_companion ->> 'dietaryRestrictions', ''),
        notes = nullif(v_companion ->> 'notes', ''),
        group_id = nullif(v_companion ->> 'groupId', '')::uuid,
        party_id = v_party_id,
        party_order = v_order
      where id = v_companion_id and wedding_id = p_wedding_id;
    end if;

    v_order := v_order + 1;
  end loop;

  if p_removed_guest_ids is not null then
    foreach v_removed_id in array p_removed_guest_ids
    loop
      update guests set party_id = null, party_order = 0
      where id = v_removed_id and wedding_id = p_wedding_id;
    end loop;
  end if;

  if p_invite is not null then
    v_invite_id := nullif(p_invite ->> 'id', '')::uuid;

    if exists (
      select 1 from guests
      where wedding_id = p_wedding_id
        and (id = v_primary_id or (party_id is not null and party_id = v_party_id))
        and invite_id is not null
        and invite_id is distinct from v_invite_id
    ) then
      raise exception 'GUEST_ALREADY_IN_ANOTHER_INVITE' using errcode = 'check_violation';
    end if;

    if v_invite_id is null then
      insert into invites (wedding_id, name, notes, responsible_guest_id, internal_code)
      values (
        p_wedding_id,
        p_invite ->> 'name',
        nullif(p_invite ->> 'notes', ''),
        v_primary_id,
        'CONV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
      ) returning id into v_invite_id;

      insert into invite_events (wedding_id, invite_id, event_type)
      values (p_wedding_id, v_invite_id, 'invite.created');
    else
      update invites set
        name = coalesce(nullif(p_invite ->> 'name', ''), name),
        notes = coalesce(nullif(p_invite ->> 'notes', ''), notes)
      where id = v_invite_id and wedding_id = p_wedding_id;
    end if;

    update guests set invite_id = v_invite_id
    where wedding_id = p_wedding_id
      and (id = v_primary_id or (party_id is not null and party_id = v_party_id));

    if p_invite ? 'tagIds' then
      delete from invite_tag_links where invite_id = v_invite_id;

      for v_tag_id in select (jsonb_array_elements_text(p_invite -> 'tagIds'))::uuid
      loop
        insert into invite_tag_links (invite_id, tag_id) values (v_invite_id, v_tag_id)
        on conflict do nothing;
      end loop;
    end if;
  end if;

  return jsonb_build_object(
    'primaryGuestId', v_primary_id,
    'partyId', v_party_id,
    'inviteId', v_invite_id
  );
end;
$$;
