-- Repara o vínculo fornecedor <-> gasto que a contratação gravava só de um lado.
--
-- `POST /api/finance/vendors/:id/contract` preenchia `despesas.fornecedor_id` e
-- esquecia `fornecedores.despesa_id`. O efeito era visível: a tela de
-- Fornecedores agrupa as cotações pelo gasto que elas disputam, então o
-- fornecedor recém-contratado caía em "Sem gasto definido" enquanto Pagamentos
-- já exibia o nome dele no gasto — duas telas descrevendo o mesmo contrato de
-- formas diferentes.
--
-- O código passou a gravar os dois lados; esta migration acerta o que já está
-- gravado. Só onde a resposta é única: fornecedor apontado por exatamente um
-- gasto ativo. Com dois ou mais, qualquer escolha seria um palpite, e a tela
-- continua mostrando o fornecedor em "Sem gasto definido" — que é honesto.

update fornecedores as f
set despesa_id = escolhido.despesa_id
from (
  select d.fornecedor_id, min(d.id::text)::uuid as despesa_id
  from despesas d
  where d.fornecedor_id is not null
    and d.excluido_em is null
  group by d.fornecedor_id
  having count(*) = 1
) as escolhido
where f.id = escolhido.fornecedor_id
  and f.despesa_id is null
  and f.excluido_em is null;
