-- Fase 5 do Hub: o papel `planejador` e a escada de papéis
-- (docs/fase5-multievento.md seção 4).
--
-- O planejador não vê menos que o colaborador -- uma assessora vê MAIS
-- dinheiro que o irmão da noiva, porque é ela quem negocia com o fornecedor.
-- O único privilégio que muda de mão é gente: ela convida e remove
-- colaboradores do evento. Todo o resto continua sendo is_membro_casamento, e
-- por isso nenhuma das ~90 policies que o usam é tocada aqui.

-- =========================================================================
-- 1. O CHECK ganha o terceiro valor
-- =========================================================================

alter table membros_casamento drop constraint membros_casamento_papel_check;
alter table membros_casamento add constraint membros_casamento_papel_check
  check (papel in ('dono', 'planejador', 'colaborador'));

comment on column membros_casamento.papel is
  'dono: acesso total, único que exclui o evento e alcança outros donos. planejador ("Assessoria" na tela do casal): profissional que responde pelo evento e traz a própria equipe -- alcança colaborador. colaborador: demais membros administrativos, não gerencia ninguém. A ordem vive em shared/papeis-de-membro.ts, que é o par deste CHECK (docs/fase5-multievento.md 4.3).';

-- =========================================================================
-- 2. A escada, em SQL
-- =========================================================================

-- Par de `postoDoPapel()` em shared/papeis-de-membro.ts. Os dois se movem
-- juntos ou a regra passa a ter duas versões -- mesmo tipo de par que
-- TAMANHO_PALETA_CATEGORIAS já tem com o generate_series das funções de cor.
create function posto_do_papel(p_papel text)
returns integer
language sql
immutable
as $$
  select case p_papel
    when 'dono' then 3
    when 'planejador' then 2
    when 'colaborador' then 1
    else 0
  end;
$$;

comment on function posto_do_papel(text) is
  'Altura de um papel na escada de membros_casamento. Par de postoDoPapel() em shared/papeis-de-membro.ts.';

-- Irmão de is_membro_casamento/is_dono_casamento: SECURITY DEFINER pelo mesmo
-- motivo que eles (lê membros_casamento ignorando a própria RLS da tabela,
-- evitando a policy que referencia a própria tabela para checar associação;
-- o que sai daqui é sempre um booleano, nunca dado cru).
create function pode_gerenciar_papel(p_wedding_id uuid, p_papel_alvo text)
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
      and (
        posto_do_papel(papel) > posto_do_papel(p_papel_alvo)
        -- O dono sobre outro dono: o casal são dois, e um precisa poder
        -- remover o outro. Quem impede o casamento de ficar órfão é a regra
        -- do último dono, checada no endpoint -- não esta.
        or (papel = 'dono' and p_papel_alvo = 'dono')
      )
  );
$$;

comment on function pode_gerenciar_papel(uuid, text) is
  'True se auth.uid() alcança o papel alvo neste casamento: todo papel abaixo do seu, e o dono também os outros donos. Par de podeGerenciarPapel() em shared/papeis-de-membro.ts (docs/fase5-multievento.md 4.2).';

-- =========================================================================
-- 3. As policies de membros_casamento passam a usar a escada
-- =========================================================================
--
-- Continuam existindo mesmo com os endpoints usando service_role (onde RLS
-- não protege nada e a checagem real é o TypeScript): são a última linha de
-- defesa do dia em que uma tela escrever aqui pelo client autenticado
-- (CLAUDE.md, seção 4.2).

drop policy membros_casamento_insert_dono on membros_casamento;
create policy membros_casamento_insert_gerenciavel
  on membros_casamento for insert
  with check (pode_gerenciar_papel(casamento_id, papel));

-- O UPDATE checa nos DOIS lados: sem o `with check`, um planejador editaria a
-- linha de um colaborador (alcançável) para papel 'dono' (não alcançável) --
-- escalada de privilégio pela porta dos fundos.
drop policy membros_casamento_update_dono on membros_casamento;
create policy membros_casamento_update_gerenciavel
  on membros_casamento for update
  using (pode_gerenciar_papel(casamento_id, papel))
  with check (pode_gerenciar_papel(casamento_id, papel));

drop policy membros_casamento_delete_dono on membros_casamento;
create policy membros_casamento_delete_gerenciavel
  on membros_casamento for delete
  using (pode_gerenciar_papel(casamento_id, papel));

-- `casamentos_delete_dono` NÃO é tocada de propósito: quem contratou a
-- assessoria pode demiti-la; a assessoria não pode apagar o casamento.
