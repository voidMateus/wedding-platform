-- Remodelagem para português (Passo 1 do plano de execução SaaS,
-- docs/PLANO-SAAS.md). Renomeia todas as 27 tabelas e suas colunas de
-- negócio. Ambiente confirmado pré-lançamento, sem dado real de produção
-- (docs/PLANO-SAAS.md) — corte coordenado único, sem o padrão de duas etapas
-- reservado para dado real em produção.
--
-- ALTER TABLE RENAME / RENAME COLUMN preservam FKs, RLS policies, CHECK
-- constraints e índices por OID/attnum — só o *nome* de cada objeto precisa
-- ser realinhado explicitamente (índices/triggers/constraints não seguem o
-- rename automaticamente, ver 20260803120002 como precedente já usado neste
-- projeto). Valores de CHECK/enum (texto literal) são tratados na próxima
-- migration (20260821090002), já que a coluna precisa existir com o nome
-- novo antes de trocar os valores.

-- =========================================================================
-- weddings -> casamentos
-- =========================================================================
alter table weddings rename to casamentos;
alter table casamentos rename column couple_names to nomes_noivos;
alter table casamentos rename column event_date to data_evento;
alter table casamentos rename column event_time to horario_evento;
alter table casamentos rename column guest_list_mode to modo_lista_convidados;
alter table casamentos rename column infinitepay_handle to handle_infinitepay;
alter table casamentos rename column physical_gift_delivery_mode to modo_entrega_presente_fisico;
alter table casamentos rename column rsvp_deadline to prazo_rsvp;
alter table casamentos rename column theme_config to config_tema;
alter table casamentos rename column content_config to config_conteudo;
alter table casamentos rename column child_max_age to idade_maxima_crianca;
alter trigger weddings_set_updated_at on casamentos rename to casamentos_set_updated_at;

-- =========================================================================
-- wedding_members -> membros_casamento
-- =========================================================================
alter table wedding_members rename to membros_casamento;
alter table membros_casamento rename column wedding_id to casamento_id;
alter table membros_casamento rename column user_id to usuario_id;
alter table membros_casamento rename column role to papel;
alter index wedding_members_wedding_id_idx rename to membros_casamento_casamento_id_idx;
alter index wedding_members_user_id_idx rename to membros_casamento_usuario_id_idx;
alter trigger wedding_members_set_updated_at on membros_casamento rename to membros_casamento_set_updated_at;

-- =========================================================================
-- event_segments -> etapas_evento
-- =========================================================================
alter table event_segments rename to etapas_evento;
alter table etapas_evento rename column wedding_id to casamento_id;
alter table etapas_evento rename column title to titulo;
alter table etapas_evento rename column venue_name to nome_local;
alter table etapas_evento rename column venue_address to endereco_local;
alter table etapas_evento rename column venue_latitude to latitude_local;
alter table etapas_evento rename column venue_longitude to longitude_local;
alter table etapas_evento rename column starts_at to inicia_em;
alter table etapas_evento rename column ends_at to termina_em;
alter table etapas_evento rename column display_order to ordem_exibicao;
alter table etapas_evento rename column same_venue_as to mesmo_local_que;
alter table etapas_evento rename column image_url to url_imagem;
alter trigger event_segments_set_updated_at on etapas_evento rename to etapas_evento_set_updated_at;

-- =========================================================================
-- invites -> convites (já era guest_groups originalmente)
-- =========================================================================
alter table invites rename to convites;
alter table convites rename column wedding_id to casamento_id;
alter table convites rename column name to nome;
alter table convites rename column notes to observacoes;
alter table convites rename column internal_code to codigo_interno;
alter table convites rename column status to status_convite;
alter table convites rename column responsible_guest_id to convidado_responsavel_id;
alter table convites rename column sent_at to enviado_em;
alter table convites rename column archived_at to arquivado_em;
alter table convites rename column max_companions to max_acompanhantes;
alter table convites rename column rsvp_message to mensagem_rsvp;
alter table convites rename column rsvp_message_at to mensagem_rsvp_em;
alter table convites rename column deleted_at to excluido_em;
alter index invites_wedding_id_idx rename to convites_casamento_id_idx;
alter index invites_wedding_id_internal_code_key rename to convites_casamento_id_codigo_interno_key;
alter index invites_responsible_guest_id_idx rename to convites_convidado_responsavel_id_idx;
alter index invites_status_idx rename to convites_status_convite_idx;
alter trigger invites_set_updated_at on convites rename to convites_set_updated_at;

-- =========================================================================
-- groups -> grupos
-- =========================================================================
alter table groups rename to grupos;
alter table grupos rename column wedding_id to casamento_id;
alter table grupos rename column name to nome;
alter table grupos rename column color to cor;
alter table grupos rename column deleted_at to excluido_em;
alter index groups_wedding_id_idx rename to grupos_casamento_id_idx;
alter trigger groups_set_updated_at on grupos rename to grupos_set_updated_at;

-- =========================================================================
-- guest_parties -> nucleos_acompanhantes
-- =========================================================================
alter table guest_parties rename to nucleos_acompanhantes;
alter table nucleos_acompanhantes rename column wedding_id to casamento_id;
alter index guest_parties_wedding_id_idx rename to nucleos_acompanhantes_casamento_id_idx;
alter trigger guest_parties_set_updated_at on nucleos_acompanhantes rename to nucleos_acompanhantes_set_updated_at;

-- =========================================================================
-- guests -> convidados
-- =========================================================================
alter table guests rename to convidados;
alter table convidados rename column wedding_id to casamento_id;
alter table convidados rename column invite_id to convite_id;
alter table convidados rename column group_id to grupo_id;
alter table convidados rename column party_id to nucleo_id;
alter table convidados rename column party_order to ordem_nucleo;
alter table convidados rename column full_name to nome_completo;
alter table convidados rename column phone to telefone;
alter table convidados rename column dietary_restrictions to restricoes_alimentares;
alter table convidados rename column nickname to apelido;
alter table convidados rename column sex to sexo;
alter table convidados rename column birth_date to data_nascimento;
alter table convidados rename column photo_path to caminho_foto;
alter table convidados rename column wedding_role to papel_casamento;
alter table convidados rename column notes to observacoes;
alter table convidados rename column deleted_at to excluido_em;
alter index guests_wedding_id_idx rename to convidados_casamento_id_idx;
alter index guests_invite_id_idx rename to convidados_convite_id_idx;
alter index guests_group_id_idx rename to convidados_grupo_id_idx;
alter index guests_party_id_idx rename to convidados_nucleo_id_idx;
alter index guests_party_id_party_order_key rename to convidados_nucleo_id_ordem_nucleo_key;
alter index guests_wedding_id_email_key rename to convidados_casamento_id_email_key;
alter trigger guests_set_updated_at on convidados rename to convidados_set_updated_at;

-- =========================================================================
-- rsvp_responses -> respostas_rsvp
-- =========================================================================
alter table rsvp_responses rename to respostas_rsvp;
alter table respostas_rsvp rename column wedding_id to casamento_id;
alter table respostas_rsvp rename column guest_id to convidado_id;
alter table respostas_rsvp rename column invite_id to convite_id;
alter table respostas_rsvp rename column status to status_rsvp;
alter table respostas_rsvp rename column responded_at to respondido_em;
alter index rsvp_responses_wedding_id_idx rename to respostas_rsvp_casamento_id_idx;
alter index rsvp_responses_guest_id_key rename to respostas_rsvp_convidado_id_key;
alter index rsvp_responses_invite_id_idx rename to respostas_rsvp_convite_id_idx;
alter trigger rsvp_responses_set_updated_at on respostas_rsvp rename to respostas_rsvp_set_updated_at;

-- =========================================================================
-- companions -> acompanhantes_avulsos
-- =========================================================================
alter table companions rename to acompanhantes_avulsos;
alter table acompanhantes_avulsos rename column wedding_id to casamento_id;
alter table acompanhantes_avulsos rename column invite_id to convite_id;
alter table acompanhantes_avulsos rename column full_name to nome_completo;
alter table acompanhantes_avulsos rename column dietary_restrictions to restricoes_alimentares;
alter table acompanhantes_avulsos rename column deleted_at to excluido_em;
alter index companions_wedding_id_idx rename to acompanhantes_avulsos_casamento_id_idx;
alter index companions_invite_id_idx rename to acompanhantes_avulsos_convite_id_idx;
alter trigger companions_set_updated_at on acompanhantes_avulsos rename to acompanhantes_avulsos_set_updated_at;

-- =========================================================================
-- gift_categories -> categorias_presentes
-- =========================================================================
alter table gift_categories rename to categorias_presentes;
alter table categorias_presentes rename column wedding_id to casamento_id;
alter table categorias_presentes rename column name to nome;
alter table categorias_presentes rename column display_order to ordem_exibicao;
alter index gift_categories_wedding_id_idx rename to categorias_presentes_casamento_id_idx;
alter trigger gift_categories_set_updated_at on categorias_presentes rename to categorias_presentes_set_updated_at;

-- =========================================================================
-- gifts -> presentes
-- =========================================================================
alter table gifts rename to presentes;
alter table presentes rename column wedding_id to casamento_id;
alter table presentes rename column category_id to categoria_id;
alter table presentes rename column title to titulo;
alter table presentes rename column description to descricao;
alter table presentes rename column price_cents to preco_centavos;
alter table presentes rename column image_url to url_imagem;
alter table presentes rename column quantity_available to quantidade_disponivel;
alter table presentes rename column is_group_gift to e_presente_cota;
alter table presentes rename column target_amount_cents to valor_meta_centavos;
alter table presentes rename column is_active to esta_ativo;
alter table presentes rename column deleted_at to excluido_em;
alter table presentes rename column quota_amount_cents to valor_cota_centavos;
alter table presentes rename column display_style to estilo_exibicao;
alter table presentes rename column emotional_icon to icone_emocional;
alter index gifts_wedding_id_idx rename to presentes_casamento_id_idx;
alter index gifts_category_id_idx rename to presentes_categoria_id_idx;
alter trigger gifts_set_updated_at on presentes rename to presentes_set_updated_at;

-- =========================================================================
-- gift_reservations -> reservas_presentes (group_id corrigido p/ convite_id
-- na mesma migration — ver achado da auditoria, docs/PLANO-SAAS.md Passo 1)
-- =========================================================================
alter table gift_reservations rename to reservas_presentes;
alter table reservas_presentes rename column wedding_id to casamento_id;
alter table reservas_presentes rename column gift_id to presente_id;
alter table reservas_presentes rename column guest_id to convidado_id;
alter table reservas_presentes rename column group_id to convite_id;
alter table reservas_presentes rename column contributor_name to nome_contribuinte;
alter table reservas_presentes rename column reserved_at to reservado_em;
alter table reservas_presentes rename column message to mensagem;
alter table reservas_presentes rename column giver_phone to telefone_presenteador;
alter index gift_reservations_wedding_id_idx rename to reservas_presentes_casamento_id_idx;
alter index gift_reservations_gift_id_idx rename to reservas_presentes_presente_id_idx;
alter trigger gift_reservations_set_updated_at on reservas_presentes rename to reservas_presentes_set_updated_at;

-- =========================================================================
-- gift_contributions -> contribuicoes_presentes (mesma correção group_id)
-- =========================================================================
alter table gift_contributions rename to contribuicoes_presentes;
alter table contribuicoes_presentes rename column wedding_id to casamento_id;
alter table contribuicoes_presentes rename column gift_id to presente_id;
alter table contribuicoes_presentes rename column guest_id to convidado_id;
alter table contribuicoes_presentes rename column group_id to convite_id;
alter table contribuicoes_presentes rename column contributor_name to nome_contribuinte;
alter table contribuicoes_presentes rename column amount_cents to valor_centavos;
alter table contribuicoes_presentes rename column contributed_at to contribuido_em;
alter table contribuicoes_presentes rename column message to mensagem;
alter table contribuicoes_presentes rename column quota_count to quantidade_cotas;
alter table contribuicoes_presentes rename column giver_phone to telefone_presenteador;
alter index gift_contributions_wedding_id_idx rename to contribuicoes_presentes_casamento_id_idx;
alter index gift_contributions_gift_id_idx rename to contribuicoes_presentes_presente_id_idx;
alter trigger gift_contributions_set_updated_at on contribuicoes_presentes rename to contribuicoes_presentes_set_updated_at;

-- =========================================================================
-- gift_payments -> pagamentos_presentes
-- =========================================================================
alter table gift_payments rename to pagamentos_presentes;
alter table pagamentos_presentes rename column wedding_id to casamento_id;
alter table pagamentos_presentes rename column gift_id to presente_id;
alter table pagamentos_presentes rename column invite_id to convite_id;
alter table pagamentos_presentes rename column kind to tipo;
alter table pagamentos_presentes rename column status to status_pagamento;
alter table pagamentos_presentes rename column amount_cents to valor_centavos;
alter table pagamentos_presentes rename column giver_name to nome_presenteador;
alter table pagamentos_presentes rename column giver_phone to telefone_presenteador;
alter table pagamentos_presentes rename column guest_message to mensagem_convidado;
alter table pagamentos_presentes rename column quota_count to quantidade_cotas;
alter table pagamentos_presentes rename column resulting_reservation_id to reserva_resultante_id;
alter table pagamentos_presentes rename column resulting_contribution_id to contribuicao_resultante_id;
alter table pagamentos_presentes rename column provider_order_nsu to nsu_pedido_provedor;
alter table pagamentos_presentes rename column provider_transaction_nsu to nsu_transacao_provedor;
alter table pagamentos_presentes rename column provider_invoice_slug to slug_fatura_provedor;
alter table pagamentos_presentes rename column provider_checkout_url to url_checkout_provedor;
alter table pagamentos_presentes rename column last_provider_response to ultima_resposta_provedor;
alter table pagamentos_presentes rename column failure_reason to motivo_falha;
alter table pagamentos_presentes rename column confirmed_at to confirmado_em;
alter trigger gift_payments_set_updated_at on pagamentos_presentes rename to pagamentos_presentes_set_updated_at;

-- =========================================================================
-- guest_access_tokens -> credenciais_acesso_convite
-- =========================================================================
alter table guest_access_tokens rename to credenciais_acesso_convite;
alter table credenciais_acesso_convite rename column wedding_id to casamento_id;
alter table credenciais_acesso_convite rename column invite_id to convite_id;
alter table credenciais_acesso_convite rename column code_hash to codigo_hash;
alter table credenciais_acesso_convite rename column revoked_at to revogado_em;
alter index guest_access_tokens_wedding_id_idx rename to credenciais_acesso_convite_casamento_id_idx;
alter index guest_access_tokens_code_hash_key rename to credenciais_acesso_convite_codigo_hash_key;
alter index guest_access_tokens_invite_id_idx rename to credenciais_acesso_convite_convite_id_idx;
alter index guest_access_tokens_active_invite_key rename to credenciais_acesso_convite_convite_ativo_key;
alter trigger guest_access_tokens_set_updated_at on credenciais_acesso_convite rename to credenciais_acesso_convite_set_updated_at;

-- =========================================================================
-- communications -> comunicacoes
-- =========================================================================
alter table communications rename to comunicacoes;
alter table comunicacoes rename column wedding_id to casamento_id;
alter table comunicacoes rename column access_token_id to credencial_id;
alter table comunicacoes rename column type to tipo;
alter table comunicacoes rename column channel to canal;
alter table comunicacoes rename column sent_at to enviado_em;
alter table comunicacoes rename column opened_at to aberto_em;
alter index communications_wedding_id_idx rename to comunicacoes_casamento_id_idx;
alter index communications_access_token_id_idx rename to comunicacoes_credencial_id_idx;
alter trigger communications_set_updated_at on comunicacoes rename to comunicacoes_set_updated_at;

-- =========================================================================
-- invite_tags -> etiquetas_convite / invite_tag_links -> vinculos_convite_etiqueta
-- =========================================================================
alter table invite_tags rename to etiquetas_convite;
alter table etiquetas_convite rename column wedding_id to casamento_id;
alter table etiquetas_convite rename column name to nome;
alter index invite_tags_wedding_id_name_key rename to etiquetas_convite_casamento_id_nome_key;
alter trigger invite_tags_set_updated_at on etiquetas_convite rename to etiquetas_convite_set_updated_at;

alter table invite_tag_links rename to vinculos_convite_etiqueta;
alter table vinculos_convite_etiqueta rename column invite_id to convite_id;
alter table vinculos_convite_etiqueta rename column tag_id to etiqueta_id;
alter index invite_tag_links_tag_id_idx rename to vinculos_convite_etiqueta_etiqueta_id_idx;

-- =========================================================================
-- invite_events -> historico_convite
-- =========================================================================
alter table invite_events rename to historico_convite;
alter table historico_convite rename column wedding_id to casamento_id;
alter table historico_convite rename column invite_id to convite_id;
alter table historico_convite rename column event_type to tipo_evento;
alter table historico_convite rename column metadata to metadados;
alter table historico_convite rename column occurred_at to ocorrido_em;
alter index invite_events_invite_id_occurred_at_idx rename to historico_convite_convite_id_ocorrido_em_idx;
alter index invite_events_wedding_id_idx rename to historico_convite_casamento_id_idx;

-- =========================================================================
-- photos -> fotos
-- =========================================================================
alter table photos rename to fotos;
alter table fotos rename column wedding_id to casamento_id;
alter table fotos rename column storage_path to caminho_storage;
alter table fotos rename column caption to legenda;
alter table fotos rename column display_order to ordem_exibicao;
alter table fotos rename column uploaded_by to enviado_por;
alter table fotos rename column source_connection_id to conexao_id;
alter table fotos rename column source_file_id to id_arquivo_origem;
alter table fotos rename column source_thumbnail_url to url_miniatura_origem;
alter table fotos rename column source_mime_type to tipo_mime_origem;
alter table fotos rename column focal_x to foco_x;
alter table fotos rename column focal_y to foco_y;
alter index photos_wedding_id_idx rename to fotos_casamento_id_idx;
alter trigger photos_set_updated_at on fotos rename to fotos_set_updated_at;

-- =========================================================================
-- gallery_source_connections -> conexoes_galeria
-- =========================================================================
alter table gallery_source_connections rename to conexoes_galeria;
alter table conexoes_galeria rename column wedding_id to casamento_id;
alter table conexoes_galeria rename column provider to provedor;
alter table conexoes_galeria rename column mode to modo;
alter table conexoes_galeria rename column folder_id to id_pasta;
alter table conexoes_galeria rename column folder_name to nome_pasta;
alter table conexoes_galeria rename column access_token_encrypted to token_acesso_cifrado;
alter table conexoes_galeria rename column refresh_token_encrypted to token_renovacao_cifrado;
alter table conexoes_galeria rename column token_expires_at to token_expira_em;
alter table conexoes_galeria rename column token_scope to escopo_token;
alter table conexoes_galeria rename column status to status_conexao;
alter table conexoes_galeria rename column last_sync_error to ultimo_erro_sincronizacao;
alter table conexoes_galeria rename column last_synced_at to ultima_sincronizacao_em;
alter table conexoes_galeria rename column last_sync_photo_count to ultima_contagem_fotos;
alter table conexoes_galeria rename column created_by to criado_por;
alter trigger gallery_source_connections_set_updated_at on conexoes_galeria rename to conexoes_galeria_set_updated_at;

-- =========================================================================
-- jobs -> tarefas
-- =========================================================================
alter table jobs rename to tarefas;
alter table tarefas rename column wedding_id to casamento_id;
alter table tarefas rename column type to tipo;
alter table tarefas rename column payload to dados;
alter table tarefas rename column status to status_tarefa;
alter table tarefas rename column attempts to tentativas;
alter table tarefas rename column last_error to ultimo_erro;
alter table tarefas rename column run_at to executar_em;
alter index jobs_status_run_at_idx rename to tarefas_status_executar_em_idx;
alter index jobs_wedding_id_idx rename to tarefas_casamento_id_idx;
alter trigger jobs_set_updated_at on tarefas rename to tarefas_set_updated_at;

-- =========================================================================
-- audit_logs -> trilha_auditoria
-- =========================================================================
alter table audit_logs rename to trilha_auditoria;
alter table trilha_auditoria rename column wedding_id to casamento_id;
alter table trilha_auditoria rename column actor_id to autor_id;
alter table trilha_auditoria rename column actor_type to tipo_autor;
alter table trilha_auditoria rename column action to acao;
alter table trilha_auditoria rename column entity_type to tipo_entidade;
alter table trilha_auditoria rename column entity_id to entidade_id;
alter table trilha_auditoria rename column metadata to metadados;
alter index audit_logs_wedding_id_idx rename to trilha_auditoria_casamento_id_idx;

-- =========================================================================
-- plans -> planos / subscriptions -> assinaturas / usage_counters ->
-- contadores_uso / entitlements -> funcionalidades_habilitadas
-- (conta_id/XOR e max_casamentos entram na migration 20260821090004)
-- =========================================================================
alter table plans rename to planos;
alter table planos rename column name to nome;
alter table planos rename column max_guests to max_convidados;
alter table planos rename column max_gifts to max_presentes;
alter table planos rename column storage_limit_mb to limite_storage_mb;
alter trigger plans_set_updated_at on planos rename to planos_set_updated_at;

alter table subscriptions rename to assinaturas;
alter table assinaturas rename column wedding_id to casamento_id;
alter table assinaturas rename column plan_id to plano_id;
alter table assinaturas rename column started_at to iniciado_em;
alter index subscriptions_plan_id_idx rename to assinaturas_plano_id_idx;
alter trigger subscriptions_set_updated_at on assinaturas rename to assinaturas_set_updated_at;

alter table usage_counters rename to contadores_uso;
alter table contadores_uso rename column wedding_id to casamento_id;
alter table contadores_uso rename column guest_count to contagem_convidados;
alter table contadores_uso rename column storage_used_mb to storage_usado_mb;
alter trigger usage_counters_set_updated_at on contadores_uso rename to contadores_uso_set_updated_at;

alter table entitlements rename to funcionalidades_habilitadas;
alter table funcionalidades_habilitadas rename column wedding_id to casamento_id;
alter table funcionalidades_habilitadas rename column key to chave;
alter table funcionalidades_habilitadas rename column enabled to habilitado;
alter index entitlements_wedding_id_idx rename to funcionalidades_habilitadas_casamento_id_idx;
alter trigger entitlements_set_updated_at on funcionalidades_habilitadas rename to funcionalidades_habilitadas_set_updated_at;
