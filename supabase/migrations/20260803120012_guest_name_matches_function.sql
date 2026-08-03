-- Busca tolerante de nome (CLAUDE.md, seção 12.1) — nome completo, primeiro
-- nome, sobrenome, apelido, busca parcial, maiúsc./minúsc., acentuação e
-- ordem invertida ("Silva Mateus" deve achar "Mateus Silva"). Reaproveitada
-- tanto pela busca pública de RSVP quanto pela busca administrativa global —
-- uma única função evita duplicar a mesma regra de tokenização em dois
-- lugares (Fases 5 e 6).

create extension if not exists unaccent;

create function guest_name_matches(p_full_name text, p_nickname text, p_query text)
returns boolean
language sql
stable
as $$
  select coalesce(
    (
      select bool_and(unaccent(lower(p_full_name || ' ' || coalesce(p_nickname, ''))) like '%' || unaccent(lower(word)) || '%')
      from unnest(regexp_split_to_array(trim(p_query), '\s+')) as word
      where word <> ''
    ),
    false
  );
$$;

comment on function guest_name_matches(text, text, text) is
  'Correspondência tolerante: divide p_query em palavras e exige que todas apareçam (em qualquer ordem) no nome completo + apelido, ignorando acentuação e caixa. "Silva Mateus" encontra "Mateus Silva".';
