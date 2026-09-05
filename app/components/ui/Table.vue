<!--
  Wrapper fino de estilo — extraído depois de aparecer em 2 contextos reais
  (grupos e convidados, CLAUDE.md 23.2). Não abstrai ordenação/paginação:
  cada página continua controlando o que exibe, só a casca visual é
  compartilhada.

  Grade rolável com cabeçalho fixo, mesma mecânica do AdminTable: `.table-scroll`
  é o contêiner de rolagem, e o `sticky` do <thead> gruda no topo dele. As <th>
  vêm do slot `head` das páginas, então fundo e borda são aplicados daqui por
  seletor — é o único jeito de a casca garantir o contraste do cabeçalho fixo
  sem obrigar toda página a repetir as classes.
-->
<template>
  <div
    class="table-scroll break-words rounded-lg border border-border [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:border-b [&_thead_th]:border-border [&_thead_th]:bg-surface-muted"
  >
    <table class="w-full text-left text-sm">
      <thead class="text-text-muted">
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
