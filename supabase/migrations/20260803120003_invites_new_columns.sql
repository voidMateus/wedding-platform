-- Novos campos de invites (CLAUDE.md, seção 12.1/19.2): responsável,
-- status, código interno, arquivamento, mensagem de RSVP. Substitui o antigo
-- max_members (validação de capacidade que não existe mais nesse formato —
-- convidados agora são sempre pré-cadastrados individualmente) por
-- max_companions (limite de acompanhante avulso, só relevante em
-- weddings.guest_list_mode = 'open').

-- confirm_rsvp() é a única função que ainda lê guest_groups.max_members —
-- será substituída por upsert_guest_rsvp()/finalize_invite_rsvp() em
-- migrations posteriores desta mesma fase. Precisa ser removida antes de
-- dropar a coluna.
drop function if exists confirm_rsvp(uuid, uuid, uuid, text, text, text, jsonb);

alter table invites
  add column internal_code text,
  add column status text not null default 'pending' check (status in ('pending', 'sent')),
  add column responsible_guest_id uuid references guests (id) on delete set null,
  add column sent_at timestamptz,
  add column archived_at timestamptz,
  add column max_companions integer check (max_companions is null or max_companions >= 0),
  add column rsvp_message text,
  add column rsvp_message_at timestamptz;

-- Backfill de internal_code para convites já existentes antes do NOT NULL.
update invites set internal_code = 'CONV-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where internal_code is null;

alter table invites alter column internal_code set not null;

create unique index invites_wedding_id_internal_code_key on invites (wedding_id, internal_code);
create index invites_responsible_guest_id_idx on invites (responsible_guest_id);
create index invites_status_idx on invites (wedding_id, status);

alter table invites drop column max_members;

comment on column invites.internal_code is
  'Código interno gerado automaticamente — só uso organizacional (busca/relatório), nunca credencial de acesso (essa é guest_access_tokens.code_hash).';
comment on column invites.status is
  'pending | sent — se o convite já foi enviado ao(s) convidado(s). O status "respondido"/"parcial" é calculado a partir de rsvp_responses, nunca gravado aqui (CLAUDE.md, seção 12.1).';
comment on column invites.responsible_guest_id is
  'Convidado Responsável pelo convite — usado para personalizar mensagens ("Olá, José!"). Nulo até o primeiro convidado ser vinculado; editável pelo casal a qualquer momento.';
comment on column invites.archived_at is
  'Arquivamento pós-evento — independente de status, permite consulta histórica sem exclusão.';
comment on column invites.max_companions is
  'Limite de acompanhante avulso (nome livre, sem cadastro prévio) — só aplicável quando weddings.guest_list_mode = ''open''.';
comment on column invites.rsvp_message is
  'Mensagem única do convite ao casal, escrita na revisão final do RSVP — não é por convidado (CLAUDE.md, seção 16.3).';
comment on column invites.notes is
  'Observação interna do convite (ex.: "Mesa VIP") — nunca exibida ao convidado. Distinta das observações por convidado (guests.notes).';
