# Auditoria de UX/UI — Painel Administrativo (`/admin/{slug}`)

**Escopo:** componentes de `app/components/ui/` e `app/components/admin/`, páginas de
`app/pages/admin/[slug]/**`, mais o screenshot da tela de Planejamento fornecido na
conversa. **Método:** leitura de código (classes Tailwind, tokens de `main.css`,
`shared/utils/contrast.ts`) cruzada com a experiência visual reportada — não é uma
varredura automatizada de todas as telas renderizadas, é auditoria dirigida ao que o
código realmente produz.

**Contexto importante:** este projeto já tem um Design System maduro, com decisões de
contraste documentadas e testadas (`docs/DESIGN-SYSTEM.md`, `CLAUDE.md` §13,
`tests/unit/shared/utils/contrast.spec.ts`). A maioria dos achados abaixo **não é
violação do mínimo numérico da WCAG AA** — é o padrão mais chato de pegar: passa no
checker de contraste e ainda assim não se vê ou não se reconhece como clicável. Por
isso a auditoria foi ao código em vez de só rodar uma ferramenta de contraste.

---

## Resumo dos achados

| # | Severidade | Achado | Onde |
|---|---|---|---|
| 1 | 🔴 Alta | Sugestões de tarefa/despesa quase invisíveis | Planejamento, Financeiro |
| 2 | 🔴 Alta | Ícone de filtro/ordenação da tabela com contraste no limite e pouco visível | Toda tabela do admin |
| 3 | 🟡 Média | "ver todas (N)" estilizado como texto mudo, não como link | Planejamento |
| 4 | 🟡 Média | Botão de excluir sem rótulo acessível (leitor de tela só ouve "botão") | FAQ e Manual do Casamento (Configurações) |
| 5 | 🟢 Baixa | Validação de contraste da cor de grupo é só aviso, nunca bloqueia salvar | Grupos de convidados |
| 6 | 🟢 Baixa | Botão de fechar do Toast com opacidade reduzida sobre texto já colorido | Toast (plataforma inteira) |

---

## 1 — Sugestões de tarefa/despesa quase invisíveis 🔴

**Onde:** `app/components/admin/planning/PlanningTaskGroup.vue` (linhas 242–264) e
`app/components/admin/finance/FinanceCategoryExpenses.vue` (linhas ~241–257) — mesma
classe copiada nos dois arquivos.

**O que acontece:** os chips de sugestão (`+ Fechar a banda ou o DJ`, `+ Contratar a
decoração e as flores`) usam borda tracejada e não declaram cor de texto própria, então
herdam `text-text-muted` do contêiner pai:

```html
<div class="... text-xs text-text-muted">
  <span>Costuma entrar aqui:</span>
  <button class="rounded-md border border-dashed border-border px-2 py-0.5 ...">
    + {{ sugestao.titulo }}
  </button>
</div>
```

Texto cinza-claro (`#61616b`) sobre fundo cinza-claro (`#f4f4f6`), fonte pequena
(`text-xs`, 12px) e borda **tracejada** — que tem metade da presença visual de uma
borda sólida. Numericamente o texto passa (~5,6:1, acima do mínimo AA de 4,5:1), mas
nada ali diz "isto é clicável": sem preenchimento e sem contorno firme, o olho lê como
legenda solta, não como botão. É exatamente o relato do usuário ("quase não dá pra
ver") — confirmado no código, não só na percepção.

**Por que em dois lugares:** é a mesma classe Tailwind copiada e colada, sem um
componente compartilhado por trás — o próprio `CLAUDE.md` (§13, Governança do Design
System) proíbe estilo visual duplicado fora de `components/ui/`, e essa duplicata
escapou da regra.

**Recomendação:**
- Trocar borda tracejada por preenchimento sólido e leve (`bg-surface-elevated` ou
  `bg-primary/5`) — dá silhueta própria ao chip em vez de só um contorno fraco.
- Subir o texto do chip para `text-text` (reservando `text-text-muted` só para o rótulo
  estático "Costuma entrar aqui:", que é contexto, não ação).
- Acentuar o "+" em `text-primary` para reforçar "isto adiciona algo".
- Extrair um componente `SuggestionChip.vue` em `components/ui/` e usá-lo nos dois
  lugares, eliminando a duplicata.

Classe de referência:
```html
class="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-text
       transition-brand hover:border-primary/40 hover:bg-primary/5 hover:text-primary
       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
       focus-visible:outline-primary"
```

---

## 2 — Ícone de filtro/ordenação da tabela pouco visível 🔴

**Onde:** `app/components/admin/AdminTable.vue`, linhas ~285–296 (cabeçalho de
coluna, `PopoverTrigger`).

**O que acontece:** toda coluna filtrável/ordenável do admin tem um ícone de gatilho
(`lucide:filter` ou `lucide:chevron-down`, 14px) ao lado do nome da coluna. Quando o
filtro não está ativo, ele usa `text-text-muted/70` — o cinza já muted, ainda a 70% de
opacidade — sobre `bg-surface-elevated` (branco):

```html
:class="filters?.isActive(column.key) ? 'text-primary' : 'text-text-muted/70 hover:text-text'"
```

Contraste calculado: ~**3,17:1**. Isso está no limite mínimo para elemento **não
textual** (WCAG 1.4.11 exige 3:1 para componentes de interface), mas é um ícone de
14px, a menor unidade interativa da tela, e fica praticamente invisível até o hover —
que não existe em toque. Resultado prático: em toda tabela do admin (Convidados,
Financeiro, Presentes, Convites...) a maioria das pessoas nunca vai descobrir sozinha
que os cabeçalhos são clicáveis para filtrar/ordenar — é uma função central da tela
escondida atrás de um detalhe visual quase invisível.

**Recomendação:**
- Subir a opacidade/cor do estado inativo para pelo menos `text-text-muted` sem
  redução extra (sem o `/70`), ou testar `text-text-muted/90`.
- Considerar um indício adicional além da cor — por exemplo, o ícone sempre visível ao
  lado do rótulo (já é o caso), mas com peso visual mais próximo do texto do cabeçalho,
  já que ele representa uma ação, não uma decoração.
- Validar o novo valor em `shared/utils/contrast.ts`/teste equivalente, já que o padrão
  do projeto é nunca aceitar uma cor de estado sem essa checagem.

---

## 3 — "ver todas (N)" como texto mudo em vez de link 🟡

**Onde:** `app/components/admin/planning/PlanningTaskGroup.vue`, linha ~256–263 (mesmo
bloco do achado 1).

**O que acontece:** é um link de verdade (expande a lista de sugestões), mas está
estilizado como texto sublinhado dentro do mesmo `text-text-muted` do rodapé. Em
qualquer outro lugar da plataforma um link de ação usa `text-primary` — aqui ele se
camufla como se fosse só uma nota de rodapé.

**Recomendação:** `text-primary` no lugar de `text-text-muted`, mantendo o sublinhado.

---

## 4 — Botões de excluir sem rótulo acessível 🟡

**Onde:**
- `app/components/admin/AdminFaqItemsEditor.vue`, linha 44
- `app/components/admin/AdminManualTopicsEditor.vue`, linha 50

**O que acontece:** os dois só têm o ícone (`lucide:trash-2`), sem `aria-label`, `title`
nem texto `sr-only`:

```html
<UiButton type="button" size="sm" variant="ghost" @click="removeItem(index)">
  <Icon name="lucide:trash-2" class="h-4 w-4" />
</UiButton>
```

Um leitor de tela anuncia só "botão", sem dizer o que ele remove. Isso destoa do resto
da base: varri **todos** os `UiButton` só-ícone do admin (60+ ocorrências) e só esses
dois não têm rótulo — componentes irmãos como `AdminStoryMilestonesEditor.vue` e
`AdminPaletteEditor.vue` fazem a mesma ação com `aria-label="Remover marco"` /
`"Remover cor da paleta"`.

**Recomendação:** adicionar `aria-label="Remover pergunta"` e `aria-label="Remover
tópico"`, respectivamente. Considerar extrair um `UiIconButton` que exija `label` como
prop obrigatória (nos moldes do `AdminRowAction.vue`, que já faz isso certo para ações
de linha de tabela), para essa classe de erro parar de depender de revisão manual.

---

## 5 — Validação de contraste da cor de grupo é só aviso 🟢

**Onde:** `app/pages/admin/[slug]/grupos/index.vue`.

**O que acontece:** ao escolher uma cor customizada para um grupo de convidados, a tela
mostra "Contraste: X:1 (insuficiente)" em vermelho, mas **não impede salvar** com
contraste insuficiente. A cor primária/secundária do tema, por outro lado, é validada
por contraste no schema antes de salvar (`CLAUDE.md` §13).

**Recomendação:** não é necessariamente um bug — pode ser intencional, já que a cor do
grupo talvez só apareça como pastilha decorativa, nunca como texto. Mas hoje a
assimetria não está documentada em nenhum lugar, e lê como esquecimento. Ou bloquear
como as demais cores customizáveis, ou comentar no código por que a regra é diferente
aqui.

---

## 6 — Botão de fechar do Toast com opacidade reduzida sobre texto colorido 🟢

**Onde:** `app/components/ui/Toast.vue`.

**O que acontece:** o "×" de fechar usa `text-current opacity-60`. Num toast de
sucesso/erro/aviso, `text-current` herda a cor de estado (`text-success`, `text-danger`
etc.), e a opacidade de 60% reduz ainda mais o contraste desse glifo específico — não
o suficiente para ser um problema sério (já tem `aria-label="Fechar"`, e o "×" é
redundante com o gesto de fechar o toast automaticamente), mas vale considerar subir
para `opacity-75` ou usar `text-text-muted` fixo em vez de herdar a cor do estado.

---

## Observações finais (sem ação necessária, mas dignas de nota)

- **Reduzir de propósito o "está tudo bem" para não mascarar problema real:** o resto
  do Design System — badges de status, foco visível em teclado, mapa de assentos com
  navegação por teclado, tokens de cor documentados com a matemática de contraste —
  está genuinamente acima da média para esse tipo de painel. Os achados acima são
  pontuais, não sintoma de uma base desorganizada.
- Nenhuma cor "crua" do Tailwind (`bg-red-500` etc.) foi encontrada fora de
  `components/ui/` — a governança de tokens está sendo seguida à risca.
