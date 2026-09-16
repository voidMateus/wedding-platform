-- Última atividade de um casamento, para o painel interno.
--
-- A listagem da equipe dizia o PORTE de cada evento (convidados, storage) e
-- quando ele nasceu, mas nada sobre se ele está vivo. Um casamento criado em
-- março, com 80 convidados e nenhum toque desde abril é exatamente o caso que
-- a equipe precisa enxergar — e era indistinguível de um em uso diário.
--
-- ATIVIDADE É DO CASAL, NÃO DA PLATAFORMA. Só linhas com `tipo_autor =
-- 'membro'` contam:
--
--   * `sistema` é o cron (lembrete de RSVP, aviso de vencimento). Ele roda
--     sozinho, e faria um casamento abandonado parecer ativo todo dia.
--   * `operador` é a própria equipe interna. Contá-lo faria uma visita de
--     suporte marcar como "ativo" justamente o evento que se foi conferir por
--     estar parado — o painel responderia com o próprio reflexo.
--
-- Derivada da trilha, nunca uma coluna `ultima_atividade_em` a manter
-- sincronizada: seria mais um contador materializado a lembrar em cada caminho
-- de escrita (mesmo raciocínio de `uso_de_storage_por_casamento`,
-- `mesas.ocupacao` e `convites.enviado_em`). A trilha já é escrita por TODA
-- rota administrativa — `tests/unit/server/auditoria-completa.spec.ts` é o que
-- garante isso —, então ela já é o registro de atividade; faltava lê-la.
create index if not exists trilha_auditoria_atividade_do_membro_idx
  on trilha_auditoria (casamento_id, created_at desc)
  where tipo_autor = 'membro';

comment on index trilha_auditoria_atividade_do_membro_idx is
  'Sustenta ultima_atividade_por_casamento(): o max(created_at) por casamento das ações do casal.';

create function ultima_atividade_por_casamento()
returns table (casamento_id uuid, ultima_atividade timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select t.casamento_id, max(t.created_at) as ultima_atividade
  from trilha_auditoria t
  where t.tipo_autor = 'membro'
  group by t.casamento_id;
$$;

comment on function ultima_atividade_por_casamento() is
  'Quando o CASAL mexeu no painel pela última vez, por casamento (derivado de trilha_auditoria). Ação de sistema e de operador de plataforma não contam — as duas acontecem sem o cliente.';

-- Lê entre tenants, como todo o caminho Plataforma (CLAUDE.md 4.2): nunca
-- alcançável por uma sessão de casal ou de convidado. Quem autoriza é
-- requirePlatformOperator() em TypeScript, antes de qualquer uso de
-- service_role.
revoke execute on function ultima_atividade_por_casamento() from public;
revoke execute on function ultima_atividade_por_casamento() from anon;
revoke execute on function ultima_atividade_por_casamento() from authenticated;
grant execute on function ultima_atividade_por_casamento() to service_role;
