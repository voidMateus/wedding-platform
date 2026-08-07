// Divide um texto livre (ex.: mensagem de boas-vindas/história, CLAUDE.md
// roadmap "Fase Mensagens Personalizáveis") em parágrafos, usando linha em
// branco como separador — mesma convenção informal de markdown/e-mail.
// Texto sem nenhuma linha em branco vira um único parágrafo, nunca quebra.
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
}
