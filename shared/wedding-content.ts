// Copy fixo das novas seções editoriais do site público (Fase Editorial —
// CLAUDE.md, seção 22.3/32). Nenhum texto aqui inventa fatos específicos
// sobre um casal real — é copy genérico de placeholder. Desde o roadmap
// "Fase Mensagens Personalizáveis", esses textos viraram a MENSAGEM PADRÃO:
// cada casamento pode sobrescrevê-los via weddings.content_config (aba
// "Conteúdo" do admin) — ver resolveWeddingContent() no fim deste arquivo,
// que resolve o config bruto do banco + esses defaults no shape final
// consumido pelos componentes públicos.
import type { WeddingContentConfig } from './schemas/content'
import { splitParagraphs } from './utils/split-paragraphs'

// Boas-vindas logo após o Hero (Fase Linguagem Visual, Rodada 6) —
// continuação natural do Hero, sem card/caixa, só tipografia.
export const WELCOME_CONTENT = {
  title: 'Seja muito bem-vindo!',
  paragraphs: [
    'Criamos este espaço com muito carinho para compartilhar todos os detalhes do nosso grande dia e um pouco da nossa história.',
    'É uma alegria imensa ter você aqui com a gente!',
  ],
}

export const STORY_CONTENT = {
  paragraphs: [
    'Cada história de amor tem o seu próprio ritmo — a nossa começou devagar, em conversas que se estendiam sem pressa, e foi crescendo até se tornar a certeza que trazemos até aqui.',
    'Entre risadas, planos adiados e recomeços, aprendemos que construir uma vida a dois é, acima de tudo, escolher o outro todos os dias — e é exatamente isso que queremos celebrar com vocês.',
  ],
}

export const DRESS_CODE_CONTENT = {
  description:
    'Escolha um look que reflita a elegância do momento — sugerimos traje social, em tons que conversem com a nossa paleta.',
  suggestions: [
    'Evite branco e tons muito próximos do branco, reservados para a noiva.',
    'Cores terrosas, joias discretas e tecidos fluidos são bem-vindos.',
    'A cerimônia e a recepção acontecem ao ar livre — calçados confortáveis agradecem.',
  ],
}

export interface ManualTopic {
  icon: string
  title: string
  description: string
}

export const GUEST_MANUAL_CONTENT: { intro: string; topics: ManualTopic[] } = {
  intro: 'Algumas informações práticas para você aproveitar o dia sem preocupação.',
  topics: [
    {
      icon: 'lucide:bed',
      title: 'Hospedagem',
      description: 'Há hotéis e pousadas a poucos minutos do local — teremos uma lista de sugestões em breve.',
    },
    {
      icon: 'lucide:car',
      title: 'Transporte e estacionamento',
      description: 'O local conta com estacionamento próprio; se preferir, aplicativos de transporte chegam até a entrada.',
    },
    {
      icon: 'lucide:shirt',
      title: 'Traje',
      description: 'Confira as sugestões na seção Dress Code, um pouco mais acima nesta página.',
    },
    {
      icon: 'lucide:clock',
      title: 'Horários',
      description: 'Chegue com 30 minutos de antecedência para se acomodar antes do início da cerimônia.',
    },
  ],
}

// Mensagem introdutória da página de presentes ("Presentes 2.0", CLAUDE.md
// seção 18) — explica ao convidado, sem rodeio, que existem duas formas de
// presentear um item físico (comprar por fora ou pagar pelo link de
// pagamento), já que ele pode não saber o que fazer sem essa explicação.
export const GIFTS_INTRO_CONTENT = {
  message:
    'Sua presença já é o presente mais importante. Se quiser nos ajudar a começar essa nova fase, preparamos esta lista com carinho — de itens do dia a dia a uma contribuição para a lua de mel. Em cada presente físico, você escolhe como prefere: comprar e entregar por fora, ou enviar o valor pelo link de pagamento para o casal comprar.',
}

export interface FaqItem {
  question: string
  answer: string
}

export const FAQ_CONTENT: FaqItem[] = [
  {
    question: 'Posso levar acompanhante?',
    answer:
      'Confirmamos os acompanhantes que constam no seu convite — o número exato aparece no formulário de confirmação de presença, acessado pelo seu link pessoal.',
  },
  {
    question: 'Crianças estão convidadas?',
    answer:
      'Cada convite indica se inclui crianças. Se tiver dúvida, entre em contato com a gente antes de confirmar presença.',
  },
  {
    question: 'Até quando posso confirmar presença?',
    answer:
      'O prazo final de confirmação aparece no seu link pessoal de RSVP. Depois dessa data, o formulário fica somente para consulta.',
  },
  {
    question: 'Onde encontro a lista de presentes?',
    answer: 'A lista completa está na seção "Lista de Presentes", um pouco acima nesta página.',
  },
  {
    question: 'O evento é ao ar livre?',
    answer:
      'Sim — tanto a cerimônia quanto a recepção acontecem em espaços abertos. Veja as sugestões na seção Dress Code.',
  },
]

export interface ResolvedWeddingContent {
  welcomeTitle: string
  welcomeParagraphs: string[]
  storyParagraphs: string[]
  dressCodeDescription: string
  dressCodeSuggestions: string[]
  guestManualIntro: string
  guestManualTopics: ManualTopic[]
  giftsIntroMessage: string
  faqItems: FaqItem[]
}

/**
 * Resolve weddings.content_config (bruto, do banco) + os defaults acima no
 * shape final consumido pelos componentes públicos — mesmo espírito de
 * useWeddingTheme.ts (função pura, sem estado).
 *
 * Usa `??` (não `?.length ?`) de propósito: distingue "nunca customizado"
 * (undefined → cai no default) de "customizado para lista vazia" ([] → o
 * casal removeu todos os itens de Manual/FAQ, a seção correspondente some —
 * ver v-if nos componentes).
 */
export function resolveWeddingContent(contentConfig: unknown): ResolvedWeddingContent {
  const c = (contentConfig ?? {}) as Partial<WeddingContentConfig>
  return {
    welcomeTitle: c.welcomeTitle ?? WELCOME_CONTENT.title,
    welcomeParagraphs: c.welcomeMessage ? splitParagraphs(c.welcomeMessage) : WELCOME_CONTENT.paragraphs,
    storyParagraphs: c.storyMessage ? splitParagraphs(c.storyMessage) : STORY_CONTENT.paragraphs,
    dressCodeDescription: c.dressCodeDescription ?? DRESS_CODE_CONTENT.description,
    dressCodeSuggestions: c.dressCodeSuggestions ?? DRESS_CODE_CONTENT.suggestions,
    guestManualIntro: c.guestManualIntro ?? GUEST_MANUAL_CONTENT.intro,
    guestManualTopics: c.guestManualTopics ?? GUEST_MANUAL_CONTENT.topics,
    giftsIntroMessage: c.giftsIntroMessage ?? GIFTS_INTRO_CONTENT.message,
    faqItems: c.faqItems ?? FAQ_CONTENT,
  }
}
