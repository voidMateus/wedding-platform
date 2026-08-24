-- Passo 4 (docs/PLANO-SAAS.md): primeiras RLS policies reais nas 4 tabelas
-- de preparação para SaaS (criadas em 20260730120018, sempre com RLS
-- habilitada e deny-by-default -- nenhuma feature lia/escrevia por caminho
-- autenticado até agora). Escopo desta migration: só leitura. Nenhuma
-- policy de insert/update/delete é adicionada -- o efeito de negócio de
-- assinatura/feature flag nasce de um processo de confiança do lado do
-- servidor (hoje nenhum; futuramente um webhook de pagamento reverificado
-- servidor-a-servidor, mesmo padrão de confirm_gift_payment(), CLAUDE.md
-- seção 12), nunca de uma mutação direta do client autenticado.

-- =========================================================================
-- planos: catálogo global, não particionado por casamento/conta -- qualquer
-- usuário autenticado pode consultar (nomes/limites de plano não são dado
-- sensível).
-- =========================================================================
create policy planos_select_autenticado on planos
  for select
  to authenticated
  using (true);

-- =========================================================================
-- assinaturas / funcionalidades_habilitadas: casamento_id OU conta_id
-- (XOR, ver 20260821090005) -- membro do casamento correspondente, ou a
-- própria conta (auth.uid()) quando for assinatura/feature flag de conta.
-- =========================================================================
create policy assinaturas_select_membro on assinaturas
  for select
  to authenticated
  using (
    (casamento_id is not null and is_membro_casamento(casamento_id))
    or (conta_id is not null and conta_id = auth.uid())
  );

create policy funcionalidades_habilitadas_select_membro on funcionalidades_habilitadas
  for select
  to authenticated
  using (
    (casamento_id is not null and is_membro_casamento(casamento_id))
    or (conta_id is not null and conta_id = auth.uid())
  );

-- =========================================================================
-- contadores_uso: só existe por casamento_id (sem XOR de conta) -- membro
-- do casamento correspondente.
-- =========================================================================
create policy contadores_uso_select_membro on contadores_uso
  for select
  to authenticated
  using (is_membro_casamento(casamento_id));
