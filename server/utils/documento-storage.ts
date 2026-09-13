import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

/**
 * Storage dos documentos do Financeiro — o ÚNICO bucket privado do projeto.
 *
 * Os outros três (capas, fotos, imagens de etapa) são públicos porque servem o
 * site do casamento. Aqui não: um contrato tem CPF, valor e assinatura. Por
 * isso nada nunca devolve URL pública — a leitura é sempre por URL assinada de
 * vida curta, gerada aqui no servidor.
 */

export const BUCKET_DOCUMENTOS = 'wedding-documents'

/** Allowlist explícita de MIME (CLAUDE.md, seção 11) — o mesmo contrato do bucket. */
export const ALLOWED_DOCUMENT_MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const MAX_DOCUMENT_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

/**
 * Vida da URL assinada. Curta de propósito: ela existe para abrir o arquivo
 * agora, não para virar link compartilhável — quem precisa do arquivo de novo
 * pede outra ao painel.
 */
export const SEGUNDOS_URL_ASSINADA = 60

/**
 * Caminho do objeto: {casamento_id}/{uuid}.{ext}. O nome é SEMPRE regenerado
 * aqui — reaproveitar o nome do upload traria "contrato da noiva.pdf" (dado
 * pessoal no caminho) e o risco de path traversal.
 */
export function caminhoDeDocumento(weddingId: string, extensao: string): string {
  return `${weddingId}/${randomUUID()}.${extensao}`
}

/**
 * Confere que o caminho pertence mesmo ao casamento da sessão antes de assinar
 * ou apagar. A RLS do bucket já garante isso, mas uma linha de `documentos`
 * apontando para outro casamento é sinal de bug, não de permissão — e some
 * aqui em vez de virar acesso.
 */
export function caminhoPertenceAoCasamento(caminho: string, weddingId: string): boolean {
  return caminho.startsWith(`${weddingId}/`)
}

export async function gerarUrlAssinada(
  client: SupabaseClient<Database>,
  caminho: string,
): Promise<string> {
  const { data, error } = await client.storage
    .from(BUCKET_DOCUMENTOS)
    .createSignedUrl(caminho, SEGUNDOS_URL_ASSINADA)

  if (error || !data) {
    throw badRequestError(error?.message ?? 'Não foi possível gerar o link do documento.')
  }

  return data.signedUrl
}

export async function removerArquivo(
  client: SupabaseClient<Database>,
  caminho: string,
): Promise<void> {
  const { error } = await client.storage.from(BUCKET_DOCUMENTOS).remove([caminho])
  if (error) {
    throw badRequestError(error.message)
  }
}
