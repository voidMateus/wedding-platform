/**
 * Rolagem que respeita "Reduzir movimento".
 *
 * O bloco `@media (prefers-reduced-motion: reduce)` do `main.css` alcança
 * animação e transição de CSS, mas **não alcança JavaScript**: `scrollTo` e
 * `scrollIntoView` com `behavior: 'smooth'` são API de script e ignoram
 * `scroll-behavior` do CSS. Sem consultar a preferência aqui, quem pediu menos
 * movimento continuaria levando a página inteira deslizando sob os olhos — que
 * é justamente o movimento que mais provoca enjoo.
 *
 * Dois lugares usam isto: o botão "voltar ao topo" do site público e a âncora
 * de seção de Configurações.
 */

/** O usuário pediu menos movimento? Falso no servidor e onde não dá para saber. */
export function prefereMenosMovimento(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * `'auto'` (salto instantâneo) quando a preferência está ligada, `'smooth'`
 * quando não. Nunca deixa de rolar — o destino é o mesmo, só o caminho muda.
 */
export function scrollBehaviorPreferido(): ScrollBehavior {
  return prefereMenosMovimento() ? 'auto' : 'smooth'
}
