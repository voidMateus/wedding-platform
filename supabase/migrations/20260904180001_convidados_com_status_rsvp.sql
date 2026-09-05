-- Leitura da lista de convidados já com o status de RSVP resolvido.
--
-- Por que existe: "pendente" não é um valor gravado em lugar nenhum.
-- `respostas_rsvp` só ganha linha quando alguém responde de fato
-- (`registrar_resposta_rsvp`), então pendente é "não tem linha OU tem linha com
-- status pendente". Essa condição não é expressável pelo PostgREST a partir de
-- `convidados`: com `!inner` o convidado que nunca respondeu desaparece do
-- resultado, e com `!left` o filtro corta a resposta embutida, não o convidado.
-- Resolver na aplicação também não serve — a listagem é paginada e o
-- "N confirmados" do cabeçalho é contado no banco, então um recorte feito em
-- memória descreveria uma lista diferente da que está na tela.
--
-- Primeira view do projeto. `security_invoker = true` é obrigatório
-- (CLAUDE.md, seção 10): sem isso ela roda com o privilégio do dono e ignora a
-- RLS de `convidados`/`respostas_rsvp` — exatamente o achado de segurança
-- "Security Definer View" registrado em docs/CHANGELOG.md. Com o invoker
-- ligado, cada linha continua passando pelas policies das tabelas de origem,
-- então a view não é um caminho novo de acesso: é a mesma leitura de sempre,
-- com uma coluna derivada a mais.
--
-- `respostas_rsvp` tem no máximo uma linha por convidado (índice único em
-- convidado_id), então o left join nunca duplica ninguém.
--
-- Manutenção: `c.*` é expandido na criação da view. Coluna nova em
-- `convidados` não aparece aqui sozinha — é preciso `drop view` + `create view`
-- (o `create or replace` não muda a lista de colunas). O typecheck acusa:
-- o tipo gerado da view fica sem a coluna que o código passou a usar.

create view public.convidados_com_status
with (security_invoker = true) as
select
  c.*,
  coalesce(r.status_rsvp, 'pendente') as status_rsvp,
  r.respondido_em
from public.convidados c
left join public.respostas_rsvp r on r.convidado_id = c.id;

comment on view public.convidados_com_status is
  'Convidados com o status de RSVP resolvido (sem resposta = pendente). Leitura da listagem/filtro do admin — escrita continua sendo sempre em convidados/respostas_rsvp. security_invoker: respeita a RLS das tabelas de origem.';

-- Explícito, ainda que os default privileges do schema public já cubram: a
-- garantia de que só quem já podia ler as tabelas de origem enxerga a view não
-- vem do grant (é a RLS, via security_invoker), mas deixar o grant escrito
-- evita depender do default privileges do projeto.
grant select on public.convidados_com_status to authenticated, service_role;
