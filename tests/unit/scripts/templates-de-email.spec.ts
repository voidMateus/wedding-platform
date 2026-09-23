import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error — script de build em .mjs, sem tipos próprios.
import { TEMPLATES, montarTemplatesDeEmail } from '../../../scripts/templates-de-email.mjs'

/**
 * O HTML commitado é o que o gerador produz.
 *
 * Os quatro e-mails do Auth vivem no dashboard do Supabase, e o que está no
 * repositório é a cópia que permite conferir os três ambientes um contra o
 * outro. Editar o HTML à mão funciona — até alguém rodar o gerador e a correção
 * sumir, num e-mail que só quem está entrando pela primeira vez recebe.
 *
 * Mesmo desenho do gate de `database.types.ts`: o arquivo é gerado, e o teste é
 * o que garante que ele continue sendo.
 */
const RAIZ = join(process.cwd(), 'supabase', 'templates')

const gerados = montarTemplatesDeEmail() as Record<string, string>

describe('templates de e-mail do Auth', () => {
  it.each(Object.keys(gerados))('supabase/templates/%s está igual ao gerador', (arquivo) => {
    const commitado = readFileSync(join(RAIZ, arquivo), 'utf8').replaceAll('\r\n', '\n')
    expect(commitado).toBe(gerados[arquivo])
  })

  /**
   * O que muda entre os quatro é o `type`, e é ele que diz ao
   * `/auth/confirmar` o que verificar e para onde mandar depois. Trocar dois
   * por engano manda quem redefine senha direto ao painel, sem senha nenhuma.
   */
  it('cada template carrega o próprio tipo de OTP', () => {
    const tipos = Object.values(TEMPLATES as Record<string, { arquivo: string; tipo: string }>)

    expect(tipos.map((t) => t.tipo).sort()).toEqual(['invite', 'magiclink', 'recovery', 'signup'])

    for (const template of tipos) {
      expect(gerados[template.arquivo]).toContain(`type=${template.tipo}`)
    }
  })

  it('o link verifica no servidor, nunca pelo ConfirmationURL', () => {
    for (const html of Object.values(gerados)) {
      expect(html).toContain('/auth/confirmar?token_hash={{ .TokenHash }}')
      expect(html).not.toContain('ConfirmationURL')
    }
  })
})
