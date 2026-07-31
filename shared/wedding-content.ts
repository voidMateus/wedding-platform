// Copy fixo das novas seções editoriais do site público (Fase Editorial —
// CLAUDE.md, seção 22.3/32). Decisão explícita do usuário: por enquanto
// essas seções não têm tela de admin para o casal editar — o conteúdo vive
// aqui, centralizado, para facilitar a migração para colunas/tabelas
// editáveis quando essa fase futura existir (ver "Adiado" no plano da Fase
// Editorial). Nenhum texto aqui inventa fatos específicos sobre um casal
// real — é copy genérico de placeholder, do tipo que o casal reescreveria
// com a própria história assim que o admin de conteúdo existir.

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

export const GROOMSMEN_MANUAL_CONTENT: { intro: string; topics: ManualTopic[] } = {
  intro: 'Um guia rápido para quem vai estar ao nosso lado nos bastidores do grande dia.',
  topics: [
    {
      icon: 'lucide:door-open',
      title: 'Chegada',
      description: 'Pedimos a chegada com 1h de antecedência, para fotos e os últimos ajustes antes da cerimônia.',
    },
    {
      icon: 'lucide:calendar-check',
      title: 'Ensaio',
      description: 'Marcaremos um ensaio nos dias anteriores — a data será combinada diretamente com cada um.',
    },
    {
      icon: 'lucide:shirt',
      title: 'Traje',
      description: 'Alinharemos cor e estilo com antecedência, para tudo conversar com a nossa paleta.',
    },
    {
      icon: 'lucide:heart-handshake',
      title: 'No dia',
      description: 'Contamos com vocês para ajudar os convidados a se acomodarem e para deixar tudo mais leve.',
    },
  ],
}
