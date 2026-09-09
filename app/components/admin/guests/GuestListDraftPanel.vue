<!--
  O rascunho da lista ("Em consideração") — quem está no planejamento sem ser
  convidado.

  Painel próprio, abaixo da lista, e não uma coluna à direita: com a navegação
  do admin, o menu da seção e uma tabela de oito colunas na mesma tela, uma
  quarta coluna espremia a tabela até as colunas saírem de vista. Aqui o
  rascunho é uma faixa horizontal que aproveita a largura toda.
-->
<script setup lang="ts">
interface PessoaEmConsideracao {
  id: string
  nome_completo: string
}

interface Props {
  pessoas: readonly PessoaEmConsideracao[]
}

const { pessoas } = defineProps<Props>()

function iniciais(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : ''
  return (primeira + ultima).toLocaleUpperCase('pt-BR')
}
</script>

<template>
  <AdminPanel
    title="Rascunho da lista"
    :meta="`${pessoas.length} ${pessoas.length === 1 ? 'pessoa' : 'pessoas'}`"
  >
    <div class="flex flex-col gap-3 px-4 py-4 sm:px-5">
      <p class="text-xs leading-relaxed text-text-muted">
        Pessoas que ainda não foram definidas como convidadas. Não entram em nenhuma contagem, não
        recebem convite e não aparecem no site do casamento.
      </p>

      <ul class="flex flex-wrap gap-2">
        <li
          v-for="pessoa in pessoas"
          :key="pessoa.id"
          class="flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-sm"
        >
          <span
            aria-hidden="true"
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-medium text-text-muted"
          >
            {{ iniciais(pessoa.nome_completo) }}
          </span>
          <span class="min-w-0 truncate text-text">{{ pessoa.nome_completo }}</span>
        </li>
      </ul>
    </div>
  </AdminPanel>
</template>
