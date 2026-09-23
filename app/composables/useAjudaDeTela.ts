import { ajudaDaRota } from '#shared/ajuda-de-tela'

/**
 * A ajuda da tela atual, e se ela está à vista.
 *
 * **"Visto" é da PESSOA, não do casamento** (CLAUDE.md, seção 12): quem já leu
 * o que é a tela de Mesas não precisa ler de novo ao abrir o segundo
 * casamento. Por isso o cookie não carrega slug — é a exceção deliberada à
 * regra de escopo por casamento, do mesmo tipo que a preferência de menu
 * recolhido.
 *
 * Cookie, e não `localStorage`: o painel é renderizado no servidor, e com
 * storage do navegador o bloco apareceria na primeira pintura para quem já o
 * dispensou, sumindo depois da hidratação. Um piscar por tela visitada.
 */
const CHAVE_DO_COOKIE = 'ajuda_vista'
const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365

export function useAjudaDeTela() {
  const route = useRoute()

  const vistas = useCookie<string[]>(CHAVE_DO_COOKIE, {
    default: () => [],
    maxAge: UM_ANO_EM_SEGUNDOS,
    sameSite: 'lax',
    path: '/',
  })

  const ajuda = computed(() => ajudaDaRota(route.path))

  /**
   * Reaberta pelo ponto de interrogação do cabeçalho.
   *
   * `useState` porque quem clica é o cabeçalho e quem mostra é o bloco no topo
   * do conteúdo — dois componentes sem parentesco. **Sem slug na chave**, e essa
   * é a exceção que o CLAUDE.md (seção 12) descreve: ler a explicação de uma tela
   * é da pessoa, não do evento.
   *
   * E ela **não** volta para o cookie: reabrir é consulta pontual, e gravar
   * faria a ajuda reaparecer sozinha na próxima visita — exatamente o que
   * dispensá-la pediu para não acontecer.
   */
  const reaberta = useState('ajuda-de-tela-reaberta', () => false)

  watch(
    () => route.path,
    () => {
      reaberta.value = false
    },
  )

  const visivel = computed(() => {
    if (!ajuda.value) return false
    return reaberta.value || !vistas.value.includes(ajuda.value.id)
  })

  function dispensar() {
    const id = ajuda.value?.id
    reaberta.value = false
    if (!id || vistas.value.includes(id)) return
    vistas.value = [...vistas.value, id]
  }

  function reabrir() {
    reaberta.value = true
  }

  return { ajuda, visivel, dispensar, reabrir }
}
