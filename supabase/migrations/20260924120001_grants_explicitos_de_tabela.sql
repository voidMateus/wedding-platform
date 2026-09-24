-- A partir de 30/10/2026 o Supabase deixa de conceder, sozinho, acesso da
-- Data API às tabelas NOVAS do schema public -- e isso vale também para
-- migration: tabela criada sem GRANT nasce inalcançável por anon,
-- authenticated E service_role (erro 42501), inclusive em projeto novo e em
-- `supabase db reset`.
--
-- Nenhuma das 39 tabelas abaixo tinha GRANT em migration nenhuma: todas
-- dependiam do default privilege que o projeto hospedado traz de fábrica. É a
-- mesma lição de 20260924110001 (EXECUTE de função), agora para tabela: **a
-- permissão é declarada, nunca herdada**. Depender do que o ambiente concede
-- por padrão é depender de uma diferença entre ambientes que ninguém vê até
-- ela morder -- e, desta vez, com data marcada.
--
-- EM dev/prod ESTA MIGRATION NÃO MUDA NADA. Ela repete exatamente o que as
-- tabelas já têm hoje (o bootstrap de fábrica concede DML amplo aos três
-- papéis), e GRANT repetido é no-op. O que ela muda é o que o repositório
-- AFIRMA: montado só pelas migrations -- projeto novo, recuperação de
-- desastre, o stack local do CI --, o banco agora chega ao mesmo estado de
-- prod.
--
-- `anon` recebe DML amplo aqui porque é o estado atual e mudá-lo não é o
-- objetivo desta migration: GRANT é só o pré-requisito para a policy de RLS
-- ser avaliada, e quem decide linha a linha continua sendo a RLS (CLAUDE.md
-- seções 4.2 e 10). Tabela NOVA não herda esse padrão: concede a `anon` só
-- quando tem policy de leitura pública.
--
-- E, com isto, `supabase/seed.sql` deixa de conceder qualquer coisa: o grant
-- amplo de lá mascarava justamente a falha que 30/10 vai produzir -- no CI,
-- uma tabela sem GRANT ganhava acesso pelo seed, a suíte passava, e o
-- `db push` para prod (que nunca roda o seed) criava a tabela fechada.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on table
  acompanhantes_avulsos,
  assinaturas,
  casamentos,
  categorias_orcamento,
  categorias_presentes,
  comunicacoes,
  conexoes_galeria,
  contadores_uso,
  contribuicoes_presentes,
  convidados,
  convites,
  credenciais_acesso_convite,
  despesas,
  documentos,
  elementos_planta,
  etapas_evento,
  etiquetas_convite,
  eventos_email,
  exclusoes_de_casamento,
  fila_processamento,
  fornecedores,
  fotos,
  funcionalidades_habilitadas,
  grupos,
  historico_convite,
  membros_casamento,
  mesas,
  nucleos_acompanhantes,
  operadores_plataforma,
  pagamentos_presentes,
  parcelas_despesa,
  planos,
  presentes,
  reservas_presentes,
  respostas_rsvp,
  tarefas,
  trilha_auditoria,
  trilha_auditoria_plataforma,
  vinculos_convite_etiqueta
to anon, authenticated, service_role;
