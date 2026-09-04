/**
 * Compõe o endereço pronto para exibição (`etapas_evento.endereco_local`) a
 * partir das partes digitadas no cadastro manual de local.
 *
 * Uma coluna só, composta, em vez de cada tela remontar o endereço: todo
 * consumidor de exibição — EventSpotlight.vue, o embed do mapa, o card de
 * confirmação do admin — já lê `endereco_local`, inclusive nas linhas
 * legadas que nunca tiveram partes separadas. As partes existem apenas para
 * reabrir o formulário manual com cada campo no seu lugar.
 *
 * Compartilhado client/server de propósito: o servidor é quem grava (fonte de
 * verdade), mas o formulário precisa mostrar o mesmo texto no card de
 * confirmação antes de salvar — duas implementações divergiriam no primeiro
 * endereço sem número.
 */

export interface EnderecoLocalPartes {
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  cidade?: string | null
  estado?: string | null
}

function limpar(valor: string | null | undefined): string {
  return (valor ?? '').trim()
}

export function formatarEnderecoLocal(partes: EnderecoLocalPartes): string {
  const logradouro = limpar(partes.logradouro)
  const numero = limpar(partes.numero)
  const complemento = limpar(partes.complemento)
  const cidade = limpar(partes.cidade)
  const estado = limpar(partes.estado)

  // "Rua das Flores, 100" — vírgula só quando as duas partes existem; um
  // logradouro sem número não pode virar "Rua das Flores, " nem ", 100".
  const rua = [logradouro, numero].filter(Boolean).join(', ')
  // "Cuiabá - MT", mas "Cuiabá" sozinho quando a UF não foi informada.
  const municipio = [cidade, estado].filter(Boolean).join(' - ')

  return [rua, complemento, municipio].filter(Boolean).join(' · ')
}
