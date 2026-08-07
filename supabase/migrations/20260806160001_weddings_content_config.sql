-- Personalização das mensagens narrativas do site público (CLAUDE.md, roadmap
-- "Fase Mensagens Personalizáveis") — cada campo é opcional: null/ausente
-- mantém o texto padrão da plataforma (shared/wedding-content.ts). Ao
-- contrário de theme_config (§22.3, exclusivamente atributos visuais), esta
-- coluna é só conteúdo textual — nunca comportamento de negócio, mesma
-- separação de responsabilidade, endpoint próprio (PATCH /api/wedding/content).

alter table weddings add column content_config jsonb null default null;

comment on column weddings.content_config is
  'Sobrescritas opcionais das mensagens narrativas do site público (boas-vindas, nossa história, dress code, manual do convidado, intro de presentes, FAQ). Shape em shared/schemas/content.ts#WeddingContentConfig. null = usa o texto padrão de shared/wedding-content.ts.';
