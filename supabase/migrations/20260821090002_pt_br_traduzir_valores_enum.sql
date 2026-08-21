-- Remodelagem para português (Passo 1, docs/PLANO-SAAS.md) — parte 2:
-- valores de CHECK/enum também são vocabulário de negócio (docs/PLANO-SAAS.md,
-- "Correções de documentação" / seção 5 do artifact da auditoria), então
-- traduzem junto. Cada bloco: drop do CHECK antigo (nome real buscado
-- dinamicamente via pg_constraint, nunca adivinhado — nomes auto-gerados de
-- CHECK inline não seguem rename de tabela/coluna) -> UPDATE dos dados
-- existentes -> novo CHECK com valores em português.
--
-- Ordem importa: o CHECK antigo continua exigindo os valores em inglês até
-- ser dropado — fazer o UPDATE antes dele violaria a própria constraint que
-- ainda está ativa (achado real ao validar esta migration contra o banco
-- dev, corrigido nesta versão).
--
-- Helper local, dropada ao final da migration: encontra e remove qualquer
-- CHECK constraint que referencie a coluna informada.
create or replace function _pt_br_drop_check(p_table regclass, p_column text)
returns void
language plpgsql
as $$
declare
  v_conname text;
begin
  for v_conname in
    select conname from pg_constraint
    where conrelid = p_table
      and contype = 'c'
      and pg_get_constraintdef(oid) ~ ('\y' || p_column || '\y')
  loop
    execute format('alter table %s drop constraint %I', p_table::text, v_conname);
  end loop;
end;
$$;

-- casamentos.modo_lista_convidados: closed/open -> fechada/aberta
select _pt_br_drop_check('casamentos', 'modo_lista_convidados');
update casamentos set modo_lista_convidados = case modo_lista_convidados
  when 'closed' then 'fechada' when 'open' then 'aberta' else modo_lista_convidados end;
alter table casamentos add constraint casamentos_modo_lista_convidados_check
  check (modo_lista_convidados in ('fechada', 'aberta'));
alter table casamentos alter column modo_lista_convidados set default 'fechada';

-- casamentos.modo_entrega_presente_fisico: both/self_purchase_only/payment_only
-- -> ambos/somente_compra_propria/somente_pagamento
select _pt_br_drop_check('casamentos', 'modo_entrega_presente_fisico');
update casamentos set modo_entrega_presente_fisico = case modo_entrega_presente_fisico
  when 'both' then 'ambos'
  when 'self_purchase_only' then 'somente_compra_propria'
  when 'payment_only' then 'somente_pagamento'
  else modo_entrega_presente_fisico end;
alter table casamentos add constraint casamentos_modo_entrega_presente_fisico_check
  check (modo_entrega_presente_fisico in ('ambos', 'somente_compra_propria', 'somente_pagamento'));
alter table casamentos alter column modo_entrega_presente_fisico set default 'ambos';

-- membros_casamento.papel: owner/collaborator -> dono/colaborador
select _pt_br_drop_check('membros_casamento', 'papel');
update membros_casamento set papel = case papel
  when 'owner' then 'dono' when 'collaborator' then 'colaborador' else papel end;
alter table membros_casamento add constraint membros_casamento_papel_check
  check (papel in ('dono', 'colaborador'));

-- convites.status_convite: pending/sent -> pendente/enviado
select _pt_br_drop_check('convites', 'status_convite');
update convites set status_convite = case status_convite
  when 'pending' then 'pendente' when 'sent' then 'enviado' else status_convite end;
alter table convites add constraint convites_status_convite_check
  check (status_convite in ('pendente', 'enviado'));
alter table convites alter column status_convite set default 'pendente';

-- convidados.sexo: male/female/other -> masculino/feminino/outro
select _pt_br_drop_check('convidados', 'sexo');
update convidados set sexo = case sexo
  when 'male' then 'masculino' when 'female' then 'feminino' when 'other' then 'outro' else sexo end;
alter table convidados add constraint convidados_sexo_check
  check (sexo is null or sexo in ('masculino', 'feminino', 'outro'));

-- convidados.papel_casamento: já em português (padrinho/madrinha) — só
-- realinha o nome do constraint para o nome consistente com a coluna nova.
select _pt_br_drop_check('convidados', 'papel_casamento');
alter table convidados add constraint convidados_papel_casamento_check
  check (papel_casamento is null or papel_casamento in ('padrinho', 'madrinha'));

-- respostas_rsvp.status_rsvp: pending/confirmed/declined/waitlisted/removed
-- -> pendente/confirmado/recusado/lista_espera/removido
select _pt_br_drop_check('respostas_rsvp', 'status_rsvp');
update respostas_rsvp set status_rsvp = case status_rsvp
  when 'pending' then 'pendente'
  when 'confirmed' then 'confirmado'
  when 'declined' then 'recusado'
  when 'waitlisted' then 'lista_espera'
  when 'removed' then 'removido'
  else status_rsvp end;
alter table respostas_rsvp add constraint respostas_rsvp_status_rsvp_check
  check (status_rsvp in ('pendente', 'confirmado', 'recusado', 'lista_espera', 'removido'));
alter table respostas_rsvp alter column status_rsvp set default 'pendente';

-- presentes.estilo_exibicao: standard/emotional -> padrao/emocional
select _pt_br_drop_check('presentes', 'estilo_exibicao');
update presentes set estilo_exibicao = case estilo_exibicao
  when 'standard' then 'padrao' when 'emotional' then 'emocional' else estilo_exibicao end;
alter table presentes add constraint presentes_estilo_exibicao_check
  check (estilo_exibicao in ('padrao', 'emocional'));
alter table presentes alter column estilo_exibicao set default 'padrao';

-- pagamentos_presentes.tipo: reservation/contribution -> reserva/contribuicao
select _pt_br_drop_check('pagamentos_presentes', 'tipo');
update pagamentos_presentes set tipo = case tipo
  when 'reservation' then 'reserva' when 'contribution' then 'contribuicao' else tipo end;
alter table pagamentos_presentes add constraint pagamentos_presentes_tipo_check
  check (tipo in ('reserva', 'contribuicao'));

-- pagamentos_presentes.status_pagamento: pending/confirmed/failed/expired
-- -> pendente/confirmado/falhou/expirado
select _pt_br_drop_check('pagamentos_presentes', 'status_pagamento');
update pagamentos_presentes set status_pagamento = case status_pagamento
  when 'pending' then 'pendente'
  when 'confirmed' then 'confirmado'
  when 'failed' then 'falhou'
  when 'expired' then 'expirado'
  else status_pagamento end;
alter table pagamentos_presentes add constraint pagamentos_presentes_status_pagamento_check
  check (status_pagamento in ('pendente', 'confirmado', 'falhou', 'expirado'));
alter table pagamentos_presentes alter column status_pagamento set default 'pendente';

-- comunicacoes.tipo: invite/reminder/confirmation -> convite/lembrete/confirmacao
select _pt_br_drop_check('comunicacoes', 'tipo');
update comunicacoes set tipo = case tipo
  when 'invite' then 'convite' when 'reminder' then 'lembrete' when 'confirmation' then 'confirmacao'
  else tipo end;
alter table comunicacoes add constraint comunicacoes_tipo_check
  check (tipo in ('convite', 'lembrete', 'confirmacao'));

-- comunicacoes.canal: email/whatsapp/sms ficam como estão (nomes de canal
-- já universais/próprios) — só realinha o nome do constraint.
select _pt_br_drop_check('comunicacoes', 'canal');
alter table comunicacoes add constraint comunicacoes_canal_check
  check (canal in ('email', 'whatsapp', 'sms'));

-- conexoes_galeria.status_conexao: active/error/reauth_required
-- -> ativo/erro/reautenticacao_necessaria
select _pt_br_drop_check('conexoes_galeria', 'status_conexao');
update conexoes_galeria set status_conexao = case status_conexao
  when 'active' then 'ativo' when 'error' then 'erro' when 'reauth_required' then 'reautenticacao_necessaria'
  else status_conexao end;
alter table conexoes_galeria add constraint conexoes_galeria_status_conexao_check
  check (status_conexao in ('ativo', 'erro', 'reautenticacao_necessaria'));
alter table conexoes_galeria alter column status_conexao set default 'ativo';

-- conexoes_galeria.modo: oauth/public_link -> mantidos (termos técnicos de
-- integração, sem tradução natural) — só realinha o nome do constraint.
select _pt_br_drop_check('conexoes_galeria', 'modo');
alter table conexoes_galeria add constraint conexoes_galeria_modo_check
  check (modo in ('oauth', 'public_link'));

-- tarefas.status_tarefa: pending/processing/completed/failed
-- -> pendente/processando/concluida/falhou
select _pt_br_drop_check('tarefas', 'status_tarefa');
update tarefas set status_tarefa = case status_tarefa
  when 'pending' then 'pendente'
  when 'processing' then 'processando'
  when 'completed' then 'concluida'
  when 'failed' then 'falhou'
  else status_tarefa end;
alter table tarefas add constraint tarefas_status_tarefa_check
  check (status_tarefa in ('pendente', 'processando', 'concluida', 'falhou'));
alter table tarefas alter column status_tarefa set default 'pendente';

-- trilha_auditoria.tipo_autor: member/system -> membro/sistema
select _pt_br_drop_check('trilha_auditoria', 'tipo_autor');
update trilha_auditoria set tipo_autor = case tipo_autor
  when 'member' then 'membro' when 'system' then 'sistema' else tipo_autor end;
-- constraint composto (checa tipo_autor + autor_id juntos) precisa ser
-- recriado por inteiro com os novos valores.
alter table trilha_auditoria add constraint trilha_auditoria_autor_consistencia_check
  check (
    (tipo_autor = 'sistema' and autor_id is null)
    or (tipo_autor = 'membro' and autor_id is not null)
  );

-- Constraint de formato do slug: puramente estrutural (regex), não carrega
-- vocabulário de negócio — só realinha o nome para o padrão novo.
alter table casamentos rename constraint weddings_slug_format to casamentos_slug_formato_check;

-- Nomes de constraint de FK/PK (ex.: event_segments_wedding_id_fkey) ficam
-- como estão nesta fase — são identificadores internos de catálogo, nunca
-- referenciados por nome em código de aplicação ou documentação; renomear
-- todos exigiria uma migration própria sem ganho funcional (ver
-- docs/PLANO-SAAS.md, escopo do rename).

drop function _pt_br_drop_check(regclass, text);
