import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-07-29',

  // Estrutura de diretórios conforme docs/ARCHITECTURE.md (seção 1):
  // código de aplicação sob app/, server/ e public/ permanecem na raiz.
  srcDir: 'app/',

  devtools: { enabled: false },

  modules: ['@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  vite: {
    // @tailwindcss/vite declara suporte a vite ^8, mas seus tipos publicados
    // ainda não batem estruturalmente com o Plugin/PluginContextMeta do
    // vite 7.x usado pelo @nuxt/vite-builder nesta versão do Nuxt — o plugin
    // funciona normalmente em runtime, é só o `nuxt typecheck` que reclama.
    // Remover este @ts-expect-error quando as declarações convergirem.
    // @ts-expect-error incompatibilidade de tipos entre vite 7 (Nuxt) e vite 8 (@tailwindcss/vite)
    plugins: [tailwindcss()],
  },

  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true,
      },
    },
  },

  eslint: {
    config: {
      // Formatação é responsabilidade do Prettier (ver .prettierrc.json),
      // não das regras stylistic do ESLint — evita regras concorrentes.
      stylistic: false,
    },
  },

  app: {
    head: {
      title: 'Wedding Platform',
      htmlAttrs: {
        lang: 'pt-BR',
      },
    },
  },
})
