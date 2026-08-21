-- Remodelagem para português (Passo 1, docs/PLANO-SAAS.md) — parte 3:
-- funções e triggers. Corpo de função (LANGUAGE sql/plpgsql) é texto
-- literal — NÃO segue rename de tabela/coluna automaticamente (achado já
-- documentado neste projeto, ver migration 20260803120017: reserve_gift()
-- quebrou em runtime após o rename guest_groups->invites porque a
-- referência ficou presa no corpo). Por isso cada função é recriada por
-- inteiro aqui, nunca só renomeada.
--
-- Padrão: ALTER FUNCTION ... RENAME TO ... (preserva o binding por OID em
-- triggers/policies que já a chamam) seguido de CREATE OR REPLACE com o
-- corpo e os nomes de parâmetro corrigidos.

-- =========================================================================
-- Utilitário
-- =========================================================================
alter function set_updated_at() rename to atualizar_timestamp;
create or replace function atualizar_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- Predicados de RLS (SECURITY DEFINER — reutilizados por praticamente toda
-- policy do schema)
-- =========================================================================
alter function is_wedding_member(uuid) rename to is_membro_casamento;
create or replace function is_membro_casamento(p_casamento_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from membros_casamento
    where casamento_id = p_casamento_id
      and usuario_id = auth.uid()
  );
$$;

alter function is_wedding_owner(uuid) rename to is_dono_casamento;
create or replace function is_dono_casamento(p_casamento_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from membros_casamento
    where casamento_id = p_casamento_id
      and usuario_id = auth.uid()
      and papel = 'dono'
  );
$$;

comment on function is_membro_casamento(uuid) is
  'Predicado reutilizado pelas RLS policies do caminho administrativo: true se auth.uid() pertence ao casamento.';
comment on function is_dono_casamento(uuid) is
  'Predicado reutilizado pelas RLS policies do caminho administrativo: true se auth.uid() é dono do casamento.';

-- =========================================================================
-- Triggers de consistência de casamento_id (uma função por tabela filha)
-- =========================================================================

alter function guests_check_wedding_id() rename to convidados_verificar_casamento_id;
create or replace function convidados_verificar_casamento_id()
returns trigger
language plpgsql
as $$
declare
  v_convite_casamento_id uuid;
  v_grupo_casamento_id uuid;
  v_nucleo_casamento_id uuid;
begin
  if new.convite_id is not null then
    select casamento_id into v_convite_casamento_id from convites where id = new.convite_id;
    if v_convite_casamento_id is null then
      raise exception 'convites % não encontrado', new.convite_id
        using errcode = 'foreign_key_violation';
    end if;
    if v_convite_casamento_id <> new.casamento_id then
      raise exception 'convidados.casamento_id (%) não bate com convites.casamento_id (%) do convite %',
        new.casamento_id, v_convite_casamento_id, new.convite_id
        using errcode = 'check_violation';
    end if;
  end if;

  if new.grupo_id is not null then
    select casamento_id into v_grupo_casamento_id from grupos where id = new.grupo_id;
    if v_grupo_casamento_id is null then
      raise exception 'grupos % não encontrado', new.grupo_id
        using errcode = 'foreign_key_violation';
    end if;
    if v_grupo_casamento_id <> new.casamento_id then
      raise exception 'convidados.casamento_id (%) não bate com grupos.casamento_id (%) do grupo %',
        new.casamento_id, v_grupo_casamento_id, new.grupo_id
        using errcode = 'check_violation';
    end if;
  end if;

  if new.nucleo_id is not null then
    select casamento_id into v_nucleo_casamento_id from nucleos_acompanhantes where id = new.nucleo_id;
    if v_nucleo_casamento_id is null then
      raise exception 'nucleos_acompanhantes % não encontrado', new.nucleo_id
        using errcode = 'foreign_key_violation';
    end if;
    if v_nucleo_casamento_id <> new.casamento_id then
      raise exception 'convidados.casamento_id (%) não bate com nucleos_acompanhantes.casamento_id (%) do núcleo %',
        new.casamento_id, v_nucleo_casamento_id, new.nucleo_id
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;
alter trigger guests_check_wedding_id_trigger on convidados rename to convidados_verificar_casamento_id_trigger;

alter function rsvp_responses_check_wedding_id() rename to respostas_rsvp_verificar_casamento_id;
create or replace function respostas_rsvp_verificar_casamento_id()
returns trigger
language plpgsql
as $$
declare
  v_convidado_casamento_id uuid;
  v_convite_casamento_id uuid;
begin
  select casamento_id into v_convidado_casamento_id from convidados where id = new.convidado_id;
  if v_convidado_casamento_id is null then
    raise exception 'convidados % não encontrado', new.convidado_id
      using errcode = 'foreign_key_violation';
  end if;
  if v_convidado_casamento_id <> new.casamento_id then
    raise exception 'respostas_rsvp.casamento_id (%) não bate com convidados.casamento_id (%)',
      new.casamento_id, v_convidado_casamento_id
      using errcode = 'check_violation';
  end if;

  select casamento_id into v_convite_casamento_id from convites where id = new.convite_id;
  if v_convite_casamento_id is null then
    raise exception 'convites % não encontrado', new.convite_id
      using errcode = 'foreign_key_violation';
  end if;
  if v_convite_casamento_id <> new.casamento_id then
    raise exception 'respostas_rsvp.casamento_id (%) não bate com convites.casamento_id (%)',
      new.casamento_id, v_convite_casamento_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
alter trigger rsvp_responses_check_wedding_id_trigger on respostas_rsvp rename to respostas_rsvp_verificar_casamento_id_trigger;

-- acompanhantes_avulsos: trigger derrubado em 20260803120007 e nunca
-- recriado com o novo modelo (invite_id) -- achado real da auditoria
-- (docs/PLANO-SAAS.md, Passo 1). Recriado aqui pela primeira vez seguindo
-- o mesmo padrão das demais tabelas filhas.
create function acompanhantes_avulsos_verificar_casamento_id()
returns trigger
language plpgsql
as $$
declare
  v_convite_casamento_id uuid;
begin
  select casamento_id into v_convite_casamento_id from convites where id = new.convite_id;

  if v_convite_casamento_id is null then
    raise exception 'convites % não encontrado', new.convite_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_convite_casamento_id <> new.casamento_id then
    raise exception 'acompanhantes_avulsos.casamento_id (%) não bate com convites.casamento_id (%)',
      new.casamento_id, v_convite_casamento_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
create trigger acompanhantes_avulsos_verificar_casamento_id_trigger
  before insert or update of casamento_id, convite_id on acompanhantes_avulsos
  for each row
  execute function acompanhantes_avulsos_verificar_casamento_id();
comment on function acompanhantes_avulsos_verificar_casamento_id() is
  'Recriada durante o rename para português — a versão anterior (companions_check_parent) havia sido derrubada em 20260803120007 e nunca recriada com o modelo baseado em convite_id (achado da auditoria, docs/PLANO-SAAS.md).';

alter function gift_reservations_check_wedding_id() rename to reservas_presentes_verificar_casamento_id;
create or replace function reservas_presentes_verificar_casamento_id()
returns trigger
language plpgsql
as $$
declare
  v_presente_casamento_id uuid;
begin
  select casamento_id into v_presente_casamento_id from presentes where id = new.presente_id;

  if v_presente_casamento_id is null then
    raise exception 'presentes % não encontrado', new.presente_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_presente_casamento_id <> new.casamento_id then
    raise exception 'reservas_presentes.casamento_id (%) não bate com presentes.casamento_id (%)',
      new.casamento_id, v_presente_casamento_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
alter trigger gift_reservations_check_wedding_id_trigger on reservas_presentes rename to reservas_presentes_verificar_casamento_id_trigger;

alter function gift_contributions_check_wedding_id() rename to contribuicoes_presentes_verificar_casamento_id;
create or replace function contribuicoes_presentes_verificar_casamento_id()
returns trigger
language plpgsql
as $$
declare
  v_presente_casamento_id uuid;
begin
  select casamento_id into v_presente_casamento_id from presentes where id = new.presente_id;

  if v_presente_casamento_id is null then
    raise exception 'presentes % não encontrado', new.presente_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_presente_casamento_id <> new.casamento_id then
    raise exception 'contribuicoes_presentes.casamento_id (%) não bate com presentes.casamento_id (%)',
      new.casamento_id, v_presente_casamento_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
alter trigger gift_contributions_check_wedding_id_trigger on contribuicoes_presentes rename to contribuicoes_presentes_verificar_casamento_id_trigger;

alter function guest_access_tokens_check_wedding_id() rename to credenciais_acesso_convite_verificar_casamento_id;
create or replace function credenciais_acesso_convite_verificar_casamento_id()
returns trigger
language plpgsql
as $$
declare
  v_convite_casamento_id uuid;
begin
  select casamento_id into v_convite_casamento_id from convites where id = new.convite_id;

  if v_convite_casamento_id is null then
    raise exception 'convites % não encontrado', new.convite_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_convite_casamento_id <> new.casamento_id then
    raise exception 'credenciais_acesso_convite.casamento_id (%) não bate com convites.casamento_id (%)',
      new.casamento_id, v_convite_casamento_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
alter trigger guest_access_tokens_check_wedding_id_trigger on credenciais_acesso_convite rename to credenciais_acesso_convite_verificar_casamento_id_trigger;

alter function communications_check_wedding_id() rename to comunicacoes_verificar_casamento_id;
create or replace function comunicacoes_verificar_casamento_id()
returns trigger
language plpgsql
as $$
declare
  v_credencial_casamento_id uuid;
begin
  select casamento_id into v_credencial_casamento_id
  from credenciais_acesso_convite
  where id = new.credencial_id;

  if v_credencial_casamento_id is null then
    raise exception 'credenciais_acesso_convite % não encontrada', new.credencial_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_credencial_casamento_id <> new.casamento_id then
    raise exception 'comunicacoes.casamento_id (%) não bate com credenciais_acesso_convite.casamento_id (%)',
      new.casamento_id, v_credencial_casamento_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
alter trigger communications_check_wedding_id_trigger on comunicacoes rename to comunicacoes_verificar_casamento_id_trigger;

alter function gifts_check_category_wedding_id() rename to presentes_verificar_categoria_casamento_id;
create or replace function presentes_verificar_categoria_casamento_id()
returns trigger
language plpgsql
as $$
declare
  v_categoria_casamento_id uuid;
begin
  if new.categoria_id is null then
    return new;
  end if;

  select casamento_id into v_categoria_casamento_id
  from categorias_presentes
  where id = new.categoria_id;

  if v_categoria_casamento_id is null then
    raise exception 'categorias_presentes % não encontrada', new.categoria_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_categoria_casamento_id <> new.casamento_id then
    raise exception 'presentes.casamento_id (%) não bate com categorias_presentes.casamento_id (%)',
      new.casamento_id, v_categoria_casamento_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
alter trigger gifts_check_category_wedding_id_trigger on presentes rename to presentes_verificar_categoria_casamento_id_trigger;

alter function gift_payments_check_gift_consistency() rename to pagamentos_presentes_verificar_consistencia;
create or replace function pagamentos_presentes_verificar_consistencia()
returns trigger
language plpgsql
as $$
declare
  v_presente presentes%rowtype;
begin
  select * into v_presente from presentes where id = new.presente_id;

  if not found then
    raise exception 'presentes % não encontrado', new.presente_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_presente.casamento_id <> new.casamento_id then
    raise exception 'pagamentos_presentes.casamento_id (%) não bate com presentes.casamento_id (%)',
      new.casamento_id, v_presente.casamento_id
      using errcode = 'check_violation';
  end if;

  if new.tipo = 'reserva' and v_presente.e_presente_cota then
    raise exception 'pagamentos_presentes.tipo=reserva exige presentes.e_presente_cota=false'
      using errcode = 'check_violation';
  end if;

  if new.tipo = 'contribuicao' and not v_presente.e_presente_cota then
    raise exception 'pagamentos_presentes.tipo=contribuicao exige presentes.e_presente_cota=true'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
alter trigger gift_payments_check_gift_consistency_trigger on pagamentos_presentes rename to pagamentos_presentes_verificar_consistencia_trigger;

-- photos.source_connection_id nunca teve trigger de consistência (achado da
-- auditoria) -- adicionado aqui pela primeira vez, mesmo padrão das demais.
create function fotos_verificar_conexao_casamento_id()
returns trigger
language plpgsql
as $$
declare
  v_conexao_casamento_id uuid;
begin
  if new.conexao_id is null then
    return new;
  end if;

  select casamento_id into v_conexao_casamento_id from conexoes_galeria where id = new.conexao_id;

  if v_conexao_casamento_id is null then
    raise exception 'conexoes_galeria % não encontrada', new.conexao_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_conexao_casamento_id <> new.casamento_id then
    raise exception 'fotos.casamento_id (%) não bate com conexoes_galeria.casamento_id (%)',
      new.casamento_id, v_conexao_casamento_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
create trigger fotos_verificar_conexao_casamento_id_trigger
  before insert or update of casamento_id, conexao_id on fotos
  for each row
  execute function fotos_verificar_conexao_casamento_id();
comment on function fotos_verificar_conexao_casamento_id() is
  'Adicionada durante o rename para português — a FK fotos.conexao_id nunca teve trigger de consistência equivalente às demais tabelas filhas (achado da auditoria, docs/PLANO-SAAS.md).';

-- =========================================================================
-- Funções de negócio
-- =========================================================================

alter function guest_name_matches(text, text, text) rename to convidado_nome_corresponde;
create or replace function convidado_nome_corresponde(p_nome_completo text, p_apelido text, p_busca text)
returns boolean
language sql
stable
as $$
  select coalesce(
    (
      select bool_and(unaccent(lower(p_nome_completo || ' ' || coalesce(p_apelido, ''))) like '%' || unaccent(lower(palavra)) || '%')
      from unnest(regexp_split_to_array(trim(p_busca), '\s+')) as palavra
      where palavra <> ''
    ),
    false
  );
$$;

alter function guest_is_child(date, uuid) rename to convidado_e_crianca;
create or replace function convidado_e_crianca(p_data_nascimento date, p_casamento_id uuid)
returns boolean
language sql
stable
as $$
  select case
    when p_data_nascimento is null then false
    else extract(year from age(current_date, p_data_nascimento)) <= (
      select idade_maxima_crianca from casamentos where id = p_casamento_id
    )
  end;
$$;

alter function search_guests_by_name(uuid, text, integer) rename to buscar_convidados_por_nome;
create or replace function buscar_convidados_por_nome(p_casamento_id uuid, p_busca text, p_limite integer default 8)
returns table (id uuid, nome_completo text, apelido text)
language sql
stable
as $$
  select c.id, c.nome_completo, c.apelido
  from convidados c
  where c.casamento_id = p_casamento_id
    and c.excluido_em is null
    and convidado_nome_corresponde(c.nome_completo, c.apelido, p_busca)
  order by c.nome_completo
  limit p_limite;
$$;

alter function upsert_guest_rsvp(uuid, uuid, text, text, text, text, text) rename to salvar_rsvp_convidado;
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

  update convidados set restricoes_alimentares = p_restricoes_alimentares where id = p_convidado_id;

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

alter function finalize_invite_rsvp(uuid, uuid, jsonb, text, text) rename to finalizar_rsvp_convite;
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
        v_acompanhante ->> 'fullName',
        v_acompanhante ->> 'dietaryRestrictions'
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

-- sync_guest_party: consolida direto para a versão final (com o fix de
-- colisão de índice da migration 20260803120018) -- as versões
-- intermediárias nunca chegaram a existir isoladas em produção.
alter function sync_guest_party(uuid, jsonb, jsonb, uuid[], jsonb) rename to sincronizar_nucleo_convidado;
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
      p_principal ->> 'fullName',
      nullif(p_principal ->> 'nickname', ''),
      nullif(p_principal ->> 'sex', ''),
      nullif(p_principal ->> 'birthDate', '')::date,
      nullif(p_principal ->> 'photoPath', ''),
      nullif(p_principal ->> 'weddingRole', ''),
      nullif(p_principal ->> 'dietaryRestrictions', ''),
      nullif(p_principal ->> 'notes', ''),
      nullif(p_principal ->> 'groupId', '')::uuid,
      v_nucleo_id,
      0
    ) returning id into v_id_principal;
  else
    update convidados set
      nome_completo = p_principal ->> 'fullName',
      apelido = nullif(p_principal ->> 'nickname', ''),
      sexo = nullif(p_principal ->> 'sex', ''),
      data_nascimento = nullif(p_principal ->> 'birthDate', '')::date,
      caminho_foto = nullif(p_principal ->> 'photoPath', ''),
      papel_casamento = nullif(p_principal ->> 'weddingRole', ''),
      restricoes_alimentares = nullif(p_principal ->> 'dietaryRestrictions', ''),
      observacoes = nullif(p_principal ->> 'notes', ''),
      grupo_id = nullif(p_principal ->> 'groupId', '')::uuid,
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
        v_acompanhante ->> 'fullName',
        nullif(v_acompanhante ->> 'nickname', ''),
        nullif(v_acompanhante ->> 'sex', ''),
        nullif(v_acompanhante ->> 'birthDate', '')::date,
        nullif(v_acompanhante ->> 'photoPath', ''),
        nullif(v_acompanhante ->> 'weddingRole', ''),
        nullif(v_acompanhante ->> 'dietaryRestrictions', ''),
        nullif(v_acompanhante ->> 'notes', ''),
        nullif(v_acompanhante ->> 'groupId', '')::uuid,
        v_nucleo_id,
        v_ordem,
        v_convite_id_existente
      );
    else
      update convidados set
        nome_completo = v_acompanhante ->> 'fullName',
        apelido = nullif(v_acompanhante ->> 'nickname', ''),
        sexo = nullif(v_acompanhante ->> 'sex', ''),
        data_nascimento = nullif(v_acompanhante ->> 'birthDate', '')::date,
        caminho_foto = nullif(v_acompanhante ->> 'photoPath', ''),
        papel_casamento = nullif(v_acompanhante ->> 'weddingRole', ''),
        restricoes_alimentares = nullif(v_acompanhante ->> 'dietaryRestrictions', ''),
        observacoes = nullif(v_acompanhante ->> 'notes', ''),
        grupo_id = nullif(v_acompanhante ->> 'groupId', '')::uuid,
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
        p_convite ->> 'name',
        nullif(p_convite ->> 'notes', ''),
        v_id_principal,
        'CONV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
      ) returning id into v_convite_id;

      insert into historico_convite (casamento_id, convite_id, tipo_evento)
      values (p_casamento_id, v_convite_id, 'invite.created');
    else
      update convites set
        nome = coalesce(nullif(p_convite ->> 'name', ''), nome),
        observacoes = coalesce(nullif(p_convite ->> 'notes', ''), observacoes)
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

-- reserve_gift(): existem 3 overloads acumulados na evolução do produto
-- (docs/PLANO-SAAS.md) -- os dois obsoletos são derrubados explicitamente
-- (função em LANGUAGE plpgsql não segue rename/consolidação automática de
-- overload) e só a assinatura final vira reservar_presente().
drop function if exists reserve_gift(uuid, uuid, uuid, text);
drop function if exists reserve_gift(uuid, uuid, uuid, text, text);
alter function reserve_gift(uuid, uuid, uuid, text, text, text) rename to reservar_presente;
create or replace function reservar_presente(
  p_presente_id uuid,
  p_convidado_id uuid default null,
  p_convite_id uuid default null,
  p_nome_contribuinte text default null,
  p_mensagem text default null,
  p_telefone_presenteador text default null
)
returns reservas_presentes
language plpgsql
as $$
declare
  v_presente presentes%rowtype;
  v_reserva reservas_presentes%rowtype;
  v_convidado_casamento_id uuid;
  v_convite_casamento_id uuid;
begin
  if num_nonnulls(p_convidado_id, p_convite_id) > 1 then
    raise exception 'reservar_presente: informe apenas convidado_id OU convite_id, nunca os dois'
      using errcode = 'check_violation';
  end if;

  if num_nonnulls(p_convidado_id, p_convite_id, p_nome_contribuinte) = 0 then
    raise exception 'reservar_presente: é preciso identificar convidado_id, convite_id ou nome_contribuinte'
      using errcode = 'check_violation';
  end if;

  select * into v_presente from presentes where id = p_presente_id for update;

  if not found then
    raise exception 'GIFT_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  if v_presente.e_presente_cota then
    raise exception 'GIFT_IS_GROUP_GIFT' using errcode = 'check_violation';
  end if;

  if v_presente.quantidade_disponivel <= 0 then
    raise exception 'GIFT_UNAVAILABLE' using errcode = 'check_violation';
  end if;

  if p_convidado_id is not null then
    select casamento_id into v_convidado_casamento_id from convidados where id = p_convidado_id;
    if v_convidado_casamento_id is null or v_convidado_casamento_id <> v_presente.casamento_id then
      raise exception 'GUEST_NOT_IN_WEDDING' using errcode = 'check_violation';
    end if;
  end if;

  if p_convite_id is not null then
    select casamento_id into v_convite_casamento_id from convites where id = p_convite_id;
    if v_convite_casamento_id is null or v_convite_casamento_id <> v_presente.casamento_id then
      raise exception 'GROUP_NOT_IN_WEDDING' using errcode = 'check_violation';
    end if;
  end if;

  update presentes set quantidade_disponivel = quantidade_disponivel - 1 where id = p_presente_id;

  insert into reservas_presentes (casamento_id, presente_id, convidado_id, convite_id, nome_contribuinte, mensagem, telefone_presenteador)
  values (v_presente.casamento_id, p_presente_id, p_convidado_id, p_convite_id, p_nome_contribuinte, p_mensagem, p_telefone_presenteador)
  returning * into v_reserva;

  return v_reserva;
end;
$$;

alter function cancel_gift_reservation(uuid, uuid, uuid, boolean) rename to cancelar_reserva_presente;
create or replace function cancelar_reserva_presente(
  p_reserva_id uuid,
  p_convidado_id uuid default null,
  p_convite_id uuid default null,
  p_ignorar_checagem_posse boolean default false
)
returns void
language plpgsql
as $$
declare
  v_reserva reservas_presentes%rowtype;
begin
  select * into v_reserva from reservas_presentes where id = p_reserva_id;

  if not found then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  if not p_ignorar_checagem_posse then
    if v_reserva.convidado_id is distinct from p_convidado_id
      or v_reserva.convite_id is distinct from p_convite_id then
      raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
    end if;
  end if;

  perform 1 from presentes where id = v_reserva.presente_id for update;

  update presentes set quantidade_disponivel = quantidade_disponivel + 1 where id = v_reserva.presente_id;

  delete from reservas_presentes where id = p_reserva_id;
end;
$$;

alter function confirm_gift_payment(uuid) rename to confirmar_pagamento_presente;
create or replace function confirmar_pagamento_presente(p_pagamento_id uuid)
returns pagamentos_presentes
language plpgsql
as $$
declare
  v_pagamento pagamentos_presentes%rowtype;
  v_reserva reservas_presentes%rowtype;
  v_contribuicao_id uuid;
begin
  select * into v_pagamento from pagamentos_presentes where id = p_pagamento_id for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  if v_pagamento.status_pagamento = 'confirmado' then
    return v_pagamento;
  end if;

  if v_pagamento.status_pagamento <> 'pendente' then
    raise exception 'PAYMENT_NOT_PENDING' using errcode = 'check_violation';
  end if;

  if v_pagamento.tipo = 'reserva' then
    begin
      select * into v_reserva from reservar_presente(
        v_pagamento.presente_id,
        null,
        v_pagamento.convite_id,
        v_pagamento.nome_presenteador,
        v_pagamento.mensagem_convidado,
        v_pagamento.telefone_presenteador
      );
    exception when others then
      update pagamentos_presentes
      set status_pagamento = 'falhou', motivo_falha = sqlerrm
      where id = p_pagamento_id
      returning * into v_pagamento;
      return v_pagamento;
    end;

    update pagamentos_presentes
    set status_pagamento = 'confirmado', confirmado_em = now(), reserva_resultante_id = v_reserva.id
    where id = p_pagamento_id
    returning * into v_pagamento;

    return v_pagamento;
  end if;

  insert into contribuicoes_presentes (casamento_id, presente_id, convidado_id, convite_id, valor_centavos, mensagem, quantidade_cotas, nome_contribuinte, telefone_presenteador)
  values (v_pagamento.casamento_id, v_pagamento.presente_id, null, v_pagamento.convite_id, v_pagamento.valor_centavos, v_pagamento.mensagem_convidado, v_pagamento.quantidade_cotas, v_pagamento.nome_presenteador, v_pagamento.telefone_presenteador)
  returning id into v_contribuicao_id;

  update pagamentos_presentes
  set status_pagamento = 'confirmado', confirmado_em = now(), contribuicao_resultante_id = v_contribuicao_id
  where id = p_pagamento_id
  returning * into v_pagamento;

  return v_pagamento;
end;
$$;

comment on function confirmar_pagamento_presente(uuid) is
  'Efetiva a reserva/contribuição de um pagamento já confirmado como pago (reverificação via payment_check acontece antes, em código de aplicação). Idempotente; falha de domínio (GIFT_UNAVAILABLE) vira status_pagamento=falhou em vez de exceção, para não ser revertida pelo rollback da própria chamada.';
