import type { InjectionKey, MaybeRefOrGetter } from 'vue'

/**
 * Moldura de filete duplo nas seções do site público
 * (config_tema.ornamentFrame — Fase Rebrand do Convite). O layout público
 * provê o valor; PublicEditorialSection injeta.
 *
 * Injeção, e não o store de UI, pela mesma razão que levou o UiButton a usar
 * ADMIN_UI_CONTEXT_KEY: `inject` tem valor padrão, então um componente montado
 * isoladamente num teste continua funcionando sem Pinia nenhuma — que é o
 * contrato de "testável com @vue/test-utils puro" seguido em todo
 * components/public. Ler o store aqui obrigaria as vinte e tantas suítes de
 * seção a instalar Pinia só para desenhar (ou não) uma borda.
 *
 * E não é prop porque a moldura é uma decisão de tema do site inteiro: como
 * prop, cada uma das dez seções da home teria de repassá-la, e esquecer uma
 * deixaria a página com moldura pela metade.
 *
 * `MaybeRefOrGetter` porque o valor MUDA depois do primeiro render — o tema
 * chega junto com o casamento carregado. Diferente do ADMIN_UI_CONTEXT_KEY,
 * que é um booleano constante decidido pelo layout, aqui um valor cru
 * congelaria a moldura no que ela era antes de config_tema existir. O layout
 * provê um getter; quem injeta lê com `toValue`, e um valor simples continua
 * válido (é o que o default `false` do inject entrega).
 */
export const PUBLIC_ORNAMENT_FRAME_KEY: InjectionKey<MaybeRefOrGetter<boolean>> =
  Symbol('public-ornament-frame')
