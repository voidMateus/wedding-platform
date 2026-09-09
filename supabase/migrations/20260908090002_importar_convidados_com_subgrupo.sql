-- `importar_convidados` passa a entender a subdivisão de grupo.
--
-- Por que junto do Modo Lista: com `grupos.grupo_pai_id` existindo
-- (20260908090001), a exportação passou a escrever "Grupo" e "Subdivisão" em
-- colunas separadas. Sem esta mudança, reimportar o próprio CSV exportado
-- recriaria "Tios paternos" como grupo de primeiro nível e a hierarquia se
-- desfaria — em silêncio, que é o pior desfecho para uma importação.
--
-- Duas mudanças de comportamento, ambas deliberadas:
--
-- 1. A coluna "Grupo" agora resolve SÓ entre grupos de primeiro nível
--    (`grupo_pai_id is null`). Antes casava com qualquer grupo pelo nome, o
--    que era equivalente enquanto a hierarquia não existia; agora uma
--    subdivisão chamada "Primos" não pode mais ser confundida com um grupo
--    "Primos".
--
-- 2. A coluna "Subdivisão" resolve SEMPRE dentro do grupo da mesma linha.
--    "Primos" da Família do Mateus e "Primos" da Família da Raquel são duas
--    subdivisões distintas, e procurar apenas pelo nome jogaria as duas
--    famílias na mesma lista.

create or replace function importar_convidados(
  p_casamento_id uuid,
  p_linhas jsonb,
  p_criar_vinculos_novos boolean default false
)
returns jsonb
language plpgsql
as $$
declare
  v_linha jsonb;
  v_id uuid;
  v_grupo_nome text;
  v_subgrupo_nome text;
  v_convite_nome text;
  v_grupo_id uuid;
  v_grupo_raiz_id uuid;
  v_convite_id uuid;
  v_criados int := 0;
  v_atualizados int := 0;
  v_grupos_criados text[] := '{}';
  v_subgrupos_criados text[] := '{}';
  v_convites_criados text[] := '{}';
  v_numero int := 0;
begin
  for v_linha in select * from jsonb_array_elements(coalesce(p_linhas, '[]'::jsonb))
  loop
    v_numero := v_numero + 1;
    v_grupo_id := null;
    v_grupo_raiz_id := null;
    v_convite_id := null;

    -- ----------------------------------------------------------------
    -- Vínculos por nome
    -- ----------------------------------------------------------------
    --
    -- Nome vazio não é "sem grupo": é "a planilha não falou sobre grupo", e a
    -- diferença importa porque a coluna ausente não pode desvincular ninguém.
    -- Quem quer desvincular manda a célula vazia, tratado mais abaixo.
    v_grupo_nome := nullif(trim(coalesce(v_linha ->> 'grupo', '')), '');
    if v_grupo_nome is not null then
      select id into v_grupo_raiz_id
      from grupos
      where casamento_id = p_casamento_id
        and excluido_em is null
        and grupo_pai_id is null
        and nome_normalizado(nome) = nome_normalizado(v_grupo_nome);

      if v_grupo_raiz_id is null then
        if not p_criar_vinculos_novos then
          raise exception 'GRUPO_INEXISTENTE:%:%', v_numero, v_grupo_nome
            using errcode = 'check_violation';
        end if;
        insert into grupos (casamento_id, nome) values (p_casamento_id, v_grupo_nome)
        returning id into v_grupo_raiz_id;
        v_grupos_criados := v_grupos_criados || v_grupo_nome;
      end if;

      -- Sem subdivisão na linha, o convidado fica no próprio grupo raiz.
      v_grupo_id := v_grupo_raiz_id;
    end if;

    v_subgrupo_nome := nullif(trim(coalesce(v_linha ->> 'subgrupo', '')), '');
    if v_subgrupo_nome is not null then
      -- O schema Zod já recusa este caso antes de chegar aqui, mas a função é
      -- a fonte de verdade: sem grupo não há onde pendurar a subdivisão, e o
      -- silêncio alternativo seria criar um grupo solto chamado "Tios
      -- paternos" que ninguém pediu.
      if v_grupo_raiz_id is null then
        raise exception 'SUBGRUPO_SEM_GRUPO:%:%', v_numero, v_subgrupo_nome
          using errcode = 'check_violation';
      end if;

      select id into v_grupo_id
      from grupos
      where casamento_id = p_casamento_id
        and excluido_em is null
        and grupo_pai_id = v_grupo_raiz_id
        and nome_normalizado(nome) = nome_normalizado(v_subgrupo_nome);

      if v_grupo_id is null then
        if not p_criar_vinculos_novos then
          raise exception 'SUBGRUPO_INEXISTENTE:%:%', v_numero, v_subgrupo_nome
            using errcode = 'check_violation';
        end if;
        insert into grupos (casamento_id, nome, grupo_pai_id)
        values (p_casamento_id, v_subgrupo_nome, v_grupo_raiz_id)
        returning id into v_grupo_id;
        -- Qualificado pelo grupo: duas famílias podem criar "Primos" no mesmo
        -- lote, e a revisão precisa mostrar que são dois. O separador é o
        -- mesmo de `SEPARADOR_SUBGRUPO` (shared/utils/grupos.ts),
        -- porque o casal vê este nome antes de confirmar (montado em TS) e
        -- depois de importar (montado aqui) — divergir faria parecer que a
        -- subdivisão criada não foi a que ele aprovou.
        v_subgrupos_criados := v_subgrupos_criados || (v_grupo_nome || ' › ' || v_subgrupo_nome);
      end if;
    end if;

    v_convite_nome := nullif(trim(coalesce(v_linha ->> 'convite', '')), '');
    if v_convite_nome is not null then
      select id into v_convite_id
      from convites
      where casamento_id = p_casamento_id
        and excluido_em is null
        and nome_normalizado(nome) = nome_normalizado(v_convite_nome);

      if v_convite_id is null then
        if not p_criar_vinculos_novos then
          raise exception 'CONVITE_INEXISTENTE:%:%', v_numero, v_convite_nome
            using errcode = 'check_violation';
        end if;
        insert into convites (casamento_id, nome, codigo_interno)
        values (
          p_casamento_id,
          v_convite_nome,
          'CONV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
        )
        returning id into v_convite_id;

        insert into historico_convite (casamento_id, convite_id, tipo_evento, metadados)
        values (p_casamento_id, v_convite_id, 'invite.created', jsonb_build_object('source', 'import'));

        v_convites_criados := v_convites_criados || v_convite_nome;
      end if;
    end if;

    -- ----------------------------------------------------------------
    -- Convidado
    -- ----------------------------------------------------------------
    v_id := nullif(v_linha ->> 'id', '')::uuid;

    if v_id is null then
      insert into convidados (
        casamento_id, nome_completo, apelido, sexo, data_nascimento, faixa_etaria_manual,
        email, telefone, papel_casamento, observacoes, grupo_id, convite_id
      ) values (
        p_casamento_id,
        v_linha ->> 'nome_completo',
        nullif(v_linha ->> 'apelido', ''),
        nullif(v_linha ->> 'sexo', ''),
        nullif(v_linha ->> 'data_nascimento', '')::date,
        nullif(v_linha ->> 'faixa_etaria_manual', ''),
        nullif(v_linha ->> 'email', ''),
        nullif(v_linha ->> 'telefone', ''),
        nullif(v_linha ->> 'papel_casamento', ''),
        nullif(v_linha ->> 'observacoes', ''),
        v_grupo_id,
        v_convite_id
      );
      v_criados := v_criados + 1;
    else
      -- `? 'campo'` em TODA coluna: a planilha quase nunca traz o conjunto
      -- completo, e uma de `id;nome_completo;grupo` não pode zerar o e-mail,
      -- o telefone e a data de nascimento de quem ela toca. Mesma semântica de
      -- 20260904170001, estendida a todos os campos.
      --
      -- Limpar de propósito continua funcionando: a chave vai presente com
      -- string vazia, e o `nullif` a converte em NULL.
      --
      -- `grupo_id` responde às DUAS colunas de hierarquia: uma planilha que
      -- traga só "Subdivisão" ainda descreve para onde a pessoa vai, e
      -- ignorá-la deixaria a linha sem efeito nenhum.
      update convidados set
        nome_completo = case when v_linha ? 'nome_completo' then v_linha ->> 'nome_completo' else nome_completo end,
        apelido = case when v_linha ? 'apelido' then nullif(v_linha ->> 'apelido', '') else apelido end,
        sexo = case when v_linha ? 'sexo' then nullif(v_linha ->> 'sexo', '') else sexo end,
        data_nascimento = case when v_linha ? 'data_nascimento' then nullif(v_linha ->> 'data_nascimento', '')::date else data_nascimento end,
        faixa_etaria_manual = case when v_linha ? 'faixa_etaria_manual' then nullif(v_linha ->> 'faixa_etaria_manual', '') else faixa_etaria_manual end,
        email = case when v_linha ? 'email' then nullif(v_linha ->> 'email', '') else email end,
        telefone = case when v_linha ? 'telefone' then nullif(v_linha ->> 'telefone', '') else telefone end,
        papel_casamento = case when v_linha ? 'papel_casamento' then nullif(v_linha ->> 'papel_casamento', '') else papel_casamento end,
        observacoes = case when v_linha ? 'observacoes' then nullif(v_linha ->> 'observacoes', '') else observacoes end,
        grupo_id = case when (v_linha ? 'grupo') or (v_linha ? 'subgrupo') then v_grupo_id else grupo_id end,
        convite_id = case when v_linha ? 'convite' then v_convite_id else convite_id end
      where id = v_id and casamento_id = p_casamento_id and excluido_em is null;

      if not found then
        -- Inclui o caso de um `id` de OUTRO casamento: a cláusula de
        -- casamento_id acima é o que impede uma planilha de alcançar dado
        -- alheio (CLAUDE.md, seção 4.2).
        raise exception 'CONVIDADO_INEXISTENTE:%:%', v_numero, v_id
          using errcode = 'no_data_found';
      end if;

      v_atualizados := v_atualizados + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'criados', v_criados,
    'atualizados', v_atualizados,
    'gruposCriados', to_jsonb(v_grupos_criados),
    'subgruposCriados', to_jsonb(v_subgrupos_criados),
    'convitesCriados', to_jsonb(v_convites_criados)
  );
end;
$$;

comment on function importar_convidados(uuid, jsonb, boolean) is
  'Importa um lote de convidados numa única transação. Linha com `id` atualiza (só as chaves presentes no jsonb — ausente significa "não mexer"); sem `id`, cria. `grupo` resolve entre grupos de primeiro nível e `subgrupo` sempre dentro dele; ambos, como `convite`, por nome normalizado e só criados quando p_criar_vinculos_novos é true. Não trata acompanhantes.';
