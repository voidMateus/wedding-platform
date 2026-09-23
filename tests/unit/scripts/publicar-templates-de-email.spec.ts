import { describe, expect, it } from 'vitest'
// @ts-expect-error — scripts em .mjs, sem tipos próprios.
import { TEMPLATES } from '../../../scripts/templates-de-email.mjs'
// @ts-expect-error — scripts em .mjs, sem tipos próprios.
import { montarPayloadDeEmails } from '../../../scripts/publicar-templates-de-email.mjs'

/**
 * O mapeamento entre os quatro arquivos e os campos da Management API.
 *
 * É o lugar onde o erro seria mudo e caro: trocar dois campos grava a
 * recuperação de senha no slot do convite, e o defeito só aparece quando
 * alguém entra pela primeira vez e recebe o e-mail errado — meses depois, uma
 * pessoa de cada vez.
 *
 * O risco é concreto porque os nomes quase coincidem com o `tipo` do OTP e
 * divergem em dois dos quatro (`magiclink`/`magic_link`, `signup`/
 * `confirmation`): derivar um do outro funciona em metade do catálogo, que é o
 * pior tipo de bug.
 */
type Template = { arquivo: string; assunto: string; tipo: string; campoDaApi: string }

const catalogo = Object.values(TEMPLATES as Record<string, Template>)
const payload = montarPayloadDeEmails((arquivo: string) => `<html>${arquivo}</html>`) as Record<
  string,
  string
>

describe('publicar templates de e-mail', () => {
  it('escreve os oito campos que a API espera, e nada além', () => {
    expect(Object.keys(payload).sort()).toEqual([
      'mailer_subjects_confirmation',
      'mailer_subjects_invite',
      'mailer_subjects_magic_link',
      'mailer_subjects_recovery',
      'mailer_templates_confirmation_content',
      'mailer_templates_invite_content',
      'mailer_templates_magic_link_content',
      'mailer_templates_recovery_content',
    ])
  })

  it('cada campo recebe o arquivo e o assunto do próprio template', () => {
    for (const template of catalogo) {
      expect(payload[`mailer_templates_${template.campoDaApi}_content`]).toBe(
        `<html>${template.arquivo}</html>`,
      )
      expect(payload[`mailer_subjects_${template.campoDaApi}`]).toBe(template.assunto)
    }
  })

  /**
   * O assunto é campo separado do corpo, e é o que se perde na publicação
   * manual: o dashboard não o importa junto do HTML. Um template em português
   * com "Your sign-in link" na linha de assunto era o estado do projeto de
   * desenvolvimento até 23/09/2026.
   */
  it('nenhum assunto fica em branco', () => {
    for (const template of catalogo) {
      expect(payload[`mailer_subjects_${template.campoDaApi}`]).toMatch(/\S/)
    }
  })
})
