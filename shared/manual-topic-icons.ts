// Catálogo fixo de ícones disponíveis para tópicos do Manual dos Convidados
// (CLAUDE.md, roadmap "Fase Mensagens Personalizáveis") — o casal escolhe o
// ícone de cada tópico (inclusive os que adicionar) a partir desta lista
// curada, nunca um ícone livre. Os 4 tópicos padrão de
// GUEST_MANUAL_CONTENT.topics já usam os 4 primeiros valores abaixo.

export interface ManualTopicIconOption {
  icon: string
  label: string
}

export const MANUAL_TOPIC_ICON_CATALOG: ManualTopicIconOption[] = [
  { icon: 'lucide:bed', label: 'Hospedagem' },
  { icon: 'lucide:car', label: 'Transporte' },
  { icon: 'lucide:shirt', label: 'Traje' },
  { icon: 'lucide:clock', label: 'Horário' },
  { icon: 'lucide:map-pin', label: 'Localização' },
  { icon: 'lucide:phone', label: 'Contato' },
  { icon: 'lucide:utensils', label: 'Alimentação' },
  { icon: 'lucide:info', label: 'Informação geral' },
]

export const MANUAL_TOPIC_ICON_VALUES = new Set(MANUAL_TOPIC_ICON_CATALOG.map((option) => option.icon))
