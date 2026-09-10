<!--
  Os campos de UMA pessoa — o convidado responsável e cada acompanhante usam
  este mesmo formulário, porque acompanhante é uma linha de `convidados` como
  qualquer outra e nunca herda nada do responsável.

  Em dois blocos, e essa divisão é a ideia central do cadastro: em cima o que a
  lista precisa para a pessoa existir (nome, categoria, grupo), e atrás de
  "Mais detalhes" o que só importa quando importa (apelido, contato, sexo,
  papel, observações). Antes eram doze campos abertos de uma vez, e cadastrar
  alguém de quem só se sabe o nome pedia a mesma atenção de um padrinho com
  e-mail e telefone.

  O bloco recolhido abre sozinho quando QUALQUER campo dele já tem valor: em
  edição, esconder um e-mail cadastrado atrás de um clique faria a tela mentir
  sobre o que está no banco.
-->
<script setup lang="ts">
import type { GuestPersonInput } from '#shared/schemas/guests'
import type { Group } from '~/types/group'

interface Props {
  modelValue: GuestPersonInput
  groupOptions: Array<{ value: string; label: string }>
  /** Mostra o erro "obrigatório" no campo de nome (o pai decide quando validar). */
  fullNameError?: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: GuestPersonInput]
  'group-created': [group: Group]
}>()

function update<K extends keyof GuestPersonInput>(key: K, value: GuestPersonInput[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

const sexOptions = [
  { value: 'feminino', label: 'Feminino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'outro', label: 'Outro' },
]

const weddingRoleOptions = [
  { value: '', label: 'Nenhum' },
  { value: 'padrinho', label: 'Padrinho' },
  { value: 'madrinha', label: 'Madrinha' },
]

// Data de nascimento e faixa etária respondem à mesma pergunta, com
// precedência: a data, quando existe, sempre vence a faixa informada à mão.
// Mas nenhuma das duas é obrigatória — o casal quase nunca sabe a data de
// nascimento de todos os convidados, e "sei que ele é adulto" precisa ser
// suficiente para concluir o cadastro (CLAUDE.md, seção 12).
const { classify, manualOptions } = useAgeGroups()

const classificacao = computed(() =>
  classify({
    data_nascimento: props.modelValue.dataNascimento || null,
    faixa_etaria_manual: props.modelValue.faixaEtariaManual || null,
  }),
)

/** Com data de nascimento, a faixa é calculada e as pílulas não competem com ela. */
const isCalculada = computed(() => classificacao.value.origem === 'calculada')

/**
 * Só as faixas do vocabulário — "não informada" NÃO é uma pílula.
 *
 * Ela é a ausência das outras, e como pílula ficava marcada por padrão: o
 * elemento de maior peso visual da tela, preenchido na cor primária, anunciando
 * que não se sabe nada. Sem pílula nenhuma marcada, a tela começa quieta, e
 * desmarcar é o "limpar" que aparece só depois de haver o que limpar.
 *
 * `manualOptions` já traz só as faixas ativas do evento, então desligar uma
 * faixa em Configurações a remove daqui sozinho.
 */
const opcoesDeCategoria = manualOptions

/**
 * Sempre a faixa que a classificação resolveu, nunca o valor cru guardado.
 *
 * Cobre os dois desencontros possíveis. Com data de nascimento, a faixa é
 * calculada e marcar o valor manual diria o oposto do que o sistema faz. Sem
 * data, um valor manual de faixa DESLIGADA não tem pílula para marcar — e
 * `classificarFaixaEtaria` já devolve a faixa que herdou o território dele, que
 * é o que todas as outras telas exibem.
 *
 * Nos dois casos `faixa_etaria_manual` continua gravado intacto: mostrar o
 * equivalente é leitura, e só uma escolha explícita do casal grava algo
 * (CLAUDE.md, seção 12).
 */
const categoriaSelecionada = computed(() => classificacao.value.chave ?? '')

const nascimentoId = useId()

// Contato é recomendação, nunca bloqueio: parte da lista chega só por convite
// físico e precisa poder ser cadastrada sem e-mail nem telefone
// (docs/PRODUCT.md, seção 3.3). Por isso vira `hint`, não `error`.
const semContato = computed(() => !props.modelValue.email && !props.modelValue.telefone)

const detalhesAbertos = ref(
  Boolean(
    props.modelValue.apelido ||
    props.modelValue.email ||
    props.modelValue.telefone ||
    props.modelValue.sexo ||
    props.modelValue.papelCasamento ||
    props.modelValue.observacoes,
  ),
)
const detalhesId = useId()

// Criar um grupo sem sair do cadastro do convidado (CLAUDE.md, seção 12.1) —
// evita o casal precisar ir em Grupos cadastrar tudo antes de começar.
const { createGroup } = useGroups()
const isCreatingGroup = ref(false)
const newGroupName = ref('')
const isSavingGroup = ref(false)

function openCreateGroup() {
  newGroupName.value = ''
  isCreatingGroup.value = true
}

async function handleCreateGroup() {
  const name = newGroupName.value.trim()
  if (!name) return
  isSavingGroup.value = true
  try {
    const group = await createGroup({ nome: name })
    update('grupoId', group.id)
    emit('group-created', group)
    isCreatingGroup.value = false
  } finally {
    isSavingGroup.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UiInput
      :model-value="modelValue.nomeCompleto"
      label="Nome completo"
      placeholder="Como o nome sai no convite"
      :error="fullNameError ?? undefined"
      @update:model-value="update('nomeCompleto', $event)"
    />

    <!--
      Data de nascimento ANTES da categoria, e SEMPRE visível: é a ordem da
      regra de precedência (uma data válida sempre vence a pílula escolhida à
      mão), então ler de cima para baixo descreve o que o sistema faz. Atrás de
      um atalho, como esteve, a tela escondia justamente o campo que manda na
      classificação.

      Opcional dito no rótulo, não subentendido: o casal quase nunca sabe a data
      de nascimento de todos os convidados, e a pílula existe exatamente para
      quem só sabe "é adulto" (CLAUDE.md, seção 12).
    -->
    <div class="flex flex-col gap-1.5">
      <label class="text-sm font-medium text-text" :for="nascimentoId">
        Data de nascimento
        <span class="font-normal text-text-muted">(opcional)</span>
      </label>
      <input
        :id="nascimentoId"
        type="date"
        :value="modelValue.dataNascimento"
        class="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-48"
        @change="update('dataNascimento', ($event.target as HTMLInputElement).value)"
      />
      <!-- Idade e classificação são sempre derivadas (idade na data do evento x
           faixas do evento) — exibidas, nunca gravadas. -->
      <p
        v-if="classificacao.idadeNoEvento !== null"
        class="text-xs leading-relaxed text-text-muted"
      >
        <span class="num font-medium text-text">{{ classificacao.idadeNoEvento }}</span>
        {{ classificacao.idadeNoEvento === 1 ? 'ano' : 'anos' }} na data do casamento
      </p>
      <p v-else class="text-xs leading-relaxed text-text-muted">
        Com a data, a categoria passa a ser calculada.
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <UiRadioGroup
        :model-value="categoriaSelecionada"
        label="Categoria"
        layout="inline"
        :options="opcoesDeCategoria"
        :disabled="isCalculada"
        :hint="isCalculada ? 'Calculada pela data de nascimento.' : undefined"
        @update:model-value="
          update('faixaEtariaManual', $event as GuestPersonInput['faixaEtariaManual'])
        "
      />

      <button
        v-if="modelValue.faixaEtariaManual && !isCalculada"
        type="button"
        class="self-start text-xs text-text-muted hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        @click="update('faixaEtariaManual', undefined)"
      >
        Limpar categoria
      </button>
    </div>

    <div class="flex flex-col gap-1">
      <UiSelect
        :model-value="modelValue.grupoId"
        label="Grupo"
        placeholder="Sem grupo"
        :options="groupOptions"
        @update:model-value="update('grupoId', $event)"
      />
      <button
        v-if="!isCreatingGroup"
        type="button"
        class="self-start text-xs text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        @click="openCreateGroup"
      >
        + Criar novo grupo
      </button>
      <div v-else class="flex items-center gap-2">
        <UiInput
          v-model="newGroupName"
          placeholder="Nome do novo grupo"
          class="flex-1"
          @keyup.enter="handleCreateGroup"
        />
        <UiButton type="button" size="sm" :disabled="isSavingGroup" @click="handleCreateGroup">
          Criar
        </UiButton>
        <UiButton type="button" size="sm" variant="ghost" @click="isCreatingGroup = false">
          Cancelar
        </UiButton>
      </div>
    </div>

    <div class="border-t border-border pt-3">
      <button
        type="button"
        class="flex items-center gap-1.5 text-sm text-text-muted transition-brand hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :aria-expanded="detalhesAbertos"
        :aria-controls="detalhesId"
        @click="detalhesAbertos = !detalhesAbertos"
      >
        <Icon
          name="lucide:chevron-right"
          class="h-4 w-4 transition-transform"
          :class="detalhesAbertos ? 'rotate-90' : ''"
          aria-hidden="true"
        />
        Mais detalhes
        <span class="hidden text-xs sm:inline">
          apelido, contato, padrinho/madrinha, observações
        </span>
      </button>

      <div v-show="detalhesAbertos" :id="detalhesId" class="mt-4 flex flex-col gap-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <UiInput
            :model-value="modelValue.apelido"
            label="Apelido"
            @update:model-value="update('apelido', $event)"
          />
          <UiSelect
            :model-value="modelValue.papelCasamento"
            label="Padrinho/Madrinha"
            :options="weddingRoleOptions"
            @update:model-value="
              update('papelCasamento', $event as GuestPersonInput['papelCasamento'])
            "
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <UiInput
            :model-value="modelValue.email"
            label="E-mail"
            type="email"
            placeholder="convidado@email.com"
            :hint="semContato ? 'Ao menos um canal facilita enviar o convite.' : undefined"
            @update:model-value="update('email', $event)"
          />
          <UiInput
            :model-value="modelValue.telefone"
            label="Telefone"
            type="tel"
            placeholder="(11) 91234-5678"
            @update:model-value="update('telefone', $event)"
          />
        </div>

        <UiSelect
          :model-value="modelValue.sexo"
          label="Sexo"
          placeholder="Não informar"
          :options="sexOptions"
          @update:model-value="update('sexo', $event as GuestPersonInput['sexo'])"
        />

        <UiTextarea
          :model-value="modelValue.observacoes"
          label="Observações internas"
          placeholder="Nunca exibidas ao convidado"
          @update:model-value="update('observacoes', $event)"
        />
      </div>
    </div>
  </div>
</template>
