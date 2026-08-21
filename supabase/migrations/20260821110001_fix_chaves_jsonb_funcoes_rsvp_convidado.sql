-- Correção de bug real (achado pela suíte de testes de integração do Passo
-- 2, docs/PLANO-SAAS.md): a migration 20260821090003 recriou
-- sincronizar_nucleo_convidado() e finalizar_rsvp_convite() em português,
-- mas os corpos continuaram lendo as chaves internas dos parâmetros jsonb
-- em inglês (ex.: `p_principal ->> 'fullName'`), enquanto os schemas Zod que
-- montam esse jsonb no client/server já enviam chaves em português
-- (`nomeCompleto`) desde a mesma leva de tradução (shared/schemas/guests.ts,
-- shared/schemas/rsvp.ts). Resultado real em produção: todo cadastro/edição
-- de convidado pelo wizard falhava (função sequer era encontrada, por causa
-- de um mismatch adicional de nome de parâmetro em
-- server/api/guests/party.put.ts, corrigido no mesmo commit desta
-- migration) e, separadamente, adicionar acompanhante avulso na revisão
-- final do RSVP quebraria (nome_completo NULL, viola NOT NULL) assim que o
-- primeiro mismatch fosse corrigido.
--
-- 20260821090003 nunca é editada (já mergeada) — esta migration só
-- redefine as duas funções (CREATE OR REPLACE, mesma assinatura/nomes de
-- parâmetro, só o corpo muda) com as chaves jsonb corrigidas.

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
      papel_casamento, restricoes_alimentares, observacoes, grupo_id, nucleo_id, ordem_nucleo
    ) values (
      p_casamento_id,
      p_principal ->> 'nomeCompleto',
      nullif(p_principal ->> 'apelido', ''),
      nullif(p_principal ->> 'sexo', ''),
      nullif(p_principal ->> 'dataNascimento', '')::date,
      nullif(p_principal ->> 'caminhoFoto', ''),
      nullif(p_principal ->> 'papelCasamento', ''),
      nullif(p_principal ->> 'restricoesAlimentares', ''),
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
      restricoes_alimentares = nullif(p_principal ->> 'restricoesAlimentares', ''),
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
        papel_casamento, restricoes_alimentares, observacoes, grupo_id, nucleo_id, ordem_nucleo, convite_id
      ) values (
        p_casamento_id,
        v_acompanhante ->> 'nomeCompleto',
        nullif(v_acompanhante ->> 'apelido', ''),
        nullif(v_acompanhante ->> 'sexo', ''),
        nullif(v_acompanhante ->> 'dataNascimento', '')::date,
        nullif(v_acompanhante ->> 'caminhoFoto', ''),
        nullif(v_acompanhante ->> 'papelCasamento', ''),
        nullif(v_acompanhante ->> 'restricoesAlimentares', ''),
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
        restricoes_alimentares = nullif(v_acompanhante ->> 'restricoesAlimentares', ''),
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
      insert into acompanhantes_avulsos (casamento_id, convite_id, nome_completo, restricoes_alimentares)
      values (
        p_casamento_id,
        p_convite_id,
        v_acompanhante ->> 'nomeCompleto',
        v_acompanhante ->> 'restricoesAlimentares'
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
