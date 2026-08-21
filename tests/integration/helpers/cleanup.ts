/**
 * Roda várias limpezas em paralelo sem deixar uma falha silenciosa pular as
 * outras — cada teste de integração cria dado real (casamento/usuário de
 * auth/etc.) num Supabase de verdade, então um `afterAll` capenga deixa
 * lixo acumulando no projeto entre execuções. Ainda assim propaga erro (a
 * suíte deve aparecer como falha) — só não desiste na primeira.
 */
export async function cleanupAll(cleanups: Array<() => Promise<unknown>>): Promise<void> {
  const results = await Promise.allSettled(cleanups.map((fn) => fn()))
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  if (failures.length > 0) {
    const messages = failures.map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason)))
    throw new Error(`Falha ao limpar dado de teste (${failures.length}/${cleanups.length}):\n${messages.join('\n')}`)
  }
}
