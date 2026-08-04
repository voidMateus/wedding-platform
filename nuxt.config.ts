import tailwindcss from '@tailwindcss/vite'

// @nuxt/image (IPX) só otimiza domínios explicitamente allowlistados — a
// própria variável documentada pelo módulo (NUXT_IMAGE_DOMAINS), derivada de
// SUPABASE_URL, é mais confiável que a chave `image.domains` do módulo (ver
// achado documentado no commit desta seção).
if (process.env.SUPABASE_URL && !process.env.NUXT_IMAGE_DOMAINS) {
  process.env.NUXT_IMAGE_DOMAINS = new URL(process.env.SUPABASE_URL).hostname
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-07-29',

  // Estrutura de diretórios conforme docs/ARCHITECTURE.md (seção 1):
  // código de aplicação sob app/, server/ e public/ permanecem na raiz.
  srcDir: 'app/',

  devtools: { enabled: false },

  modules: [
    '@nuxt/eslint',
    '@pinia/nuxt',
    '@nuxtjs/supabase',
    '@vee-validate/nuxt',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@vueuse/motion/nuxt',
  ],

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

  // Só server-side (não existe runtimeConfig.public.upstash*) — rate limiting
  // de endpoints públicos sensíveis (CLAUDE.md, seção 3/14.5/28).
  runtimeConfig: {
    upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  },

  // Ícones vêm do pacote local @iconify-json/lucide (devDependency), não da
  // API pública do Iconify em runtime — evita dependência de rede externa
  // tanto em build quanto em produção.
  icon: {
    serverBundle: {
      collections: ['lucide'],
    },
  },

  // Fontes carregadas via @nuxt/fonts são self-hosted automaticamente
  // (baixadas no build, servidas pela própria aplicação) — nunca via CDN
  // do Google Fonts em runtime. "Inter" é a sans-serif fixa de todo o site,
  // inclusive admin (--font-sans, ver main.css) — nunca varia por casamento.
  // As demais famílias compõem os pares tipográficos de shared/theme-presets.ts
  // (FONT_PAIRS) — cada casamento escolhe um par, que troca --font-display no
  // site público (aplicado globalmente na PR 7).
  fonts: {
    families: [
      { name: 'Inter', provider: 'google' },
      { name: 'Playfair Display', provider: 'google' },
      { name: 'Cormorant Garamond', provider: 'google' },
      { name: 'Nunito Sans', provider: 'google' },
      { name: 'DM Serif Display', provider: 'google' },
      { name: 'DM Sans', provider: 'google' },
      { name: 'Abril Fatface', provider: 'google' },
      { name: 'Work Sans', provider: 'google' },
      { name: 'Libre Baskerville', provider: 'google' },
      { name: 'Karla', provider: 'google' },
      { name: 'Cinzel', provider: 'google' },
      { name: 'Montserrat', provider: 'google' },
    ],
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
      title: 'MeuSiteCasamento',
      htmlAttrs: {
        lang: 'pt-BR',
      },
    },
  },
})
