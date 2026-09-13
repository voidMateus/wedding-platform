/**
 * Entrega um arquivo ao navegador a partir de conteúdo que já está na memória.
 *
 * Âncora com `download` e blob, e não uma navegação até uma URL: as rotas do
 * painel exigem a sessão do Supabase, e uma navegação direta sairia do contexto
 * do app. Serve tanto para o que veio do servidor (`Blob` da exportação de
 * convidados) quanto para o que foi montado aqui (o CSV de presentes).
 */
export function baixarArquivo(conteudo: Blob | string, nomeDoArquivo: string, tipo?: string): void {
  const blob =
    typeof conteudo === 'string'
      ? new Blob([conteudo], { type: tipo ?? 'text/csv;charset=utf-8' })
      : conteudo

  const url = URL.createObjectURL(blob)
  const ancora = document.createElement('a')
  ancora.href = url
  // O `Content-Disposition` do servidor não é lido num download de blob, então
  // o nome é sempre reaplicado aqui.
  ancora.download = nomeDoArquivo
  ancora.click()
  URL.revokeObjectURL(url)
}
