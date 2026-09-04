import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { decryptWithKey, encryptWithKey, parseEncryptionKey } from '../../../server/utils/aes-gcm'

const key = randomBytes(32)
const otherKey = randomBytes(32)
const CODE = 'AbC123xyzAbC123xyzAbC123'

describe('encryptWithKey/decryptWithKey', () => {
  it('devolve o mesmo valor depois de cifrar — é o que permite reexibir o link do convite (docs/PRODUCT.md, seção 5.2)', () => {
    expect(decryptWithKey(encryptWithKey(CODE, key), key)).toBe(CODE)
  })

  it('nunca deixa o valor em texto plano no payload (CLAUDE.md, seção 11)', () => {
    expect(encryptWithKey(CODE, key)).not.toContain(CODE)
  })

  it('usa IV novo a cada chamada — mesmo valor, payloads diferentes', () => {
    expect(encryptWithKey(CODE, key)).not.toBe(encryptWithKey(CODE, key))
  })

  it('não abre com outra chave — chaves são separadas por finalidade', () => {
    expect(() => decryptWithKey(encryptWithKey(CODE, key), otherKey)).toThrow()
  })

  it('recusa payload adulterado (GCM autentica a integridade)', () => {
    const [iv, tag, data] = encryptWithKey(CODE, key).split(':')
    const tampered = Buffer.from(data!, 'base64')
    tampered[0] ^= 0xff
    expect(() => decryptWithKey([iv, tag, tampered.toString('base64')].join(':'), key)).toThrow()
  })

  it('recusa payload malformado', () => {
    expect(() => decryptWithKey('nao-e-um-payload', key)).toThrow('Payload cifrado inválido.')
  })
})

describe('parseEncryptionKey', () => {
  it('aceita hex de 64 chars e base64 de 32 bytes', () => {
    const raw = randomBytes(32)
    expect(parseEncryptionKey(raw.toString('hex'), 'X')).toEqual(raw)
    expect(parseEncryptionKey(raw.toString('base64'), 'X')).toEqual(raw)
  })

  it('reclama nomeando a env quando ausente ou do tamanho errado', () => {
    expect(() => parseEncryptionKey(undefined, 'ACCESS_CODE_ENCRYPTION_KEY')).toThrow(
      'ACCESS_CODE_ENCRYPTION_KEY não configurada.',
    )
    expect(() => parseEncryptionKey('curta', 'ACCESS_CODE_ENCRYPTION_KEY')).toThrow(
      'ACCESS_CODE_ENCRYPTION_KEY deve ter 32 bytes',
    )
  })
})
