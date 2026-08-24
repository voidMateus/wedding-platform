-- Dados de desenvolvimento local (CLAUDE.md, seção 11; docs/ARCHITECTURE.md,
-- seção 4.7). Roda depois das migrations via `supabase db reset`.
--
-- membros_casamento não é semeada aqui: precisa de uma linha real em
-- auth.users, que só existe depois de criar um usuário local (Studio ou
-- `supabase auth admin`). Depois de criar um, associe-o manualmente:
--
--   insert into membros_casamento (casamento_id, user_id, papel)
--   values ('11111111-1111-1111-1111-111111111111', '<id do auth.users>', 'dono');

-- Achado real (Passo 2, docs/PLANO-SAAS.md -- primeira execução do gate de
-- integração no GitHub Actions): o bootstrap de `supabase start` (Docker
-- local) NÃO concede os GRANTs básicos de tabela (SELECT/INSERT/UPDATE/
-- DELETE) para `anon`/`authenticated`/`service_role` -- só TRUNCATE/
-- REFERENCES/TRIGGER. O projeto hospedado (`dev`/`prod`) já vem com esse
-- bootstrap de fábrica (confirmado: toda a suíte de integração passa
-- normalmente contra `dev`), mas o Postgres local subido via Docker não.
-- RLS continua sendo a autorização real linha-a-linha (CLAUDE.md seção
-- 4.2/10) -- estes GRANTs são só o pré-requisito para que uma policy de
-- RLS chegue a ser avaliada. `seed.sql` roda só local/CI (`supabase start`/
-- `db reset`), nunca é aplicado em `dev`/`prod` via `db push`.
-- anon recebe o mesmo DML amplo que authenticated -- é assim que o projeto
-- hospedado (dev/prod) já vem configurado de fábrica: GRANT é só a
-- permissão de acesso à tabela, RLS é quem de fato decide linha a linha
-- (CLAUDE.md seção 4.2/10). Confirmado pela suíte de integração inteira já
-- validada contra `dev`, que espera `anon` receber "0 linhas afetadas, sem
-- erro" de UPDATE/DELETE bloqueado por RLS -- não um erro de permissão
-- (42501) por falta de GRANT.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, anon;
grant all on all sequences in schema public to service_role;
grant usage on all sequences in schema public to authenticated, anon;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, anon;

insert into casamentos (id, slug, nomes_noivos, data_evento, prazo_rsvp, config_tema)
values (
  '11111111-1111-1111-1111-111111111111',
  'ana-e-joao',
  'Ana & João',
  '2026-12-12',
  '2026-11-01T00:00:00Z',
  '{"primaryColor": "#6b4a35"}'::jsonb
);

insert into etapas_evento (casamento_id, titulo, nome_local, endereco_local, inicia_em, termina_em, ordem_exibicao)
values
  ('11111111-1111-1111-1111-111111111111', 'Cerimônia', 'Igreja São José', 'Rua das Flores, 100', '2026-12-12T16:00:00Z', '2026-12-12T17:00:00Z', 1),
  ('11111111-1111-1111-1111-111111111111', 'Recepção', 'Espaço Jardim', 'Av. Central, 500', '2026-12-12T19:00:00Z', '2026-12-13T02:00:00Z', 2);

-- Convite: quem recebeu o mesmo convite (CLAUDE.md, seção 12.1).
insert into convites (id, casamento_id, nome, codigo_interno, observacoes)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Família Silva',
  'CONV-SEED0001',
  'Sentar próximo à mesa dos padrinhos'
);

-- Maria e Pedro são Acompanhantes um do outro (nucleos_acompanhantes) e
-- pertencem ao mesmo convite acima.
insert into nucleos_acompanhantes (id, casamento_id)
values ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111');

insert into convidados (id, casamento_id, convite_id, nucleo_id, ordem_nucleo, nome_completo, email, telefone, restricoes_alimentares)
values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 0, 'Maria Silva', 'maria@example.com', '+55 11 90000-0001', null),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 1, 'Pedro Silva', 'pedro@example.com', '+55 11 90000-0002', 'vegetariano');

update convites set convidado_responsavel_id = '33333333-3333-3333-3333-333333333333'
where id = '22222222-2222-2222-2222-222222222222';

-- Credencial de acesso do convite Família Silva para testes locais de RSVP.
-- Código em texto plano só existe aqui, no seed — nunca em produção
-- (CLAUDE.md, seção 14.5). Código: DEV-LOCAL-SEED-TOKEN-0001
insert into credenciais_acesso_convite (casamento_id, convite_id, codigo_hash)
values (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  encode(digest('DEV-LOCAL-SEED-TOKEN-0001', 'sha256'), 'hex')
);

insert into categorias_presentes (id, casamento_id, nome, ordem_exibicao)
values ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Cozinha', 1);

insert into presentes (casamento_id, categoria_id, titulo, descricao, preco_centavos, quantidade_disponivel, e_presente_cota)
values (
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555555',
  'Jogo de panelas',
  'Jogo de panelas antiaderentes, 5 peças',
  89900,
  2,
  false
);

insert into presentes (casamento_id, titulo, descricao, e_presente_cota, valor_meta_centavos)
values (
  '11111111-1111-1111-1111-111111111111',
  'Lua de mel',
  'Cota para a viagem de lua de mel',
  true,
  500000
);
