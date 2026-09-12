-- Restaurar uma categoria não pode devolvê-la com a cor de outra.
--
-- O slot é atribuído na criação pelo menor livre entre as ATIVAS, e arquivar
-- libera o slot para a próxima categoria criada — que é o comportamento certo
-- (excluir uma categoria não repinta as outras). A consequência é que o slot
-- guardado na arquivada pode estar ocupado quando ela voltar, e aí duas
-- categorias ativas dividiriam a mesma cor — exatamente o que a paleta existe
-- para evitar.
--
-- Só o retorno é tratado: quem está ativa nunca muda de cor sozinha, e
-- arquivar continua não mexendo em ninguém.

create or replace function categorias_orcamento_cor_ao_restaurar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  proximo smallint;
begin
  -- Só na transição arquivada -> ativa.
  if old.excluido_em is null or new.excluido_em is not null then
    return new;
  end if;

  -- Slot ainda livre: a categoria volta com a cor que sempre teve.
  if not exists (
    select 1
    from categorias_orcamento
    where casamento_id = new.casamento_id
      and excluido_em is null
      and id <> new.id
      and cor_indice = new.cor_indice
  ) then
    return new;
  end if;

  select min(slot)
    into proximo
  from generate_series(0, 11) as slot
  where slot not in (
    select cor_indice
    from categorias_orcamento
    where casamento_id = new.casamento_id
      and excluido_em is null
      and id <> new.id
  );

  -- Paleta cheia: a repetição é inevitável, e manter o slot antigo é melhor
  -- que sortear outro igualmente repetido.
  if proximo is not null then
    new.cor_indice := proximo;
  end if;

  return new;
end;
$$;

create trigger categorias_orcamento_cor_ao_restaurar
  before update on categorias_orcamento
  for each row
  execute function categorias_orcamento_cor_ao_restaurar();
