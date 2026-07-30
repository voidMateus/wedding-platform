<!--
  Wrapper fino de estilo — extraído depois de aparecer em 2 contextos reais
  (grupos e convidados, CLAUDE.md 23.2). Não abstrai ordenação/paginação:
  cada página continua controlando o que exibe, só a casca visual é
  compartilhada.
-->
<template>
  <div class="overflow-x-auto rounded-lg border border-border">
    <table class="w-full text-left text-sm">
      <thead class="bg-surface-muted text-text-muted">
        <tr>
          <slot name="head" />
        </tr>
      </thead>
      <tbody>
        <slot />
      </tbody>
    </table>
  </div>
</template>
