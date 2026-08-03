-- "Criança" nunca é um campo manual — é sempre calculada a partir de
-- birth_date + weddings.child_max_age (CLAUDE.md, seção 15.2). Sem
-- birth_date, o convidado conta como adulto (decisão explícita).

create function guest_is_child(p_birth_date date, p_wedding_id uuid)
returns boolean
language sql
stable
as $$
  select case
    when p_birth_date is null then false
    else extract(year from age(current_date, p_birth_date)) <= (
      select child_max_age from weddings where id = p_wedding_id
    )
  end;
$$;

comment on function guest_is_child(date, uuid) is
  'true se a idade do convidado (calculada a partir de birth_date) for <= weddings.child_max_age. Sem birth_date, sempre false (conta como adulto).';
