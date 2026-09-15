import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/vue3-vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'

/**
 * Storybook sobre o Vite CRU, não sobre o Nuxt.
 *
 * `@nuxtjs/storybook` seria o caminho óbvio, e foi descartado por versão: ele
 * pede `storybook@~9.0.5` e `@nuxt/kit@^3`, e este projeto está em Nuxt 4.3 com
 * Storybook 10. Instalá-lo significaria segurar duas dependências numa versão
 * anterior só para a vitrine de componentes existir.
 *
 * O preço de não usá-lo é que o Nuxt não está aqui, e o que o Nuxt dava de
 * graça precisa ser reposto à mão. São três coisas, e só três, porque os
 * componentes de `components/ui/` foram escritos sem conhecer o Nuxt:
 *
 *   1. os auto-imports do Vue e de `app/utils/` (abaixo, via AutoImport);
 *   2. `Icon`, `NuxtLink` e `UiCard`, registrados globalmente em `preview.ts`;
 *   3. os aliases `~`/`#shared`, que o `srcDir: 'app/'` do Nuxt define.
 *
 * O que NÃO é reposto, e vale saber ao ler um story: `useAsyncData`,
 * `useSupabaseClient`, `navigateTo` e afins não existem aqui. Um componente que
 * dependa deles não tem story — o que não é uma limitação incômoda, porque
 * componente de `components/ui/` que busca dado já violaria a regra de camadas
 * do CLAUDE.md (seção 9).
 */

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const config: StorybookConfig = {
  // Co-locados com o componente, e não numa pasta `stories/` paralela: uma
  // variante nova de `Button.vue` e o story dela têm que ser editados no mesmo
  // lugar, senão a vitrine passa a descrever um componente que não existe mais.
  stories: ['../app/components/**/*.stories.ts'],

  addons: ['@storybook/addon-a11y'],

  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },

  viteFinal: async (configuracaoBase) => {
    const { mergeConfig } = await import('vite')

    return mergeConfig(configuracaoBase, {
      plugins: [
        // `@storybook/vue3-vite` 10 NÃO traz o plugin do Vue: ele espera achá-lo
        // no `vite.config.ts` do projeto. Este projeto não tem um — a
        // configuração do Vite mora dentro do `nuxt.config.ts`, e quem monta o
        // plugin lá é o `@nuxt/vite-builder`. Sem esta linha, o primeiro `.vue`
        // importado chega cru ao Rollup e o build morre com "Expected ';', '}'
        // or <eof>" apontando para a primeira linha do template.
        vue(),

        // Mesmo motivo do `@ts-expect-error` no `nuxt.config.ts`: os tipos
        // publicados do @tailwindcss/vite miram o vite 8 e aqui o vite é 7. O
        // plugin roda; é só a declaração que não bate.
        // @ts-expect-error incompatibilidade de tipos entre vite 7 e @tailwindcss/vite
        tailwindcss(),

        AutoImport({
          // `vue` cobre ref/computed/inject/onMounted/useId — exatamente o que
          // os componentes de `ui/` usam sem importar, porque o Nuxt importa
          // por eles em produção.
          imports: ['vue'],
          // `ADMIN_UI_CONTEXT_KEY` e os outros helpers de `app/utils/` são
          // auto-importados pelo Nuxt pela mesma regra.
          dirs: [resolve(raiz, 'app/utils')],
          // Sem arquivo de tipos gerado: quem typecheca este projeto é o
          // `nuxt typecheck`, com os tipos que o próprio Nuxt gera. Um
          // `auto-imports.d.ts` daqui seria uma segunda declaração das mesmas
          // globais, competindo com aquela.
          dts: false,
        }),
      ],

      server: {
        watch: {
          // `storybook build` escreve em `storybook-static/`, e o watcher do
          // `storybook dev` tentava vigiar cada arquivo que aparecia ali — as
          // fontes .woff2 chegam com o arquivo ainda aberto para escrita, o
          // watcher morre com EBUSY e derruba o dev server inteiro (exit 4, e
          // no Windows uma asserção do libuv que contamina qualquer suíte
          // rodando ao lado). Rodar build e dev juntos é normal; vigiar a
          // saída do build é que nunca fez sentido.
          ignored: ['**/storybook-static/**'],
        },
      },

      resolve: {
        alias: {
          // Os mesmos que o `srcDir: 'app/'` do Nuxt cria.
          '~~': raiz,
          '@@': raiz,
          '#shared': resolve(raiz, 'shared'),
          '~': resolve(raiz, 'app'),
          '@': resolve(raiz, 'app'),
        },
      },
    })
  },
}

export default config
