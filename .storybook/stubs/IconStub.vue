<!--
  Substituto do `<Icon>` do @nuxt/icon dentro do Storybook.

  O componente real resolve o ícone pelo módulo do Nuxt (bundle de servidor da
  coleção `lucide`), que não existe fora de uma app Nuxt. Este aqui desenha um
  quadrado arredondado em `currentColor` — o bastante para o story mostrar que
  há um ícone ali, sem prometer QUAL.

  Para a varredura do axe o que importa é o contrato acessível, e ele é o mesmo
  do componente real: `aria-hidden`, sem texto e sem papel. É isso que faz um
  botão só de ícone continuar reprovando em `button-name` aqui — que é
  exatamente o achado que a vitrine deve produzir.

  Quem for ler um story para avaliar DESENHO precisa saber: a forma do ícone é
  falsa, o espaço que ele ocupa é real (a classe de tamanho passa por
  fallthrough).
-->
<template>
  <span
    aria-hidden="true"
    class="inline-block shrink-0 rounded-[3px] border-[1.5px] border-current opacity-70"
  />
</template>
