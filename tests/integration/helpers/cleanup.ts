/**
 * Roda várias limpezas em paralelo sem deixar uma falha silenciosa pular as
 * outras — cada teste de integração cria dado real (casamento/usuário de
 * auth/etc.) num Supabase de verdade, então um `afterAll` capenga deixa
 * lixo acumulando no projeto entre execuções. Ainda assim propaga erro (a
 * suíte deve aparecer como falha) — só não desiste na primeira.
 *
 * Cada `fn()` roda dentro de um wrapper `async` (não chamado direto no
 * `.map`) de propósito: se um `beforeAll` falhar pela metade (ex.: criou
 * `memberA` mas não `memberB`), uma limpeza escrita como
 * `() => deleteTestMember(admin, memberB.userId)` lança um TypeError
 * *síncrono* ao acessar `.userId` de `undefined` — sem o wrapper, isso
 * escaparia do `.map()` antes mesmo do `Promise.allSettled` rodar, abortando
 * a limpeza inteira e deixando toda a massa de dados órfã, não só a parte
 * que falhou.
 */
export async function cleanupAll(cleanups: Array<() => Promise<unknown>>): Promise<void> {
  const results = await Promise.allSettled(cleanups.map(async (fn) => fn()))
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  if (failures.length > 0) {
    const messages = failures.map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason)))
    throw new Error(`Falha ao limpar dado de teste (${failures.length}/${cleanups.length}):\n${messages.join('\n')}`)
  }
}
