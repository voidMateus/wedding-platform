import { expect, test } from '@playwright/test'

/**
 * A suíte não pode voltar a ficar verde por não ter rodado.
 *
 * Todo spec daqui abre com um `test.skip` quando falta a credencial que
 * provisiona a conta de teste — o que é o comportamento certo na máquina de
 * quem clonou o repositório e ainda não configurou nada. O problema é o outro
 * ambiente: no CI, "pulou" e "passou" viram a mesma cor, e foi exatamente
 * assim que sete arquivos ficaram anos sem rodar enquanto o pipeline dizia
 * verde.
 *
 * Este teste é a diferença entre os dois casos. Ele não verifica regra de
 * produto nenhuma: verifica que a suíte está de fato habilitada onde ela
 * precisa estar.
 */
test('no CI, a suíte nunca passa por ter pulado', () => {
  test.skip(!process.env.CI, 'Só vale no CI — fora dele, pular é legítimo.')

  expect(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    'SUPABASE_SERVICE_ROLE_KEY ausente no CI: sem ela TODOS os specs se pulam, e o pipeline fica verde sem ter testado nada.',
  ).toBeTruthy()
})
