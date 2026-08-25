-- Passo 8 (docs/PLANO-SAAS.md) -- fundação do painel interno da plataforma:
-- equipe do próprio produto (não casal/colaborador de um casamento) com
-- leitura entre tenants. Não existe hoje nenhum conceito de "operador de
-- plataforma" no schema -- CLAUDE.md seção 4.2 descreve 4 modelos de
-- confiança, todos por-tenant/por-requisição; este é um 5º modelo novo,
-- documentado ali nesta mesma leva.

-- Extensão 1:1 de auth.users, mesmo padrão de contadores_uso (extensão 1:1
-- de casamentos, PK = FK, sem id próprio, ver docs/DATABASE.md seção 1).
create table operadores_plataforma (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table operadores_plataforma is
  'Equipe interna com acesso de leitura entre casamentos/contas (docs/PLANO-SAAS.md, Passo 8) -- nunca confundir com membros_casamento.papel = dono (esse é por casamento). Sem UI de gestão nesta fase: primeira linha inserida manualmente via service_role, mesmo racional do bootstrap de membros_casamento em supabase/seed.sql.';

alter table operadores_plataforma enable row level security;

-- Autochecagem: usuario_id = auth.uid() é comparação direta na própria
-- linha, sem lookup em outra tabela -- diferente de is_membro_casamento()/
-- is_dono_casamento(), não precisa de security definer (não há recursão de
-- RLS a evitar aqui). auth.uid() nulo (anon/sem sessão) nunca bate com
-- nenhuma linha real, resultado sempre vazio, sem gap.
create policy operadores_plataforma_select_proprio on operadores_plataforma
  for select
  using (usuario_id = auth.uid());

-- Sem policy de insert/update/delete: deny-by-default, mesmo padrão de
-- casamentos (sem policy de insert -- "criação é manual/via seed") e das 4
-- tabelas de SaaS-readiness (efeito de negócio só nasce de processo de
-- confiança do servidor).

-- Reserva o slug 'plataforma' -- o novo painel vive em /plataforma (rota
-- raiz, fora de /admin), então um casamento não pode reivindicar esse slug
-- e colidir com a rota. CREATE OR REPLACE preserva o OID da função: a CHECK
-- constraint existente em casamentos.slug (casamentos_slug_nao_reservado)
-- continua válida sem precisar ser recriada.
create or replace function is_slug_reservado(p_slug text)
returns boolean
language sql
stable
as $$
  select p_slug = any (array[
    'admin', 'login', 'api', 'public', 'www', 'app', 'assets',
    'meusitecasamento', 'presentes', 'rsvp', 'galeria', 'auth',
    'dashboard', 'cron', 'static', '_nuxt', 'plataforma'
  ]);
$$;
