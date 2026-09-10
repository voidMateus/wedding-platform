-- Status do convite deixa de ser uma coleção de estados independentes e passa a
-- ser UM estágio operacional: o mais avançado que o convite alcançou.
--
-- O problema que isso resolve (docs/PRODUCT.md seção 5): "Pendente" cobria
-- quatro situações com providências opostas — não foi enviado, foi enviado e
-- ninguém respondeu, alguém abriu e não respondeu, parte respondeu. A tela
-- escrevia a mesma palavra nas quatro, mudando só o tom do badge (cinza vs
-- âmbar), que ninguém decodifica. E "abriu e não respondeu", que é o dado mais
-- acionável que existe, ficava enterrado na Linha do Tempo.
--
-- O funil:
--
--   nao_enviado -> enviado -> aberto -> parcial -> respondido
--      enviar     aguardar   lembrar   lembrar os   nada
--                                       que faltam
--
-- Cada estágio implica os anteriores, então uma coluna basta e nada se perde.
--
-- POR QUE DERIVADO, E NÃO UMA COLUNA NOVA: trocar `status_convite` por um
-- `status` de cinco valores só mudaria o tamanho do problema — seria mais uma
-- fonte de verdade a manter sincronizada com os fatos. Os fatos já existem
-- todos (`enviado_em`, o evento `rsvp.first_access`, as linhas de
-- `respostas_rsvp`); o estágio é a leitura deles.
--
-- POR QUE NA VIEW, E NÃO NA TELA: a listagem é paginada e o recorte por status
-- é feito pelo endpoint. Calculado no navegador, o filtro voltaria a recortar
-- só os 25 da página — exatamente o bug que esta view foi criada para matar.
--
-- O FUNIL NÃO É SÓ DIGITAL. Nenhum estágio exige que o convidado use o site: a
-- avó que confirma por telefone tem a resposta registrada pelo casal
-- (`salvar_rsvp_convidado` com `p_origem = 'admin_panel'`) e o convite vai
-- direto a `respondido`, sem nunca ter passado por `aberto`. É o que "estágio
-- mais avançado alcançado" garante — e a razão de não ser uma máquina de
-- estados com transições obrigatórias.

drop view if exists public.convites_com_resumo;

create view public.convites_com_resumo
with (security_invoker = true)
as
select
  c.*,
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
    -- marcado nada.
    when a.abriu then 'aberto'
    when c.enviado_em is not null then 'enviado'
    else 'nao_enviado'
  end as status_operacional
from public.convites c
left join (
  select
    g.convite_id,
    count(*) as total_membros,
    -- Só resposta de verdade conta: linha ausente e linha 'pendente' são a
    -- mesma coisa para quem organiza — ninguém respondeu ainda. `lista_espera`
    -- conta como resposta: o convidado deu retorno, quem está segurando é o
    -- casal (decisão registrada em docs/PRODUCT.md seção 5).
    count(*) filter (
      where r.status_rsvp is not null and r.status_rsvp <> 'pendente'
    ) as total_respondidos
  from public.convidados g
  left join public.respostas_rsvp r on r.convidado_id = g.id
  where g.excluido_em is null
    and g.convite_id is not null
  group by g.convite_id
) m on m.convite_id = c.id
left join lateral (
  -- Primeiro acesso vive só no log, e é gravado POR CONVITE (não por
  -- convidado): "João abriu, Maria não" é `aberto`, nunca `parcial` — acesso
  -- parcial não é resposta parcial. Daí bastar a existência do evento, sem
  -- coluna nova em `convites` para manter sincronizada.
  select true as abriu
  from public.historico_convite h
  where h.convite_id = c.id
    and h.tipo_evento = 'rsvp.first_access'
  limit 1
) a on true;

comment on view public.convites_com_resumo is
  'Convites com total de membros, total de respostas e `status_operacional`: o estágio mais avançado do funil (nao_enviado/enviado/aberto/parcial/respondido), derivado dos fatos — nunca uma fonte de verdade própria. Leitura da listagem/filtro do admin; escrita continua sempre em convites. security_invoker: respeita a RLS das tabelas de origem.';

grant select on public.convites_com_resumo to authenticated, service_role;

-- Acelera a checagem de "abriu" por convite. O índice existente é
-- (convite_id, ocorrido_em), que serve para a Linha do Tempo mas obriga a
-- varrer todos os eventos do convite para achar um tipo específico.
create index if not exists historico_convite_convite_id_tipo_evento_idx
  on public.historico_convite (convite_id, tipo_evento);

-- ---------------------------------------------------------------------------
-- `convites.status_convite` fica órfão a partir daqui
-- ---------------------------------------------------------------------------
-- Ele é a TERCEIRA representação do mesmo acontecimento: a coluna, o timestamp
-- `enviado_em` e o evento `token.sent` no histórico — os três gravados juntos
-- pelo mesmo endpoint. `enviado_em is not null` diz tudo que a coluna dizia, e
-- com data.
--
-- A coluna NÃO é removida nesta migration de propósito. As migrations são
-- aplicadas em prod no merge, em paralelo com o deploy da Vercel (ver
-- docs/ARCHITECTURE.md 4.2): existe uma janela em que o código ANTIGO ainda
-- roda contra o schema novo, e nela um `update` na coluna removida falharia.
-- Esta migration só deixa de exigi-la (o default cobre inserts que ainda a
-- mandem); a remoção entra numa migration posterior, quando nenhuma versão em
-- voo a escrever. Registrado em docs/ROADMAP.md.
comment on column public.convites.status_convite is
  'OBSOLETO — não ler nem escrever. Substituído por `enviado_em` (o mesmo fato, com data) e pelo evento `token.sent` no histórico. Mantido só para a janela de deploy; remoção pendente (ver docs/ROADMAP.md).';
