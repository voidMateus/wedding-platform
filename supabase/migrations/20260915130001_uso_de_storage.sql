-- Fase 5 do Hub: storage no painel interno (docs/fase5-multievento.md seção 8).
--
-- O painel interno media o porte de um casamento por contagem de convidados.
-- Convidado é linha de texto; o que de fato cresce, e o que de fato custa, é
-- arquivo -- e storage não aparecia em lugar nenhum.
--
-- MEDIDO, NUNCA CONTADO POR GATILHO. `contadores_uso.storage_used_mb` existe
-- desde a v1 e nunca foi populada, e a tentação óbvia é populá-la agora. Não:
-- este projeto remove contador materializado toda vez que encontra um
-- (mesas.ocupacao nunca existiu, convites.status_convite e enviado_em saíram
-- do schema, estado de pagamento deriva de pago_em). Contador que precisa ser
-- lembrado em seis caminhos de escrita erra no primeiro que esquecer -- e
-- upload tem seis caminhos, exclusão tem mais. `contadores_uso` volta a fazer
-- sentido quando existir limite a APLICAR na escrita (Fase 6), que é outra
-- pergunta.

-- Allowlist explícita, não "tudo que houver em storage.objects".
--
-- Somar tudo é pior das duas maneiras: o bucket que alguém criar daqui a seis
-- meses entra na conta sem ninguém decidir que deveria, e um bucket fora do
-- padrão de caminho {casamento_id}/... soma no grupo errado, em silêncio.
--
-- `wedding-photos` fica DE FORA porque está morto: desde a galeria via Google
-- Drive, a plataforma espelha a pasta do casal e nunca copia -- somá-lo leria
-- zero para sempre, enquanto as fotos, o maior volume de qualquer casamento,
-- não tocam nossa infraestrutura.
--
-- A allowlist tem par em tests/integration/storage-buckets.spec.ts, que compara
-- esta lista com storage.buckets e falha quando aparece um bucket que ela não
-- conhece -- obrigando quem o criou a decidir, ali, se ele conta.
create function buckets_contabilizados()
returns text[]
language sql
immutable
as $$
  select array['wedding-covers', 'wedding-event-segments', 'wedding-documents'];
$$;

comment on function buckets_contabilizados() is
  'Buckets que entram na métrica de storage do painel interno (docs/fase5-multievento.md 8.3). wedding-photos fica fora: está morto desde a galeria via Drive.';

-- Devolve BYTES, nunca megabytes: quem decide entre "12,4 MB" e "1,83 GB" é a
-- tela. Mesma regra dos centímetros da planta de mesas (CLAUDE.md seção 12) --
-- o dado-base fica no banco, a unidade de exibição é apresentação.
create function uso_de_storage_por_casamento()
returns table (casamento_id uuid, bytes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (split_part(o.name, '/', 1))::uuid as casamento_id,
    coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint as bytes
  from storage.objects o
  where o.bucket_id = any (buckets_contabilizados())
    -- Objeto fora do padrão {casamento_id}/... não tem a quem ser atribuído.
    -- Descartar é melhor que somar no grupo errado: o painel prefere um número
    -- menor e honesto a um número maior e inventado.
    and split_part(o.name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  group by 1;
$$;

comment on function uso_de_storage_por_casamento() is
  'Bytes ocupados por casamento, somados de storage.objects no momento da leitura (docs/fase5-multievento.md 8.2). Medida sob demanda, nunca contador materializado.';

-- Lê entre tenants, exatamente como o resto do caminho Plataforma -- e por
-- isso nunca pode ser alcançável por uma sessão de casal ou de convidado
-- (CLAUDE.md 4.2). O schema `storage` também não é exposto ao PostgREST, o que
-- é justamente o motivo de esta função existir em vez de N chamadas à API de
-- Storage por casamento.
revoke execute on function uso_de_storage_por_casamento() from public;
revoke execute on function uso_de_storage_por_casamento() from anon;
revoke execute on function uso_de_storage_por_casamento() from authenticated;
grant execute on function uso_de_storage_por_casamento() to service_role;
