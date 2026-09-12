-- Cor da categoria como SLOT persistente, nunca como HEX gravado.
--
-- A paleta não mora no banco: ela é derivada em runtime da cor tema do
-- casamento (`shared/utils/paleta-categorias.ts`), girando a matiz com
-- saturação e luminosidade presas numa faixa estreita. O que a linha guarda é
-- só a POSIÇÃO dela nessa paleta.
--
-- Guardar o HEX gerado seria o erro simétrico: o casal troca o tema do
-- casamento de borgonha para azul e as categorias continuariam borgonha,
-- porque a cor teria virado dado em vez de derivação.
--
-- E o slot não pode vir de hash do id: duas categorias colidiriam no mesmo
-- tom, que é exatamente o que a paleta existe para evitar.

alter table categorias_orcamento
  add column cor_indice smallint not null default 0 check (cor_indice >= 0),
  add column cor_personalizada text
    check (cor_personalizada is null or cor_personalizada ~* '^#[0-9a-f]{6}$');

comment on column categorias_orcamento.cor_indice is
  'Posição desta categoria na paleta derivada da cor tema do casamento. É slot, não cor: trocar o tema repinta todas as categorias sem tocar em nenhuma linha. Atribuído na criação pelo menor slot livre entre as ativas (categorias_orcamento_atribuir_cor).';
comment on column categorias_orcamento.cor_personalizada is
  'Override manual em HEX. Nulo (o normal) = a cor vem de cor_indice e acompanha o tema; preenchido = o casal fixou aquela cor para esta categoria.';

-- ---------------------------------------------------------------------------
-- Backfill determinístico, sem alterar ordem nem associação de nada
-- ---------------------------------------------------------------------------
-- A ordem de exibição é a ordem em que o casal já vê as categorias, então ela
-- é o critério: a primeira categoria fica com o slot 0, a segunda com o 1, e
-- assim por diante. `created_at` e `id` entram só como desempate estável — sem
-- eles, duas categorias com a mesma `ordem_exibicao` poderiam trocar de cor
-- entre uma execução e outra.
--
-- 12 é o tamanho da paleta (TAMANHO_PALETA_CATEGORIAS). Passando de 12
-- categorias ativas os slots voltam a se repetir, o que é aceitável: quem tem
-- 13 categorias financeiras já não distingue 13 cores.
with numeradas as (
  select
    id,
    (row_number() over (
      partition by casamento_id
      order by ordem_exibicao, created_at, id
    ) - 1) % 12 as slot
  from categorias_orcamento
  where excluido_em is null
)
update categorias_orcamento as c
set cor_indice = numeradas.slot
from numeradas
where c.id = numeradas.id;

-- Arquivadas também recebem um slot, para restaurar não trazer a categoria
-- sem cor. Elas ficam depois das ativas na contagem.
with numeradas as (
  select
    id,
    (row_number() over (
      partition by casamento_id
      order by ordem_exibicao, created_at, id
    ) - 1) % 12 as slot
  from categorias_orcamento
  where excluido_em is not null
)
update categorias_orcamento as c
set cor_indice = numeradas.slot
from numeradas
where c.id = numeradas.id;

-- ---------------------------------------------------------------------------
-- Atribuição na criação: o menor slot livre, sem remapear ninguém
-- ---------------------------------------------------------------------------
-- Só quando o insert não trouxe um slot explícito (cor_indice = 0 é o default,
-- e "0" também é um slot legítimo — por isso a decisão é tomada sobre a
-- ausência de categorias ativas usando o 0, não sobre o valor em si).
--
-- Excluir uma categoria LIBERA o slot dela para a próxima criada; as demais
-- não mudam de cor. É o oposto de renumerar por posição, onde apagar a segunda
-- categoria repintaria todas as seguintes.
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
  from generate_series(0, 11) as slot
  where slot not in (
    select cor_indice
    from categorias_orcamento
    where casamento_id = new.casamento_id
      and excluido_em is null
      and id <> new.id
  );

  -- Paleta cheia: volta a girar pela contagem, aceitando a repetição.
  if proximo is null then
    select (count(*) % 12)::smallint
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

create trigger categorias_orcamento_atribuir_cor
  before insert on categorias_orcamento
  for each row
  execute function categorias_orcamento_atribuir_cor();
