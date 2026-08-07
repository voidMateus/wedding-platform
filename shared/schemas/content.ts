import { z } from 'zod'
import { MANUAL_TOPIC_ICON_VALUES } from '../manual-topic-icons'

// Personalização das mensagens narrativas do site público (CLAUDE.md,
// roadmap "Fase Mensagens Personalizáveis") — compartilhado entre client
// (aba "Conteúdo" do admin) e server (revalidação, CLAUDE.md seção 8/20.1).
// Endpoint próprio (PATCH /api/wedding/content), separado de theme_config
// (§22.3, exclusivamente visual) e de PATCH /api/wedding (dados de negócio).

export const contentFaqItemSchema = z.object({
  question: z.string().trim().min(1, 'Informe a pergunta.').max(200),
  answer: z.string().trim().min(1, 'Informe a resposta.').max(1000),
})

export const contentManualTopicSchema = z.object({
  icon: z.string().refine((value) => MANUAL_TOPIC_ICON_VALUES.has(value), 'Ícone desconhecido.'),
  title: z.string().trim().min(1, 'Informe o título.').max(80),
  description: z.string().trim().min(1, 'Informe a descrição.').max(300),
})

// Campos escalares são sempre obrigatórios — não há "limpar pra voltar ao
// padrão" nesta fase (CLAUDE.md, decisão de escopo). Os dois arrays podem
// ficar vazios: é como o casal remove a seção inteira (Manual/FAQ), tratado
// explicitamente pelo resolver (shared/wedding-content.ts#resolveWeddingContent).
export const weddingContentConfigSchema = z.object({
  welcomeTitle: z.string().trim().min(1, 'Informe o título.').max(120),
  welcomeMessage: z.string().trim().min(1, 'Informe a mensagem de boas-vindas.').max(2000),
  storyMessage: z.string().trim().min(1, 'Conte um pouco da história.').max(3000),
  dressCodeDescription: z.string().trim().min(1, 'Informe a descrição do dress code.').max(1000),
  dressCodeSuggestions: z.array(z.string().trim().min(1).max(300)).max(10),
  guestManualIntro: z.string().trim().min(1, 'Informe a introdução do manual.').max(500),
  guestManualTopics: z.array(contentManualTopicSchema).max(12),
  giftsIntroMessage: z.string().trim().min(1, 'Informe a mensagem de presentes.').max(1000),
  faqItems: z.array(contentFaqItemSchema).max(20),
})

export type WeddingContentConfigInput = z.infer<typeof weddingContentConfigSchema>

/** Shape completo de weddings.content_config como lido do banco — todo campo é opcional (ausente = usa o default de shared/wedding-content.ts). */
export interface WeddingContentConfig {
  welcomeTitle?: string
  welcomeMessage?: string
  storyMessage?: string
  dressCodeDescription?: string
  dressCodeSuggestions?: string[]
  guestManualIntro?: string
  guestManualTopics?: { icon: string; title: string; description: string }[]
  giftsIntroMessage?: string
  faqItems?: { question: string; answer: string }[]
}
