-- Fase 5 do Hub: criar um casamento pelo painel interno
-- (docs/fase5-multievento.md seção 6).
--
-- Até aqui, cliente novo era uma linha escrita à mão no banco de produção, sem
-- registro de quem fez -- `casamentos` nunca teve policy de INSERT e não havia
-- endpoint nenhum.
--
-- As três escritas precisam valer JUNTAS: um casamento sem dono é um tenant
-- que ninguém alcança, visível no painel interno e em lugar nenhum além dele.
-- Daí a função, pelo mesmo motivo que reserva de presente é função: transação,
-- não sequência de INSERT na aplicação.
--
-- O que NÃO está aqui, e é decisão: resolver/convidar o usuário do dono. Isso
-- acontece ANTES, fora da transação, porque `inviteUserByEmail` cria linha em
-- auth.users e dispara um e-mail -- nem uma coisa nem a outra volta atrás com
-- um rollback. Com o usuário resolvido primeiro, a falha da transação deixa no
-- pior caso um convite para alguém que ainda não tem casamento nenhum (estado
-- previsto e já implementado: o vazio de /admin), nunca um tenant órfão.

create function criar_casamento_com_dono(
  p_slug text,
  p_nomes_noivos text,
  p_data_evento date,
  p_usuario_dono uuid,
  p_operador uuid
)
returns casamentos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_casamento casamentos;
  v_membro_id uuid;
begin
  if is_slug_reservado(p_slug) then
    raise exception 'slug reservado: %', p_slug
      using errcode = 'check_violation';
  end if;

  -- Sem tocar em status_ciclo_vida: o default é 'rascunho', e desde a Fase 4
  -- rascunho barra o site público de verdade. A equipe interna cria o evento;
  -- só o casal o coloca no ar (docs/fase5-multievento.md 6.4).
  insert into casamentos (slug, nomes_noivos, data_evento)
  values (p_slug, p_nomes_noivos, p_data_evento)
  returning * into v_casamento;

  insert into membros_casamento (casamento_id, usuario_id, papel)
  values (v_casamento.id, p_usuario_dono, 'dono')
  returning id into v_membro_id;

  -- O registro nasce dentro da mesma transação que o tenant: criar um
  -- casamento e dar posse dele a alguém não pode acontecer sem trilha
  -- (docs/fase5-multievento.md seção 7).
  insert into trilha_auditoria (
    casamento_id, tipo_autor, autor_operador_id, acao, tipo_entidade, entidade_id, metadados
  )
  values (
    v_casamento.id,
    'operador',
    p_operador,
    'casamento.criar',
    'casamento',
    v_casamento.id,
    jsonb_build_object('slug', p_slug, 'membro_dono_id', v_membro_id)
  );

  return v_casamento;
end;
$$;

comment on function criar_casamento_com_dono(text, text, date, uuid, uuid) is
  'Cria casamento + dono + registro de auditoria numa transação só (docs/fase5-multievento.md 6.1). Chamada apenas por POST /api/platform/weddings, depois de requirePlatformOperator(). SECURITY DEFINER porque casamentos não tem policy de INSERT e nunca deve ter: criação é do caminho Plataforma, com portão em TypeScript.';

-- O caminho Plataforma é sempre service_role + checagem explícita
-- (CLAUDE.md 4.2). Esta função escreve entre tenants, então nenhuma sessão de
-- casal ou de convidado pode alcançá-la.
revoke execute on function criar_casamento_com_dono(text, text, date, uuid, uuid) from public;
revoke execute on function criar_casamento_com_dono(text, text, date, uuid, uuid) from anon;
revoke execute on function criar_casamento_com_dono(text, text, date, uuid, uuid) from authenticated;
grant execute on function criar_casamento_com_dono(text, text, date, uuid, uuid) to service_role;
