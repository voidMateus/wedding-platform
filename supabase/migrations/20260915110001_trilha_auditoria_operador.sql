-- Fase 5 do Hub: a trilha de auditoria ganha um terceiro ator
-- (docs/fase5-multievento.md seção 7).
--
-- `/plataforma` deixa de ser só leitura na entrega seguinte (criar casamento),
-- e criar um tenant e dar posse dele a alguém é exatamente o tipo de ação que
-- não pode acontecer sem registro. Só que a trilha não conseguia representar
-- quem a tomou: `tipo_autor` aceitava membro/sistema, e `autor_id` aponta para
-- membros_casamento -- um operador de plataforma não é membro de casamento
-- nenhum, e não pode virar um só para caber na coluna.
--
-- Sem isto, a única saída seria declarar `auditoria dispensada:` na rota de
-- criação, concedendo a primeira dispensa do projeto justamente à ação mais
-- grave que o sistema sabe fazer.

alter table trilha_auditoria
  add column autor_operador_id uuid
    references operadores_plataforma (usuario_id) on delete set null;

comment on column trilha_auditoria.autor_operador_id is
  'Operador de plataforma que tomou a ação (tipo_autor = operador). Nulo nos outros dois tipos. `on delete set null`: a trilha é append-only e sobrevive à saída de quem agiu -- o registro do que aconteceu não depende de a pessoa continuar na equipe.';

-- Cada tipo tem exatamente uma forma de autor -- um operador nunca "finge"
-- ser membro, e o sistema continua sem autor nenhum.
--
-- O constraint é composto (o tipo e o autor são checados juntos), como já era
-- desde a tradução para português: não existe um `check (tipo_autor in ...)`
-- separado, porque a própria consistência já enumera os valores válidos.
alter table trilha_auditoria drop constraint trilha_auditoria_autor_consistencia_check;

alter table trilha_auditoria add constraint trilha_auditoria_autor_consistencia_check check (
  (tipo_autor = 'sistema' and autor_id is null and autor_operador_id is null)
  or (tipo_autor = 'membro' and autor_id is not null and autor_operador_id is null)
  or (tipo_autor = 'operador' and autor_id is null and autor_operador_id is not null)
);

comment on column trilha_auditoria.tipo_autor is
  'membro: ação do painel administrativo, com autor_id. sistema: o que a plataforma faz sozinha (cron), sem autor. operador: equipe interna agindo pelo /plataforma, com autor_operador_id (docs/fase5-multievento.md seção 7).';

-- Nenhuma policy nova: a escrita do operador acontece via service_role (o
-- caminho Plataforma inteiro é assim, CLAUDE.md 4.2 -- RLS não consegue
-- expressar "qualquer tenant"). A policy de SELECT existente continua valendo
-- e é o que faz o CASAL ler, no próprio painel, quem criou o evento dele --
-- isso é honesto, não vazamento.
