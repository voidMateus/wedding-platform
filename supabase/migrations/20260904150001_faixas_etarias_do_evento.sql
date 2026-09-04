-- Classificação etária do convidado: da coluna única "idade máxima de
-- criança" para faixas configuráveis por evento (CLAUDE.md, seção 12).
--
-- O que muda conceitualmente: "criança" deixa de ser uma propriedade derivada
-- de UM número do casamento e passa a ser o resultado de duas informações
-- independentes — a idade do convidado NA DATA DO EVENTO e as faixas
-- configuradas pelo casal. A mesma pessoa pode ser criança num evento (0–11) e
-- adolescente em outro (0–7), sem que nada mude na linha dela em `convidados`.
--
-- BREAKING CHANGE: `casamentos.idade_maxima_crianca` é removida (o valor é
-- migrado para `config_faixas_etarias`), a função `convidado_e_crianca(date,
-- uuid)` deixa de existir e `PATCH /api/wedding` passa a exigir `faixasEtarias`
-- no lugar de `idadeMaximaCrianca`.

-- --------------------------------------------------------------------------
-- 1. Configuração de faixas do evento
-- --------------------------------------------------------------------------
--
-- jsonb (não tabela) por dois motivos concretos: a regra "exatamente uma faixa
-- se aplica a cada idade" é validada de uma vez, num valor só (shared/schemas/
-- wedding.ts#faixasEtariasSchema) em vez de entre linhas dentro de uma
-- transação; e "Restaurar classificação padrão" é uma escrita só. Mesma
-- estratégia de config_tema/config_conteudo, com a diferença de ser
-- comportamento de negócio — daí a coluna própria, nunca dentro de config_tema.
--
-- A chave `principal` existe para não fechar a porta das classificações por
-- finalidade previstas no roadmap (alimentação, mesas, recreação): elas entram
-- como chaves irmãs, sem migration de shape.

alter table casamentos
  add column config_faixas_etarias jsonb not null default jsonb_build_object(
    'principal',
    jsonb_build_array(
      jsonb_build_object('chave', 'crianca', 'idadeMinima', 0, 'idadeMaxima', 11),
      jsonb_build_object('chave', 'adolescente', 'idadeMinima', 12, 'idadeMaxima', 17),
      jsonb_build_object('chave', 'adulto', 'idadeMinima', 18, 'idadeMaxima', 59),
      jsonb_build_object('chave', 'idoso', 'idadeMinima', 60, 'idadeMaxima', null)
    )
  );

comment on column casamentos.config_faixas_etarias is
  'Faixas da classificação etária principal do evento — {"principal": [{chave, idadeMinima, idadeMaxima}]}, shape em shared/schemas/wedding.ts#faixasEtariasSchema. Contínuas e sem sobreposição (a última com idadeMaxima null). A classificação de um convidado NUNCA é gravada: é sempre calculada a partir da idade dele na data do evento contra estas faixas (shared/utils/faixa-etaria.ts).';

-- Preserva o que cada casal já havia configurado: o limite de criança vira o
-- fim da primeira faixa e as demais se acomodam depois dele. `greatest`
-- garante faixas válidas mesmo num casamento que tenha configurado um limite
-- alto (ex.: 20 anos → adolescente 21–21, adulto 22–59, idoso 60+).
update casamentos c
set config_faixas_etarias = jsonb_build_object(
  'principal',
  jsonb_build_array(
    jsonb_build_object('chave', 'crianca', 'idadeMinima', 0, 'idadeMaxima', limites.crianca),
    jsonb_build_object('chave', 'adolescente', 'idadeMinima', limites.crianca + 1, 'idadeMaxima', limites.adolescente),
    jsonb_build_object('chave', 'adulto', 'idadeMinima', limites.adolescente + 1, 'idadeMaxima', limites.adulto),
    jsonb_build_object('chave', 'idoso', 'idadeMinima', limites.adulto + 1, 'idadeMaxima', null)
  )
)
from (
  select
    base.id,
    base.crianca,
    base.adolescente,
    greatest(59, base.adolescente + 1) as adulto
  from (
    select
      id,
      idade_maxima_crianca as crianca,
      greatest(17, idade_maxima_crianca + 1) as adolescente
    from casamentos
  ) base
) limites
where limites.id = c.id;

-- --------------------------------------------------------------------------
-- 2. Faixa etária manual do convidado
-- --------------------------------------------------------------------------
--
-- Existe para o caso mais comum na prática — "sei que ele é adulto, não sei a
-- data de nascimento". Não é a classificação final do convidado: sempre perde
-- para uma data de nascimento válida (regra de prioridade em
-- shared/utils/faixa-etaria.ts#classificarFaixaEtaria).

alter table convidados
  add column faixa_etaria_manual text
    check (faixa_etaria_manual is null or faixa_etaria_manual in ('crianca', 'adolescente', 'adulto', 'idoso'));

comment on column convidados.faixa_etaria_manual is
  'Faixa etária informada à mão quando não se conhece a data de nascimento. Usada SÓ na ausência de data_nascimento — com data, a faixa é calculada na data do evento contra casamentos.config_faixas_etarias. Não é uma característica permanente da pessoa: é a informação contextual dela neste evento.';

comment on column convidados.data_nascimento is
  'Data de nascimento, opcional. Quando presente, é a fonte da classificação etária (calculada na data do evento) e tem prioridade sobre faixa_etaria_manual.';

-- --------------------------------------------------------------------------
-- 3. Remoção do modelo antigo
-- --------------------------------------------------------------------------
--
-- Ao contrário de `restricoes_alimentares` (20260904120001), aqui não há dado
-- a preservar: o número já foi migrado para as faixas acima. Manter a coluna
-- deixaria duas fontes de verdade para "criança" — exatamente o que esta
-- remodelagem elimina.

drop function if exists convidado_e_crianca(date, uuid);

alter table casamentos drop column idade_maxima_crianca;

-- --------------------------------------------------------------------------
-- 4. sincronizar_nucleo_convidado passa a gravar a faixa manual
-- --------------------------------------------------------------------------
--
-- Mesma assinatura de 20260904120001; a única diferença é a leitura da chave
-- jsonb 'faixaEtariaManual' (principal e acompanhantes). Cada acompanhante
-- tem a sua — nunca herda a do responsável.

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
      casamento_id, nome_completo, apelido, sexo, data_nascimento, faixa_etaria_manual,
      caminho_foto, papel_casamento, observacoes, grupo_id, nucleo_id, ordem_nucleo
    ) values (
      p_casamento_id,
      p_principal ->> 'nomeCompleto',
      nullif(p_principal ->> 'apelido', ''),
      nullif(p_principal ->> 'sexo', ''),
      nullif(p_principal ->> 'dataNascimento', '')::date,
      nullif(p_principal ->> 'faixaEtariaManual', ''),
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
      faixa_etaria_manual = nullif(p_principal ->> 'faixaEtariaManual', ''),
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
        casamento_id, nome_completo, apelido, sexo, data_nascimento, faixa_etaria_manual,
        caminho_foto, papel_casamento, observacoes, grupo_id, nucleo_id, ordem_nucleo, convite_id
      ) values (
        p_casamento_id,
        v_acompanhante ->> 'nomeCompleto',
        nullif(v_acompanhante ->> 'apelido', ''),
        nullif(v_acompanhante ->> 'sexo', ''),
        nullif(v_acompanhante ->> 'dataNascimento', '')::date,
        nullif(v_acompanhante ->> 'faixaEtariaManual', ''),
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
        faixa_etaria_manual = nullif(v_acompanhante ->> 'faixaEtariaManual', ''),
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
