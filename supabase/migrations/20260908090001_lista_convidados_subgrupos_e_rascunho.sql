-- Fundação de dados do Modo Lista: subdivisão de grupo e rascunho da lista.
--
-- Contexto: o Modo Lista quer que o casal monte a lista como monta numa
-- planilha — blocos recolhíveis e pessoas que ainda não são decisão tomada.
-- Nenhuma das duas coisas existia no schema, e as duas são estruturais (não
-- dão para resolver na tela), daí entrarem antes da UI.
--
-- O que esta migration NÃO faz: nada em `convidados` além da coluna de
-- rascunho. Em particular, subdivisão não vira coluna nova de convidado — ver
-- a seção 1.

-- --------------------------------------------------------------------------
-- 1. Subdivisão de grupo — `grupos.grupo_pai_id`, dois níveis
-- --------------------------------------------------------------------------
--
-- "Tios paternos" dentro de "Família do Mateus" é o mesmo tipo de coisa que
-- "Família do Mateus": uma etiqueta organizacional livre (CLAUDE.md, seção 12
-- — grupo não é convite nem núcleo). Por isso é auto-referência em `grupos` e
-- não tabela nova: subgrupo herda de graça a RLS, o soft delete e o CRUD que
-- `grupos` já tem, e "promover subgrupo a grupo" fica sendo um update de uma
-- coluna em vez de mover linha entre tabelas.
--
-- Decisão importante: `convidados.grupo_id` continua sendo a ÚNICA referência
-- de grupo do convidado — ele aponta para a folha onde a pessoa está, seja ela
-- um grupo raiz ou uma subdivisão, e o grupo-pai é derivado pelo
-- `grupo_pai_id` da folha. Não existe `convidados.subgrupo_id`. Uma segunda
-- coluna criaria a classe de bug "grupo_id e subgrupo_id discordam", que não
-- tem resposta certa em tempo de leitura e apareceria como árvore incoerente
-- na tela.
--
-- `on delete restrict` acompanha o resto do projeto: grupo não some fisicamente
-- enquanto alguém o referencia (CLAUDE.md, seção 10 — soft delete via
-- `excluido_em`).

alter table grupos
  add column grupo_pai_id uuid references grupos (id) on delete restrict;

comment on column grupos.grupo_pai_id is
  'Grupo-pai desta subdivisão (ex.: "Tios paternos" dentro de "Família do Mateus"). Null = grupo raiz. Hierarquia de no máximo dois níveis, garantida por validar_grupo_pai(). O convidado sempre aponta para a folha via convidados.grupo_id — não existe subgrupo_id.';

-- Índice para "quais são as subdivisões deste grupo?", que a árvore do Modo
-- Lista faz uma vez por grupo raiz a cada carregamento.
create index grupos_grupo_pai_id_idx on grupos (grupo_pai_id) where grupo_pai_id is not null;

-- Nenhuma das quatro regras abaixo é expressável em `check`: todas comparam a
-- linha com OUTRA linha de `grupos`, e `check` só vê a própria linha. Daí o
-- trigger.
--
-- O limite de dois níveis é decisão de produto, não limitação técnica: a
-- planilha do casal tem grupo e subdivisão, e liberar profundidade arbitrária
-- transformaria a tela numa árvore de indentação infinita sem nenhum caso de
-- uso pedindo isso. É mais fácil liberar um terceiro nível depois do que
-- retirar dados de uma hierarquia que já cresceu.
--
-- `casamento_id` é DERIVADO do pai, não validado contra ele: a regra do projeto
-- é que a coluna denormalizada nunca é definida de forma independente da
-- hierarquia real (CLAUDE.md, seção 10). Com o pai presente, quem manda é o
-- pai — assim um subgrupo em casamento diferente do pai é impossível, não
-- apenas rejeitado.
--
-- O `select` abaixo roda com o privilégio de quem chamou (plpgsql é security
-- invoker por padrão), então a RLS de `grupos` continua valendo aqui: um
-- membro tentando pendurar um subgrupo num grupo de outro casamento não
-- enxerga a linha do pai e cai em GRUPO_PAI_NAO_ENCONTRADO. O trigger não é
-- um caminho novo de acesso.

create or replace function validar_grupo_pai()
returns trigger
language plpgsql
as $$
declare
  v_pai_casamento_id uuid;
  v_pai_grupo_pai_id uuid;
  v_pai_excluido_em timestamptz;
begin
  if new.grupo_pai_id is null then
    return new;
  end if;

  if new.grupo_pai_id = new.id then
    raise exception 'GRUPO_PAI_CIRCULAR' using errcode = 'check_violation';
  end if;

  select casamento_id, grupo_pai_id, excluido_em
    into v_pai_casamento_id, v_pai_grupo_pai_id, v_pai_excluido_em
  from grupos
  where id = new.grupo_pai_id;

  if not found then
    raise exception 'GRUPO_PAI_NAO_ENCONTRADO' using errcode = 'foreign_key_violation';
  end if;

  if v_pai_grupo_pai_id is not null then
    raise exception 'GRUPO_PAI_JA_E_SUBGRUPO' using errcode = 'check_violation';
  end if;

  if v_pai_excluido_em is not null then
    raise exception 'GRUPO_PAI_ARQUIVADO' using errcode = 'check_violation';
  end if;

  -- Um grupo que já tem subdivisões não pode virar subdivisão de outro: seria
  -- o terceiro nível pela porta de trás.
  if exists (select 1 from grupos where grupo_pai_id = new.id) then
    raise exception 'GRUPO_COM_SUBGRUPOS' using errcode = 'check_violation';
  end if;

  new.casamento_id := v_pai_casamento_id;

  return new;
end;
$$;

comment on function validar_grupo_pai() is
  'Garante a hierarquia de grupos em no máximo dois níveis e deriva casamento_id do grupo-pai. Ver a migration 20260908090001 para o porquê de cada regra.';

create trigger grupos_validar_grupo_pai
  before insert or update of grupo_pai_id, casamento_id on grupos
  for each row
  execute function validar_grupo_pai();

-- --------------------------------------------------------------------------
-- 2. Rascunho da lista — `convidados.em_consideracao`
-- --------------------------------------------------------------------------
--
-- "Será que convidamos o Marcelo?" é o estado mais comum de uma lista de
-- casamento em construção, e hoje não tem representação: ou a pessoa é
-- convidada (e entra em toda contagem) ou não existe. A coluna dá o terceiro
-- estado, sem inventar uma tabela paralela de "quase convidados" — que
-- duplicaria nome, contato e faixa etária e depois exigiria migrar a linha na
-- hora da decisão.
--
-- Boolean e não enum de status: o que o produto precisa distinguir é
-- exatamente "está na lista" de "ainda estamos pensando". Status de RSVP já
-- existe e é outra coisa (`respostas_rsvp`), e status de ciclo de vida do
-- convidado não é um conceito que o produto tenha.

alter table convidados
  add column em_consideracao boolean not null default false;

comment on column convidados.em_consideracao is
  'Pessoa que está no planejamento da lista mas ainda não é convidada ("Em consideração" / Rascunho da lista). NUNCA entra em contagem de convidados, em convite ou em RSVP — ver a constraint convidados_em_consideracao_sem_convite. Virar convidado de verdade é uma ação explícita do casal, nunca efeito colateral.';

-- Esta constraint é o que sustenta o invariante em todo o resto do sistema, e
-- vale mais que uma checagem em `server/api`: quase todo consumidor de
-- `convidados` já filtra por `convite_id` (RSVP, convite, payload do
-- convidado), então "rascunho não tem convite" faz esses caminhos excluírem
-- rascunho de graça, sem uma linha de código nova em cada um.
--
-- Inclusive um de segurança: a busca pública por nome
-- (server/api/public/[slug]/rsvp-search.get.ts) só devolve quem tem
-- `convite_id`, então um rascunho — "Namorada do Gustavo", "Primo da Raquel" —
-- nunca pode aparecer no site do casamento. Sem a constraint, isso passaria a
-- depender de cada endpoint lembrar de filtrar, que é exatamente o tipo de
-- garantia que o banco deve dar.

alter table convidados
  add constraint convidados_em_consideracao_sem_convite
    check (not (em_consideracao and convite_id is not null));

-- --------------------------------------------------------------------------
-- 3. `convidados_com_status` precisa ser recriada
-- --------------------------------------------------------------------------
--
-- A view expande `c.*` na criação, então `em_consideracao` não aparece nela
-- sozinha (o `create or replace` não muda a lista de colunas) — a própria
-- migration 20260904180001 registra essa manutenção. A listagem do admin lê da
-- view, e é lá que o recorte "sem rascunho" precisa ser aplicado, então sem
-- recriar a coluna simplesmente não existiria para filtrar.
--
-- `security_invoker = true` continua obrigatório (CLAUDE.md, seção 10): sem
-- isso a view roda com privilégio do dono e ignora a RLS das tabelas de
-- origem, que é o achado de segurança "Security Definer View" registrado em
-- docs/CHANGELOG.md.

drop view public.convidados_com_status;

create view public.convidados_com_status
with (security_invoker = true) as
select
  c.*,
  coalesce(r.status_rsvp, 'pendente') as status_rsvp,
  r.respondido_em
from public.convidados c
left join public.respostas_rsvp r on r.convidado_id = c.id;

comment on view public.convidados_com_status is
  'Convidados com o status de RSVP resolvido (sem resposta = pendente). Leitura da listagem/filtro do admin — escrita continua sendo sempre em convidados/respostas_rsvp. security_invoker: respeita a RLS das tabelas de origem. Inclui em_consideracao: quem lê esta view precisa decidir explicitamente se quer rascunho no recorte (o padrão do admin é não).';

grant select on public.convidados_com_status to authenticated, service_role;
