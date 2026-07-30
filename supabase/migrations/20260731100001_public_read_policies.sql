-- O site público do casamento (CLAUDE.md, seções 1/20/26) é acessível sem
-- autenticação e sem token de convidado — qualquer pessoa com o link pode
-- ver os dados básicos do evento. Nenhuma coluna de weddings/event_segments
-- é sensível (nome do casal, data, cronograma, tema visual), então uma
-- policy de leitura pública explícita é segura e evita reimplementar essa
-- checagem manualmente em server/api (CLAUDE.md, seção 4.3 — toda tabela
-- nasce com RLS habilitada e nenhuma policy; esta é adicionada de forma
-- deliberada e explícita, não por padrão).

create policy weddings_select_public
  on weddings for select
  using (true);

create policy event_segments_select_public
  on event_segments for select
  using (true);
