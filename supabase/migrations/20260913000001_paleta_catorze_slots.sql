-- A paleta categórica passa de 12 para 14 slots.
--
-- Por quê: o catálogo de categorias sugeridas tem treze linhas, e com uma
-- paleta de doze a décima terceira nasceria com a cor de outra — no primeiro
-- clique do casal, sem ninguém ter escolhido nada. Repetição é aceitável quando
-- o casal chega lá por conta própria; no que a plataforma sugere, é defeito de
-- fábrica.
--
-- O CUSTO, declarado: o passo de matiz deixa de ser 360/12 e passa a 360/14, o
-- que REPINTA as categorias de todos os casamentos existentes. Nenhuma linha
-- muda de slot — `cor_indice` continua o mesmo —, só o tom que aquele slot
-- produz. É porta de mão única e foi feita agora, com um punhado de casamentos,
-- porque nunca vai ser mais barata.
--
-- O número vive em dois lugares: aqui e em
-- `shared/utils/paleta-categorias.ts` (TAMANHO_PALETA_CATEGORIAS). Não há como
-- o Postgres importar a constante do TypeScript; o par tem que ser mantido à
-- mão, e é por isso que este comentário existe.

create or replace function categorias_orcamento_atribuir_cor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  proximo smallint;
begin
  if new.cor_indice is not null and new.cor_indice <> 0 then
    return new;
  end if;

  select min(slot)
    into proximo
  from generate_series(0, 13) as slot
  where slot not in (
    select cor_indice
    from categorias_orcamento
    where casamento_id = new.casamento_id
      and excluido_em is null
      and id <> new.id
  );

  -- Paleta cheia: volta a girar pela contagem, aceitando a repetição.
  if proximo is null then
    select (count(*) % 14)::smallint
      into proximo
    from categorias_orcamento
    where casamento_id = new.casamento_id
      and excluido_em is null
      and id <> new.id;
  end if;

  new.cor_indice := proximo;
  return new;
end;
$$;

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
  from generate_series(0, 13) as slot
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

comment on column categorias_orcamento.cor_indice is
  'Posição desta categoria na paleta derivada da cor tema do casamento (14 slots). É slot, não cor: trocar o tema repinta todas as categorias sem tocar em nenhuma linha. Atribuído na criação pelo menor slot livre entre as ativas (categorias_orcamento_atribuir_cor).';
