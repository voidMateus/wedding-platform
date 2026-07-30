// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import eslintConfigPrettier from 'eslint-config-prettier'

export default withNuxt(
  // Desliga qualquer regra de formatação que colida com o Prettier
  // (formatação é responsabilidade do `npm run format`, não do lint).
  eslintConfigPrettier,
  {
    rules: {
      // Props opcionais tipadas via TypeScript (`?:`) já documentam a
      // ausência de valor como estado válido — forçar um default aqui
      // divergiria da convenção de props do CLAUDE.md (seção 7.2).
      'vue/require-default-prop': 'off',
    },
  },
)
