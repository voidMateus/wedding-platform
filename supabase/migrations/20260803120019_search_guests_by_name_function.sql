-- Centraliza a busca tolerante de convidados por nome (guest_name_matches,
-- Fase 1) numa única função SQL — reaproveitada pela busca pública de RSVP
-- e pela busca administrativa global (CLAUDE.md, seção 12.1), evitando
-- reimplementar a mesma regra de tokenização em dois lugares.

create function search_guests_by_name(p_wedding_id uuid, p_query text, p_limit integer default 8)
returns table (id uuid, full_name text, nickname text)
language sql
stable
as $$
  select g.id, g.full_name, g.nickname
  from guests g
  where g.wedding_id = p_wedding_id
    and g.deleted_at is null
    and guest_name_matches(g.full_name, g.nickname, p_query)
  order by g.full_name
  limit p_limit;
$$;

comment on function search_guests_by_name(uuid, text, integer) is
  'Busca tolerante de convidados por nome, reutilizada pela busca pública de RSVP (sem convite/status) e pela busca administrativa global (CLAUDE.md, seção 12.1).';
