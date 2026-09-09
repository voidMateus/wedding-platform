import { z } from 'zod'
import { MANUAL_TOPIC_ICON_VALUES } from '../manual-topic-icons'
import { isValidHexColor } from '../utils/contrast'

// Personalização das mensagens narrativas do site público (CLAUDE.md,
// roadmap "Fase Mensagens Personalizáveis") — compartilhado entre client
// (aba "Conteúdo" do admin) e server (revalidação, CLAUDE.md seção 8/20.1).
// Endpoint próprio (PATCH /api/wedding/content), separado de config_tema
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

/**
 * Amostra da paleta do Manual dos Padrinhos — a "bolinha de cor" do convite
 * impresso (Fase Rebrand do Convite).
 *
 * `hex` NÃO passa por contraste, e por um motivo diferente do ornamento: aqui
 * a cor não pinta nada da interface. Ela é o conteúdo — a amostra do tom do
 * vestido que a madrinha vai comprar. Exigir 4.5:1 proibiria justamente um
 * dourado claro ou um rosé, que são exatamente as cores que um casal quer
 * mostrar. O nome ao lado da bolinha é que carrega a informação para quem não
 * distingue a cor (ver PublicColorSwatches).
 */
export const contentPaletteSwatchSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da cor.').max(40),
  hex: z
    .string()
    .trim()
    .refine(isValidHexColor, 'Informe uma cor em formato hexadecimal (ex: #8b0000).'),
})

/**
 * Manual dos Padrinhos — seção própria, separada do Manual dos Convidados
 * (público diferente, informação diferente: aqui é o traje combinado e a
 * paleta, lá é estacionamento e horário).
 *
 * Todo campo é opcional e a seção só aparece quando há de fato o que mostrar
 * — mesmo contrato de "lista vazia esconde a seção" já usado em Manual e FAQ,
 * porque a maioria dos casamentos não tem manual de padrinhos nenhum.
 */
export const contentGroomsmenManualSchema = z.object({
  intro: z.string().trim().max(500).optional(),
  attireGroomsmen: z.string().trim().max(500).optional(),
  attireBridesmaids: z.string().trim().max(500).optional(),
  palette: z.array(contentPaletteSwatchSchema).max(8),
})

/**
 * Um marco da história do casal — o cartão "O começo / Conversas que se
 * estenderam / ..." do protótipo do convite (Fase Rebrand do Convite,
 * rodada 3).
 *
 * Existe ao lado de `storyMessage`, não no lugar dele: são duas formas
 * diferentes de contar a mesma coisa, e qual serve depende do casal. Texto
 * corrido é uma carta; marcos são uma linha do tempo. Preenchendo os marcos, a
 * seção passa a desenhá-los; sem eles, segue o texto corrido de sempre.
 */
export const contentStoryMilestoneSchema = z.object({
  /** Rótulo curto acima do título ("O começo", "2019", "A certeza"). */
  label: z.string().trim().min(1, 'Informe o rótulo.').max(40),
  title: z.string().trim().min(1, 'Informe o título.').max(80),
  text: z.string().trim().min(1, 'Informe o texto.').max(400),
})

/** Versículo/citação em faixa cheia — respiro entre blocos claros, como a página vermelha do convite. */
export const contentVerseSchema = z.object({
  text: z.string().trim().max(600).optional(),
  reference: z.string().trim().max(120).optional(),
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
  // As duas seções da Fase Rebrand do Convite são opcionais de ponta a ponta
  // — diferente dos campos acima, não têm texto padrão que apareceria sozinho
  // no site de quem nunca abriu esta aba. Um versículo genérico inventado pela
  // plataforma seria pior que nenhum: é a única seção do site que fala em nome
  // da fé do casal.
  // Máximo de 6: o layout do protótipo é uma fileira de três cartões, e além
  // de duas fileiras a seção deixa de ser um respiro na página e vira um
  // capítulo próprio.
  storyMilestones: z.array(contentStoryMilestoneSchema).max(6).default([]),
  verse: contentVerseSchema.default({}),
  groomsmenManual: contentGroomsmenManualSchema.default({ palette: [] }),
})

export type WeddingContentConfigInput = z.infer<typeof weddingContentConfigSchema>

/** Shape completo de casamentos.config_conteudo como lido do banco — todo campo é opcional (ausente = usa o default de shared/wedding-content.ts). */
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
  /** Marcos da história. Vazio = a seção usa o texto corrido de `storyMessage`. */
  storyMilestones?: { label: string; title: string; text: string }[]
  /** Versículo/citação em faixa cheia. Sem texto, a seção não é renderizada. */
  verse?: { text?: string; reference?: string }
  /** Manual dos Padrinhos. Sem nenhum campo preenchido, a seção não é renderizada. */
  groomsmenManual?: {
    intro?: string
    attireGroomsmen?: string
    attireBridesmaids?: string
    palette?: { name: string; hex: string }[]
  }
}
