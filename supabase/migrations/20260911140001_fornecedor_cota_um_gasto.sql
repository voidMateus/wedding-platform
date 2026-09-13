-- Fornecedor cota UM gasto: a cotação passa a pertencer ao que está sendo
-- planejado, não só a uma categoria.
--
-- O fluxo real do casal (pedido de 2026-09-11): ele planeja "Refrigerantes"
-- dentro de Bebidas, e então sai atrás de três fornecedores de refrigerante.
-- Comparar propostas é uma pergunta sobre AQUELE gasto — com as cotações
-- espalhadas por categoria, os refrigerantes ficavam misturados com o buffet e
-- a comparação, que é o motivo de existir a tela, não acontecia.
--
-- `categoria_id` continua para o fornecedor que ainda não está ligado a um
-- gasto específico (o "achei esse DJ, vou guardar"), e a tela deriva a
-- categoria do gasto quando ele existe.

alter table fornecedores
  add column despesa_id uuid references despesas (id) on delete set null;

create index fornecedores_despesa_id_idx on fornecedores (despesa_id);

comment on column fornecedores.despesa_id is
  'O gasto que este fornecedor está cotando. É o que agrupa as propostas concorrentes lado a lado — três cotações do mesmo gasto. Nulo para fornecedor guardado sem gasto definido.';

-- `on delete set null`, e não cascade: excluir o gasto não pode apagar o
-- contato do fornecedor, que o casal levou tempo para achar.

-- A consistência de casamento_id ganha mais uma referência a verificar.
create or replace function fornecedores_verificar_casamento_id()
returns trigger
language plpgsql
as $$
declare
  v_categoria_casamento_id uuid;
  v_despesa_casamento_id uuid;
begin
  if new.categoria_id is not null then
    select casamento_id into v_categoria_casamento_id
      from categorias_orcamento where id = new.categoria_id;
    if v_categoria_casamento_id is null then
      raise exception 'categorias_orcamento % não encontrada', new.categoria_id
        using errcode = 'foreign_key_violation';
    end if;
    if v_categoria_casamento_id <> new.casamento_id then
      raise exception 'fornecedores.casamento_id (%) não bate com categorias_orcamento.casamento_id (%) da categoria %',
        new.casamento_id, v_categoria_casamento_id, new.categoria_id
        using errcode = 'check_violation';
    end if;
  end if;

  if new.despesa_id is not null then
    select casamento_id into v_despesa_casamento_id
      from despesas where id = new.despesa_id;
    if v_despesa_casamento_id is null then
      raise exception 'despesas % não encontrada', new.despesa_id
        using errcode = 'foreign_key_violation';
    end if;
    if v_despesa_casamento_id <> new.casamento_id then
      raise exception 'fornecedores.casamento_id (%) não bate com despesas.casamento_id (%) do gasto %',
        new.casamento_id, v_despesa_casamento_id, new.despesa_id
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists fornecedores_verificar_casamento_id_trigger on fornecedores;
create trigger fornecedores_verificar_casamento_id_trigger
  before insert or update of casamento_id, categoria_id, despesa_id on fornecedores
  for each row
  execute function fornecedores_verificar_casamento_id();
