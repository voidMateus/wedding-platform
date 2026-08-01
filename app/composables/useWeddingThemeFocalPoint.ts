import type { ThemeFocalPointInput } from '#shared/schemas/theme'

/**
 * Ponto de foco (enquadramento) da foto de capa ou da foto da "Nossa
 * História" (CLAUDE.md, seção 28) — endpoint próprio, separado do upload.
 * Toda chamada de rede do client passa por aqui (CLAUDE.md, seção 5.1).
 */
export function useWeddingThemeFocalPoint() {
  async function updateThemeFocalPoint(
    input: ThemeFocalPointInput,
  ): Promise<{ target: 'cover' | 'story'; x: number; y: number }> {
    return $fetch<{ target: 'cover' | 'story'; x: number; y: number }>('/api/wedding/theme/focal-point', {
      method: 'PATCH',
      body: input,
    })
  }

  return { updateThemeFocalPoint }
}
