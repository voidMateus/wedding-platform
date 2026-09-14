-- Planejamento (Fase 3 do Hub) — a checklist do casal.
-- Refinamento completo em docs/fase3-planejamento.md.
--
-- O módulo responde a única pergunta grande que o Hub ainda não respondia: "o
-- que eu faço agora, e estou atrasado?". Convidados diz quem vem, Financeiro
-- diz quanto custa, o site diz o que o convidado vê — e nenhuma dessas é a
-- primeira pergunta de um casal que acabou de marcar a data.
--
-- A REGRA QUE ORGANIZA A FASE INTEIRA:
--
--   O sistema decide o que OFERECER. O casal decide o que EXISTE e o que
--   está FEITO.
--
-- O produto sabe coisas que nenhuma checklist de mercado sabe (a data do
-- evento, quais gastos estão contratados, quais convites saíram). Esse saber
-- entra na decisão de qual SUGESTÃO mostrar, nunca na de marcar tarefa como
-- concluída: "contratar o buffet" só se resolveria por heurística (qual gasto
-- é *o* buffet?), e uma tarefa que se desmarca sozinha porque o casal
-- reclassificou um gasto apaga trabalho declarado por causa de uma inferência.
-- A assimetria é de custo do erro — deixar de sugerir custa um clique; marcar
-- errado custa a confiança na tela inteira.
--
-- É por isso que esta migration não cria NENHUM vínculo com despesas,
-- convites ou mesas. O único traço de sugestão que fica gravado é
-- `origem_catalogo`, e ele existe para a sugestão sumir do rodapé — não para
-- fechar caixinha.

-- ===========================================================================
-- A fila de jobs libera o nome `tarefas`
-- ===========================================================================
-- `tarefas` veio de `jobs` na remodelagem para português e é a fila de
-- processamento assíncrono: vazia, sem nenhum código chamador, documentada em
-- docs/ARCHITECTURE.md seção 3.4 como "ainda não implementada".
--
-- No vocabulário do produto, tarefa é o que o CASAL faz. Deixar as duas
-- coexistir como `tarefas` (fila) e `tarefas_planejamento` (checklist) seria
-- uma armadilha de leitura permanente para quem abrisse o schema. O rename
-- custa esta seção, um arquivo de teste de RLS e dois docs — e nunca será mais
-- barato do que agora, com a tabela ainda sem uma linha (mesmo argumento que
-- levou a paleta a catorze slots).
alter table tarefas rename to fila_processamento;

alter index tarefas_status_executar_em_idx rename to fila_processamento_status_executar_em_idx;
alter index tarefas_casamento_id_idx rename to fila_processamento_casamento_idx;
alter trigger tarefas_set_updated_at on fila_processamento rename to fila_processamento_set_updated_at;
alter policy tarefas_select_membro on fila_processamento rename to fila_processamento_select_membro;
alter policy tarefas_insert_membro on fila_processamento rename to fila_processamento_insert_membro;

comment on table fila_processamento is
  'Fila de processamento assíncrono consumida pelo worker (docs/ARCHITECTURE.md seção 3.4) — ainda não implementada. Chamava-se tarefas até a Fase 3 do Hub, que deu esse nome à checklist do casal.';

-- ===========================================================================
-- tarefas — a checklist
-- ===========================================================================
create table tarefas (
  id uuid primary key default gen_random_uuid(),
  casamento_id uuid not null references casamentos (id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  observacao text,
  -- Data, não timestamp: prazo de casamento é um dia, e guardar hora obrigaria
  -- a escolher uma ("às 00:00 de sexta?") que ninguém digitou.
  prazo date,
  responsavel text,
  concluida_em timestamptz,
  origem_catalogo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table tarefas is
  'Checklist do casal: o que falta fazer até o casamento. Nenhuma linha nasce de sugestão — o catálogo vive em shared/planejamento-tarefas.ts e só o clique do casal cria (docs/fase3-planejamento.md seção 6.2).';
comment on column tarefas.prazo is
  'NULO É ESTADO VÁLIDO: "quero fazer, não sei quando". Também é como nasce toda tarefa criada a partir de uma sugestão de fase já passada — o sistema não inventa atraso para quem descobriu o produto a quatro meses do casamento.';
comment on column tarefas.concluida_em is
  'ÚNICA fonte de "feita". "Atrasada", "para esta semana" e "concluída" são todas derivadas daqui e de prazo contra hoje — nunca uma coluna de status a sincronizar (mesma lição de pago_em e de status_convite).';
comment on column tarefas.responsavel is
  'Texto livre ("Noiva", "Mãe do noivo", "Carol (cerimonial)"), NUNCA uma FK para membros_casamento: quem executa tarefa de casamento quase nunca tem login, e exigir um excluiria justamente a maioria.';
comment on column tarefas.origem_catalogo is
  'Chave estável da sugestão que criou esta tarefa; nulo quando o casal digitou do zero. É por ela que a sugestão some do rodapé — e não por comparação de texto, que quebraria assim que o casal renomeasse a tarefa (diferente do catálogo de gastos, que casa por nome de propósito).';

create index tarefas_casamento_idx on tarefas (casamento_id, prazo);

-- Clique duplo numa sugestão não pode virar duas tarefas. Parcial porque
-- `origem_catalogo` é nulo na maioria das linhas — e duas tarefas digitadas à
-- mão com o mesmo nome são problema de ninguém.
create unique index tarefas_origem_catalogo_key
  on tarefas (casamento_id, origem_catalogo)
  where origem_catalogo is not null;

create trigger tarefas_set_updated_at
  before update on tarefas
  for each row
  execute function atualizar_timestamp();

-- EXCLUSÃO FÍSICA, contra a convenção de soft delete e pelo mesmo motivo de
-- mesas e etapas_evento: nenhuma outra tabela referencia uma tarefa, e ela não
-- tem valor histórico próprio. Excluir aqui é "não vou fazer isso", não "isto
-- deixou de ter acontecido".
alter table tarefas enable row level security;

create policy tarefas_select_membro on tarefas
  for select to authenticated using (is_membro_casamento(casamento_id));
create policy tarefas_insert_membro on tarefas
  for insert to authenticated with check (is_membro_casamento(casamento_id));
create policy tarefas_update_membro on tarefas
  for update to authenticated
  using (is_membro_casamento(casamento_id))
  with check (is_membro_casamento(casamento_id));
create policy tarefas_delete_membro on tarefas
  for delete to authenticated using (is_membro_casamento(casamento_id));

-- Sem policy pública, como todo dado do Hub: "ainda não escolhemos o
-- celebrante" não é informação de convidado.
