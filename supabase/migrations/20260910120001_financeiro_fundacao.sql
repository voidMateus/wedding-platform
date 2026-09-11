-- Financeiro (Fase 1 do Hub) — fundação de dados: orçamento, fornecedores e
-- documentos. Refinamento completo em docs/fase1-financeiro.md.
--
-- O dinheiro tem TRÊS NÍVEIS, e cada um responde uma pergunta diferente:
--
--   categorias_orcamento  "quanto imaginávamos gastar?"   (planejamento)
--     despesas            "quanto já contratamos?"        (compromisso)
--       parcelas_despesa  "quanto já saiu / ainda sai?"   (caixa e futuro)
--
-- Quatro decisões estruturais entram aqui, todas registradas no refinamento:
--
-- 1. NENHUM ESTADO DE PAGAMENTO É GRAVADO. `parcelas_despesa.pago_em` é a
--    única fonte: "paga / a vencer / vencida" é sempre derivado dele e de
--    `vence_em` contra a data de hoje. Uma coluna `status` aqui seria a mesma
--    dívida que `convites.status_convite` virou — um fato já contado por um
--    timestamp, duplicado numa coluna a manter sincronizada.
--
-- 2. O VALOR DA DESPESA E A SOMA DAS PARCELAS PODEM DIVERGIR, de propósito.
--    "Entrada de R$ 5.000 e o resto a combinar" é o caso normal de um
--    casamento, não a exceção. Nenhum CHECK amarra os dois: a divergência é
--    exibida na tela ("R$ 6.000 ainda não parcelados"), e um CHECK aqui só
--    ensinaria o casal a mentir o valor para conseguir salvar.
--
-- 3. FORNECEDOR NÃO GUARDA O VALOR DO CONTRATO. Guarda contato, estágio e a
--    cotação (`valor_proposto_centavos`, que não entra em total nenhum). Três
--    buffets concorrentes inflariam o orçamento se cada proposta contasse
--    como compromisso — o compromisso é sempre uma despesa. E `estagio` nunca
--    tem o valor 'pago': a situação financeira do fornecedor é derivada das
--    parcelas das despesas ligadas a ele.
--
-- 4. O TETO GLOBAL É SEPARADO DA SOMA DAS CATEGORIAS. "Temos R$ 100 mil" é
--    dito antes de existir uma categoria, e a distribuição quase nunca soma
--    exatamente o teto — é a diferença entre os dois que responde "já
--    distribuí tudo que tenho?".

-- ===========================================================================
-- Teto global do casamento
-- ===========================================================================
alter table casamentos
  add column orcamento_total_centavos integer
    check (orcamento_total_centavos is null or orcamento_total_centavos >= 0);

comment on column casamentos.orcamento_total_centavos is
  'Teto global que o casal tem para o casamento inteiro. NULO é estado normal (sem teto definido), não pendência. Nunca é a soma de categorias_orcamento.valor_previsto_centavos — é a comparação entre os dois que interessa.';

-- ===========================================================================
-- categorias_orcamento — a taxonomia ÚNICA do módulo
-- ===========================================================================
-- Compartilhada por despesas e fornecedores de propósito: duas listas de
-- categoria ("Buffet" de despesa != "Buffet" de fornecedor) divergiriam na
-- primeira renomeação, e nada acusaria.
create table categorias_orcamento (
  id uuid primary key default gen_random_uuid(),
  casamento_id uuid not null references casamentos (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  valor_previsto_centavos integer not null default 0 check (valor_previsto_centavos >= 0),
  ordem_exibicao integer not null default 0,
  excluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table categorias_orcamento is
  'Categoria do orçamento (Buffet, Espaço, Fotografia...). Taxonomia única do módulo Financeiro: usada por despesas e por fornecedores.';
comment on column categorias_orcamento.valor_previsto_centavos is
  'O teto PLANEJADO para a categoria — nunca a soma das despesas dela, que é o contratado. A distância entre os dois é o "falta contratar".';
comment on column categorias_orcamento.excluido_em is
  'Soft delete: despesas.categoria_id e fornecedores.categoria_id referenciam esta linha mesmo depois de arquivada.';

create index categorias_orcamento_casamento_id_idx
  on categorias_orcamento (casamento_id, ordem_exibicao);

-- Nome duplicado quebra o total mental do casal antes de quebrar qualquer
-- código: duas linhas "Buffet" com R$ 12.500 cada parecem um orçamento de
-- R$ 25.000 bem distribuído.
create unique index categorias_orcamento_nome_ativo_key
  on categorias_orcamento (casamento_id, lower(nome))
  where excluido_em is null;

create trigger categorias_orcamento_set_updated_at
  before update on categorias_orcamento
  for each row
  execute function atualizar_timestamp();

alter table categorias_orcamento enable row level security;

create policy categorias_orcamento_select_membro on categorias_orcamento
  for select to authenticated using (is_membro_casamento(casamento_id));
create policy categorias_orcamento_insert_membro on categorias_orcamento
  for insert to authenticated with check (is_membro_casamento(casamento_id));
create policy categorias_orcamento_update_membro on categorias_orcamento
  for update to authenticated
  using (is_membro_casamento(casamento_id))
  with check (is_membro_casamento(casamento_id));
create policy categorias_orcamento_delete_membro on categorias_orcamento
  for delete to authenticated using (is_membro_casamento(casamento_id));

-- ===========================================================================
-- fornecedores
-- ===========================================================================
create table fornecedores (
  id uuid primary key default gen_random_uuid(),
  casamento_id uuid not null references casamentos (id) on delete cascade,
  categoria_id uuid references categorias_orcamento (id) on delete restrict,
  nome text not null check (length(trim(nome)) > 0),
  estagio text not null default 'pesquisando'
    check (estagio in ('pesquisando', 'em_negociacao', 'contratado', 'descartado')),
  valor_proposto_centavos integer check (valor_proposto_centavos is null or valor_proposto_centavos >= 0),
  nome_contato text,
  telefone text,
  email citext,
  site_url text,
  observacao text,
  excluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table fornecedores is
  'Fornecedor do casamento: contato, estágio da negociação e cotação. O valor do CONTRATO nunca mora aqui — mora em despesas.';
comment on column fornecedores.estagio is
  'Estágio manual da negociação. NUNCA tem o valor "pago": a situação financeira (sem despesa / a pagar / quitado) é derivada das parcelas das despesas ligadas a este fornecedor, nunca uma coluna a sincronizar.';
comment on column fornecedores.valor_proposto_centavos is
  'Cotação recebida deste fornecedor. Não entra em NENHUM total de orçamento — três concorrentes na mesma categoria somariam três vezes o mesmo gasto.';

create index fornecedores_casamento_id_idx on fornecedores (casamento_id, estagio);
create index fornecedores_categoria_id_idx on fornecedores (categoria_id);

create trigger fornecedores_set_updated_at
  before update on fornecedores
  for each row
  execute function atualizar_timestamp();

-- Garante fornecedores.casamento_id = categorias_orcamento.casamento_id da
-- categoria referenciada (mesmo padrão de convidados_verificar_casamento_id).
create function fornecedores_verificar_casamento_id()
returns trigger
language plpgsql
as $$
declare
  v_categoria_casamento_id uuid;
begin
  if new.categoria_id is not null then
    select casamento_id into v_categoria_casamento_id
      from categorias_orcamento where id = new.categoria_id;
    if v_categoria_casamento_id is null then
      raise exception 'categorias_orcamento % não encontrada', new.categoria_id
        using errcode = 'foreign_key_violation';
    end if;
    if v_categoria_casamento_id <> new.casamento_id then
      raise exception 'fornecedores.casamento_id (%) não bate com categorias_orcamento.casamento_id (%) da categoria %',
        new.casamento_id, v_categoria_casamento_id, new.categoria_id
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger fornecedores_verificar_casamento_id_trigger
  before insert or update of casamento_id, categoria_id on fornecedores
  for each row
  execute function fornecedores_verificar_casamento_id();

alter table fornecedores enable row level security;

create policy fornecedores_select_membro on fornecedores
  for select to authenticated using (is_membro_casamento(casamento_id));
create policy fornecedores_insert_membro on fornecedores
  for insert to authenticated with check (is_membro_casamento(casamento_id));
create policy fornecedores_update_membro on fornecedores
  for update to authenticated
  using (is_membro_casamento(casamento_id))
  with check (is_membro_casamento(casamento_id));
create policy fornecedores_delete_membro on fornecedores
  for delete to authenticated using (is_membro_casamento(casamento_id));

-- ===========================================================================
-- despesas — o compromisso
-- ===========================================================================
create table despesas (
  id uuid primary key default gen_random_uuid(),
  casamento_id uuid not null references casamentos (id) on delete cascade,
  categoria_id uuid references categorias_orcamento (id) on delete restrict,
  fornecedor_id uuid references fornecedores (id) on delete restrict,
  descricao text not null check (length(trim(descricao)) > 0),
  valor_centavos integer not null check (valor_centavos >= 0),
  observacao text,
  excluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table despesas is
  'Compromisso de gasto do casamento — o valor acordado. Categoria e fornecedor são opcionais: obrigar a cadastrar categoria antes da primeira despesa é a fricção que faz o casal voltar para a planilha.';
comment on column despesas.valor_centavos is
  'Valor acordado. A soma das parcelas PODE divergir deste valor (parcelamento incompleto é o caso normal) — a divergência é exibida, nunca bloqueada.';
comment on column despesas.categoria_id is
  'Opcional. Nulo agrupa a despesa em "Sem categoria" no fim da lista.';

create index despesas_casamento_id_idx on despesas (casamento_id, categoria_id);
create index despesas_categoria_id_idx on despesas (categoria_id);
create index despesas_fornecedor_id_idx on despesas (fornecedor_id);

create trigger despesas_set_updated_at
  before update on despesas
  for each row
  execute function atualizar_timestamp();

create function despesas_verificar_casamento_id()
returns trigger
language plpgsql
as $$
declare
  v_categoria_casamento_id uuid;
  v_fornecedor_casamento_id uuid;
begin
  if new.categoria_id is not null then
    select casamento_id into v_categoria_casamento_id
      from categorias_orcamento where id = new.categoria_id;
    if v_categoria_casamento_id is null then
      raise exception 'categorias_orcamento % não encontrada', new.categoria_id
        using errcode = 'foreign_key_violation';
    end if;
    if v_categoria_casamento_id <> new.casamento_id then
      raise exception 'despesas.casamento_id (%) não bate com categorias_orcamento.casamento_id (%) da categoria %',
        new.casamento_id, v_categoria_casamento_id, new.categoria_id
        using errcode = 'check_violation';
    end if;
  end if;

  if new.fornecedor_id is not null then
    select casamento_id into v_fornecedor_casamento_id
      from fornecedores where id = new.fornecedor_id;
    if v_fornecedor_casamento_id is null then
      raise exception 'fornecedores % não encontrado', new.fornecedor_id
        using errcode = 'foreign_key_violation';
    end if;
    if v_fornecedor_casamento_id <> new.casamento_id then
      raise exception 'despesas.casamento_id (%) não bate com fornecedores.casamento_id (%) do fornecedor %',
        new.casamento_id, v_fornecedor_casamento_id, new.fornecedor_id
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger despesas_verificar_casamento_id_trigger
  before insert or update of casamento_id, categoria_id, fornecedor_id on despesas
  for each row
  execute function despesas_verificar_casamento_id();

alter table despesas enable row level security;

create policy despesas_select_membro on despesas
  for select to authenticated using (is_membro_casamento(casamento_id));
create policy despesas_insert_membro on despesas
  for insert to authenticated with check (is_membro_casamento(casamento_id));
create policy despesas_update_membro on despesas
  for update to authenticated
  using (is_membro_casamento(casamento_id))
  with check (is_membro_casamento(casamento_id));
create policy despesas_delete_membro on despesas
  for delete to authenticated using (is_membro_casamento(casamento_id));

-- ===========================================================================
-- parcelas_despesa — caixa e futuro
-- ===========================================================================
create table parcelas_despesa (
  id uuid primary key default gen_random_uuid(),
  casamento_id uuid not null references casamentos (id) on delete cascade,
  despesa_id uuid not null references despesas (id) on delete cascade,
  numero smallint not null check (numero > 0),
  vence_em date not null,
  valor_centavos integer not null check (valor_centavos > 0),
  pago_em date,
  forma_pagamento text
    check (forma_pagamento is null or forma_pagamento in ('pix', 'cartao', 'transferencia', 'dinheiro', 'boleto', 'outro')),
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parcelas_despesa_numero_key unique (despesa_id, numero)
);

comment on table parcelas_despesa is
  'Parcela de uma despesa: quanto vence, quando, e se já foi paga. Sem soft delete — a parcela não tem valor histórico próprio fora da despesa, e a despesa (que tem) usa excluido_em.';
comment on column parcelas_despesa.pago_em is
  'ÚNICA fonte do estado de pagamento. "Paga / a vencer / vencida" é sempre derivado deste campo e de vence_em contra a data de hoje — nunca existe coluna de status aqui.';
comment on column parcelas_despesa.numero is
  'Posição da parcela dentro da despesa, para o rótulo "2 de 3". Não implica periodicidade nem ordena por vencimento.';
comment on column parcelas_despesa.casamento_id is
  'Denormalizado e DERIVADO da despesa por trigger (parcelas_despesa_derivar_casamento_id) — nunca definido pela aplicação.';

create index parcelas_despesa_despesa_id_idx on parcelas_despesa (despesa_id);

-- "O que vence agora?" é a consulta mais repetida do módulo — índice parcial
-- porque parcela paga nunca aparece nela.
create index parcelas_despesa_em_aberto_idx
  on parcelas_despesa (casamento_id, vence_em)
  where pago_em is null;

create trigger parcelas_despesa_set_updated_at
  before update on parcelas_despesa
  for each row
  execute function atualizar_timestamp();

-- Aqui o casamento_id é DERIVADO, não validado: a parcela sempre tem despesa
-- (FK not null), então não existe caso em que a aplicação precise informá-lo —
-- e informar abriria a porta para uma parcela apontando para o casamento
-- errado (CLAUDE.md, seção 10).
create function parcelas_despesa_derivar_casamento_id()
returns trigger
language plpgsql
as $$
declare
  v_despesa_casamento_id uuid;
begin
  select casamento_id into v_despesa_casamento_id
    from despesas where id = new.despesa_id;

  if v_despesa_casamento_id is null then
    raise exception 'despesas % não encontrada', new.despesa_id
      using errcode = 'foreign_key_violation';
  end if;

  new.casamento_id = v_despesa_casamento_id;
  return new;
end;
$$;

create trigger parcelas_despesa_derivar_casamento_id_trigger
  before insert or update of despesa_id on parcelas_despesa
  for each row
  execute function parcelas_despesa_derivar_casamento_id();

alter table parcelas_despesa enable row level security;

create policy parcelas_despesa_select_membro on parcelas_despesa
  for select to authenticated using (is_membro_casamento(casamento_id));
create policy parcelas_despesa_insert_membro on parcelas_despesa
  for insert to authenticated with check (is_membro_casamento(casamento_id));
create policy parcelas_despesa_update_membro on parcelas_despesa
  for update to authenticated
  using (is_membro_casamento(casamento_id))
  with check (is_membro_casamento(casamento_id));
create policy parcelas_despesa_delete_membro on parcelas_despesa
  for delete to authenticated using (is_membro_casamento(casamento_id));

-- ===========================================================================
-- documentos — entidade única compartilhada
-- ===========================================================================
-- Contrato, comprovante e referência vivem na MESMA tabela, exibida filtrada
-- dentro de cada área (fornecedor, despesa e, no futuro, outras). Uma tabela
-- por área seria a mesma lista escrita várias vezes.
create table documentos (
  id uuid primary key default gen_random_uuid(),
  casamento_id uuid not null references casamentos (id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  tipo text not null check (tipo in ('contrato', 'comprovante', 'referencia', 'outro')),
  fornecedor_id uuid references fornecedores (id) on delete restrict,
  despesa_id uuid references despesas (id) on delete restrict,
  caminho_storage text,
  url_externa text,
  nome_arquivo text,
  tipo_mime text,
  tamanho_bytes integer check (tamanho_bytes is null or tamanho_bytes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Padrão XOR do projeto (o mesmo de assinaturas.casamento_id/conta_id):
  -- o documento é um arquivo enviado OU um link externo, nunca os dois nem
  -- nenhum.
  constraint documentos_origem_exclusiva check (num_nonnulls(caminho_storage, url_externa) = 1)
);

comment on table documentos is
  'Documento do casamento (contrato, comprovante, referência) — entidade única compartilhada, exibida filtrada dentro de cada área. Sem soft delete: excluir um documento enviado apaga o objeto no Storage, e registro escondido com arquivo vivo é pior que exclusão franca.';
comment on column documentos.caminho_storage is
  'Caminho no bucket PRIVADO wedding-documents ({casamento_id}/{uuid}.{ext}). Exclusivo com url_externa. Leitura sempre por URL assinada gerada no servidor.';
comment on column documentos.url_externa is
  'Link externo (Drive, Dropbox...) para quem já guarda o arquivo em outro lugar. Exclusivo com caminho_storage.';

create index documentos_casamento_id_idx on documentos (casamento_id, tipo);
create index documentos_fornecedor_id_idx on documentos (fornecedor_id);
create index documentos_despesa_id_idx on documentos (despesa_id);

create trigger documentos_set_updated_at
  before update on documentos
  for each row
  execute function atualizar_timestamp();

create function documentos_verificar_casamento_id()
returns trigger
language plpgsql
as $$
declare
  v_fornecedor_casamento_id uuid;
  v_despesa_casamento_id uuid;
begin
  if new.fornecedor_id is not null then
    select casamento_id into v_fornecedor_casamento_id
      from fornecedores where id = new.fornecedor_id;
    if v_fornecedor_casamento_id is null then
      raise exception 'fornecedores % não encontrado', new.fornecedor_id
        using errcode = 'foreign_key_violation';
    end if;
    if v_fornecedor_casamento_id <> new.casamento_id then
      raise exception 'documentos.casamento_id (%) não bate com fornecedores.casamento_id (%) do fornecedor %',
        new.casamento_id, v_fornecedor_casamento_id, new.fornecedor_id
        using errcode = 'check_violation';
    end if;
  end if;

  if new.despesa_id is not null then
    select casamento_id into v_despesa_casamento_id
      from despesas where id = new.despesa_id;
    if v_despesa_casamento_id is null then
      raise exception 'despesas % não encontrada', new.despesa_id
        using errcode = 'foreign_key_violation';
    end if;
    if v_despesa_casamento_id <> new.casamento_id then
      raise exception 'documentos.casamento_id (%) não bate com despesas.casamento_id (%) da despesa %',
        new.casamento_id, v_despesa_casamento_id, new.despesa_id
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger documentos_verificar_casamento_id_trigger
  before insert or update of casamento_id, fornecedor_id, despesa_id on documentos
  for each row
  execute function documentos_verificar_casamento_id();

alter table documentos enable row level security;

create policy documentos_select_membro on documentos
  for select to authenticated using (is_membro_casamento(casamento_id));
create policy documentos_insert_membro on documentos
  for insert to authenticated with check (is_membro_casamento(casamento_id));
create policy documentos_update_membro on documentos
  for update to authenticated
  using (is_membro_casamento(casamento_id))
  with check (is_membro_casamento(casamento_id));
create policy documentos_delete_membro on documentos
  for delete to authenticated using (is_membro_casamento(casamento_id));

-- ===========================================================================
-- Bucket wedding-documents — o PRIMEIRO bucket privado do projeto
-- ===========================================================================
-- Os três buckets existentes (wedding-covers, wedding-photos,
-- wedding-event-segments) são públicos porque servem imagens do site do
-- casamento. Este NÃO É: um contrato tem CPF, valor e assinatura. Daí
-- `public = false` e a ausência deliberada de qualquer policy de select
-- pública — a leitura acontece por URL assinada de curta duração gerada no
-- servidor. Copiar o modelo dos outros três aqui vazaria contrato por URL
-- adivinhável.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-documents',
  'wedding-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Caminho do objeto: wedding-documents/{casamento_id}/{uuid}.{ext} — primeiro
-- segmento sempre o casamento, como nos outros buckets.
create policy wedding_documents_select_membro
  on storage.objects for select
  using (
    bucket_id = 'wedding-documents'
    and is_membro_casamento((storage.foldername(name))[1]::uuid)
  );

create policy wedding_documents_insert_membro
  on storage.objects for insert
  with check (
    bucket_id = 'wedding-documents'
    and is_membro_casamento((storage.foldername(name))[1]::uuid)
  );

create policy wedding_documents_update_membro
  on storage.objects for update
  using (
    bucket_id = 'wedding-documents'
    and is_membro_casamento((storage.foldername(name))[1]::uuid)
  );

create policy wedding_documents_delete_membro
  on storage.objects for delete
  using (
    bucket_id = 'wedding-documents'
    and is_membro_casamento((storage.foldername(name))[1]::uuid)
  );
