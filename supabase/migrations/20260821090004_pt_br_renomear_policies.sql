-- Remodelagem para português (Passo 1, docs/PLANO-SAAS.md) — parte 4:
-- nomes de RLS policy. Funcionalmente já corretas (preservadas por
-- attnum/OID durante os renames anteriores) — só o nome do objeto ainda diz
-- inglês. Convenção mantida: <tabela>_<operação>_<regra>
-- (docs/DATABASE.md §4).

alter policy weddings_select_own_wedding on casamentos rename to casamentos_select_membro;
alter policy weddings_update_own_wedding on casamentos rename to casamentos_update_membro;
alter policy weddings_delete_owner_only on casamentos rename to casamentos_delete_dono;
alter policy weddings_select_public on casamentos rename to casamentos_select_publico;

alter policy wedding_members_select_own_wedding on membros_casamento rename to membros_casamento_select_membro;
alter policy wedding_members_insert_owner_only on membros_casamento rename to membros_casamento_insert_dono;
alter policy wedding_members_update_owner_only on membros_casamento rename to membros_casamento_update_dono;
alter policy wedding_members_delete_owner_only on membros_casamento rename to membros_casamento_delete_dono;

alter policy event_segments_select_wedding_members on etapas_evento rename to etapas_evento_select_membro;
alter policy event_segments_insert_wedding_members on etapas_evento rename to etapas_evento_insert_membro;
alter policy event_segments_update_wedding_members on etapas_evento rename to etapas_evento_update_membro;
alter policy event_segments_delete_wedding_members on etapas_evento rename to etapas_evento_delete_membro;
alter policy event_segments_select_public on etapas_evento rename to etapas_evento_select_publico;

alter policy invites_select_wedding_members on convites rename to convites_select_membro;
alter policy invites_insert_wedding_members on convites rename to convites_insert_membro;
alter policy invites_update_wedding_members on convites rename to convites_update_membro;
alter policy invites_delete_wedding_members on convites rename to convites_delete_membro;

alter policy groups_select_wedding_members on grupos rename to grupos_select_membro;
alter policy groups_insert_wedding_members on grupos rename to grupos_insert_membro;
alter policy groups_update_wedding_members on grupos rename to grupos_update_membro;
alter policy groups_delete_wedding_members on grupos rename to grupos_delete_membro;

alter policy guest_parties_select_wedding_members on nucleos_acompanhantes rename to nucleos_acompanhantes_select_membro;
alter policy guest_parties_insert_wedding_members on nucleos_acompanhantes rename to nucleos_acompanhantes_insert_membro;
alter policy guest_parties_update_wedding_members on nucleos_acompanhantes rename to nucleos_acompanhantes_update_membro;
alter policy guest_parties_delete_wedding_members on nucleos_acompanhantes rename to nucleos_acompanhantes_delete_membro;

alter policy guests_select_wedding_members on convidados rename to convidados_select_membro;
alter policy guests_insert_wedding_members on convidados rename to convidados_insert_membro;
alter policy guests_update_wedding_members on convidados rename to convidados_update_membro;
alter policy guests_delete_wedding_members on convidados rename to convidados_delete_membro;

alter policy rsvp_responses_select_wedding_members on respostas_rsvp rename to respostas_rsvp_select_membro;
alter policy rsvp_responses_insert_wedding_members on respostas_rsvp rename to respostas_rsvp_insert_membro;
alter policy rsvp_responses_update_wedding_members on respostas_rsvp rename to respostas_rsvp_update_membro;
alter policy rsvp_responses_delete_wedding_members on respostas_rsvp rename to respostas_rsvp_delete_membro;

alter policy companions_select_wedding_members on acompanhantes_avulsos rename to acompanhantes_avulsos_select_membro;
alter policy companions_insert_wedding_members on acompanhantes_avulsos rename to acompanhantes_avulsos_insert_membro;
alter policy companions_update_wedding_members on acompanhantes_avulsos rename to acompanhantes_avulsos_update_membro;
alter policy companions_delete_wedding_members on acompanhantes_avulsos rename to acompanhantes_avulsos_delete_membro;

alter policy gift_categories_select_wedding_members on categorias_presentes rename to categorias_presentes_select_membro;
alter policy gift_categories_insert_wedding_members on categorias_presentes rename to categorias_presentes_insert_membro;
alter policy gift_categories_update_wedding_members on categorias_presentes rename to categorias_presentes_update_membro;
alter policy gift_categories_delete_wedding_members on categorias_presentes rename to categorias_presentes_delete_membro;
alter policy gift_categories_select_public on categorias_presentes rename to categorias_presentes_select_publico;

alter policy gifts_select_wedding_members on presentes rename to presentes_select_membro;
alter policy gifts_insert_wedding_members on presentes rename to presentes_insert_membro;
alter policy gifts_update_wedding_members on presentes rename to presentes_update_membro;
alter policy gifts_delete_wedding_members on presentes rename to presentes_delete_membro;

alter policy gift_reservations_select_wedding_members on reservas_presentes rename to reservas_presentes_select_membro;
alter policy gift_reservations_insert_wedding_members on reservas_presentes rename to reservas_presentes_insert_membro;
alter policy gift_reservations_update_wedding_members on reservas_presentes rename to reservas_presentes_update_membro;
alter policy gift_reservations_delete_wedding_members on reservas_presentes rename to reservas_presentes_delete_membro;

alter policy gift_contributions_select_wedding_members on contribuicoes_presentes rename to contribuicoes_presentes_select_membro;
alter policy gift_contributions_insert_wedding_members on contribuicoes_presentes rename to contribuicoes_presentes_insert_membro;
alter policy gift_contributions_update_wedding_members on contribuicoes_presentes rename to contribuicoes_presentes_update_membro;
alter policy gift_contributions_delete_wedding_members on contribuicoes_presentes rename to contribuicoes_presentes_delete_membro;

alter policy gift_payments_select_wedding_members on pagamentos_presentes rename to pagamentos_presentes_select_membro;

alter policy guest_access_tokens_select_wedding_members on credenciais_acesso_convite rename to credenciais_acesso_convite_select_membro;
alter policy guest_access_tokens_insert_wedding_members on credenciais_acesso_convite rename to credenciais_acesso_convite_insert_membro;
alter policy guest_access_tokens_update_wedding_members on credenciais_acesso_convite rename to credenciais_acesso_convite_update_membro;

alter policy communications_select_wedding_members on comunicacoes rename to comunicacoes_select_membro;
alter policy communications_insert_wedding_members on comunicacoes rename to comunicacoes_insert_membro;
alter policy communications_update_wedding_members on comunicacoes rename to comunicacoes_update_membro;

alter policy invite_tags_select_wedding_members on etiquetas_convite rename to etiquetas_convite_select_membro;
alter policy invite_tags_insert_wedding_members on etiquetas_convite rename to etiquetas_convite_insert_membro;
alter policy invite_tags_update_wedding_members on etiquetas_convite rename to etiquetas_convite_update_membro;
alter policy invite_tags_delete_wedding_members on etiquetas_convite rename to etiquetas_convite_delete_membro;

alter policy invite_tag_links_select_wedding_members on vinculos_convite_etiqueta rename to vinculos_convite_etiqueta_select_membro;
alter policy invite_tag_links_insert_wedding_members on vinculos_convite_etiqueta rename to vinculos_convite_etiqueta_insert_membro;
alter policy invite_tag_links_delete_wedding_members on vinculos_convite_etiqueta rename to vinculos_convite_etiqueta_delete_membro;

alter policy invite_events_select_wedding_members on historico_convite rename to historico_convite_select_membro;
alter policy invite_events_insert_wedding_members on historico_convite rename to historico_convite_insert_membro;

alter policy photos_select_wedding_members on fotos rename to fotos_select_membro;
alter policy photos_insert_wedding_members on fotos rename to fotos_insert_membro;
alter policy photos_update_wedding_members on fotos rename to fotos_update_membro;
alter policy photos_delete_wedding_members on fotos rename to fotos_delete_membro;
alter policy photos_select_public on fotos rename to fotos_select_publico;

alter policy jobs_select_wedding_members on tarefas rename to tarefas_select_membro;
alter policy jobs_insert_wedding_members on tarefas rename to tarefas_insert_membro;

alter policy audit_logs_select_wedding_members on trilha_auditoria rename to trilha_auditoria_select_membro;
alter policy audit_logs_insert_wedding_members on trilha_auditoria rename to trilha_auditoria_insert_membro;

-- gallery_source_connections nunca teve policy pública/de membro simples
-- listada nas migrations lidas na auditoria além do padrão CRUD -- confirma
-- e renomeia se existir; RLS já habilitada desde a criação da tabela.
do $$
begin
  if exists (select 1 from pg_policies where tablename = 'conexoes_galeria' and policyname = 'gallery_source_connections_select_wedding_members') then
    alter policy gallery_source_connections_select_wedding_members on conexoes_galeria rename to conexoes_galeria_select_membro;
  end if;
  if exists (select 1 from pg_policies where tablename = 'conexoes_galeria' and policyname = 'gallery_source_connections_insert_wedding_members') then
    alter policy gallery_source_connections_insert_wedding_members on conexoes_galeria rename to conexoes_galeria_insert_membro;
  end if;
  if exists (select 1 from pg_policies where tablename = 'conexoes_galeria' and policyname = 'gallery_source_connections_update_wedding_members') then
    alter policy gallery_source_connections_update_wedding_members on conexoes_galeria rename to conexoes_galeria_update_membro;
  end if;
  if exists (select 1 from pg_policies where tablename = 'conexoes_galeria' and policyname = 'gallery_source_connections_delete_wedding_members') then
    alter policy gallery_source_connections_delete_wedding_members on conexoes_galeria rename to conexoes_galeria_delete_membro;
  end if;
end $$;
