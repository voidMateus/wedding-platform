-- Remoção da restrição alimentar do produto (UI + API).
--
-- Escopo deliberado: as colunas `convidados.restricoes_alimentares` e
-- `acompanhantes_avulsos.restricoes_alimentares` CONTINUAM existindo, com os
-- dados já preenchidos intactos. Só o caminho de escrita é cortado — nenhuma
-- função volta a gravar nesses campos, e nenhuma tela volta a lê-los.
--
-- Por que a migration é necessária mesmo sem `drop column`: as três funções
-- abaixo gravavam a restrição a partir do payload do client. Se o client
-- simplesmente parasse de enviar o campo, `salvar_rsvp_convidado` gravaria
-- NULL por cima do valor existente a cada toque em "Estarei lá" — ou seja, a
-- remoção só da UI apagaria o histórico silenciosamente. Removendo a escrita
-- aqui, o dado antigo fica preservado de verdade.
--
-- Os parâmetros `p_restricoes_alimentares` / a chave jsonb
-- `restricoesAlimentares` seguem aceitos e são ignorados: manter a assinatura
-- estável evita mexer em app/types/database.types.ts (gerado pelo Supabase
-- CLI, nunca editado à mão — CLAUDE.md seção 8). Quando/se as colunas forem
-- dropadas, a mesma migration que faz o `drop column` também dropa o
-- parâmetro e os tipos são regerados no mesmo passo.

create or replace function salvar_rsvp_convidado(
  p_casamento_id uuid,
  p_convidado_id uuid,
  p_status text,
  p_restricoes_alimentares text default null,
  p_ip text default null,
  p_user_agent text default null,
  p_origem text default 'public_site'
)
returns respostas_rsvp
language plpgsql
as $$
declare
  v_convite_id uuid;
  v_status_anterior text;
  v_resultado respostas_rsvp%rowtype;
begin
  if p_status not in ('pendente', 'confirmado', 'recusado', 'lista_espera', 'removido') then
    raise exception 'salvar_rsvp_convidado: status inválido (%)', p_status
      using errcode = 'check_violation';
  end if;

  if p_origem not in ('public_site', 'admin_panel', 'api') then
    raise exception 'salvar_rsvp_convidado: origem inválida (%)', p_origem
      using errcode = 'check_violation';
  end if;

  select convite_id into v_convite_id
  from convidados
  where id = p_convidado_id and casamento_id = p_casamento_id
  for update;

  if not found then
    raise exception 'GUEST_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  if v_convite_id is null then
    raise exception 'GUEST_WITHOUT_INVITE' using errcode = 'check_violation';
  end if;

  select status_rsvp into v_status_anterior from respostas_rsvp where convidado_id = p_convidado_id;

  insert into respostas_rsvp (casamento_id, convidado_id, convite_id, status_rsvp, respondido_em)
  values (p_casamento_id, p_convidado_id, v_convite_id, p_status, now())
  on conflict (convidado_id) do update set
    status_rsvp = excluded.status_rsvp,
    convite_id = excluded.convite_id,
    respondido_em = now()
  returning * into v_resultado;

  insert into historico_convite (casamento_id, convite_id, tipo_evento, metadados)
  values (
    p_casamento_id,
    v_convite_id,
    'rsvp.guest_status_changed',
    jsonb_build_object(
      'guestId', p_convidado_id,
      'previousStatus', v_status_anterior,
      'newStatus', p_status,
      'ipAddress', p_ip,
      'userAgent', p_user_agent,
      'source', p_origem
    )
  );

  return v_resultado;
end;
$$;

-- Mesma assinatura de 20260821110001; só saem as duas gravações de
-- restricoes_alimentares (principal e acompanhante). A chave jsonb
-- 'restricoesAlimentares' deixa de ser lida.
create or replace function sincronizar_nucleo_convidado(
  p_casamento_id uuid,
  p_principal jsonb,
  p_acompanhantes jsonb default '[]'::jsonb,
  p_ids_convidados_removidos uuid[] default '{}',
  p_convite jsonb default null
)
returns jsonb
language plpgsql
as $$
declare
  v_id_principal uuid;
  v_nucleo_id uuid;
  v_convite_id_existente uuid;
  v_convite_id uuid;
  v_acompanhante jsonb;
  v_id_acompanhante uuid;
  v_ordem smallint := 1;
  v_id_removido uuid;
  v_etiqueta_id uuid;
begin
  v_id_principal := nullif(p_principal ->> 'id', '')::uuid;

  if v_id_principal is not null then
    select nucleo_id, convite_id into v_nucleo_id, v_convite_id_existente
    from convidados
    where id = v_id_principal and casamento_id = p_casamento_id
    for update;

    if not found then
      raise exception 'PRIMARY_GUEST_NOT_FOUND' using errcode = 'no_data_found';
    end if;
  end if;

  if jsonb_array_length(coalesce(p_acompanhantes, '[]'::jsonb)) > 0 and v_nucleo_id is null then
    insert into nucleos_acompanhantes (casamento_id) values (p_casamento_id) returning id into v_nucleo_id;
  end if;

  -- Desloca todos os membros atuais do núcleo para uma faixa alta antes de
  -- reatribuir as posições finais (evita colisão do índice único).
  if v_nucleo_id is not null then
    update convidados set ordem_nucleo = ordem_nucleo + 1000 where nucleo_id = v_nucleo_id;
  end if;

  if v_id_principal is null then
    insert into convidados (
      casamento_id, nome_completo, apelido, sexo, data_nascimento, caminho_foto,
      papel_casamento, observacoes, grupo_id, nucleo_id, ordem_nucleo
    ) values (
      p_casamento_id,
      p_principal ->> 'nomeCompleto',
      nullif(p_principal ->> 'apelido', ''),
      nullif(p_principal ->> 'sexo', ''),
      nullif(p_principal ->> 'dataNascimento', '')::date,
      nullif(p_principal ->> 'caminhoFoto', ''),
      nullif(p_principal ->> 'papelCasamento', ''),
      nullif(p_principal ->> 'observacoes', ''),
      nullif(p_principal ->> 'grupoId', '')::uuid,
      v_nucleo_id,
      0
    ) returning id into v_id_principal;
  else
    update convidados set
      nome_completo = p_principal ->> 'nomeCompleto',
      apelido = nullif(p_principal ->> 'apelido', ''),
      sexo = nullif(p_principal ->> 'sexo', ''),
      data_nascimento = nullif(p_principal ->> 'dataNascimento', '')::date,
      caminho_foto = nullif(p_principal ->> 'caminhoFoto', ''),
      papel_casamento = nullif(p_principal ->> 'papelCasamento', ''),
      observacoes = nullif(p_principal ->> 'observacoes', ''),
      grupo_id = nullif(p_principal ->> 'grupoId', '')::uuid,
      nucleo_id = v_nucleo_id,
      ordem_nucleo = 0
    where id = v_id_principal;
  end if;

  for v_acompanhante in select * from jsonb_array_elements(coalesce(p_acompanhantes, '[]'::jsonb))
  loop
    v_id_acompanhante := nullif(v_acompanhante ->> 'id', '')::uuid;

    if v_id_acompanhante is null then
      insert into convidados (
        casamento_id, nome_completo, apelido, sexo, data_nascimento, caminho_foto,
        papel_casamento, observacoes, grupo_id, nucleo_id, ordem_nucleo, convite_id
      ) values (
        p_casamento_id,
        v_acompanhante ->> 'nomeCompleto',
        nullif(v_acompanhante ->> 'apelido', ''),
        nullif(v_acompanhante ->> 'sexo', ''),
        nullif(v_acompanhante ->> 'dataNascimento', '')::date,
        nullif(v_acompanhante ->> 'caminhoFoto', ''),
        nullif(v_acompanhante ->> 'papelCasamento', ''),
        nullif(v_acompanhante ->> 'observacoes', ''),
        nullif(v_acompanhante ->> 'grupoId', '')::uuid,
        v_nucleo_id,
        v_ordem,
        v_convite_id_existente
      );
    else
      update convidados set
        nome_completo = v_acompanhante ->> 'nomeCompleto',
        apelido = nullif(v_acompanhante ->> 'apelido', ''),
        sexo = nullif(v_acompanhante ->> 'sexo', ''),
        data_nascimento = nullif(v_acompanhante ->> 'dataNascimento', '')::date,
        caminho_foto = nullif(v_acompanhante ->> 'caminhoFoto', ''),
        papel_casamento = nullif(v_acompanhante ->> 'papelCasamento', ''),
        observacoes = nullif(v_acompanhante ->> 'observacoes', ''),
        grupo_id = nullif(v_acompanhante ->> 'grupoId', '')::uuid,
        nucleo_id = v_nucleo_id,
        ordem_nucleo = v_ordem
      where id = v_id_acompanhante and casamento_id = p_casamento_id;
    end if;

    v_ordem := v_ordem + 1;
  end loop;

  if p_ids_convidados_removidos is not null then
    foreach v_id_removido in array p_ids_convidados_removidos
    loop
      update convidados set nucleo_id = null, ordem_nucleo = 0
      where id = v_id_removido and casamento_id = p_casamento_id;
    end loop;
  end if;

  if p_convite is not null then
    v_convite_id := nullif(p_convite ->> 'id', '')::uuid;

    if exists (
      select 1 from convidados
      where casamento_id = p_casamento_id
        and (id = v_id_principal or (nucleo_id is not null and nucleo_id = v_nucleo_id))
        and convite_id is not null
        and convite_id is distinct from v_convite_id
    ) then
      raise exception 'GUEST_ALREADY_IN_ANOTHER_INVITE' using errcode = 'check_violation';
    end if;

    if v_convite_id is null then
      insert into convites (casamento_id, nome, observacoes, convidado_responsavel_id, codigo_interno)
      values (
        p_casamento_id,
        p_convite ->> 'nome',
        nullif(p_convite ->> 'observacoes', ''),
        v_id_principal,
        'CONV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
      ) returning id into v_convite_id;

      insert into historico_convite (casamento_id, convite_id, tipo_evento)
      values (p_casamento_id, v_convite_id, 'invite.created');
    else
      update convites set
        nome = coalesce(nullif(p_convite ->> 'nome', ''), nome),
        observacoes = coalesce(nullif(p_convite ->> 'observacoes', ''), observacoes)
      where id = v_convite_id and casamento_id = p_casamento_id;
    end if;

    update convidados set convite_id = v_convite_id
    where casamento_id = p_casamento_id
      and (id = v_id_principal or (nucleo_id is not null and nucleo_id = v_nucleo_id));

    if p_convite ? 'tagIds' then
      delete from vinculos_convite_etiqueta where convite_id = v_convite_id;

      for v_etiqueta_id in select (jsonb_array_elements_text(p_convite -> 'tagIds'))::uuid
      loop
        insert into vinculos_convite_etiqueta (convite_id, etiqueta_id) values (v_convite_id, v_etiqueta_id)
        on conflict do nothing;
      end loop;
    end if;
  end if;

  return jsonb_build_object(
    'primaryGuestId', v_id_principal,
    'partyId', v_nucleo_id,
    'inviteId', v_convite_id
  );
end;
$$;

-- Mesma assinatura de 20260821110001; o insert em acompanhantes_avulsos deixa
-- de gravar restricoes_alimentares (a coluna é nullable, então some do insert).
create or replace function finalizar_rsvp_convite(
  p_casamento_id uuid,
  p_convite_id uuid,
  p_acompanhantes jsonb default '[]'::jsonb,
  p_mensagem text default null,
  p_origem text default 'public_site'
)
returns convites
language plpgsql
as $$
declare
  v_modo_lista_convidados text;
  v_max_acompanhantes integer;
  v_contagem_novos_acompanhantes integer;
  v_resultado convites%rowtype;
  v_acompanhante jsonb;
  v_mensagem text;
begin
  if p_origem not in ('public_site', 'admin_panel', 'api') then
    raise exception 'finalizar_rsvp_convite: origem inválida (%)', p_origem
      using errcode = 'check_violation';
  end if;

  select modo_lista_convidados into v_modo_lista_convidados from casamentos where id = p_casamento_id;

  select max_acompanhantes into v_max_acompanhantes
  from convites
  where id = p_convite_id and casamento_id = p_casamento_id
  for update;

  if not found then
    raise exception 'INVITE_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  update acompanhantes_avulsos set excluido_em = now()
  where convite_id = p_convite_id and excluido_em is null;

  if v_modo_lista_convidados = 'aberta' and p_acompanhantes is not null then
    v_contagem_novos_acompanhantes := coalesce(jsonb_array_length(p_acompanhantes), 0);

    if v_max_acompanhantes is not null and v_contagem_novos_acompanhantes > v_max_acompanhantes then
      raise exception 'MAX_COMPANIONS_EXCEEDED' using errcode = 'check_violation';
    end if;

    for v_acompanhante in select * from jsonb_array_elements(p_acompanhantes)
    loop
      insert into acompanhantes_avulsos (casamento_id, convite_id, nome_completo)
      values (
        p_casamento_id,
        p_convite_id,
        v_acompanhante ->> 'nomeCompleto'
      );
    end loop;
  end if;

  v_mensagem := nullif(p_mensagem, '');

  update convites
  set
    mensagem_rsvp = v_mensagem,
    mensagem_rsvp_em = case when v_mensagem is not null then now() else mensagem_rsvp_em end
  where id = p_convite_id
  returning * into v_resultado;

  if v_mensagem is not null then
    insert into historico_convite (casamento_id, convite_id, tipo_evento, metadados)
    values (p_casamento_id, p_convite_id, 'rsvp.message_sent', jsonb_build_object('source', p_origem));
  end if;

  return v_resultado;
end;
$$;
