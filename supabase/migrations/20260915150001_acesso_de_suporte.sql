-- Fase 5 do Hub: acesso de suporte ao painel do casal
-- (docs/fase5-multievento.md seção 6.7).
--
-- A equipe interna precisa entrar no painel de um casamento para dar suporte.
-- Havia dois caminhos possíveis, e um deles está proibido pelo CLAUDE.md
-- (seção 4.2): acrescentar `is_operador_plataforma()` às ~90 policies seria
-- exatamente a "policy de RLS cross-tenant de conveniência" que a regra veda,
-- e qualquer tenant poderia herdá-la por engano.
--
-- O outro caminho é este: o operador ganha um vínculo REAL em
-- membros_casamento, temporário. Nada muda nas 123 rotas que usam o client com
-- RLS, nada muda nas policies, e a autorização continua sendo a mesma para
-- todo mundo -- que é o que a torna confiável.

alter table membros_casamento
  add column acesso_suporte_expira_em timestamptz;

comment on column membros_casamento.acesso_suporte_expira_em is
  'Preenchido APENAS em vínculo de suporte da plataforma (docs/fase5-multievento.md 6.7): marca que a linha é acesso temporário da equipe interna, e até quando. Nulo em todo membro de verdade. A expiração vale na LEITURA (ver is_membro_casamento abaixo), não numa varredura periódica -- uma linha vencida não concede nada mesmo enquanto existe.';

-- Índice parcial: a varredura que limpa linhas mortas só olha as de suporte,
-- que são poucas entre muitos membros.
create index membros_casamento_acesso_suporte_idx
  on membros_casamento (acesso_suporte_expira_em)
  where acesso_suporte_expira_em is not null;

-- =========================================================================
-- A expiração vale na leitura
-- =========================================================================
--
-- CREATE OR REPLACE, nunca DROP: as duas funções têm ~90 policies dependentes
-- por OID, e a assinatura (inclusive o nome do parâmetro, `p_wedding_id`)
-- precisa ficar exatamente como está.
--
-- Um vínculo de suporte vencido deixa de valer no instante em que vence, e não
-- quando alguém o apaga. É a diferença entre uma expiração de verdade e uma
-- decorativa.

create or replace function is_membro_casamento(p_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from membros_casamento
    where casamento_id = p_wedding_id
      and usuario_id = auth.uid()
      and (acesso_suporte_expira_em is null or acesso_suporte_expira_em > now())
  );
$$;

create or replace function is_dono_casamento(p_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from membros_casamento
    where casamento_id = p_wedding_id
      and usuario_id = auth.uid()
      and papel = 'dono'
      and (acesso_suporte_expira_em is null or acesso_suporte_expira_em > now())
  );
$$;

create or replace function pode_gerenciar_papel(p_wedding_id uuid, p_papel_alvo text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from membros_casamento
    where casamento_id = p_wedding_id
      and usuario_id = auth.uid()
      and (acesso_suporte_expira_em is null or acesso_suporte_expira_em > now())
      and (
        posto_do_papel(papel) > posto_do_papel(p_papel_alvo)
        or (papel = 'dono' and p_papel_alvo = 'dono')
      )
  );
$$;
