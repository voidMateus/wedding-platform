-- Financeiro: separar PLANEJAMENTO de PAGAMENTO (rodada de 2026-09-11).
--
-- A v1 tinha um valor só por despesa, e isso obrigava o casal a escrever o
-- número do contrato antes de ter contrato — ou seja, a tela de planejar só
-- funcionava depois de planejar em outro lugar. Agora são dois valores, que
-- respondem perguntas de momentos diferentes:
--
--   valor_estimado_centavos  "quanto eu acho que isso vai custar?"  (planejar)
--   valor_centavos           "por quanto eu fechei?"                (contratar)
--
-- E é por isso que `valor_centavos` passa a aceitar NULL: gasto planejado e
-- ainda não contratado é o estado NORMAL do começo de um casamento, não uma
-- linha incompleta. Só o que tem custo final vira compromisso — e só
-- compromisso entra em "contratado", gera parcela e aparece em Pagamentos.
--
-- Nenhum dado existente se perde: a migration copia o valor atual para o
-- estimado, porque toda despesa cadastrada até aqui foi cadastrada como
-- "valor acordado" e continua valendo como as duas coisas.

alter table despesas
  add column valor_estimado_centavos integer
    check (valor_estimado_centavos is null or valor_estimado_centavos >= 0);

alter table despesas
  alter column valor_centavos drop not null;

update despesas
set valor_estimado_centavos = valor_centavos
where valor_estimado_centavos is null;

comment on column despesas.valor_estimado_centavos is
  'Custo ESTIMADO do gasto — o número do planejamento, anterior a qualquer contrato. Nulo quando o casal partiu direto para o valor fechado.';

comment on column despesas.valor_centavos is
  'Custo FINAL (contratado). NULO enquanto o gasto é só planejamento: é o preenchimento desta coluna que transforma o gasto em compromisso, o faz contar como "contratado" e o manda para Pagamentos.';

-- Um gasto precisa de pelo menos um dos dois números para existir: sem
-- estimado e sem final ele não diz nada nem ao planejamento nem ao caixa.
alter table despesas
  add constraint despesas_tem_algum_valor
    check (num_nonnulls(valor_estimado_centavos, valor_centavos) >= 1);
