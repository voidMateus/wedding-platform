-- A negociação com um fornecedor tem mais de quatro momentos.
--
-- `pesquisando -> em_negociacao -> contratado` escondia as duas etapas que o
-- casal mais repete no meio: "já falei com ele" e "já mandou o preço". Sem
-- elas, um fornecedor de quem se espera resposta lia igual a um que ainda nem
-- foi procurado — e é justamente aí que a lista precisa dizer de quem cobrar.
--
-- A ordem da progressão vive no código (`ESTAGIOS_FORNECEDOR`), não numa coluna
-- de posição: é sequência de vocabulário, não dado do casal.

alter table fornecedores
  drop constraint if exists fornecedores_estagio_check;

alter table fornecedores
  add constraint fornecedores_estagio_check
  check (
    estagio in (
      'pesquisando',
      'contato_feito',
      'cotacao_recebida',
      'em_negociacao',
      'contratado',
      'descartado'
    )
  );

comment on column fornecedores.estagio is
  'Etapa da negociação, escolhida pelo casal: pesquisando -> contato_feito -> cotacao_recebida -> em_negociacao -> contratado, com descartado fora da linha. NUNCA tem valor "pago": a situação financeira do fornecedor é derivada das parcelas das despesas ligadas a ele.';

-- Nenhum dado é remapeado: os quatro valores antigos continuam válidos e
-- significam o mesmo. Os dois novos só passam a ser escolhíveis.
