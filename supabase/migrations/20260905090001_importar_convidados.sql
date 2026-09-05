-- Importação em massa de convidados a partir de uma planilha.
--
-- Por que uma função Postgres, e não um laço de `sincronizar_nucleo_convidado`
-- na aplicação:
--
-- 1. **Atomicidade do lote.** Importar 300 pessoas com 20 convites novos por
--    laço de RPC deixaria metade da planilha aplicada se a linha 150 falhasse
--    — pior que não importar nada, porque ninguém sabe onde parou. Aqui o lote
--    inteiro entra ou nada entra.
-- 2. **Round-trips.** Um laço de RPC seria uma ida ao banco por convidado.
-- 3. **Resolução de vínculo sem corrida.** Vinte linhas citando "Família
--    Silva" precisam criar UM convite, não vinte. Resolver por nome dentro da
--    mesma transação, com índice único parcial garantindo o resto, é a única
--    forma correta (mesmo raciocínio do CLAUDE.md seção 10 para estoque).
--
-- O que esta função deliberadamente NÃO faz: acompanhantes
-- (`nucleos_acompanhantes`). O conceito é simétrico e não cabe numa coluna de
-- planilha sem inventar sintaxe; pessoas sob o mesmo `convite` já cobrem a
-- intenção real ("essas quatro receberam o mesmo convite"), que é o que
-- habilita o RSVP.

-- --------------------------------------------------------------------------
-- Comparação de nome para resolver os vínculos
-- --------------------------------------------------------------------------
--
-- Sem acento e sem caixa para "familia silva" e "Família Silva" resolverem
-- para a mesma linha: senão cada variação de acentuação da planilha criaria um
-- grupo novo, que é exatamente a bagunça que a importação deveria evitar.
-- `unaccent` já é usado por `convidado_nome_corresponde`.

create or replace function nome_normalizado(p_nome text)
returns text
language sql
stable
as $$
  select unaccent(lower(trim(coalesce(p_nome, ''))));
$$;

comment on function nome_normalizado(text) is
  'Forma canônica de um nome para comparação (sem acento, minúsculo, sem espaço nas pontas). Usada pela importação para resolver grupo/convite por nome.';

-- Deliberadamente SEM índice único sobre esta expressão, embora ele fosse o
-- reflexo natural aqui. Dois motivos, os dois verificados antes de decidir:
--
-- 1. Já existem convites com nome repetido em base real (dois "Família Teste"
--    no ambiente de dev) — a migration falharia na criação do índice.
-- 2. Nem `sincronizar_nucleo_convidado` nem o "Criar novo grupo" embutido no
--    wizard checam nome antes de inserir. Um índice único faria os dois
--    passarem a estourar erro cru de banco em cima do casal, o que é uma
--    mudança de comportamento bem além da importação.
--
-- A resolução correta dentro de um lote não depende do índice: as 20 linhas
-- que citam "Família Silva" veem a linha inserida pela primeira delas, porque
-- estão na mesma transação. O índice só protegeria contra duas importações
-- simultâneas — cenário que não justifica o risco acima.
--
-- Também sem índice de busca: `grupos` e `convites` têm dezenas de linhas por
-- casamento, e uma varredura sequencial nessa escala é mais barata que manter
-- um índice de expressão.

-- --------------------------------------------------------------------------
-- importar_convidados
-- --------------------------------------------------------------------------

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
  v_convite_nome text;
  v_grupo_id uuid;
  v_convite_id uuid;
  v_criados int := 0;
  v_atualizados int := 0;
  v_grupos_criados text[] := '{}';
  v_convites_criados text[] := '{}';
  v_numero int := 0;
begin
  for v_linha in select * from jsonb_array_elements(coalesce(p_linhas, '[]'::jsonb))
  loop
    v_numero := v_numero + 1;
    v_grupo_id := null;
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
      select id into v_grupo_id
      from grupos
      where casamento_id = p_casamento_id
        and excluido_em is null
        and nome_normalizado(nome) = nome_normalizado(v_grupo_nome);

      if v_grupo_id is null then
        if not p_criar_vinculos_novos then
          raise exception 'GRUPO_INEXISTENTE:%:%', v_numero, v_grupo_nome
            using errcode = 'check_violation';
        end if;
        insert into grupos (casamento_id, nome) values (p_casamento_id, v_grupo_nome)
        returning id into v_grupo_id;
        v_grupos_criados := v_grupos_criados || v_grupo_nome;
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
        grupo_id = case when v_linha ? 'grupo' then v_grupo_id else grupo_id end,
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
    'convitesCriados', to_jsonb(v_convites_criados)
  );
end;
$$;

comment on function importar_convidados(uuid, jsonb, boolean) is
  'Importa um lote de convidados numa única transação. Linha com `id` atualiza (só as chaves presentes no jsonb — ausente significa "não mexer"); sem `id`, cria. `grupo`/`convite` são resolvidos por nome normalizado e só criados quando p_criar_vinculos_novos é true. Não trata acompanhantes.';
