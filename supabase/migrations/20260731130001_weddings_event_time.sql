-- Horário exato do casamento, para a contagem regressiva (Fase Visual).
-- Nullable e sem timezone, no mesmo nível de "ingenuidade" de fuso que
-- event_date já tem (também sem timezone) — quando ausente, a contagem
-- regressiva usa meia-noite do dia do evento como alvo (resolvido pela
-- aplicação, ver shared/utils/event-datetime.ts).

alter table weddings add column event_time time;

comment on column weddings.event_time is
  'Horário do casamento (sem timezone, mesmo nível de "ingenuidade" de fuso que event_date). Nulo = contagem regressiva usa meia-noite de event_date como alvo.';
