// Stub padrão para o <Icon> do @nuxt/icon em testes de componente montados
// com @vue/test-utils fora do runtime completo do Nuxt (onde o auto-import
// resolve para o componente real, que depende de useNuxtApp()). "Icon" e
// "NuxtIcon" cobrem os dois nomes pelos quais o componente pode aparecer
// na árvore renderizada, dependendo de como o template referencia o ícone.
export const ICON_STUBS = {
  Icon: { template: '<span />', props: ['name'] },
  NuxtIcon: { template: '<span />', props: ['name'] },
}
