-- Mesas (Fase 2 do Hub) — quem senta onde, e a planta do salão.
-- Refinamento completo em docs/fase2-convidados.md, seções 4.1 a 4.4.
--
-- A pergunta que este módulo responde só aparece nas últimas três semanas e
-- hoje não tem lugar nenhum no produto: o casal desenha num papel, a
-- cerimonialista redesenha noutro lugar, e quando três pessoas desistem
-- ninguém sabe quais mesas ficaram com buraco.
--
-- QUATRO DECISÕES ESTRUTURAIS, todas registradas no refinamento:
--
-- 1. SENTAR É UMA COLUNA, NÃO UMA TABELA DE JUNÇÃO. Uma pessoa senta em no
--    máximo uma mesa, então uma junção modelaria um N:N que o domínio não tem
--    — e a alternativa com XOR entre convidado e acompanhante avulso seria
--    cerimônia para guardar a mesma informação. É o desenho de `grupo_id`, e o
--    significado é o mesmo: um QUARTO vínculo do convidado, independente de
--    convite, grupo e núcleo. Mesa não se deriva de convite: parentes do mesmo
--    convite sentam separados o tempo todo.
--
-- 2. OCUPAÇÃO É SEMPRE CONTAGEM. Não existe `mesas.ocupacao`: sentar e tirar
--    acontecem em vários caminhos (a mesa, a lista, a exclusão de convidado, a
--    importação), e um contador materializado erraria no primeiro que
--    esquecesse de atualizá-lo. Mesma lição de `status_convite`.
--
-- 3. COORDENADAS EM CENTÍMETROS, NUNCA EM PIXELS. O salão tem medidas reais e
--    a mesa redonda de 8 lugares tem 1,80 m — é a comparação entre as duas que
--    responde "cabe?". Em pixels, a planta mudaria de significado junto com o
--    tamanho da tela e nunca conversaria com a planta que o buffet mandou.
--    Pixel é centímetro x zoom, resolvido só na renderização.
--
-- 4. CAPACIDADE EXCEDIDA NÃO É BLOQUEADA. Dez pessoas numa mesa de oito é um
--    estado real do planejamento ("depois eu resolvo"), e um CHECK aqui só
--    ensinaria o casal a mentir a capacidade para conseguir salvar. Mesma
--    regra da divergência entre parcelas e valor do contrato no Financeiro.

-- ===========================================================================
-- Dimensões do salão
-- ===========================================================================
-- NULO é estado válido, não pendência: sem as medidas, a planta se ajusta ao
-- conteúdo e não desenha parede nenhuma. Um padrão gravado sozinho ("20 x 15
-- m") faria o casal olhar para um número que nunca digitou.
alter table casamentos
  add column planta_largura_cm integer
    check (planta_largura_cm is null or planta_largura_cm between 100 and 100000),
  add column planta_profundidade_cm integer
    check (planta_profundidade_cm is null or planta_profundidade_cm between 100 and 100000);

comment on column casamentos.planta_largura_cm is
  'Largura do salão em centímetros. Nulo = sem planta definida: a área se ajusta às mesas e nenhuma parede é desenhada.';

-- ===========================================================================
-- mesas
-- ===========================================================================
create table mesas (
  id uuid primary key default gen_random_uuid(),
  casamento_id uuid not null references casamentos (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  capacidade integer not null check (capacidade > 0),
  formato text not null default 'redonda' check (formato in ('redonda', 'retangular')),
  largura_cm integer not null default 180 check (largura_cm between 30 and 2000),
  profundidade_cm integer not null default 180 check (profundidade_cm between 30 and 2000),
  posicao_x_cm integer not null default 0 check (posicao_x_cm >= 0),
  posicao_y_cm integer not null default 0 check (posicao_y_cm >= 0),
  rotacao_graus integer not null default 0 check (rotacao_graus between 0 and 359),
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Na redonda, as duas medidas SÃO o diâmetro. Sem isto seria possível gravar
  -- uma "redonda" de 180x90, que a tela não sabe desenhar.
  constraint mesas_redonda_e_circular
    check (formato <> 'redonda' or largura_cm = profundidade_cm)
);

comment on table mesas is
  'Mesa da recepção: nome, capacidade, medidas e posição na planta. Sem vínculo com etapas_evento de propósito — só a recepção tem mesas, e amarrá-las criaria uma escolha obrigatória cuja resposta é sempre a mesma.';
comment on column mesas.nome is
  'Livre: "Mesa 7", "Mesa dos Pais", "Cabeceira". Nem toda mesa é numerada.';
comment on column mesas.capacidade is
  'Lugares, não assentos identificados. Cadeira numerada ficou de fora: ninguém marca cadeira em casamento, e numerar obrigaria a resolver "cadeira 3 de uma mesa que virou de 8 para 10".';
comment on column mesas.posicao_x_cm is
  'Centímetros a partir do canto superior esquerdo do salão. Nunca pixels — ver o cabeçalho desta migration.';
comment on column mesas.rotacao_graus is
  'Só a retangular usa; a UI oferece girar de 90 em 90.';

-- Duas "Mesa 7" no mesmo salão é sempre erro de digitação, e descobrir isso na
-- hora de imprimir o mapa é tarde.
create unique index mesas_nome_key on mesas (casamento_id, lower(nome));
create index mesas_casamento_idx on mesas (casamento_id);

create trigger mesas_set_updated_at
  before update on mesas
  for each row
  execute function atualizar_timestamp();

alter table mesas enable row level security;

create policy mesas_select_membro on mesas
  for select to authenticated using (is_membro_casamento(casamento_id));
create policy mesas_insert_membro on mesas
  for insert to authenticated with check (is_membro_casamento(casamento_id));
create policy mesas_update_membro on mesas
  for update to authenticated
  using (is_membro_casamento(casamento_id))
  with check (is_membro_casamento(casamento_id));
create policy mesas_delete_membro on mesas
  for delete to authenticated using (is_membro_casamento(casamento_id));

-- ===========================================================================
-- elementos_planta — o salão além das mesas
-- ===========================================================================
-- Pista, palco, buffet, bolo, entrada, bar. SEM capacidade e sem ninguém
-- sentado: são referência espacial, e é por causa delas que "não coloque a tia
-- Cléia na mesa colada na caixa de som" vira uma decisão que a planta permite
-- tomar. Sem elas, a planta é um punhado de círculos flutuando.
create table elementos_planta (
  id uuid primary key default gen_random_uuid(),
  casamento_id uuid not null references casamentos (id) on delete cascade,
  tipo text not null
    check (tipo in ('pista', 'palco', 'buffet', 'bolo', 'entrada', 'bar', 'outro')),
  nome text,
  largura_cm integer not null default 200 check (largura_cm between 30 and 5000),
  profundidade_cm integer not null default 200 check (profundidade_cm between 30 and 5000),
  posicao_x_cm integer not null default 0 check (posicao_x_cm >= 0),
  posicao_y_cm integer not null default 0 check (posicao_y_cm >= 0),
  rotacao_graus integer not null default 0 check (rotacao_graus between 0 and 359),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table elementos_planta is
  'Referências do salão que não sentam ninguém (pista, palco, buffet, bolo, entrada, bar). Exclusão física: é rascunho de layout, sem valor histórico próprio.';
comment on column elementos_planta.nome is
  'Opcional — o tipo já rotula. Existe para o "outro" e para quem quiser precisar ("Bar de gin").';

create index elementos_planta_casamento_idx on elementos_planta (casamento_id);

create trigger elementos_planta_set_updated_at
  before update on elementos_planta
  for each row
  execute function atualizar_timestamp();

alter table elementos_planta enable row level security;

create policy elementos_planta_select_membro on elementos_planta
  for select to authenticated using (is_membro_casamento(casamento_id));
create policy elementos_planta_insert_membro on elementos_planta
  for insert to authenticated with check (is_membro_casamento(casamento_id));
create policy elementos_planta_update_membro on elementos_planta
  for update to authenticated
  using (is_membro_casamento(casamento_id))
  with check (is_membro_casamento(casamento_id));
create policy elementos_planta_delete_membro on elementos_planta
  for delete to authenticated using (is_membro_casamento(casamento_id));

-- ===========================================================================
-- Quem senta: uma coluna em cada lado
-- ===========================================================================
-- `on delete set null` é o que torna a exclusão da mesa segura SEM soft
-- delete: o banco devolve as pessoas à fila sozinho. Soft delete aqui criaria
-- um estado fantasma — gente com `mesa_id` apontando para uma mesa invisível,
-- sumindo da ocupação sem reaparecer em "falta acomodar".
alter table convidados
  add column mesa_id uuid references mesas (id) on delete set null;

-- Acompanhante avulso OCUPA LUGAR: em `modo_lista_convidados = 'aberta'`
-- existem pessoas confirmadas que não são linha de `convidados`, e sem elas a
-- ocupação mente justamente no evento que mais precisa de controle de lugar.
alter table acompanhantes_avulsos
  add column mesa_id uuid references mesas (id) on delete set null;

comment on column convidados.mesa_id is
  'Quarto vínculo do convidado, independente de convite, grupo e núcleo. Mesa NUNCA se deriva de convite: parentes do mesmo convite sentam separados, e uma mesa junta gente de convites diferentes.';

create index convidados_mesa_idx on convidados (mesa_id) where mesa_id is not null;
create index acompanhantes_avulsos_mesa_idx on acompanhantes_avulsos (mesa_id) where mesa_id is not null;

-- Rascunho da lista nunca senta, pelo mesmo motivo de nunca receber convite — e
-- com a mesma garantia: uma constraint, e não um filtro que cada endpoint novo
-- precise lembrar. Irmã de `convidados_em_consideracao_sem_convite`.
alter table convidados
  add constraint convidados_em_consideracao_sem_mesa
    check (not em_consideracao or mesa_id is null);

-- A mesa tem que ser do mesmo casamento da pessoa. Mesmo padrão de
-- `convidados_verificar_casamento_id`, que já cuida de convite/grupo/núcleo.
create function convidados_verificar_mesa()
returns trigger
language plpgsql
as $$
declare
  v_mesa_casamento_id uuid;
begin
  if new.mesa_id is not null then
    select casamento_id into v_mesa_casamento_id from mesas where id = new.mesa_id;
    if v_mesa_casamento_id is distinct from new.casamento_id then
      raise exception 'mesas % pertence a outro casamento', new.mesa_id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger convidados_verificar_mesa_trigger
  before insert or update of mesa_id, casamento_id on convidados
  for each row
  execute function convidados_verificar_mesa();

create function acompanhantes_avulsos_verificar_mesa()
returns trigger
language plpgsql
as $$
declare
  v_mesa_casamento_id uuid;
begin
  if new.mesa_id is not null then
    select casamento_id into v_mesa_casamento_id from mesas where id = new.mesa_id;
    if v_mesa_casamento_id is distinct from new.casamento_id then
      raise exception 'mesas % pertence a outro casamento', new.mesa_id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger acompanhantes_avulsos_verificar_mesa_trigger
  before insert or update of mesa_id, casamento_id on acompanhantes_avulsos
  for each row
  execute function acompanhantes_avulsos_verificar_mesa();
