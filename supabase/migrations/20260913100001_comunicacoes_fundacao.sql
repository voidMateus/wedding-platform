-- Comunicações (Fase 2 do Hub) — fundação: o registro de cada envio, e o fim
-- do "Marcar como enviado" como coluna. Refinamento em docs/fase2-convidados.md.
--
-- O PROBLEMA. Hoje o fato "mandei o convite" tem uma representação frouxa: um
-- timestamp que o casal marca à mão (`convites.enviado_em`), sem canal, sem
-- destinatário, sem repetição — e um convite recebe save the date, convite e
-- lembrete, três envios que a coluna não sabe distinguir. A partir daqui o
-- fato tem uma linha própria, e `enviado_em` volta a ser o que sempre deveria
-- ter sido: uma LEITURA dos fatos.
--
-- É a mesma lição do funil de estágios (CLAUDE.md seção 12): estado que os
-- fatos já contam nunca vira coluna a sincronizar. Trocar `status_convite` por
-- um timestamp resolveu metade do problema; esta migration resolve a outra.
--
-- DUAS MIGRATIONS, DE PROPÓSITO. Esta cria a estrutura, copia o que existe e
-- passa a view a derivar. A remoção de `convites.enviado_em` e
-- `convites.status_convite` fica para uma migration POSTERIOR, num merge
-- seguinte: as migrations são aplicadas em prod no merge, em paralelo com o
-- deploy, e existe uma janela em que o código antigo roda contra o schema novo
-- — nela, um `update` numa coluna removida falharia. É o mesmo cuidado que já
-- tinha adiado `status_convite` uma vez.

-- ===========================================================================
-- comunicacoes — remodelada
-- ===========================================================================
-- `drop` e não `alter`: a tabela existe desde a Fase 0 e NUNCA teve uma linha
-- escrita (nada no código a lia ou gravava), então não há dado a preservar — e
-- o que ela tinha estava errado para o uso real:
--
--   credencial_id not null -> convite_id: comunicação é do CONVITE (a unidade
--     de comunicação). Presa à credencial, rotacionar o código dispersaria o
--     histórico entre linhas, e um envio de canal 'outro' (convite em papel)
--     não precisa de credencial nenhuma.
--   aberto_em -> removida: só se preencheria com pixel de rastreamento. O
--     sistema já tem um sinal de abertura melhor e não invasivo — o evento
--     `rsvp.first_access`, que é acesso real ao convite e é o que alimenta o
--     estágio "Aberto" do funil.
--   updated_at -> removida: é log de fato, como historico_convite. Não se
--     edita um envio; corrige-se removendo a linha, e só quando ela era uma
--     declaração do casal (ver a policy de delete).
drop table if exists comunicacoes;

create table comunicacoes (
  id uuid primary key default gen_random_uuid(),
  casamento_id uuid not null references casamentos (id) on delete cascade,
  convite_id uuid not null references convites (id) on delete cascade,
  convidado_id uuid references convidados (id) on delete set null,
  canal text not null check (canal in ('whatsapp', 'email', 'outro')),
  tipo text not null check (tipo in ('save_the_date', 'convite', 'lembrete')),
  enviado_em timestamptz not null default now(),
  registrado_por uuid references membros_casamento (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table comunicacoes is
  'Log append-only de cada envio ao convidado (save the date / convite / lembrete), por canal. Fonte única de convites_com_resumo.enviado_em — o estágio "Enviado" do funil é derivado daqui, nunca de uma coluna marcada à mão.';
comment on column comunicacoes.convite_id is
  'O convite é a unidade de comunicação (docs/PRODUCT.md 5.1): todo link/QR, lembrete e mensagem opera nesse nível.';
comment on column comunicacoes.convidado_id is
  'Destinatário, quando o envio foi para uma PESSOA (o WhatsApp vai para um número). Nulo em envio que não tem destinatário individual — convite em papel entregue à família. Nunca se grava o número/e-mail usado: seria dado pessoal duplicado, e um telefone velho no histórico não responde pergunta nenhuma do casal.';
comment on column comunicacoes.canal is
  '"outro" é envio feito FORA da plataforma (papel, mão, cerimonialista) — caminho de primeira classe, não concessão: o funil nunca exigiu jornada digital.';
comment on column comunicacoes.enviado_em is
  'NOT NULL: a linha nasce no momento do envio. Comunicação não enviada não é uma linha com data nula — é a ausência da linha.';

create index comunicacoes_convite_idx on comunicacoes (convite_id, tipo, enviado_em);
create index comunicacoes_casamento_idx on comunicacoes (casamento_id, tipo);

-- Mesmo padrão de fornecedores_verificar_casamento_id: o casamento da
-- comunicação tem que ser o do convite, e o do convidado também.
--
-- `or replace`, e não `create`: esta função JÁ EXISTE desde o rename para
-- português (20260821090003, onde nasceu como communications_check_wedding_id)
-- e o `drop table` acima não a leva junto — derruba só o trigger. O corpo
-- antigo comparava o casamento da comunicação com o de
-- `credenciais_acesso_convite`, que deixou de ser a FK desta tabela.
create or replace function comunicacoes_verificar_casamento_id()
returns trigger
language plpgsql
as $$
declare
  v_convite_casamento_id uuid;
  v_convidado_casamento_id uuid;
begin
  select casamento_id into v_convite_casamento_id
    from convites where id = new.convite_id;
  if v_convite_casamento_id is null then
    raise exception 'convites % não encontrado', new.convite_id
      using errcode = 'foreign_key_violation';
  end if;
  if v_convite_casamento_id <> new.casamento_id then
    raise exception 'comunicacoes.casamento_id (%) não bate com convites.casamento_id (%)',
      new.casamento_id, v_convite_casamento_id
      using errcode = 'check_violation';
  end if;

  if new.convidado_id is not null then
    select casamento_id into v_convidado_casamento_id
      from convidados where id = new.convidado_id;
    if v_convidado_casamento_id is distinct from new.casamento_id then
      raise exception 'comunicacoes.convidado_id (%) pertence a outro casamento', new.convidado_id
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger comunicacoes_verificar_casamento_id_trigger
  before insert or update of casamento_id, convite_id, convidado_id on comunicacoes
  for each row
  execute function comunicacoes_verificar_casamento_id();

alter table comunicacoes enable row level security;

create policy comunicacoes_select_membro on comunicacoes
  for select to authenticated using (is_membro_casamento(casamento_id));
create policy comunicacoes_insert_membro on comunicacoes
  for insert to authenticated with check (is_membro_casamento(casamento_id));

-- Sem policy de UPDATE: log não se edita.
--
-- DELETE só de canal 'outro', e a assimetria é o ponto: registro de canal
-- 'outro' é uma DECLARAÇÃO do casal ("entreguei em mãos"), e declarar por
-- engano precisa ter saída. Envio feito pelo sistema (whatsapp, email) é um
-- fato que aconteceu, e apagá-lo seria reescrever a história. Mesma assimetria
-- de "Aberto é o único estágio comprovado pelo sistema".
create policy comunicacoes_delete_membro_canal_outro on comunicacoes
  for delete to authenticated
  using (is_membro_casamento(casamento_id) and canal = 'outro');

-- ===========================================================================
-- O que já estava marcado como enviado vira registro
-- ===========================================================================
-- Canal 'outro' porque é exatamente o que a coluna significava: o casal
-- informou que mandou, sem o sistema saber por onde. Sem `registrado_por` —
-- a coluna nunca guardou quem clicou.
insert into comunicacoes (casamento_id, convite_id, canal, tipo, enviado_em)
select casamento_id, id, 'outro', 'convite', enviado_em
  from convites
 where enviado_em is not null;

-- ===========================================================================
-- Modelos de mensagem, por casamento
-- ===========================================================================
alter table casamentos
  add column config_comunicacao jsonb not null default '{}'::jsonb;

comment on column casamentos.config_comunicacao is
  'Modelos de mensagem por tipo de envio (save_the_date/convite/lembrete), com variáveis do catálogo fechado de shared/utils/modelo-comunicacao.ts. Terceiro jsonb de configuração do casamento, e os três não se misturam: config_tema é exclusivamente visual, config_conteudo é texto exibido no site público, e este é texto que SAI da plataforma para o convidado por canal privado. Vazio = o casal ainda não personalizou; a leitura cai no padrão da plataforma.';

-- ===========================================================================
-- convites_com_resumo — `enviado_em` passa a ser derivado
-- ===========================================================================
-- A view não pode mais usar `c.*`: a coluna física `enviado_em` ainda existe
-- (sai na migration B) e duas colunas com o mesmo nome não convivem. As
-- colunas são listadas uma a uma, sem `enviado_em` e sem `status_convite`
-- (obsoleta desde 2026-09-10, e nada a lê).
--
-- `coalesce(derivado, c.enviado_em)` cobre A JANELA DE DEPLOY: entre o merge e
-- o deploy novo, o código publicado ainda faz `update convites set enviado_em`
-- em "Marcar como enviado". Sem o coalesce, esse clique seria aceito pelo
-- banco e ignorado pela tela — o pior desfecho, porque parece funcionar. Na
-- migration B, quando a coluna sair, o coalesce sai com ela.
drop view if exists convites_com_resumo;

create view convites_com_resumo
with (security_invoker = true)
as
select
  c.id,
  c.casamento_id,
  c.codigo_interno,
  c.nome,
  c.convidado_responsavel_id,
  c.max_acompanhantes,
  c.mensagem_rsvp,
  c.mensagem_rsvp_em,
  c.observacoes,
  c.arquivado_em,
  c.excluido_em,
  c.created_at,
  c.updated_at,
  coalesce(env.enviado_em, c.enviado_em) as enviado_em,
  env.ultimo_contato,
  coalesce(m.total_membros, 0) as total_membros,
  coalesce(m.total_respondidos, 0) as total_respondidos,
  case
    -- `total_membros > 0` na primeira cláusula: um convite sem ninguém dentro
    -- tem 0 >= 0 e apareceria como "respondido" sem existir uma só resposta.
    when coalesce(m.total_membros, 0) > 0 and m.total_respondidos >= m.total_membros
      then 'respondido'
    when coalesce(m.total_respondidos, 0) > 0 then 'parcial'
    -- "Aberto" é o único estágio comprovado pelo sistema: o convidado acessou.
    -- Por isso ele passa na frente de "enviado", que é só o casal informando
    -- que mandou — se alguém abriu, o convite chegou, mesmo que ninguém tenha
    -- registrado o envio.
    when a.primeiro_acesso is not null then 'aberto'
    when coalesce(env.enviado_em, c.enviado_em) is not null then 'enviado'
    else 'nao_enviado'
  end as status_operacional,
  -- Espelha o CASE acima, na mesma ordem: o timestamp do fato que define o
  -- estágio. Manter os dois no mesmo SELECT é o que garante que não divirjam.
  case
    when coalesce(m.total_membros, 0) > 0 and m.total_respondidos >= m.total_membros
      then m.ultima_resposta
    when coalesce(m.total_respondidos, 0) > 0 then m.ultima_resposta
    when a.primeiro_acesso is not null then a.primeiro_acesso
    else coalesce(env.enviado_em, c.enviado_em)
  end as estagio_desde
from convites c
left join lateral (
  -- O PRIMEIRO envio de convite define o estágio "Enviado"; o último de
  -- QUALQUER tipo responde outra pergunta ("faz quanto tempo que falamos com
  -- essas pessoas?"), e é a tela de Comunicações que a usa.
  select
    min(k.enviado_em) filter (where k.tipo = 'convite') as enviado_em,
    max(k.enviado_em) as ultimo_contato
  from comunicacoes k
  where k.convite_id = c.id
) env on true
left join (
  select
    g.convite_id,
    count(*) as total_membros,
    -- Só resposta de verdade conta: linha ausente e linha 'pendente' são a
    -- mesma coisa para quem organiza — ninguém respondeu ainda. `lista_espera`
    -- conta como resposta: o convidado deu retorno, quem está segurando é o
    -- casal (decisão registrada em docs/PRODUCT.md seção 5.2).
    count(*) filter (
      where r.status_rsvp is not null and r.status_rsvp <> 'pendente'
    ) as total_respondidos,
    max(r.respondido_em) filter (
      where r.status_rsvp is not null and r.status_rsvp <> 'pendente'
    ) as ultima_resposta
  from convidados g
  left join respostas_rsvp r on r.convidado_id = g.id
  where g.excluido_em is null
    and g.convite_id is not null
  group by g.convite_id
) m on m.convite_id = c.id
left join lateral (
  -- Primeiro acesso vive só no log, e é gravado POR CONVITE (não por
  -- convidado): "João abriu, Maria não" é `aberto`, nunca `parcial` — acesso
  -- parcial não é resposta parcial.
  --
  -- `min`, não `limit 1`: o estágio precisa da data do PRIMEIRO acesso, e o
  -- log pode ter mais de um evento desse tipo se algum caminho novo o gravar.
  select min(h.ocorrido_em) as primeiro_acesso
  from historico_convite h
  where h.convite_id = c.id
    and h.tipo_evento = 'rsvp.first_access'
) a on true;

comment on view convites_com_resumo is
  'Convites com total de membros, total de respostas, `status_operacional` (o estágio mais avançado do funil: nao_enviado/enviado/aberto/parcial/respondido), `estagio_desde` (o timestamp do fato que define o estágio), `enviado_em` (DERIVADO do primeiro registro em comunicacoes do tipo convite) e `ultimo_contato` (o envio mais recente de qualquer tipo). Tudo derivado — nunca fonte de verdade própria. security_invoker: respeita a RLS das tabelas de origem.';

grant select on convites_com_resumo to authenticated, service_role;
