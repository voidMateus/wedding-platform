import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-07-29',

  // Estrutura de diretórios conforme docs/ARCHITECTURE.md (seção 1):
  // código de aplicação sob app/, server/ e public/ permanecem na raiz.
  srcDir: 'app/',

  devtools: { enabled: false },

  modules: ['@nuxt/eslint', '@pinia/nuxt', '@nuxtjs/supabase', '@vee-validate/nuxt'],

  css: ['~/assets/css/main.css'],

  // Proteção de rota é feita à mão em app/middleware/auth.global.ts (CLAUDE.md,
  // seção 5), não pelo redirect automático do módulo — mantém o arquivo e o
  // comportamento explícitos, coerentes com o resto da árvore documentada.
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    redirect: false,
  },

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
