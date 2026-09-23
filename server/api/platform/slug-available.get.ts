import { z } from 'zod'
import { platformWeddingCreateSchema } from '#shared/schemas/platform-wedding'
import { proximoEnderecoLivre } from '#shared/utils/endereco-do-site'

/**
 * O endereço do site está livre? — conveniência do formulário, nunca a garantia.
 *
 * O formulário de criação só dizia o que estava errado, e a colisão de endereço
 * só aparecia no 409 depois do Criar — com o convite do dono já pensado e o
 * operador tendo de recomeçar (rodada de usabilidade de 20/09/2026, ponto 1).
 * Esta rota responde enquanto se digita.
 *
 * **Ela não decide nada.** Entre a resposta e o POST cabe outro operador
 * criando o mesmo endereço, e quem garante um casamento só continua sendo o
 * `unique` de `casamentos.slug`, que é a chave de idempotência da criação
 * (docs/fase5-multievento.md 6.3). Tratar esta consulta como autoridade seria
 * trocar uma restrição do banco por uma corrida.
 *
 * Ela devolve também **uma alternativa livre** quando o endereço está tomado, e
 * isso não é enfeite: sem ela, o formulário sugeria `ana-e-joao` a partir do
 * nome do casal e reprovava a própria sugestão na linha seguinte — o segundo
 * casal Ana e João do produto batia nisso. Quem sugere precisa sugerir algo
 * utilizável, e quem conhece os endereços tomados é o servidor.
 *
 * Caminho Plataforma (CLAUDE.md 4.2): `requirePlatformOperator()` é o portão, e
 * só depois dele entra o `service_role` — `casamentos` não tem policy que
 * permita a alguém de fora enumerar endereços de outros casais.
 *
 * Fora de `weddings/` de propósito: ali ela casaria com o mesmo padrão de rota
 * tipada que `/api/platform/weddings/${id}`, e o `updateWedding` do client
 * passaria a ser tipado como rota só de GET.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformOperator(event)

  const { slug } = validateQuery(event, z.object({ slug: platformWeddingCreateSchema.shape.slug }))

  const admin = supabaseAdmin(event)

  // Os vizinhos do endereço pedido, e não só ele: é o que permite achar a
  // primeira alternativa livre numa consulta só, em vez de perguntar
  // `ana-e-joao-2`, `-3`, `-4` uma de cada vez. O formato do slug não admite
  // `%` nem `_`, então o prefixo entra no `like` sem virar curinga.
  const { data, error } = await admin.from('casamentos').select('slug').like('slug', `${slug}%`)

  if (error) {
    throw badRequestError(error.message)
  }

  const tomados = (data ?? []).map((casamento) => casamento.slug)
  const disponivel = !tomados.includes(slug)

  return {
    slug,
    disponivel,
    sugestao: disponivel ? null : proximoEnderecoLivre(slug, tomados),
  }
})
