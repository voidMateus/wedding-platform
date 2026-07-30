-- Extensões e utilitários compartilhados por todas as migrations seguintes.
-- Ver CLAUDE.md, seção 11.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- Toda tabela do domínio possui created_at/updated_at (CLAUDE.md, seção 11).
-- Esta função é anexada via trigger BEFORE UPDATE em cada tabela.
create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function set_updated_at() is
  'Mantém updated_at sincronizado em qualquer UPDATE — anexada via trigger em cada tabela do domínio.';
