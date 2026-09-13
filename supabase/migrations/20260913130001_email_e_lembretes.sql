-- E-mail de verdade e os lembretes automáticos — a entrega seguinte à Fase 2
-- do Hub (docs/fase2-convidados.md seção 2.2: "fica nomeada como a entrega
-- seguinte, não como backlog difuso").
--
-- Três peças, e a ordem delas conta a história: o envio passa a ter um id no
-- provedor, o que aconteceu DEPOIS do envio ganha um log próprio, e o casal
-- ganha onde dizer o que o sistema pode mandar sozinho.

-- ===========================================================================
-- comunicacoes.provedor_mensagem_id — a costura com o provedor
-- ===========================================================================
-- É o id que o provedor devolve na hora do envio, e é por ele que o webhook
-- encontra a linha quando o e-mail volta. Fica em `comunicacoes` (e não numa
-- tabela de lado) porque é parte do FATO do envio, conhecido no instante em
-- que a linha nasce — não é estado que muda depois, que é justamente o que
-- esta tabela não aceita (não há policy de UPDATE).
--
-- Nulo em `whatsapp` e `outro`: nesses canais não existe provedor nenhum. É
-- por isso que o índice único é PARCIAL — dois envios por fora não colidem.
alter table comunicacoes add column provedor_mensagem_id text;

comment on column comunicacoes.provedor_mensagem_id is
  'Id da mensagem no provedor de e-mail, devolvido no envio. Única ponte entre o webhook de entrega/devolução e o envio que o originou. Nulo nos canais sem provedor (whatsapp, outro).';

create unique index comunicacoes_provedor_mensagem_id_key
  on comunicacoes (provedor_mensagem_id)
  where provedor_mensagem_id is not null;

-- ===========================================================================
-- eventos_email — o que aconteceu DEPOIS do envio
-- ===========================================================================
-- POR QUE UMA TABELA, E NÃO UMA COLUNA `status_entrega` EM `comunicacoes`:
--
--   1. `comunicacoes` é log append-only sem policy de UPDATE, de propósito —
--      "não se edita um envio". Uma coluna de status ali exigiria abrir o
--      UPDATE da tabela inteira para gravar um fato que o casal não produz.
--   2. Entrega não é um estado, é uma sequência: entregue hoje, reclamado
--      amanhã. Uma coluna guardaria só o último e apagaria o caminho.
--   3. É a mesma lição de `status_convite` (CLAUDE.md seção 12), aplicada de
--      novo: estado que os fatos já contam nunca vira coluna a sincronizar. O
--      "não entregue" da tela é derivado do evento mais recente.
--
-- O que NÃO entra aqui: o próprio envio. Ele já é a linha de `comunicacoes` —
-- repeti-lo como evento `enviado` criaria duas verdades para o mesmo fato.
create table eventos_email (
  id uuid primary key default gen_random_uuid(),
  casamento_id uuid not null references casamentos (id) on delete cascade,
  comunicacao_id uuid not null references comunicacoes (id) on delete cascade,
  tipo_evento text not null check (tipo_evento in ('entregue', 'devolvido', 'reclamado', 'adiado')),
  ocorrido_em timestamptz not null default now(),
  -- O corpo do provedor, cru, para diagnóstico ("por que voltou?"). Nunca é
  -- lido por regra de negócio: o que a aplicação usa é `tipo_evento`, que é
  -- vocabulário nosso e não muda quando o provedor renomeia um campo.
  metadados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table eventos_email is
  'Log append-only do que aconteceu com um e-mail depois de enviado (entregue, devolvido, reclamado, adiado), alimentado pelo webhook do provedor. O estado de entrega de um envio é sempre derivado do evento mais recente — nunca uma coluna em comunicacoes.';
comment on column eventos_email.ocorrido_em is
  'Quando o provedor diz que aconteceu, não quando o webhook chegou: retentativa de webhook não reescreve a linha do tempo.';

create index eventos_email_comunicacao_idx on eventos_email (comunicacao_id, ocorrido_em desc);
create index eventos_email_casamento_idx on eventos_email (casamento_id, tipo_evento);

-- Mesmo padrão de parcelas_despesa_derivar_casamento_id: denormalizado e
-- DERIVADO do pai por trigger, nunca definido pela aplicação (CLAUDE.md
-- seção 10). O webhook roda com service_role e sem sessão — se o casamento
-- viesse do corpo da requisição, seria um valor de fora decidindo partição.
create function eventos_email_derivar_casamento_id()
returns trigger
language plpgsql
as $$
begin
  select casamento_id into new.casamento_id
    from comunicacoes where id = new.comunicacao_id;
  if new.casamento_id is null then
    raise exception 'comunicacoes % não encontrada', new.comunicacao_id
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

create trigger eventos_email_derivar_casamento_id_trigger
  before insert or update of comunicacao_id on eventos_email
  for each row
  execute function eventos_email_derivar_casamento_id();

alter table eventos_email enable row level security;

-- Leitura para quem é do casamento; escrita para ninguém autenticado. Quem
-- grava é o webhook, com service_role — e um membro não tem o que "registrar"
-- aqui: é fato do provedor, não declaração do casal (a mesma assimetria da
-- policy de delete de `comunicacoes`).
create policy eventos_email_select_membro on eventos_email
  for select to authenticated using (is_membro_casamento(casamento_id));

-- ===========================================================================
-- casamentos.config_lembretes — o que o sistema manda sozinho
-- ===========================================================================
-- Coluna nova em vez de mais uma chave em `config_comunicacao`, e a diferença
-- é de PÚBLICO: `config_comunicacao` guarda o texto que o casal manda ao
-- convidado (e é o casal quem clica). Aqui mora o que a plataforma manda sem
-- ninguém clicar — e uma das duas chaves (`pagamentos`) não vai para convidado
-- nenhum, vai para o próprio casal. Misturar as duas faria a tela de modelos
-- de mensagem herdar uma configuração que não tem nada a ver com mensagem.
alter table casamentos
  add column config_lembretes jsonb not null default '{}'::jsonb;

comment on column casamentos.config_lembretes is
  'Avisos automáticos: {rsvp:{ativo,diasAntes[]}, pagamentos:{ativo,diasAntes[]}}. Quarto jsonb de configuração do casamento e o único sobre ações que a plataforma toma sozinha — config_tema é visual, config_conteudo é texto do site público, config_comunicacao é texto que o casal manda. Vazio = desligado: o padrão aqui nunca é enviar.';
