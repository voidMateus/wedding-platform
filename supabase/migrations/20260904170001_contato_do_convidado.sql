-- Contato do convidado (e-mail/telefone) deixa de ser coluna morta.
--
-- As colunas `convidados.email` e `convidados.telefone` existem desde o schema
-- inicial, mas nunca tiveram caminho de escrita: `sincronizar_nucleo_convidado`
-- — o único caminho de gravação de convidado do produto — não as menciona, e
-- nenhuma tela do painel as exibe. O resultado é que `docs/PRODUCT.md` seção
-- 3.2/3.3 descrevia contato como se existisse ("ao menos um canal de contato é
-- recomendado pela UI") enquanto na prática o dado era inalcançável.
--
-- Esta migration é o passo A.0 da importação/exportação de convidados: sem ela,
-- importar uma planilha com telefone gravaria um dado que ninguém consegue ver
-- nem corrigir depois — pior que não importar.
--
-- Nenhum `alter table` aqui: as colunas já estão lá, com o tipo certo e
-- nullable. O que faltava era só a função saber gravá-las.

comment on column convidados.email is
  'E-mail do convidado, opcional. Canal de envio de convite — nunca usado para autenticação (o caminho do convidado autentica por token de convite/sessão de RSVP, ver CLAUDE.md seção 4.2).';

comment on column convidados.telefone is
  'Telefone do convidado, opcional. Guardado como digitado pelo casal (sem normalização): é dado de contato para envio de convite, nunca chave de busca ou identificador.';

-- --------------------------------------------------------------------------
-- sincronizar_nucleo_convidado passa a gravar contato
-- --------------------------------------------------------------------------
--
-- Mesma assinatura de 20260904150001; a única diferença são as chaves jsonb
-- 'email' e 'telefone', lidas nos quatro pontos de escrita (insert/update do
-- principal e de cada acompanhante). Cada acompanhante tem o próprio contato —
-- nunca herda o do responsável, pelo mesmo motivo da faixa etária: acompanhante
-- é uma linha de `convidados` como qualquer outra.
--
-- Nos UPDATEs, contato é o único campo com semântica de "chave ausente = não
-- mexer" (`p_principal ? 'email'`), em vez do `nullif(... ->> ...)` direto dos
-- demais. Dois motivos concretos:
--
-- 1. Um client que ainda não conhece os campos (outra árvore de trabalho, um
--    deploy anterior a este) manda o payload sem as chaves. Com leitura direta,
--    `->>` devolveria NULL e cada "Salvar" apagaria o contato — exatamente o
--    acidente que 20260904120001 descreve para `restricoes_alimentares`.
-- 2. A importação em massa (fase B) vai atualizar convidados a partir de uma
--    planilha que quase nunca traz todas as colunas. Uma planilha
--    `id;nome_completo;grupo` não pode zerar o e-mail de duzentas pessoas.
--
-- Limpar o campo de propósito continua funcionando: a chave vai presente com
-- string vazia (é o que o formulário manda), e o `nullif` a converte em NULL.

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
      email, telefone, caminho_foto, papel_casamento, observacoes, grupo_id, nucleo_id, ordem_nucleo
    ) values (
      p_casamento_id,
      p_principal ->> 'nomeCompleto',
      nullif(p_principal ->> 'apelido', ''),
      nullif(p_principal ->> 'sexo', ''),
      nullif(p_principal ->> 'dataNascimento', '')::date,
      nullif(p_principal ->> 'faixaEtariaManual', ''),
      nullif(p_principal ->> 'email', ''),
      nullif(p_principal ->> 'telefone', ''),
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
      email = case when p_principal ? 'email' then nullif(p_principal ->> 'email', '') else email end,
      telefone = case when p_principal ? 'telefone' then nullif(p_principal ->> 'telefone', '') else telefone end,
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
        email, telefone, caminho_foto, papel_casamento, observacoes, grupo_id, nucleo_id,
        ordem_nucleo, convite_id
      ) values (
        p_casamento_id,
        v_acompanhante ->> 'nomeCompleto',
        nullif(v_acompanhante ->> 'apelido', ''),
        nullif(v_acompanhante ->> 'sexo', ''),
        nullif(v_acompanhante ->> 'dataNascimento', '')::date,
        nullif(v_acompanhante ->> 'faixaEtariaManual', ''),
        nullif(v_acompanhante ->> 'email', ''),
        nullif(v_acompanhante ->> 'telefone', ''),
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
        email = case when v_acompanhante ? 'email' then nullif(v_acompanhante ->> 'email', '') else email end,
        telefone = case when v_acompanhante ? 'telefone' then nullif(v_acompanhante ->> 'telefone', '') else telefone end,
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
