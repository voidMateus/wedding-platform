import { provide } from 'vue'
import { setup } from '@storybook/vue3-vite'
import type { Preview } from '@storybook/vue3-vite'

import '../app/assets/css/main.css'

import { ADMIN_UI_CONTEXT_KEY } from '../app/utils/admin-ui-context'
// Os arquivos se chamam `*Stub` por causa do `vue/multi-word-component-names`
// do ESLint; o nome sob o qual são REGISTRADOS é o que o Nuxt usa, porque é
// esse que os templates de `components/ui/` escrevem.
import IconStub from './stubs/IconStub.vue'
import NuxtLinkStub from './stubs/NuxtLinkStub.vue'
import UiCard from '../app/components/ui/Card.vue'

/**
 * Os três componentes que o Nuxt auto-importa DENTRO dos templates de
 * `components/ui/` — ver o cabeçalho de `main.ts`. Registrados globalmente
 * porque quem os usa é o template de outro componente, não o story: nenhum
 * `import` num arquivo de story alcançaria esse ponto.
 *
 * `UiCard` está aqui por causa do `AdminStatCard`, que é um cartão por dentro.
 */
setup((app) => {
  app.component('Icon', IconStub)
  app.component('NuxtLink', NuxtLinkStub)
  app.component('UiCard', UiCard)
})

/**
 * A plataforma tem DOIS contextos visuais, e o mesmo componente muda nos dois.
 *
 * `.admin-ui` reaponta os neutros (creme -> cinza) e o par tipográfico, e
 * `ADMIN_UI_CONTEXT_KEY` muda o formato de `UiButton` (pílula -> retangular) e
 * a moldura de `UiCard` (elevado -> plano). Uma vitrine que mostrasse só um dos
 * dois estaria mentindo sobre metade do Design System — e é exatamente a
 * metade em que o casal passa o tempo todo.
 *
 * A classe e o `provide` andam juntos porque na aplicação eles andam: quem põe
 * a classe é o layout do admin, e é o mesmo layout que injeta o contexto.
 */
const decoradorDeContexto: NonNullable<Preview['decorators']>[number] = (story, contexto) => {
  const ehAdmin =
    (contexto.parameters.contexto as string | undefined) ??
    (contexto.globals.contexto as string | undefined)

  const admin = ehAdmin === 'admin'

  return {
    components: { story },
    setup() {
      provide(ADMIN_UI_CONTEXT_KEY, admin)
      return { admin }
    },
    // `bg-surface` no MESMO elemento que recebe `.admin-ui`: a classe redefine
    // as variáveis nele próprio, então pintar o fundo num pai daria o creme do
    // site público por trás dos componentes do painel.
    template: `<div :class="['p-8 bg-surface text-text', admin && 'admin-ui']"><story /></div>`,
  }
}

const preview: Preview = {
  decorators: [decoradorDeContexto],

  globalTypes: {
    contexto: {
      description: 'Contexto visual — os neutros e a tipografia mudam entre os dois',
      toolbar: {
        title: 'Contexto',
        icon: 'paintbrush',
        items: [
          { value: 'publico', title: 'Site público' },
          { value: 'admin', title: 'Painel (.admin-ui)' },
        ],
        dynamicTitle: true,
      },
    },
  },

  initialGlobals: {
    contexto: 'publico',
  },

  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i },
    },

    a11y: {
      // O MESMO recorte da varredura de E2E (`tests/e2e/utils/a11y.ts`): duas
      // fontes de verdade sobre o que a plataforma persegue dariam dois
      // veredictos para a mesma tela.
      options: {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      },
      // 'error' e não 'todo': violação em componente de Design System é
      // regressão, não pendência. Vale quando a varredura roda em CI pelo
      // test-runner; no navegador o painel Accessibility mostra do mesmo jeito.
      test: 'error',
    },
  },
}

export default preview
