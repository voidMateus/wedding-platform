-- Localização do cronograma deixa de ser texto e passa a ser uma entidade
-- selecionável (CLAUDE.md, seção 12 — "Cronograma"). Antes, o casal digitava
-- endereço em texto livre e, num acordeão "Coordenadas (opcional)", latitude
-- e longitude à mão — campos técnicos que ninguém preenchia direito e que,
-- quando preenchidos errado, jogavam o mapa do site público no lugar errado.
--
-- Agora existem dois caminhos, distinguidos por `origem_local`:
--
--  'maps_place' — o casal escolheu uma sugestão real do provedor de lugares
--                 (hoje Google Places, atrás de server/utils/places-provider.ts).
--                 Traz identificador estável (`place_id_local`), endereço
--                 formatado e coordenadas precisas, tudo preenchido sem
--                 nenhuma digitação de coordenada.
--
--  'manual'     — o local não existe como Place (chácara, sítio, salão
--                 pequeno, endereço rural). O casal digita o endereço em
--                 partes e, se quiser, posiciona o marcador no mapa — as
--                 coordenadas saem do arrasto do marcador, nunca de um campo
--                 de texto.
--
--  null         — linha legada: só `endereco_local` em texto, cadastrada
--                 antes desta migration. Continua exibindo normalmente
--                 (CLAUDE.md, seção 12 — nenhum dado antigo é reescrito
--                 automaticamente para um resultado do Maps sem o casal
--                 confirmar).
--
-- `endereco_local` permanece sendo o endereço **pronto para exibição** nos
-- três casos — é o que todo consumidor já lê (EventSpotlight.vue, o embed do
-- mapa, resolve-event-segment-venue.ts). As colunas de endereço em partes
-- abaixo existem só para o caminho manual conseguir reabrir o formulário com
-- cada campo no seu lugar; nenhuma tela de exibição as consulta.

alter table etapas_evento
  add column origem_local text,
  add column place_id_local text,
  add column url_mapa_local text,
  add column logradouro_local text,
  add column numero_local text,
  add column complemento_local text,
  add column cidade_local text,
  add column estado_local text;

-- Um identificador de lugar só faz sentido junto da origem que o produziu, e
-- vice-versa: sem esta restrição nada impediria uma linha 'maps_place' sem
-- place_id (que é justamente o que evita a rebusca textual em "Ver no mapa")
-- ou uma linha 'manual' carregando um place_id órfão de uma seleção anterior.
alter table etapas_evento
  add constraint etapas_evento_origem_local_valida
    check (origem_local is null or origem_local in ('maps_place', 'manual')),
  add constraint etapas_evento_place_id_coerente_com_origem
    check (
      (origem_local = 'maps_place' and place_id_local is not null)
      or (origem_local is distinct from 'maps_place' and place_id_local is null)
    );

-- Qual provedor emitiu `place_id_local`. Um place_id do Google não significa
-- nada para outro provedor — sem registrar a origem, uma troca futura de
-- provedor (a razão de places-provider.ts ser uma interface) transformaria
-- todo place_id salvo em lixo silencioso, com "Ver no mapa" apontando para
-- um lugar errado em vez de falhar visivelmente.
alter table etapas_evento
  add column provedor_local text;

alter table etapas_evento
  add constraint etapas_evento_provedor_local_coerente
    check (
      (place_id_local is null and provedor_local is null)
      or (place_id_local is not null and provedor_local is not null)
    );

comment on column etapas_evento.origem_local is
  'Como a localização foi definida: ''maps_place'' (sugestão escolhida no provedor de lugares) ou ''manual'' (endereço digitado, coordenadas opcionais vindas do marcador no mapa). Null = linha legada, só endereco_local em texto.';
comment on column etapas_evento.place_id_local is
  'Identificador estável do lugar no provedor externo. Presente se e somente se origem_local = ''maps_place'' — permite abrir o local exato no Maps sem refazer busca textual pelo endereço.';
comment on column etapas_evento.provedor_local is
  'Provedor que emitiu place_id_local (ex.: ''google''). Preenchido se e somente se place_id_local existe — ver server/utils/places-provider.ts.';
comment on column etapas_evento.url_mapa_local is
  'URL oficial do lugar devolvida pelo provedor, quando disponível. Validada contra allowlist de host em shared/schemas/event-segments.ts antes de gravar — vira href no site público, então nunca é aceita como texto livre.';
comment on column etapas_evento.logradouro_local is
  'Caminho manual apenas: rua/avenida digitada. Exibição usa endereco_local (composto a partir destas partes) — ver shared/utils/endereco-local.ts.';
comment on column etapas_evento.numero_local is 'Caminho manual apenas — ver logradouro_local.';
comment on column etapas_evento.complemento_local is 'Caminho manual apenas — ver logradouro_local.';
comment on column etapas_evento.cidade_local is 'Caminho manual apenas — ver logradouro_local.';
comment on column etapas_evento.estado_local is 'Caminho manual apenas (UF) — ver logradouro_local.';
