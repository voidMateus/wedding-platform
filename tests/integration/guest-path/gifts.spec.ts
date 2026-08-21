import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestGift } from '../../factories/gift'

/**
 * Caminho do convidado — presentes públicos (docs/ARCHITECTURE.md, seção 8
 * "Fluxo de Presentes"; CLAUDE.md, seção 4.2). Sem token de convite, sem
 * sessão — a garantia deste fluxo não é "só o dono acessa", é "o servidor
 * SEMPRE recalcula preço/quantidade a partir do próprio `presente_id`, nunca
 * aceita valor/quantidade vindos do client" (CLAUDE.md, seção 4.2, linha do
 * caminho "Presentes"). É exatamente essa propriedade que esta suíte prova,
 * não só "retorna 200".
 *
 * POST .../checkout cria um link de pagamento real na API da InfinitePay
 * (server/utils/infinitepay.ts) — URL fixa (api.checkout.infinitepay.io),
 * sem sandbox documentado publicamente e sem credencial de teste disponível
 * neste ambiente. Por isso os casos de checkout aqui só exercitam a
 * requisição até o ponto em que o handler já rejeitaria ANTES de chamar a
 * InfinitePay (guard de `handle_infinitepay` ausente, validação de
 * cota/schema) — nenhum deles faz uma chamada de rede real a um terceiro. O
 * caminho feliz completo (link de checkout de verdade) é pulado
 * deliberadamente com `it.skip` e o motivo documentado, não omitido em
 * silêncio. A confirmação de pagamento (`confirmar_pagamento_presente`) é
 * pura função Postgres sem chamada de rede — usada diretamente via RPC nos
 * testes do endpoint de status, para simular um pagamento confirmado sem
 * depender da InfinitePay de verdade.
 */
describe('guest-path: presentes públicos (/api/public/gifts)', () => {
  const admin = getServiceRoleClient()

  let wedding: Awaited<ReturnType<typeof createTestWedding>>
  let weddingWithInfinitePay: Awaited<ReturnType<typeof createTestWedding>>

  beforeAll(async () => {
    wedding = await createTestWedding(admin)
    // handle_infinitepay só precisa ser truthy para passar do guard em
    // checkout.post.ts — os testes que o usam nunca chegam a acionar a
    // chamada de rede real (falham antes, em validação de negócio/schema).
    weddingWithInfinitePay = await createTestWedding(admin, { handle_infinitepay: 'handle-teste-integracao' })
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestWedding(admin, wedding.id),
      () => deleteTestWedding(admin, weddingWithInfinitePay.id),
    ])
  })

  describe('POST /api/public/gifts/[id]/reserve', () => {
    it('adulteração de preço/quantidade: schema nem declara esses campos — servidor sempre decrementa exatamente 1 e nunca toca no preço', async () => {
      const gift = await createTestGift(admin, wedding.id, { preco_centavos: 10000, quantidade_disponivel: 5 })
      const client = createTestApiClient()

      const res = await client.post(`/api/public/gifts/${gift.id}/reserve`, {
        nomePresenteador: 'Convidado Adulterador',
        // giftReserveSchema (shared/schemas/gift-mutations.ts) não declara
        // nenhum destes campos — o Zod descarta silenciosamente chaves
        // desconhecidas (comportamento padrão de z.object, sem .strict()).
        // É essa ausência de campo que garante que preço/quantidade nunca
        // vêm do client.
        precoCentavos: 1,
        valorCentavos: 1,
        quantidade: 999,
      })
      expect(res.status).toBe(200)

      const { data: reservations } = await admin.from('reservas_presentes').select('*').eq('presente_id', gift.id)
      expect(reservations).toHaveLength(1)

      const { data: giftAfter } = await admin.from('presentes').select('*').eq('id', gift.id).single()
      // decrementou exatamente 1 (nunca 999) — reservar_presente() só mexe
      // em quantidade_disponivel, nunca grava preço nenhum na reserva.
      expect(giftAfter?.quantidade_disponivel).toBe(4)
      expect(giftAfter?.preco_centavos).toBe(10000)
    })

    it('caminho feliz: reserva presente físico com 1 unidade disponível; segunda tentativa é rejeitada (409, esgotado)', async () => {
      const gift = await createTestGift(admin, wedding.id, { preco_centavos: null, quantidade_disponivel: 1 })
      const client = createTestApiClient()

      const res = await client.post(`/api/public/gifts/${gift.id}/reserve`, {
        nomePresenteador: 'Fulano da Silva',
        telefonePresenteador: '11999998888',
      })
      expect(res.status).toBe(200)

      const { data: stored } = await admin.from('reservas_presentes').select('*').eq('presente_id', gift.id).single()
      expect(stored?.nome_contribuinte).toBe('Fulano da Silva')
      expect(stored?.telefone_presenteador).toBe('11999998888')

      const { data: giftAfter } = await admin
        .from('presentes')
        .select('quantidade_disponivel')
        .eq('id', gift.id)
        .single()
      expect(giftAfter?.quantidade_disponivel).toBe(0)

      const second = await client.post(`/api/public/gifts/${gift.id}/reserve`, { nomePresenteador: 'Ciclano' })
      expect(second.status).toBe(409)

      const { count } = await admin
        .from('reservas_presentes')
        .select('*', { count: 'exact', head: true })
        .eq('presente_id', gift.id)
      expect(count).toBe(1)
    })

    it('corrida: 2 tentativas concorrentes para 1 única unidade — exatamente uma ganha, a outra recebe 409 (esgotado)', async () => {
      const gift = await createTestGift(admin, wedding.id, { preco_centavos: 5000, quantidade_disponivel: 1 })
      // Dois clients independentes (IP próprio cada um) — a corrida é sobre o
      // estoque do presente no Postgres, não sobre o orçamento de rate limit.
      const clientA = createTestApiClient()
      const clientB = createTestApiClient()

      const [resA, resB] = await Promise.all([
        clientA.post(`/api/public/gifts/${gift.id}/reserve`, { nomePresenteador: 'Corredor A' }),
        clientB.post(`/api/public/gifts/${gift.id}/reserve`, { nomePresenteador: 'Corredor B' }),
      ])

      const statuses = [resA.status, resB.status].sort((a, b) => a - b)
      expect(statuses).toEqual([200, 409])

      const { count } = await admin
        .from('reservas_presentes')
        .select('*', { count: 'exact', head: true })
        .eq('presente_id', gift.id)
      expect(count).toBe(1)

      const { data: giftAfter } = await admin
        .from('presentes')
        .select('quantidade_disponivel')
        .eq('id', gift.id)
        .single()
      expect(giftAfter?.quantidade_disponivel).toBe(0)
    })

    it('presente de cota rejeita reserva (rota errada — cota usa contribuição via checkout, nunca reserva)', async () => {
      const gift = await createTestGift(admin, wedding.id, {
        e_presente_cota: true,
        preco_centavos: null,
        quantidade_disponivel: null,
        valor_meta_centavos: 100000,
      })
      const client = createTestApiClient()

      const res = await client.post(`/api/public/gifts/${gift.id}/reserve`, { nomePresenteador: 'Fulano' })
      expect(res.status).toBe(400)

      const { count } = await admin
        .from('reservas_presentes')
        .select('*', { count: 'exact', head: true })
        .eq('presente_id', gift.id)
      expect(count).toBe(0)
    })
  })

  describe('POST /api/public/gifts/[id]/checkout', () => {
    it('sem handle_infinitepay configurado no casamento: 400 antes mesmo de calcular o valor, nenhum pagamento é criado', async () => {
      const gift = await createTestGift(admin, wedding.id, { preco_centavos: 20000, quantidade_disponivel: 1 })
      const client = createTestApiClient()

      const res = await client.post(`/api/public/gifts/${gift.id}/checkout`, {
        nomePresenteador: 'Fulano',
        // tentativa de adulterar o valor de um presente físico — nem chega a
        // ser lida, o guard de handle_infinitepay barra antes disso.
        valorCentavos: 1,
      })
      expect(res.status).toBe(400)

      const { count } = await admin
        .from('pagamentos_presentes')
        .select('*', { count: 'exact', head: true })
        .eq('presente_id', gift.id)
      expect(count).toBe(0)
    })

    it('adulteração: enviar valorCentavos E quantidadeCotas juntos é rejeitado pelo schema (400) — nunca ambíguo sobre qual valor vale', async () => {
      const gift = await createTestGift(admin, wedding.id, {
        e_presente_cota: true,
        preco_centavos: null,
        quantidade_disponivel: null,
        valor_meta_centavos: 100000,
        valor_cota_centavos: 5000,
      })
      const client = createTestApiClient()

      const res = await client.post(`/api/public/gifts/${gift.id}/checkout`, {
        nomePresenteador: 'Fulano',
        quantidadeCotas: 2,
        valorCentavos: 999999999,
      })
      expect(res.status).toBe(400)

      const { count } = await admin
        .from('pagamentos_presentes')
        .select('*', { count: 'exact', head: true })
        .eq('presente_id', gift.id)
      expect(count).toBe(0)
    })

    it('presente de cota fixa nunca aceita um valorCentavos livre do client — exige quantidadeCotas, servidor sempre recalcula o total', async () => {
      const gift = await createTestGift(admin, weddingWithInfinitePay.id, {
        e_presente_cota: true,
        preco_centavos: null,
        quantidade_disponivel: null,
        valor_meta_centavos: 100000,
        valor_cota_centavos: 5000,
      })
      const client = createTestApiClient()

      const res = await client.post(`/api/public/gifts/${gift.id}/checkout`, {
        nomePresenteador: 'Fulano',
        // tenta pagar um valor arbitrário em vez de um múltiplo da cota fixa
        valorCentavos: 1,
      })
      expect(res.status).toBe(400)

      const { count } = await admin
        .from('pagamentos_presentes')
        .select('*', { count: 'exact', head: true })
        .eq('presente_id', gift.id)
      expect(count).toBe(0)
    })

    // O caminho feliz de checkout cria um link de pagamento de verdade na API
    // da InfinitePay (server/utils/infinitepay.ts, INFINITEPAY_API_BASE_URL =
    // https://api.checkout.infinitepay.io) — sem sandbox documentado
    // publicamente e sem credencial de teste disponível neste ambiente (não
    // há handle_infinitepay real em .env). Chamar isso aqui faria o teste
    // depender de infraestrutura de terceiro fora do nosso controle — pulado
    // deliberadamente, não esquecido. A garantia de que o valor cobrado é
    // sempre recalculado no servidor (nunca aceito do client) já é coberta
    // acima, até exatamente o ponto em que o handler decide o valor — que é
    // sempre antes de chamar a InfinitePay.
    it.skip('caminho feliz: cria checkout real na InfinitePay (exige credencial de sandbox — indisponível neste ambiente)', () => {})
  })

  describe('GET /api/public/gifts/payments/[id]/status', () => {
    it('pagamento inexistente retorna 404, nunca vaza se o id existe', async () => {
      const client = createTestApiClient()
      const res = await client.get(`/api/public/gifts/payments/${randomUUID()}/status`)
      expect(res.status).toBe(404)
    })

    it('pagamento confirmado: retorna o shape esperado (confirmação simulada via RPC direto, sem depender da InfinitePay de verdade)', async () => {
      const gift = await createTestGift(admin, wedding.id, { preco_centavos: 15000, quantidade_disponivel: 1 })
      const paymentId = randomUUID()

      const { error: insertError } = await admin.from('pagamentos_presentes').insert({
        id: paymentId,
        casamento_id: wedding.id,
        presente_id: gift.id,
        convite_id: null,
        tipo: 'reserva',
        valor_centavos: 15000,
        nome_presenteador: 'Fulano Pagador',
        nsu_pedido_provedor: paymentId,
        status_pagamento: 'pendente',
      })
      expect(insertError).toBeNull()

      // Efetiva a confirmação com a mesma função Postgres usada pelo
      // webhook/pull (server/utils/gift-payment.ts#confirmGiftPayment) — só a
      // reverificação payment_check contra a InfinitePay em si é substituída
      // aqui (é a única parte que exigiria rede real); a própria RPC não faz
      // nenhuma chamada externa. A constraint gift_payments_confirmed_has_result
      // (status='confirmado' exige reserva_resultante_id/contribuicao_resultante_id)
      // impede inserir a linha já confirmada direto — por isso passa por
      // 'pendente' primeiro.
      const { data: confirmed, error: rpcError } = await admin.rpc('confirmar_pagamento_presente', {
        p_pagamento_id: paymentId,
      })
      expect(rpcError).toBeNull()
      expect(confirmed?.status_pagamento).toBe('confirmado')
      expect(confirmed?.reserva_resultante_id).not.toBeNull()

      const client = createTestApiClient()
      const res = await client.get(`/api/public/gifts/payments/${paymentId}/status`)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.status).toBe('confirmado')
      expect(body.giftTitle).toBe(gift.titulo)
      expect(body.amountCents).toBe(15000)
      expect(body.quotaCount).toBeNull()
      expect(body.confirmedAt).not.toBeNull()
    })

    it('pagamento pendente sem handle_infinitepay configurado: fallback de confirmação não crasha e não confirma às cegas a partir de hints do client', async () => {
      const gift = await createTestGift(admin, wedding.id, { preco_centavos: 8000, quantidade_disponivel: 1 })
      const paymentId = randomUUID()

      const { error: insertError } = await admin.from('pagamentos_presentes').insert({
        id: paymentId,
        casamento_id: wedding.id,
        presente_id: gift.id,
        convite_id: null,
        tipo: 'reserva',
        valor_centavos: 8000,
        nome_presenteador: 'Fulano Pendente',
        nsu_pedido_provedor: paymentId,
        status_pagamento: 'pendente',
      })
      expect(insertError).toBeNull()

      const client = createTestApiClient()
      // Tenta injetar hints de confirmação via querystring (nsuTransacao/
      // slug) — sem handle_infinitepay configurado no casamento,
      // confirmGiftPayment() retorna cedo e nunca confirma só a partir do
      // que o convidado manda, nem chama a InfinitePay.
      const res = await client.get(
        `/api/public/gifts/payments/${paymentId}/status?nsuTransacao=forjado&slug=forjado`,
      )
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.status).toBe('pendente')
      expect(body.confirmedAt).toBeNull()

      const { data: stored } = await admin
        .from('pagamentos_presentes')
        .select('status_pagamento')
        .eq('id', paymentId)
        .single()
      expect(stored?.status_pagamento).toBe('pendente')
    })
  })
})
