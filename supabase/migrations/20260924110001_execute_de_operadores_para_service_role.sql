-- Corrige a migration anterior (20260924100001): ao tirar o EXECUTE de
-- `public`, o `service_role` ficou sem ele também -- e é justamente ele quem
-- precisa chamar as duas funções.
--
-- POR QUE PASSOU LOCALMENTE E REPROVOU NO CI. No projeto hospedado o Supabase
-- concede EXECUTE a `anon`, `authenticated` e `service_role` explicitamente
-- (default privileges do schema public), então revogar de `public` derrubou só
-- a concessão implícita e a explícita do `service_role` continuou de pé. No
-- stack local que o CI monta, o EXECUTE vinha SÓ de `public` -- e o revoke
-- levou todo mundo junto, incluindo quem deveria chamar. Sete dos oito testes
-- de invariante falharam com `42501`, que é a recusa correta aplicada à pessoa
-- errada.
--
-- A lição fica no schema, não no comentário de um arquivo: **a permissão é
-- declarada, nunca herdada**. Depender do que o ambiente concede por padrão é
-- depender de uma diferença entre ambientes que ninguém vê até ela morder.

grant execute on function conceder_operador_plataforma(uuid, uuid, text) to service_role;
grant execute on function revogar_operador_plataforma(uuid, uuid, text) to service_role;

-- E reafirma a recusa, para o par ficar legível numa leitura só: só o
-- service_role executa, e ele só é alcançável por rota que já passou por
-- `requirePlatformOperator()` (CLAUDE.md seção 4.2).
revoke execute on function conceder_operador_plataforma(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function revogar_operador_plataforma(uuid, uuid, text) from public, anon, authenticated;
