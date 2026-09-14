-- Publicação do site: `status_ciclo_vida` ganha o primeiro escritor, e
-- `rascunho` passa a barrar o site público de verdade
-- (docs/fase4-onboarding.md, seções 1.3, 4 e 8).
--
-- A coluna existe desde 20260821090005 e NENHUMA linha de código jamais
-- escreveu nela; nenhuma rota pública jamais a leu. Na prática o site do casal
-- está no ar desde o instante em que a linha nasce -- com o tema da
-- plataforma, sem local e sem foto -- e o casal não sabe.

-- 1. O portão das rotas que leem com a anon key.
--
-- Exatamente três rotas públicas usam a anon key (wedding.get.ts,
-- event-segments.get.ts, photos.get.ts -- varredura de 2026-09-14), e as três
-- resolvem `casamentos` por slug ANTES de tocar em qualquer tabela filha.
-- Barrar `casamentos` barra o site inteiro numa linha só, sem repetir a
-- checagem em cada endpoint.
--
-- As policies públicas das filhas (etapas_evento, fotos, categorias_presentes)
-- seguem `using (true)` de propósito: elas são sempre consultadas por
-- casamento_id, e esse casamento_id vem da consulta que esta policy acabou de
-- barrar. Uma rota pública nova que lesse tabela filha direto por id furaria o
-- portão -- é o que tests/unit/server/rotas-publicas-com-portao.spec.ts trava.
--
-- A policy de MEMBRO não é tocada, e é ela que faz a prévia do casal
-- funcionar sem nenhum "modo de prévia": as rotas públicas usam o client da
-- sessão, então quem está logado e é membro lê o próprio rascunho; qualquer
-- outra pessoa cai nesta policy e recebe 404.
--
-- O caminho do convidado (RSVP) e o de presentes usam service_role, que ignora
-- RLS: lá o portão é checagem explícita em TypeScript
-- (server/utils/casamento-publicado.ts), como manda o modelo de confiança do
-- CLAUDE.md seção 4.2.
drop policy if exists casamentos_select_publico on casamentos;

create policy casamentos_select_publico
  on casamentos for select
  using (status_ciclo_vida = 'publicado');

-- 2. Promover o que já está no ar.
--
-- Sem promoção, esta migration tira do ar todo site em produção: o default da
-- coluna é 'rascunho' e ninguém nunca escreveu nela.
--
-- Mas promover TODO rascunho suporia que todo rascunho é site pronto, e não é:
-- um casamento que a equipe cadastrou e ainda não entregou ao casal também
-- está em rascunho, e publicá-lo seria a plataforma decidir por alguém que
-- nunca entrou. A linha divisória é ter dono -- sem nenhuma linha em
-- membros_casamento, ninguém fez login, ninguém compartilhou link nenhum, e
-- não ir ao ar não quebra nada.
--
-- O caso que esta heurística não cobre (casamento com membro cujo cadastro a
-- equipe ainda montava) sai da conferência manual que precede este deploy, com
-- um update pontual depois -- nunca um id de produção literal aqui, que não
-- significaria nada em dev nem no CI.
update casamentos c
   set status_ciclo_vida = 'publicado'
 where c.status_ciclo_vida = 'rascunho'
   and exists (
     select 1 from membros_casamento m where m.casamento_id = c.id
   );

comment on column casamentos.status_ciclo_vida is
  'rascunho (site público responde 404 -- só membros veem, pela policy de membro) | publicado (site no ar) | arquivado (evento encerrado, dados preservados; ainda sem tela que o produza). Escrito por PATCH /api/wedding/lifecycle. O portão do rascunho é a policy casamentos_select_publico para as rotas com anon key e garantirCasamentoPublicado() para as que usam service_role (docs/fase4-onboarding.md seção 8).';
