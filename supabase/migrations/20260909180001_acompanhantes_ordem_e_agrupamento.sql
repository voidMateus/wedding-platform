-- Acompanhantes (`nucleos_acompanhantes`): ordem estável, núcleo de um
-- dissolvido, e agrupamento a partir da seleção da lista.
--
-- Três decisões de produto entram aqui (docs/PRODUCT.md seção 3.7):
--
-- 1. NÚCLEO NUNCA ATRAVESSA CONVITES. Já era o comportamento de fato — a
--    função abaixo empurra o núcleo inteiro para o convite do editado e
--    recusa quem já está em outro —, mas a regra vivia só dentro de uma
--    função, sem estar escrita em lugar nenhum. Agora é regra declarada, vale
--    também no agrupamento novo, e o motivo é de produto: se duas pessoas vão
--    em convites diferentes, elas deixaram de ser "convidadas juntas".
--
-- 2. A ORDEM DEIXA DE VIRAR SOZINHA. `ordem_nucleo = 0` significava na prática
--    "a última pessoa que alguém abriu no cadastro": salvar o cadastro da
--    Maria trocava o rótulo derivado de "João e Maria" para "Maria e João" na
--    lista inteira, sem ninguém ter pedido. A posição do principal passa a ser
--    informada (`p_posicao_principal`), e o formulário mostra o núcleo inteiro
--    em ordem — o principal é uma linha como as outras, porque o núcleo é
--    simétrico. `ordem_nucleo` deixa de acumular o papel de "quem é o
--    principal", que o convite já resolve em `convidado_responsavel_id`.
--
-- 3. NÚCLEO DE UMA PESSOA NÃO EXISTE. Remover o acompanhante (ou excluí-lo)
--    deixava o sobrevivente num núcleo sozinho, rotulado só "João" e listado
--    no filtro de Acompanhantes como se agrupasse algo — um agrupamento de um
--    não agrupa nada. E nada no código nunca apagou uma linha de
--    `nucleos_acompanhantes`: a FK é `on delete set null`, dissolver sempre
--    custou um DELETE, só nunca acontecia. Agora todo caminho que mexe em
--    núcleo dissolve o que ficou com menos de dois membros — inclusive o
--    núcleo de ORIGEM de quem foi movido, que antes era esquecido.

-- ---------------------------------------------------------------------------
-- Normalização de um núcleo: dissolve o que não agrupa e adensa a ordem.
-- ---------------------------------------------------------------------------
-- Extraída porque os dois caminhos que mexem em núcleo (o cadastro e o
-- agrupamento em massa) precisam exatamente da mesma conclusão. Duplicar essa
-- regra é como ela ficaria diferente em um dos dois.
create or replace function normalizar_nucleo_acompanhantes(p_nucleo_id uuid)
returns void
language plpgsql
as $$
declare
  v_total integer;
begin
  if p_nucleo_id is null then
    return;
  end if;

  select count(*) into v_total
  from convidados
  where nucleo_id = p_nucleo_id and excluido_em is null;

  if v_total < 2 then
    update convidados set nucleo_id = null, ordem_nucleo = 0 where nucleo_id = p_nucleo_id;
    delete from nucleos_acompanhantes where id = p_nucleo_id;
    return;
  end if;

  -- Duas passagens: o índice único (nucleo_id, ordem_nucleo) é verificado
  -- linha a linha, então reatribuir posições que já existem colide numa
  -- UPDATE intermediária. A primeira passagem move todos para uma faixa alta
  -- (nunca colide com 0..n-1); a segunda grava a ordem final, preservando a
  -- ordem relativa que existia — inclusive jogando para o fim quem estava na
  -- faixa alta deixada pelo cadastro.
  update convidados set ordem_nucleo = ordem_nucleo + 2000
  where nucleo_id = p_nucleo_id and excluido_em is null;

  update convidados c
  set ordem_nucleo = o.nova_ordem
  from (
    select id, (row_number() over (order by ordem_nucleo, created_at, id) - 1)::smallint as nova_ordem
    from convidados
    where nucleo_id = p_nucleo_id and excluido_em is null
  ) o
  where c.id = o.id;
end;
$$;

comment on function normalizar_nucleo_acompanhantes(uuid) is
  'Dissolve o núcleo com menos de dois membros (agrupamento de um não agrupa nada) e adensa `ordem_nucleo` a partir de 0 preservando a ordem relativa. Chamada por todo caminho que mexe em núcleo, inclusive para o núcleo de origem de quem foi movido.';

-- ---------------------------------------------------------------------------
-- sincronizar_nucleo_convidado — agora com a posição do principal
-- ---------------------------------------------------------------------------
-- A assinatura de 5 parâmetros precisa ser removida: com ela no lugar, uma
-- chamada de 5 argumentos casaria tanto com ela quanto com a nova (cujo 6º
-- parâmetro tem default) e o Postgres recusaria por ambiguidade. O DROP vem
-- antes do CREATE na mesma transação, então não existe janela sem função; e a
-- nova aceita 5 argumentos pelo default, o que mantém o código já publicado
-- funcionando enquanto o deploy novo não sobe.
drop function if exists sincronizar_nucleo_convidado(uuid, jsonb, jsonb, uuid[], jsonb);

create or replace function sincronizar_nucleo_convidado(
  p_casamento_id uuid,
  p_principal jsonb,
  p_acompanhantes jsonb default '[]'::jsonb,
  p_ids_convidados_removidos uuid[] default '{}',
  p_convite jsonb default null,
  p_posicao_principal integer default 0
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
  v_indice integer := 0;
  v_ordem smallint;
  v_id_removido uuid;
  v_etiqueta_id uuid;
  v_total_acompanhantes integer;
  v_posicao_principal integer;
  v_nucleos_origem uuid[];
  v_nucleo_origem uuid;
begin
  v_id_principal := nullif(p_principal ->> 'id', '')::uuid;
  v_total_acompanhantes := jsonb_array_length(coalesce(p_acompanhantes, '[]'::jsonb));

  -- Fora de 0..N a posição não existe. Encostar na borda mais próxima é melhor
  -- que recusar o salvamento inteiro por causa de um índice — o cadastro da
  -- pessoa não pode ser perdido por um detalhe de ordenação.
  v_posicao_principal := greatest(0, least(coalesce(p_posicao_principal, 0), v_total_acompanhantes));

  if v_id_principal is not null then
    select nucleo_id, convite_id into v_nucleo_id, v_convite_id_existente
    from convidados
    where id = v_id_principal and casamento_id = p_casamento_id
    for update;

    if not found then
      raise exception 'PRIMARY_GUEST_NOT_FOUND' using errcode = 'no_data_found';
    end if;
  end if;

  if v_total_acompanhantes > 0 and v_nucleo_id is null then
    insert into nucleos_acompanhantes (casamento_id) values (p_casamento_id) returning id into v_nucleo_id;
  end if;

  -- Núcleos de ORIGEM dos acompanhantes que vêm de outro núcleo. Sem isso,
  -- mover alguém deixava atrás um núcleo de um — capturado ANTES de qualquer
  -- reatribuição, que é o que apaga o vínculo antigo.
  select array_agg(distinct c.nucleo_id)
  into v_nucleos_origem
  from convidados c
  where c.casamento_id = p_casamento_id
    and c.nucleo_id is not null
    and c.nucleo_id is distinct from v_nucleo_id
    and c.id in (
      select nullif(a ->> 'id', '')::uuid
      from jsonb_array_elements(coalesce(p_acompanhantes, '[]'::jsonb)) a
      where nullif(a ->> 'id', '') is not null
    );

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
      v_posicao_principal
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
      ordem_nucleo = v_posicao_principal
    where id = v_id_principal;
  end if;

  for v_acompanhante in select * from jsonb_array_elements(coalesce(p_acompanhantes, '[]'::jsonb))
  loop
    v_id_acompanhante := nullif(v_acompanhante ->> 'id', '')::uuid;

    -- A posição do principal é um lugar na fila, não o começo dela: quem vem
    -- antes dele mantém o próprio índice, quem vem depois anda uma casa.
    v_ordem := (case when v_indice < v_posicao_principal then v_indice else v_indice + 1 end)::smallint;

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

    v_indice := v_indice + 1;
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

    -- Núcleo não atravessa convites (decisão 1 no topo deste arquivo).
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

  -- Por último, e sempre: o núcleo editado pode ter ficado com um só membro
  -- (todos os acompanhantes removidos) e os de origem podem ter ficado vazios.
  perform normalizar_nucleo_acompanhantes(v_nucleo_id);

  if v_nucleos_origem is not null then
    foreach v_nucleo_origem in array v_nucleos_origem
    loop
      perform normalizar_nucleo_acompanhantes(v_nucleo_origem);
    end loop;
  end if;

  -- Relido: `normalizar_nucleo_acompanhantes` pode ter dissolvido o núcleo.
  select nucleo_id into v_nucleo_id from convidados where id = v_id_principal;

  return jsonb_build_object(
    'primaryGuestId', v_id_principal,
    'partyId', v_nucleo_id,
    'inviteId', v_convite_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- agrupar_acompanhantes — o agrupamento a partir da seleção da lista
-- ---------------------------------------------------------------------------
-- É a operação que faltava para quem monta a lista por entrada rápida ou
-- colando da planilha: os nomes entram soltos, e o agrupamento vem depois.
-- Transacional porque mexe em núcleo, ordem e convite ao mesmo tempo — um
-- "update em lote" atravessando isso quebraria a garantia de que ninguém
-- entra em dois convites.
create or replace function agrupar_acompanhantes(
  p_casamento_id uuid,
  p_ids uuid[]
)
returns jsonb
language plpgsql
as $$
declare
  v_ids uuid[];
  v_nucleos_origem uuid[];
  v_nucleo_alvo uuid;
  v_convites uuid[];
  v_convite_id uuid;
  v_ordenados uuid[];
  v_id uuid;
  v_ordem smallint := 0;
  v_nucleo_origem uuid;
begin
  -- Expande a seleção: quem já está num núcleo traz o núcleo inteiro. Agrupar
  -- o João (que já vem com a Maria) com o Pedro não pode afastar a Maria do
  -- João — o resultado é o trio, não o par novo. É o que "juntar tudo num só"
  -- significa quando a seleção pega núcleos diferentes.
  select array_agg(distinct c.id)
  into v_ids
  from convidados c
  where c.casamento_id = p_casamento_id
    and c.excluido_em is null
    and (
      c.id = any(p_ids)
      or c.nucleo_id in (
        select nucleo_id
        from convidados
        where id = any(p_ids) and casamento_id = p_casamento_id and nucleo_id is not null
      )
    );

  if coalesce(array_length(v_ids, 1), 0) < 2 then
    raise exception 'PARTY_NEEDS_TWO_GUESTS' using errcode = 'check_violation';
  end if;

  -- Rascunho da lista nunca recebe convite (CLAUDE.md, seção 12) e agrupar
  -- propaga convite — então rascunho não entra em núcleo.
  if exists (select 1 from convidados where id = any(v_ids) and em_consideracao) then
    raise exception 'GUEST_IS_DRAFT' using errcode = 'check_violation';
  end if;

  -- Núcleo não atravessa convites: dois convites diferentes na seleção é
  -- recusa, nunca merge silencioso de convite (que trocaria o link/QR de
  -- alguém sem pedir).
  select array_agg(distinct convite_id)
  into v_convites
  from convidados
  where id = any(v_ids) and convite_id is not null;

  if coalesce(array_length(v_convites, 1), 0) > 1 then
    raise exception 'GUESTS_IN_DIFFERENT_INVITES' using errcode = 'check_violation';
  end if;

  v_convite_id := v_convites[1];

  -- Alvo do merge: o núcleo com mais gente entre os envolvidos — preserva a
  -- ordem já ajustada do maior grupo em vez de recomeçar do zero. Empate vai
  -- para o núcleo mais ANTIGO, e não para o menor uuid: o rótulo da lista é
  -- derivado dessa ordem ("João e Maria"), então desempatar por uuid trocaria
  -- o nome do grupo na tela conforme um valor aleatório.
  select c.nucleo_id into v_nucleo_alvo
  from convidados c
  join nucleos_acompanhantes n on n.id = c.nucleo_id
  where c.id = any(v_ids) and c.nucleo_id is not null
  group by c.nucleo_id, n.created_at
  order by count(*) desc, n.created_at, c.nucleo_id
  limit 1;

  if v_nucleo_alvo is null then
    insert into nucleos_acompanhantes (casamento_id) values (p_casamento_id) returning id into v_nucleo_alvo;
  end if;

  select array_agg(distinct nucleo_id)
  into v_nucleos_origem
  from convidados
  where id = any(v_ids) and nucleo_id is not null and nucleo_id <> v_nucleo_alvo;

  -- Ordem final: os membros do núcleo alvo primeiro, na ordem que já tinham;
  -- os demais atrás, por data de cadastro. Capturada ANTES de zerar
  -- `nucleo_id`, que é o que apaga a ordem antiga.
  select array_agg(id order by (nucleo_id = v_nucleo_alvo) desc nulls last, ordem_nucleo, created_at, id)
  into v_ordenados
  from convidados
  where id = any(v_ids);

  -- `nucleo_id = null` sai do índice único parcial, então a reatribuição
  -- abaixo grava 0..n-1 sem risco de colidir com as posições antigas.
  update convidados set nucleo_id = null, ordem_nucleo = 0 where id = any(v_ids);

  foreach v_id in array v_ordenados
  loop
    update convidados set nucleo_id = v_nucleo_alvo, ordem_nucleo = v_ordem where id = v_id;
    v_ordem := v_ordem + 1;
  end loop;

  -- O convite único da seleção vale para o núcleo inteiro — é o que "núcleo
  -- não atravessa convites" significa na prática: agrupar com quem já tem
  -- convite coloca todos nele.
  if v_convite_id is not null then
    update convidados set convite_id = v_convite_id where id = any(v_ids) and convite_id is null;
  end if;

  if v_nucleos_origem is not null then
    foreach v_nucleo_origem in array v_nucleos_origem
    loop
      perform normalizar_nucleo_acompanhantes(v_nucleo_origem);
    end loop;
  end if;

  return jsonb_build_object(
    'partyId', v_nucleo_alvo,
    'guestIds', to_jsonb(v_ordenados),
    'inviteId', v_convite_id
  );
end;
$$;

comment on function agrupar_acompanhantes(uuid, uuid[]) is
  'Agrupa os convidados informados como Acompanhantes num núcleo só, expandindo a seleção para os núcleos inteiros de quem já tinha um (merge). Recusa seleção com convites diferentes e rascunho da lista. Dissolve os núcleos de origem que sobraram.';
