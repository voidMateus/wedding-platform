-- Fase 5 do Hub: a ficha do casamento no painel interno — excluir
-- (docs/fase5-multievento.md seção 6.6).
--
-- Excluir um casamento é a ação mais destrutiva do produto: as 34 FKs que
-- apontam para `casamentos` têm `on delete cascade`, então a linha leva junto
-- convidados, convites, respostas, presentes, pagamentos, mesas, documentos e
-- a própria trilha de auditoria.
--
-- E é exatamente aí que está o problema que esta migration resolve: o registro
-- da exclusão NÃO pode morar em `trilha_auditoria`, porque ela cascateia com o
-- casamento. Um registro que desaparece junto com o que ele descreve não é
-- registro nenhum -- e deixar a exclusão de um tenant sem rastro é o oposto do
-- que esta fase veio fazer.

create table exclusoes_de_casamento (
  id uuid primary key default gen_random_uuid(),
  -- Sem FK, de propósito: a linha referenciada não existe mais. É o id
  -- histórico, para cruzar com o que porventura tenha sobrado (arquivo de
  -- storage órfão, por exemplo).
  casamento_id uuid not null,
  slug citext not null,
  nomes_noivos text not null,
  data_evento date not null,
  status_ciclo_vida text not null,
  -- Fotografia do porte no momento da exclusão: depois não há como recontar.
  contagem_convidados integer not null default 0,
  operador_id uuid references operadores_plataforma (usuario_id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table exclusoes_de_casamento is
  'O que foi excluído, por quem e quando — append-only, e deliberadamente FORA de trilha_auditoria, que cascateia com o casamento (docs/fase5-multievento.md 6.6). Sem updated_at: um registro de exclusão nunca é editado.';
comment on column exclusoes_de_casamento.casamento_id is
  'Id do casamento que existiu. Sem FK: a linha já não existe quando esta é escrita.';
comment on column exclusoes_de_casamento.operador_id is
  '`on delete set null` pelo mesmo motivo de trilha_auditoria.autor_operador_id: o registro do que aconteceu sobrevive à saída de quem agiu.';

create index exclusoes_de_casamento_created_at_idx on exclusoes_de_casamento (created_at desc);

alter table exclusoes_de_casamento enable row level security;

-- Nenhuma policy: deny-by-default. Só o caminho Plataforma escreve e lê,
-- sempre via service_role depois de requirePlatformOperator() (CLAUDE.md 4.2)
-- — e nenhum casal tem por que ver a lista de exclusões da plataforma.

-- =========================================================================
-- Excluir: a fotografia e a exclusão, numa transação só
-- =========================================================================

create function excluir_casamento(p_casamento_id uuid, p_operador uuid)
returns exclusoes_de_casamento
language plpgsql
security definer
set search_path = public
as $$
declare
  v_casamento casamentos;
  v_convidados integer;
  v_registro exclusoes_de_casamento;
begin
  select * into v_casamento from casamentos where id = p_casamento_id;
  if not found then
    raise exception 'casamento não encontrado: %', p_casamento_id
      using errcode = 'no_data_found';
  end if;

  -- Rascunho da lista nunca conta (CLAUDE.md seção 12): o porte registrado
  -- aqui tem que ser o mesmo que o painel mostrava um instante antes.
  select count(*) into v_convidados
  from convidados
  where casamento_id = p_casamento_id
    and excluido_em is null
    and em_consideracao = false;

  -- A fotografia ANTES do delete: depois não há de onde tirar.
  insert into exclusoes_de_casamento (
    casamento_id, slug, nomes_noivos, data_evento, status_ciclo_vida,
    contagem_convidados, operador_id
  )
  values (
    v_casamento.id, v_casamento.slug, v_casamento.nomes_noivos, v_casamento.data_evento,
    v_casamento.status_ciclo_vida, v_convidados, p_operador
  )
  returning * into v_registro;

  -- As 34 FKs com `on delete cascade` fazem o resto. O que NÃO sai daqui são
  -- os arquivos em storage.objects, que não estão no grafo de relações — quem
  -- chama remove depois, e um arquivo órfão é resíduo barato perto de um
  -- tenant meio excluído.
  delete from casamentos where id = p_casamento_id;

  return v_registro;
end;
$$;

comment on function excluir_casamento(uuid, uuid) is
  'Registra a exclusão e exclui, numa transação (docs/fase5-multievento.md 6.6). Chamada apenas por DELETE /api/platform/weddings/[id], depois de requirePlatformOperator().';

revoke execute on function excluir_casamento(uuid, uuid) from public;
revoke execute on function excluir_casamento(uuid, uuid) from anon;
revoke execute on function excluir_casamento(uuid, uuid) from authenticated;
grant execute on function excluir_casamento(uuid, uuid) to service_role;
