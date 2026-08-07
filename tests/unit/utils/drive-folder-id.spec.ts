import { describe, expect, it } from 'vitest'
import { extractDriveFolderId, isValidDriveFolderId } from '../../../server/utils/drive-folder-id'

// Fase Galeria via Google Drive (CLAUDE.md) — o parser de folder id é o pedaço
// mais suscetível a bug e o único testável sem tocar na Drive API.
describe('extractDriveFolderId', () => {
  const FOLDER_ID = '1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUv'

  it('extrai de uma URL /drive/folders/{id}', () => {
    expect(extractDriveFolderId(`https://drive.google.com/drive/folders/${FOLDER_ID}`)).toBe(FOLDER_ID)
  })

  it('extrai ignorando querystring (usp=sharing, resourcekey)', () => {
    expect(
      extractDriveFolderId(`https://drive.google.com/drive/folders/${FOLDER_ID}?usp=sharing`),
    ).toBe(FOLDER_ID)
    expect(
      extractDriveFolderId(`https://drive.google.com/drive/folders/${FOLDER_ID}?resourcekey=0-abc`),
    ).toBe(FOLDER_ID)
  })

  it('extrai de /drive/u/0/folders/{id} (conta com múltiplos logins)', () => {
    expect(extractDriveFolderId(`https://drive.google.com/drive/u/0/folders/${FOLDER_ID}`)).toBe(
      FOLDER_ID,
    )
  })

  it('extrai de open?id={id} e uc?id={id}', () => {
    expect(extractDriveFolderId(`https://drive.google.com/open?id=${FOLDER_ID}`)).toBe(FOLDER_ID)
    expect(extractDriveFolderId(`https://drive.google.com/uc?id=${FOLDER_ID}&export=download`)).toBe(
      FOLDER_ID,
    )
  })

  it('aceita um id colado sozinho', () => {
    expect(extractDriveFolderId(FOLDER_ID)).toBe(FOLDER_ID)
    expect(extractDriveFolderId(`  ${FOLDER_ID}  `)).toBe(FOLDER_ID)
  })

  it('retorna null para entradas sem um id de pasta reconhecível', () => {
    expect(extractDriveFolderId('')).toBeNull()
    expect(extractDriveFolderId('   ')).toBeNull()
    expect(extractDriveFolderId('https://drive.google.com/drive/my-drive')).toBeNull()
    expect(extractDriveFolderId('não é uma url')).toBeNull()
  })
})

describe('isValidDriveFolderId', () => {
  it('aceita apenas o charset do Google [A-Za-z0-9_-]', () => {
    expect(isValidDriveFolderId('1A2b3C_4d-5E')).toBe(true)
    expect(isValidDriveFolderId("1' or true")).toBe(false)
    expect(isValidDriveFolderId('has/slash')).toBe(false)
    expect(isValidDriveFolderId('')).toBe(false)
  })
})
