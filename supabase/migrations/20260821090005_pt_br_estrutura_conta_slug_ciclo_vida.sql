-- Remodelagem para português (Passo 1, docs/PLANO-SAAS.md) — parte 5:
-- adições estruturais identificadas na auditoria arquitetural, feitas já em
-- português (não faz sentido nomeá-las em inglês para traduzir de novo):
--   1. assinaturas/funcionalidades_habilitadas passam a suportar escopo de
--      conta (Planner), além de escopo de casamento (Casal) -- seção 6/7/10
--      do artifact da auditoria.
--   2. planos ganha max_casamentos.
--   3. slug reservado (is_slug_reservado) -- seção 9.
--   4. ciclo de vida do casamento (status_ciclo_vida) -- seção 13/17.

-- =========================================================================
-- 1. assinaturas: casamento_id vira opcional, ganha conta_id (XOR)
-- =========================================================================
alter table assinaturas alter column casamento_id drop not null;
alter table assinaturas add column conta_id uuid references auth.users (id) on delete cascade;
alter table assinaturas add constraint assinaturas_casamento_xor_conta
  check (num_nonnulls(casamento_id, conta_id) = 1);
-- unique(casamento_id) já existia (1 assinatura por casamento); equivalente
-- para o novo caminho de conta -- 1 assinatura ativa por conta.
create unique index assinaturas_conta_id_key on assinaturas (conta_id) where conta_id is not null;

comment on table assinaturas is
  'Vínculo entre casamento OU conta (auth.users) e plano -- exatamente um dos dois preenchido. Casamento = plano Casal (pagamento único por evento); conta = plano Planner (assinatura cobrindo múltiplos casamentos). Ver docs/PLANO-SAAS.md, Passo 4.';
comment on column assinaturas.conta_id is
  'Preenchido só para assinatura de conta (Planner) -- "conta" é auth.users diretamente, sem tabela própria (ver artifact da auditoria, seção 7: nenhuma entidade "Conta" nova é necessária).';

-- =========================================================================
-- 2. funcionalidades_habilitadas: mesmo padrão XOR
-- =========================================================================
alter table funcionalidades_habilitadas alter column casamento_id drop not null;
alter table funcionalidades_habilitadas add column conta_id uuid references auth.users (id) on delete cascade;
alter table funcionalidades_habilitadas add constraint funcionalidades_habilitadas_casamento_xor_conta
  check (num_nonnulls(casamento_id, conta_id) = 1);
-- unique(casamento_id, chave) já existia; equivalente para conta_id.
create unique index funcionalidades_habilitadas_conta_id_chave_key
  on funcionalidades_habilitadas (conta_id, chave) where conta_id is not null;

comment on table funcionalidades_habilitadas is
  'Feature flags por casamento OU conta -- mesmo padrão XOR de assinaturas. Evita espalhar `if (plano === "pro")` pelo código quando o billing chegar (docs/PLANO-SAAS.md, Passo 4).';

-- =========================================================================
-- 3. planos: limite de casamentos por conta (Planner) -- nulo = ilimitado
-- =========================================================================
alter table planos add column max_casamentos integer check (max_casamentos is null or max_casamentos >= 0);
comment on column planos.max_casamentos is
  'Só relevante para planos de conta (Planner) -- quantos casamentos essa conta pode possuir como dono simultaneamente. Nulo = ilimitado. Checado via COUNT no momento de criar/assumir um casamento, sem contador materializado (docs/PLANO-SAAS.md, Passo 4).';

-- =========================================================================
-- 4. Slug reservado (achado da auditoria, seção 9 do artifact: nada impedia
--    um casamento usar slug "admin", "login" etc.)
-- =========================================================================
create function is_slug_reservado(p_slug text)
returns boolean
language sql
stable
as $$
  select p_slug = any (array[
    'admin', 'login', 'api', 'public', 'www', 'app', 'assets',
    'meusitecasamento', 'presentes', 'rsvp', 'galeria', 'auth',
    'dashboard', 'cron', 'static', '_nuxt'
  ]);
$$;

comment on function is_slug_reservado(text) is
  'Lista fixa de slugs reservados (rotas técnicas/estáticas da própria plataforma) -- evita colisão de um casamento com uma rota real (achado da auditoria, docs/PLANO-SAAS.md Passo 1). Lista pequena e estável o suficiente para não justificar uma tabela própria (mesmo racional de is_membro_casamento: função, não tabela).';

alter table casamentos add constraint casamentos_slug_nao_reservado
  check (not is_slug_reservado(slug));

-- =========================================================================
-- 5. Ciclo de vida do casamento (achado da auditoria, seção 13/17: falta
--    estado agregado do casamento inteiro -- hoje só existe soft delete
--    pontual por entidade filha)
-- =========================================================================
alter table casamentos add column status_ciclo_vida text not null default 'rascunho'
  check (status_ciclo_vida in ('rascunho', 'publicado', 'arquivado'));
alter table casamentos add column arquivado_em timestamptz;

comment on column casamentos.status_ciclo_vida is
  'rascunho (default, ainda configurando) | publicado (site público ativo) | arquivado (evento encerrado, dados preservados). Adicionado durante a remodelagem para português -- não existia estado agregado do casamento inteiro antes (docs/PLANO-SAAS.md, Passo 6).';
comment on column casamentos.arquivado_em is
  'Preenchido quando status_ciclo_vida vira ''arquivado''. Comportamento completo de exportação/exclusão pós-arquivamento é trabalho de produto separado (docs/PLANO-SAAS.md, Passo 6) -- esta migration só adiciona o estado, não a automação em torno dele.';
