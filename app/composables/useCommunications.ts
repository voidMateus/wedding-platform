import type {
  ComunicacaoMensagemInput,
  ComunicacaoRegistroInput,
  ModelosComunicacaoInput,
} from '#shared/schemas/comunicacoes'
import type { ConfigLembretes } from '#shared/schemas/lembretes'
import type { ComunicacoesResponse, EnvioPorEmail, MensagemPronta } from '~/types/comunicacao'

/**
 * Comunicações: o registro de cada envio e a mensagem pronta do WhatsApp.
 *
 * Toda chamada de rede do client passa por aqui, nunca direto em
 * página/componente (CLAUDE.md, seção 4.1).
 */
export function useCommunications() {
  /**
   * A lista inteira, não uma página: o resumo do topo descreve o casamento e a
   * fila de envio precisa do conjunto — ver `GET /api/communications`.
   */
  function listCommunications() {
    return useFetch<ComunicacoesResponse>('/api/communications', { key: 'communications' })
  }

  async function fetchCommunications(): Promise<ComunicacoesResponse> {
    return $fetch<ComunicacoesResponse>('/api/communications')
  }

  /** Registra um envio (whatsapp, email ou outro). */
  async function registrarEnvio(input: ComunicacaoRegistroInput) {
    return $fetch('/api/communications', { method: 'POST', body: input })
  }

  /**
   * Apaga um registro — o servidor recusa (409) quando o canal não é `outro`:
   * declaração do casal tem volta, fato do sistema não.
   */
  async function apagarEnvio(id: string) {
    return $fetch<{ id: string }>(`/api/communications/${id}`, { method: 'DELETE' })
  }

  /**
   * O texto pronto e o `wa.me`. POST porque escreve: gera a credencial de
   * acesso do convite quando ainda não existe uma.
   */
  async function prepararMensagem(input: ComunicacaoMensagemInput): Promise<MensagemPronta> {
    return $fetch<MensagemPronta>('/api/communications/message', { method: 'POST', body: input })
  }

  /**
   * Manda o e-mail e registra o envio — um gesto só, do lado do servidor.
   *
   * Não é `registrarEnvio({ canal: 'email' })`: registrar declara um fato que
   * já aconteceu por fora, e aqui o envio acontece dentro da plataforma (e
   * pode falhar por um motivo que não é do casal).
   */
  async function enviarPorEmail(input: ComunicacaoMensagemInput): Promise<EnvioPorEmail> {
    return $fetch<EnvioPorEmail>('/api/communications/email', { method: 'POST', body: input })
  }

  async function salvarModelos(input: ModelosComunicacaoInput) {
    return $fetch('/api/wedding/communication-templates', { method: 'PATCH', body: input })
  }

  /** O que a plataforma pode mandar sozinha (`casamentos.config_lembretes`). */
  async function salvarLembretes(input: ConfigLembretes) {
    return $fetch('/api/wedding/reminders', { method: 'PATCH', body: input })
  }

  return {
    listCommunications,
    fetchCommunications,
    registrarEnvio,
    apagarEnvio,
    prepararMensagem,
    enviarPorEmail,
    salvarModelos,
    salvarLembretes,
  }
}
