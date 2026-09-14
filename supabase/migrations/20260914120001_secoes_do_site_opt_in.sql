-- As seções da home passam a ser opt-in (docs/fase4-onboarding.md, seção 3.2).
--
-- Até aqui, `config_tema.hiddenSections` guardava o que o casal DESLIGOU: um
-- casamento recém-criado nascia com as onze seções no ar, e o site público já
-- mostrava sete delas preenchidas com o texto padrão da plataforma — história,
-- dress code, manual do convidado e FAQ contando um casamento que o casal
-- ainda não tinha configurado.
--
-- Agora `config_tema.activeSections` guarda o que o casal LIGOU. Ausente ou
-- vazio significa nenhuma, e o site é só a capa: nomes, data e contagem
-- regressiva — um save the date legítimo, que é exatamente o que um casamento
-- recém-criado tem a dizer.
--
-- A inversão conserta o outro lado junto: seção nova no catálogo deixa de
-- aparecer sozinha no site de todo mundo, e passa a esperar o clique do casal.

-- A conversão preserva a escolha de cada casal exatamente como está hoje:
-- ativas = catálogo inteiro MENOS o que ele já tinha desligado. Nenhum site no
-- ar perde seção nesta migration.
--
-- A lista de ids abaixo é um SNAPSHOT do catálogo em 2026-09-14, não uma
-- segunda fonte de verdade: ela descreve o que existia na data da conversão.
-- Seção criada depois disso NÃO deve entrar aqui — nascer desligada para todo
-- mundo é justamente o comportamento novo.
update casamentos
   set config_tema =
     (config_tema - 'hiddenSections')
     || jsonb_build_object(
       'activeSections',
       coalesce(
         (
           select jsonb_agg(secao order by ordem)
             from unnest(array[
               'boas-vindas',
               'versiculo',
               'historia',
               'grande-dia',
               'confirmar-presenca',
               'dress-code',
               'manual-convidados',
               'manual-padrinhos',
               'presentes',
               'nossos-momentos',
               'faq'
             ]) with ordinality as catalogo(secao, ordem)
            where not (
              coalesce(config_tema -> 'hiddenSections', '[]'::jsonb) ? secao
            )
         ),
         '[]'::jsonb
       )
     )
 where config_tema is not null;

comment on column casamentos.config_tema is
  'Tema visual do casamento (shape em shared/schemas/theme.ts). Exclusivamente visual -- comportamento de negócio vive em colunas próprias. `activeSections` é opt-in desde 2026-09-14: ausente/vazio = nenhuma seção da home ativa, e o site é só a capa (docs/fase4-onboarding.md 3.2). Chaves geridas por outros endpoints (coverImageUrl, storyImageUrl, monogramImageUrl, pontos de foco, galleryPreviewCount) nunca entram no themeConfigSchema -- é essa ausência que as preserva no merge.';
