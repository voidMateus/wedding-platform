<script setup lang="ts">
// Spray botânico alto e "aéreo" (estilo mosquitinho/flor seca) para as
// laterais do Hero — quase imperceptível por intenção (o consumidor aplica
// opacidade baixa via text-secondary/NN). Puramente decorativo (aria-hidden),
// exibição condicionada a theme_config.showHeroBotanicals.
</script>

<template>
  <svg viewBox="0 0 220 560" fill="none" aria-hidden="true">
    <g stroke="currentColor" stroke-width="1.1" stroke-linecap="round">
      <path d="M120 560 C 112 460 96 380 64 300" />
      <path d="M124 560 C 124 450 138 360 168 292" />
      <path d="M118 560 C 108 440 104 360 118 268" />
      <path d="M64 300 C 56 278 44 260 30 246" />
      <path d="M64 300 C 66 272 62 250 52 228" />
      <path d="M168 292 C 176 268 188 252 200 240" />
      <path d="M168 292 C 164 264 168 240 178 218" />
      <path d="M118 268 C 112 246 112 226 120 204" />
      <path d="M118 268 C 124 244 132 228 146 212" />
    </g>
    <g fill="currentColor" fill-opacity="0.8">
      <circle cx="30" cy="246" r="2.2" /><circle cx="24" cy="238" r="2" /><circle cx="36" cy="236" r="2" /><circle cx="28" cy="228" r="1.7" />
      <circle cx="52" cy="228" r="2.2" /><circle cx="46" cy="218" r="2" /><circle cx="58" cy="218" r="2" /><circle cx="50" cy="210" r="1.7" />
      <circle cx="200" cy="240" r="2.2" /><circle cx="206" cy="230" r="2" /><circle cx="194" cy="230" r="2" /><circle cx="202" cy="222" r="1.7" />
      <circle cx="178" cy="218" r="2.2" /><circle cx="172" cy="208" r="2" /><circle cx="184" cy="208" r="2" /><circle cx="176" cy="200" r="1.7" />
      <circle cx="120" cy="204" r="2.2" /><circle cx="114" cy="194" r="2" /><circle cx="126" cy="194" r="2" /><circle cx="118" cy="186" r="1.7" />
      <circle cx="146" cy="212" r="2.2" /><circle cx="152" cy="202" r="2" /><circle cx="140" cy="204" r="2" /><circle cx="148" cy="194" r="1.7" />
    </g>
  </svg>
</template>
