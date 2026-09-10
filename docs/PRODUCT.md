# Especificação de Produto — MeuSiteCasamento

> Visão de produto, personas e regras de negócio dos sistemas de Convidados, RSVP, Convites/Grupos, Presentes e Administração. Para como esses fluxos são implementados tecnicamente (rotas, funções Postgres, fluxo de requisição), ver [`ARCHITECTURE.md`](ARCHITECTURE.md). Para o modelo de dados subjacente, ver [`DATABASE.md`](DATABASE.md). Em caso de conflito, [`CLAUDE.md`](../CLAUDE.md) prevalece.

---

## 1. Visão Geral do Produto

O **MeuSiteCasamento** é uma aplicação web voltada para casais que estão organizando seu casamento e precisam de uma ferramenta central para:

- Publicar um site de casamento personalizado (história do casal, data, local, cronograma do evento, galeria de fotos).
- Gerenciar a lista de convidados de forma estruturada, incluindo grupos familiares e acompanhantes.
- Coletar confirmações de presença (RSVP) com suporte a número de acompanhantes e mensagens.
- Disponibilizar uma lista de presentes (física, digital ou "cota" para lua de mel) com controle de reservas para evitar duplicidade.
- Fornecer um painel administrativo para os noivos (ou um planejador de casamentos contratado) acompanharem métricas de confirmação, presentes e comunicação com convidados.

O produto nasce como uma aplicação de uso único por casamento (single-tenant, uso por evento), mas é desenhado desde o início para evoluir para um modelo **multi-tenant SaaS**, onde múltiplos casais podem criar suas próprias instâncias de forma independente (ver [`ROADMAP.md`](ROADMAP.md)).

### 1.1 Personas

| Persona | Descrição | Necessidades principais |
|---|---|---|
| **Noivo(a) / Casal** | Dono(a) da conta, administra o evento | Configurar site, gerenciar convidados, acompanhar RSVPs e presentes |
| **Convidado** | Recebe o convite e acessa o site público | Ver informações do evento, confirmar presença, escolher presente |
| **Colaborador/Família** | Auxilia o casal na organização (ex: mãe da noiva) | Acesso limitado ao painel administrativo (permissões) |
| **Planejador de Casamento** | Profissional contratado, pode gerenciar múltiplos eventos | Visão consolidada de múltiplos casamentos — **papel futuro, ainda não implementado (Fase 5, ver [`ROADMAP.md`](ROADMAP.md))** |

### 1.1.1 Tipos de usuário/acesso — estado atual da implementação

A tabela acima descreve personas de produto; esta detalha como cada uma delas (e algumas que não são "persona" no sentido de produto) é implementada e isolada tecnicamente hoje. Fonte de verdade complementar: [`CLAUDE.md`](../CLAUDE.md) seção 4.2 ("Modelo de Confiança por Fluxo"), que descreve os mesmos tipos organizados por caminho/rota em vez de por identidade — os dois devem ser mantidos consistentes.

| Tipo | Quem é | Como acessa | Isolamento/autorização | Onde vive no banco |
|---|---|---|---|---|
| **Dono de casamento** | O casal (ou quem administra aquele evento específico) | Login (e-mail/senha ou link mágico) → `/admin/{slug}/**` | RLS por `casamento_id` | `membros_casamento.papel = 'dono'` |
| **Colaborador de casamento** | Alguém convidado pelo dono pra ajudar naquele evento específico | Mesmo login → `/admin/{slug}/**` | RLS por `casamento_id` — não pode gerenciar outros colaboradores nem excluir o casamento | `membros_casamento.papel = 'colaborador'` |
| **Operador de plataforma** | Equipe interna do produto (não é casal/colaborador de nenhum casamento) | Mesmo login → `/plataforma` (visão entre todos os tenants) | Não é RLS — é `service_role` + checagem em código (`requirePlatformOperator()`). Acesso binário, sem sub-níveis (não existe "dono da plataforma") | `operadores_plataforma` |
| **Convidado (RSVP)** | Quem foi convidado pra um casamento | Link/QR (token) ou busca por nome (sem login) | Token opaco na leitura; sessão `rsvp_session` na mutação | Sem conta — não é `auth.users` |
| **Visitante público** | Qualquer pessoa | Direto em `/{slug}` (site do casamento) ou vitrine de presentes | Nenhuma — RLS de leitura pública em tabelas sem dado sensível | Sem conta |

Pontos que geram confusão se não forem lidos com atenção:
- **Dono/colaborador é sempre por casamento, nunca global.** A mesma conta pode ser dono de um casamento e colaborador de outro simultaneamente — `papel` é uma coluna de `membros_casamento`, uma linha por vínculo, não um atributo da conta.
- **Operador de plataforma é um papel completamente separado** dos dois de cima, checado numa tabela diferente (`operadores_plataforma`, sem `casamento_id`). Uma conta pode acumular os dois ao mesmo tempo (ex.: dono de um casamento *e* operador de plataforma), mas são checagens independentes — nenhuma dá a outra automaticamente.
- Hoje **não existe hierarquia dentro dos operadores de plataforma** (sem "dono"/"admin" vs "operador comum") — presença na tabela `operadores_plataforma` já dá o acesso completo ao painel `/plataforma`, que por sua vez é só leitura (ver [`PLANO-SAAS.md`](PLANO-SAAS.md), Passo 8).

### 1.2 Proposta de Valor

- **Centralização**: substitui planilhas soltas, grupos de WhatsApp e formulários avulsos por uma única fonte de verdade.
- **Simplicidade para o convidado**: RSVP em poucos cliques, sem necessidade de criar conta.
- **Clareza para o casal**: dashboard com números reais de confirmados, pendentes e presentes reservados.
- **Personalização visual**: cada casal pode aplicar sua identidade visual (cores, fontes, fotos) dentro de um Design System consistente (ver [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md)).

## 2. Objetivos do Projeto

### 2.1 Objetivos de Produto

1. Permitir que um casal configure um site de casamento funcional em menos de 30 minutos.
2. Reduzir a taxa de não-resposta de convidados através de lembretes e UX de RSVP simplificada.
3. Eliminar presentes duplicados através de reservas em tempo real.
4. Fornecer visibilidade total do status do evento (confirmados, grupos, presentes) em um único painel.
5. Garantir que o site público funcione perfeitamente em dispositivos móveis, já que a maioria dos convidados acessará via link enviado por WhatsApp.

### 2.2 Objetivos Técnicos

1. Base de código tipada de ponta a ponta (TypeScript estrito, sem `any` implícito).
2. Arquitetura que permita evoluir de single-tenant para multi-tenant sem reescrita completa.
3. Modelagem de banco de dados normalizada, com integridade referencial garantida via constraints, não apenas via aplicação.
4. Cobertura de testes automatizados crescente, priorizando fluxos críticos (RSVP, reserva de presentes, autenticação).
5. Performance de carregamento do site público competitiva (LCP < 2.5s em 4G) por ser a principal porta de entrada de convidados.
6. Segurança adequada ao tratar dados pessoais de convidados (nome, telefone, e-mail).

### 2.3 Não-objetivos (nesta fase)

- Não construir um app mobile nativo.
- ~~Não implementar pagamentos/gateway financeiro para presentes em dinheiro~~ — superado na "Fase Presentes 2.0" (seção 6), decisão explícita do usuário: pagamento Pix real via InfinitePay, apesar do não-objetivo original desta seção. Relatórios financeiros completos (taxas, estornos, exportação) continuam fora de escopo.
- Não suportar múltiplos idiomas na v1 (i18n é item de roadmap).
- Não implementar múltiplos tenants/contas na v1 (arquitetura já prepara terreno, mas não é exposta ao usuário).

## 3. Sistema de Convidados

### 3.1 Conceito

Convidados (`convidados`) são sempre vinculados a um `convite` (a unidade real de RSVP) para poder responder — o vínculo pode ficar pendente até ser resolvido (o cadastro oferece criar o convite, mas não obriga). Independentemente disso, um convidado pode opcionalmente ter uma etiqueta livre (`grupo`, ex. "Família da Noiva") e pertencer a um agrupamento de Acompanhantes (`nucleos_acompanhantes`) — os três vínculos (`convite_id`, `grupo_id`, `nucleo_id`) são independentes entre si (ver [`DATABASE.md`](DATABASE.md)).

**Rascunho da lista (`em_consideracao`).** Uma lista de casamento não nasce pronta: "será que convidamos o Marcelo?" é o estado mais comum durante o planejamento, e obrigar o casal a decidir na hora do cadastro é o que empurra a lista para o Excel. Uma pessoa marcada como *em consideração* existe no planejamento sem ser convidada — **não conta** em nenhum indicador de convidados, não pode receber convite e portanto nunca entra em RSVP nem aparece na busca pública por nome. Virar convidado de verdade é ação explícita do casal, nunca efeito colateral de preencher outro campo. Detalhe da garantia: [`DATABASE.md`](DATABASE.md), seção 3.2.

### 3.1.1 Duas formas de trabalhar: Visão Geral e Modo lista

A gestão de uma lista de casamento tem duas fases com necessidades opostas, e uma tela só atende mal as duas. No começo o casal não está *cadastrando convidados* — está **montando uma lista**, e faz isso no Excel porque a planilha deixa despejar dezenas de nomes, reorganizar e refinar aos poucos. Depois, com a lista formada, o trabalho passa a ser gerenciar pessoa por pessoa (convite, RSVP, acompanhantes).

- **Visão Geral** (`/convidados`) é a experiência tradicional: listagem paginada, uma linha por convidado, recorte feito pelo servidor. É onde se administra o convidado individual.
- **Modo lista** (`/convidados/lista`) é a planilha inteligente: carrega a lista **inteira**, agrupa em blocos recolhíveis por grupo e subdivisão, e filtra sem ida ao servidor. É onde se monta e se organiza o conjunto.

Não existem "convidados do Modo Lista" e "convidados normais" — é **um cadastro só**, apresentado de duas formas. O que muda é a pergunta que cada tela responde: "quem é esta pessoa?" contra "como está a minha lista?".

Consequências de desenho que decorrem disso:

- **A contagem do bloco de um grupo soma as subdivisões.** O convidado aponta sempre para a folha (`convidados.grupo_id`), então sem a soma "Família do Mateus" anunciaria uma pessoa com trinta e duas abaixo. Recolher o grupo recolhe a árvore, e o cabeçalho continua exibindo a contagem cheia — é por ele que se reabre.
- **Grupo vazio continua aparecendo** quando não há filtro: ele existe, e é onde o casal vai querer adicionar gente. Com filtro ativo, bloco sem ninguém sai da lista, senão o recorte viraria uma parede de grupos vazios escondendo os poucos que casaram.
- **O núcleo de Acompanhantes é identificado por um rótulo derivado** ("João e Maria"), os dois primeiros nomes por ordem no núcleo com o excedente resumido. `nucleos_acompanhantes` não tem nome gravado, e não deveria ter: o núcleo é o agrupamento das pessoas, então batizá-lo à mão criaria um dado que envelhece sozinho quando alguém sai.
- **Os números do cabeçalho descrevem a lista inteira**, nunca o recorte — "quantos convidados eu tenho" não muda porque um filtro está aplicado. O que o filtro descreve é o "N exibidas" do painel.

### 3.2 Funcionalidades previstas

- Cadastro de convidado via wizard (dados pessoais, Acompanhantes, vínculo com convite) — persistência em lote numa única transação (`sincronizar_nucleo_convidado()`).
- **Modo lista**: a lista inteira agrupada em blocos recolhíveis por grupo e subdivisão, com busca, filtro por núcleo/categoria/RSVP e contagem por categoria — ver seção 3.1.1.
- Entrada rápida (`POST /api/guests`): cria um convidado com **só o nome**, para montar a lista digitando em sequência sem abrir formulário. Caminho deliberadamente separado do wizard — não orquestra acompanhante, convite nem limite algum, e é o que mantém o "digitar e apertar Enter" instantâneo. O resto do cadastro é preenchido depois.
- Perfil do convidado: apelido, sexo, data de nascimento (opcional), faixa etária (opcional, informada à mão), e-mail e telefone (opcionais), foto, papel de padrinho/madrinha, observações internas.
- Importação em massa (CSV) em três passos — arquivo, conferência das colunas, revisão — sem escrever nada antes do último (ver seção 3.5).
- Gerador de modelo de planilha — o casal escolhe as colunas e o sistema monta o CSV compatível com o importador (ver seção 3.5).
- Exportação em CSV do **recorte que está na tela** (mesmos filtros de nome, grupo e faixa etária da listagem), com as colunas exportáveis do catálogo (ver seção 3.5).
- Contato (e-mail/telefone) editável no cadastro do convidado, para o principal e para cada acompanhante — cada pessoa tem o próprio, nunca herdado de quem responde pelo convite.
- Classificação etária do convidado (Criança/Adolescente/Adulto/Idoso) para contagem de "lugares" e organização da lista — derivada, com **quais faixas** e limites configuráveis por evento; ver seção 3.4.
- Soft delete de convidados (remoção lógica, preservando histórico de RSVP/presentes associados).
- Busca e filtro por nome (tolerante a acentuação/ordem/apelido — `convidado_nome_corresponde`), convite, status de RSVP, grupo e faixa etária.
- Na lista do admin, cada recorte é o filtro da própria coluna (nome, status de RSVP, faixa etária, grupo), e status/faixa/grupo aceitam **mais de um valor ao mesmo tempo** — "quem ainda não respondeu ou está em espera" é uma pergunta só do casal, não duas. O status de cada convidado aparece na própria linha, e "pendente" inclui quem nunca respondeu (não é valor gravado; ver `convidados_com_status` em [`DATABASE.md`](DATABASE.md)).

### 3.3 Regras de negócio

- Um convidado só consegue responder RSVP depois de vinculado a um convite (`convite_id`); antes disso, existe no cadastro mas fica fora do fluxo de RSVP.
- Alterar o convite/etiqueta/grupo de Acompanhantes de um convidado não apaga suas respostas de RSVP anteriores (histórico preservado).
- E-mail/telefone não são obrigatórios (alguns convidados só têm envio de convite físico), mas ao menos um canal de contato é recomendado pela UI (aviso, não bloqueio).

### 3.4 Classificação etária

**O princípio:** a data de nascimento pertence ao convidado; a regra de classificação pertence ao evento. "Criança" não é uma característica da pessoa — é o resultado de aplicar as faixas *deste* casamento à idade que a pessoa terá *na data dele*. Nenhuma classificação é gravada em `convidados` (ver [`CLAUDE.md`](../CLAUDE.md) seção 12).

Três conceitos distintos, nessa ordem:

| Conceito | Onde vive | Natureza |
|---|---|---|
| Data de nascimento | `convidados.data_nascimento` (opcional) | Informação do convidado |
| Idade no evento | calculada (`calcularIdadeNaData`) | Derivada — nunca persistida |
| Classificação etária | calculada (`classificarFaixaEtaria`) | Derivada das faixas do evento |

**Por que não é uma propriedade fixa do convidado:** a definição de "criança" não é universal e varia por evento — um casamento considera criança até 7 anos, outro até 11. Gravar "João é criança" impediria que o mesmo João fosse adolescente num evento com limites diferentes.

**Configuração (Configurações → Geral → Classificação etária).** O casal escolhe **quais** faixas o casamento usa, do catálogo de quatro — Criança, Adolescente, Adulto, Idoso — e até que idade cada uma vai. O padrão de um evento novo é 0–11 / 12–17 / 18–59 / 60+, apenas um ponto de partida. Há ação de "Restaurar classificação padrão".

**Nem toda festa separa em quatro** (pedido do usuário em 2026-09-09): muitas querem só "criança" e "adulto". Desmarcar uma faixa a remove do evento, e a configuração é o próprio conjunto de faixas ativas — faixa desligada é faixa ausente do array, sem um campo "ativa" a mais.

**Desligar não é só remover: a vizinha mais nova herda o território.** Desligar Adolescente estende Criança até 17; desligar Idoso deixa Adulto aberto no topo. É o que preserva o invariante do modelo — as faixas ativas cobrem de 0 a ∞, contínuas, sem sobreposição e sem buraco, com a última sempre aberta —, validado no schema independentemente de quantas faixas sobraram. Sem a herança, um convidado de 14 anos deixaria de casar com faixa alguma e viraria "não informada" em silêncio, na lista inteira. Duas consequências da regra: a primeira faixa ativa não desliga (alguém tem de cobrir a idade 0) e o mínimo é duas (com uma só, todo convidado recebe o mesmo rótulo e a classificação deixa de classificar). Ligar uma faixa de volta devolve o corte padrão dela.

**A marcação manual de uma faixa desligada não é reescrita.** Desligar é configuração do evento, não edição do cadastro das pessoas: `convidados.faixa_etaria_manual` fica intacto e a *leitura* se adapta — um "adolescente" num evento sem adolescentes é lido como a faixa que herdou o território dele (`faixaAtivaEquivalente`). Religar a faixa devolve a marcação original, sem ninguém ter que reclassificar a lista.

**Regra de prioridade.** Com `data_nascimento` preenchida, a faixa é *calculada* (idade na data do evento × faixas do evento). Sem ela, vale a faixa informada à mão (`faixa_etaria_manual`). Sem nenhuma das duas, a faixa é "não informada" — a plataforma nunca infere idade por nome, parentesco ou qualquer outro dado. A faixa manual **nunca compete** com uma data de nascimento válida: preencher a data depois faz a classificação passar automaticamente a calculada. A interface sempre indica se o valor foi calculado ou informado manualmente.

**Cadastro sem fricção.** A data de nascimento é opcional de propósito: o casal raramente conhece a de todos os convidados, e "sei que ele é adulto" precisa ser suficiente para concluir o cadastro. A faixa manual é o campo de primeira classe do formulário; a data de nascimento é informação complementar que, quando existe, mostra idade no evento e classificação em leitura.

**Acompanhantes.** Cada pessoa tem a própria data de nascimento e a própria faixa — um acompanhante nunca herda a classificação do convidado responsável (todo acompanhante é uma linha de `convidados`, ver seção 3.1). Acompanhantes avulsos do RSVP (`acompanhantes_avulsos`, nome livre) não têm nenhuma das duas informações e por isso não entram nas contagens por faixa.

**RSVP.** O fluxo do convidado não pergunta idade nem data de nascimento — a classificação é ferramenta de organização do casal, não pergunta ao convidado.

**Ao alterar a configuração**, nenhum dado de convidado muda: só a classificação calculada. Um convidado de 11 anos exibido como "Adolescente" com criança até 7 passa a "Criança" quando o limite vira 11. Não há histórico de classificações nesta versão — a regra vigente é a atual.

**Evolução prevista** (não implementada): classificações diferentes por finalidade — alimentação (infantil 0–7 / adulto 8+), organização de mesas, recreação (bebê 0–2 / criança 3–7). Por isso a configuração é gravada sob a chave `principal`, e não como um array solto: outras finalidades entram como chaves irmãs, sem migration de formato. Ver [`ROADMAP.md`](ROADMAP.md).

### 3.5 Catálogo de campos e modelo de importação

**O princípio:** o casal não deveria precisar conhecer o schema do banco para preparar uma planilha. A pergunta "como eu preparo um arquivo para importar meus convidados?" é respondida com "escolha os campos que quer preencher e o sistema monta a planilha".

**Catálogo central** (`shared/utils/campos-convidado.ts`) — fonte única de exportação, importação e gerador de modelo. Três listas independentes fariam com que adicionar um campo ao cadastro exigisse lembrar de três lugares, e esquecer um é silencioso: a coluna simplesmente não aparece, ou aparece e é ignorada.

Cada campo declara o que se pode fazer com ele:

| Propriedade | Significado |
|---|---|
| `origem` | `coluna` (direto de `convidados`), `relacao` (vínculo resolvido por nome — `grupo`, `convite`) ou `derivado` (calculado, não existe como coluna) |
| `exportavel` | Aparece na exportação |
| `importacao` | `gravavel` (aceito como valor), `identificador` (só diz *qual* registro atualizar — é o caso de `id`) ou `nao` |
| `obrigatorio` | Só `nome_completo` |
| `aliases`/`valores` | Cabeçalhos alternativos reconhecidos e, em campos de enum, os rótulos aceitos |

**`chave` é o contrato do CSV, não a coluna do Postgres.** A maioria coincide, mas `grupo`/`convite` são vínculos por nome e `faixa_etaria_calculada`/`status_rsvp` não existem em `convidados`.

**Campo derivado nunca é importável.** `faixa_etaria_calculada` é exportada para consulta e jamais oferecida como coluna de modelo: ela muda sozinha quando o casal altera as faixas do evento (seção 3.4), então aceitá-la de volta criaria uma segunda fonte de verdade para a classificação. A regra é estrutural — o gerador só sabe listar campos `gravavel` —, não uma convenção que alguém precise lembrar.

**Exportação e modelo não têm as mesmas colunas**, de propósito: a exportação representa *dados que existem*, o modelo representa *a estrutura que o sistema aceita receber*. A exportação leva `id`, `faixa_etaria_calculada` e `status_rsvp` — que nenhum modelo oferece — e escreve os enums com o rótulo legível ("Criança", não `crianca`), porque a planilha é lida por gente; o importador aceita as duas formas de volta.

**A exportação segue os filtros da tela** (nome, grupo, faixa etária): um botão que sempre baixasse a lista inteira contradiria os filtros logo acima dele. A leitura pagina em blocos de 1000 — o teto padrão do PostgREST — porque um CSV truncado em silêncio é o pior modo de falha possível numa exportação: o arquivo *parece* completo. O registro em `trilha_auditoria` guarda a contagem e quais filtros estavam ativos, nunca o termo buscado nem dado de convidado.

**Três presets, uma tela só** — chips sobre a mesma lista de caixas, porque os três produzem o mesmo tipo de arquivo e diferem apenas em quais colunas vêm marcadas:

- **Recomendado** — só o que faz sentido preencher em massa: nome, data de nascimento, faixa etária informada, e-mail, telefone, grupo, convite. Apelido, sexo, papel na cerimônia e observações são refinamento individual; uma planilha com onze colunas em branco intimida justamente quem o preset deveria ajudar.
- **Completo** — todos os campos graváveis.
- **Atualizar existentes** — inclui `id`. Só aqui: numa planilha de cadastro novo, uma coluna `id` em branco é convite a inventar valores.

**Formato.** O modelo sai com `;` e BOM UTF-8 (Excel em pt-BR), cabeçalho na chave canônica (`nome_completo`, não "Nome completo") e uma linha de exemplo preenchida. A **leitura** é deliberadamente mais permissiva que a escrita: detecta o separador (`;`, `,` ou tabulação), tolera BOM ausente e reconhece rótulos e apelidos comuns de coluna ("celular", "WhatsApp", "E-MAIL") — aceitar só o próprio dialeto tornaria falsa a promessa de importar a planilha que o casal já tem.

**Linha de exemplo.** Resolve "qual formato a data espera?", mas cria o risco de virar uma convidada chamada "Maria Exemplo". Há aviso antes do download **e** o importador reconhece a linha pelo nome e a ignora — contar só com o aviso seria contar com a memória de quem edita a planilha dias depois.

### 3.6 Importação

**Três passos, nada escrito antes do último:** arquivo → conferência das colunas → revisão. O arquivo nunca sobe cru: é lido e interpretado no navegador, e só as linhas normalizadas viajam como JSON — o servidor revalida tudo com o mesmo schema Zod, porque o client nunca é fonte de verdade.

**O passo de conferência existe porque a planilha real vem de qualquer lugar** — do modelo que o próprio sistema gerou, de uma exportação antiga, de uma lista que a cerimonialista mandou. A autodetecção acerta a maioria (chave canônica, rótulo visível e apelidos comuns como "celular" ou "WhatsApp"); o que sobra, o casal reaponta ali mesmo, em vez de ter que renomear colunas no Excel. Duas colunas apontando para o mesmo campo não é permitido: a segunda sobrescreveria a primeira em silêncio.

**`id` decide entre criar e atualizar.** Preenchido, a linha atualiza aquele convidado; vazio, cadastra um novo. É o que faz "exportar → editar no Excel → reimportar" ser um caminho real, sem heurística de nome para achar duplicata. Um `id` de outro casamento é recusado — a cláusula de `casamento_id` na função é o que impede uma planilha de alcançar dado alheio.

**Coluna ausente nunca apaga dado.** A planilha diz o que trouxe, não o que falta: uma de `id;nome_completo;grupo` atualiza três colunas e não encosta em e-mail, telefone ou data de nascimento. Limpar de propósito continua possível — a coluna vai presente com a célula vazia. É a mesma semântica que o cadastro já aplica ao contato (ver [`CHANGELOG.md`](CHANGELOG.md)).

**Grupo e convite entram por nome, e a criação é confirmada.** Nome existente vincula; nome novo só é criado depois de o casal marcar explicitamente a confirmação, com a lista do que será criado à vista. Sem isso, um erro de digitação numa coluna ("Familia da Noiva" em três linhas) criaria entidades em silêncio, e desfazer isso é trabalho manual. A comparação ignora acento e caixa, então "familia silva" e "Família Silva" resolvem para o mesmo convite.

**Erro de uma linha não derruba as outras.** A revisão mostra, por número de linha (contando o cabeçalho como 1, igual ao Excel), o que está errado e o que será ignorado; o casal importa o resto. Já **dentro** de um lote a transação é tudo ou nada: metade de uma planilha aplicada, sem saber onde parou, é pior que nada. Acima de 500 linhas o arquivo é enviado em lotes sequenciais — nunca em paralelo, senão dois lotes citando o mesmo convite novo poderiam criá-lo duas vezes.

**Grupo e subdivisão são duas colunas.** "Grupo" resolve entre grupos de primeiro nível e "Subdivisão" sempre **dentro** do grupo da mesma linha — "Primos" da Família do Mateus e "Primos" da Família da Raquel são duas subdivisões distintas, e casar só pelo nome jogaria as duas famílias na mesma lista. Subdivisão sem grupo na linha é recusada: promovê-la a grupo de primeiro nível criaria uma etiqueta solta que ninguém pediu. A exportação escreve as duas colunas separadas pelo mesmo motivo — exportar só a folha faria a reimportação do próprio CSV desfazer a hierarquia em silêncio.

**Fora do escopo desta versão:** acompanhantes (`nucleos_acompanhantes`). O conceito é simétrico e não cabe numa coluna de planilha sem inventar sintaxe; pessoas sob o mesmo `convite` já cobrem a intenção real, que é o que habilita o RSVP.

### 3.7 Acompanhantes

**O princípio:** o núcleo (`nucleos_acompanhantes`) é **estrutura interna, não um eixo de organização.** Grupo é etiqueta livre e convite é a unidade de RSVP; o núcleo é a afirmação "estas pessoas vão juntas", e existe por duas razões que nenhum dos outros dois cobre:

1. **Ele existe antes de qualquer convite.** `convidados.convite_id` é nullable — enquanto o casal monta a lista, o núcleo é o único lugar onde cabe "esses dois vão juntos". O convite não pode registrar isso porque ainda não existe.
2. **Convite não tem sub-estrutura.** `grupos` tem subdivisão de um nível; `convites` não tem nenhuma. "Família Silva" com 6 pessoas é um cartão e um código, mas podem ser três casais lá dentro — o núcleo é o que faz a lista mostrar três unidades em vez de seis nomes soltos, e é a linha de corte natural quando precisarem de cartões separados.

**Por isso o núcleo não tem tela própria.** Grupos e Convites têm, porque o casal os **nomeia e administra** — grupo tem nome, convite tem nome, código, link e QR. O núcleo não tem nome gravado (seção 3.1.1) e o rótulo dele muda quando alguém entra ou sai: uma tela listando coisas sem nome, cujo título se mexe sozinho, não serve de referência ("qual daqueles era o que eu editei ontem?"). Ele aparece onde significa algo — na linha do convidado, no cadastro, dentro do convite e no filtro do Modo Lista.

**Na interface chama-se "Acompanhantes"; "núcleo" só existe no código.** Duas palavras para a mesma coisa nas duas formas de ver a mesma lista obrigavam o casal a ligar as duas sozinho. A célula da coluna exibe o rótulo do núcleo inteiro ("João e Maria"), igual nas duas linhas do casal — é o que faz a coluna agrupar ao ordenar e filtrar; um "vem com a Maria" por linha leria melhor e agruparia nada.

**Núcleo nunca atravessa convites.** Se duas pessoas vão em convites diferentes, deixaram de ser "convidadas juntas" — então a operação é recusada, nunca resolvida movendo alguém de convite (o que trocaria o link/QR que já pode ter sido compartilhado). Na direção oposta, a consequência prática: agrupar alguém com quem já tem convite coloca todos nele, e isso é avisado antes, porque habilita RSVP para quem não podia responder. Rascunho da lista (`em_consideracao`) não entra em núcleo pelo mesmo motivo — ele nunca recebe convite.

**A ordem dentro do núcleo é escolha, nunca efeito colateral.** O rótulo derivado usa os dois primeiros nomes por `ordem_nucleo`, então essa ordem é visível na lista inteira. O cadastro mostra a fila do núcleo **completa**, com o convidado que está sendo editado como uma linha igual às outras (é o que "simétrico" significa), e a ordem que se vê ali é a que fica gravada. `ordem_nucleo` não significa "quem é o principal" — quem responde pelo convite é `convites.convidado_responsavel_id`, outro conceito.

**Núcleo de uma pessoa não existe.** Um agrupamento de um não agrupa nada, e ainda apareceria no filtro como se agrupasse. Todo caminho que mexe em núcleo dissolve o que ficou com menos de dois membros — inclusive o núcleo de **origem** de quem foi movido para outro.

**Agrupar a partir da seleção da lista** fecha o ciclo de quem monta a lista por entrada rápida ou colando da planilha: os nomes entram soltos e o agrupamento vem depois. Quem já está num núcleo entra trazendo o núcleo inteiro — agrupar o João (que já vem com a Maria) com o Pedro resulta no trio, porque agrupar não pode afastar a Maria do João. Seleção com núcleos diferentes funde tudo num só, avisando antes; o núcleo que sobrevive é o maior, e no empate o mais antigo (desempatar por `id` trocaria o nome do grupo na tela conforme um uuid aleatório).

**O cadastro do convidado resolve o VÍNCULO; o convite se administra na tela de Convites.** A linha de convite do cadastro relata o estado e oferece uma ação só — nunca campos do convite. Vinculado, ela mostra o nome e o caminho para a tela de Convites (antes o bloco desaparecia nesse caso: o formulário sabia do vínculo pelo próprio payload que já carregava, e não contava). Sem convite, ela diz o que falta — sem convite não existe RSVP — e o botão registra o pedido; o convite nasce na mesma transação do convidado, nunca no clique, para que cancelar o cadastro não deixe convite vazio para trás. O nome é derivado do primeiro nome ("Família Mateus") e renomear é assunto de Convites.

Criar o convite é **ação pedida, não resposta já dada**: era uma caixa pré-marcada, o que fazia nascer um convite por núcleo cadastrado mesmo para o casal que planeja os convites na tela de Convites (um cartão para uma família inteira, por exemplo). E a linha aparece também para quem está sozinho — uma pessoa só precisa de convite igual, e antes o cadastro não dizia nada sobre isso.

**`ordem_nucleo` não ordena um convite.** Um convite pode conter vários núcleos e gente sem núcleo nenhum, cujo valor é 0 para todos — os membros de um convite são ordenados mantendo cada núcleo junto, com os blocos em ordem alfabética pelo primeiro nome de cada um.

## 4. Sistema de RSVP

### 4.1 Conceito

RSVP (*répondez s'il vous plaît*) é o fluxo pelo qual o convidado confirma ou recusa presença. É sempre **por convidado** — não existe mais um "modo grupo" que cobre todos os membros de uma vez.

### 4.2 Configuração por casamento

- `casamentos.modo_lista_convidados` (`'fechada'` default | `'aberta'`) — coluna própria de comportamento de negócio, deliberadamente separada de `config_tema` (que é exclusivamente visual). `'fechada'`: só convidados pré-cadastrados podem confirmar presença. `'aberta'`: permite acompanhante avulso (nome livre, sem cadastro prévio) até `convites.max_acompanhantes`.
- `prazo_rsvp` define o prazo final — após essa data, o formulário público entra em modo somente leitura.

### 4.3 Dados coletados

- Status por convidado: `pendente` (default) | `confirmado` | `recusado` (escolhidos pelo próprio convidado) | `lista_espera` | `removido` (só administrativos, o convidado nunca escolhe sozinho).
- Acompanhante avulso (nome sem cadastro prévio, só em `modo_lista_convidados = 'aberta'`) registrado em `acompanhantes_avulsos`, pendurado no convite (não numa resposta individual) — respeitando `convites.max_acompanhantes`.
- Mensagem opcional ao casal — uma por **convite** (`convites.mensagem_rsvp`, preenchida na revisão final), não por convidado individual.
- Timestamp de resposta (`respondido_em`) por convidado, permitindo reenvio de lembrete apenas para quem ainda está `pendente`.

### 4.4 Regras de negócio

- Resposta de cada convidado é **editável** até `prazo_rsvp` — `salvar_rsvp_convidado()` atualiza o registro existente (não cria duplicata), gravando o evento em `historico_convite` na mesma transação.
- Confirmar acompanhante avulso contra `convites.max_acompanhantes` é uma operação sujeita a corrida (múltiplos convidados do mesmo convite respondendo simultaneamente), resolvida com `SELECT ... FOR UPDATE` sobre a linha do convite dentro de `finalizar_rsvp_convite()` — nunca apenas validação client-side.
- Painel administrativo exibe contadores **atualizados a cada carregamento/refetch** (não é um canal de push em tempo real): confirmados, recusados, pendentes, total de acompanhantes.
- Sistema de lembretes (fase 2 do roadmap): disparo automático de e-mail para convidados `pendente` X dias antes do `prazo_rsvp`, registrado em `comunicacoes` (não em `credenciais_acesso_convite`, que permanece estável entre envios).

## 5. Sistema de Convites e Grupos

### 5.1 Conceito

Dois conceitos independentes, fáceis de confundir pelo nome:

- **Convite (`convites`)** é a unidade real de RSVP e comunicação — "quem recebeu o mesmo convite físico/digital". Todo link/QR de acesso, lembrete e mensagem ao casal opera nesse nível. Um convite pode ter um Convidado Responsável (`convidado_responsavel_id`), usado pra personalizar mensagens.
- **Grupo (`grupos`)** é só uma etiqueta organizacional livre (ex.: "Família da Noiva", "Trabalho") — sem nenhuma semântica de RSVP, comunicação ou limite de acompanhante. Serve pra filtrar/organizar a lista de convidados no admin. Aceita **subdivisão de um nível** (`grupo_pai_id`): "Tios paternos", "Primos" e "Amigos da infância" dentro de "Família do Mateus", o que mantém uma lista grande legível em blocos recolhíveis. Subdivisão é do mesmo tipo que grupo — etiqueta organizacional, nada de RSVP —, e o convidado guarda **uma só** referência de grupo, sempre a da folha onde está; o grupo-pai é derivado. O limite de dois níveis é decisão de produto: é mais fácil liberar um terceiro nível depois do que retirar dados de uma hierarquia que já cresceu.
- **Acompanhantes (`nucleos_acompanhantes`)** é um terceiro conceito, tratado à parte na seção 3 — agrupamento simétrico de convidados comumente convidados juntos.

### 5.2 Funcionalidades previstas

**Convites:**
- Criar convite, vincular convidados, definir Convidado Responsável.
- Gerar link/QR de acesso (`credenciais_acesso_convite`) e reenviar sem invalidar o já compartilhado.
- Definir `max_acompanhantes` (limite de acompanhante avulso, só relevante em `modo_lista_convidados = 'aberta'`).
- Etiquetas internas reutilizáveis (`etiquetas_convite`, ex.: "VIP", "Mesa 01") — só uso administrativo.
- Linha do Tempo do convite (`historico_convite`): criado, token enviado, primeiro acesso, RSVP alterado, mensagem enviada, arquivado.
- Visualização: convite → convidados → status de RSVP de cada um.
- **Status consolidado do convite** (`pendente`/`parcial`/`respondido`), resolvido no banco (`convites_com_resumo`): pendente enquanto ninguém respondeu, respondido quando **todos os membros** responderam, parcial no meio do caminho. O denominador é o número de membros do convite — um convite de 3 pessoas em que só 1 respondeu é **parcial**, nunca respondido, porque ainda falta cobrar alguém.

**Grupos (etiqueta livre):**
- Criar subdivisão dentro de um grupo, renomear, e promover subdivisão a grupo de primeiro nível. Arquivar um grupo arquiva as subdivisões junto; desarquivar traz de volta só o que a cascata levou (ver [`DATABASE.md`](DATABASE.md), seção 3.2).
- Filtrar a lista por um grupo traz também quem está nas subdivisões dele — o convidado aponta para a folha, então o filtro do grupo-pai sozinho devolveria um número plausível e errado.
- Criar/renomear/excluir grupos, definir cor.
- Atribuir/remover a etiqueta de um convidado (não move o convidado de convite nem de Acompanhantes).

### 5.3 Regras de negócio

- Excluir um convite ou grupo com convidados associados exige realocar os convidados ou confirmar exclusão em cascata (soft delete) — nunca exclusão física silenciosa. A cascata soft-deleta os convidados **e** o próprio convite/grupo (nunca um `DELETE` físico): `convidados.convite_id` é `ON DELETE RESTRICT`, então a linha do convite permanece referenciada por qualquer convidado soft-deleted que já tenha pertencido a ele. Um convite/grupo sem nenhum convidado (nem ativo, nem soft-deleted) também é apenas soft-deleted, pela mesma convenção.
- `max_acompanhantes` é validado no momento da revisão final do RSVP (`finalizar_rsvp_convite`): não permite confirmar mais acompanhantes avulsos do que o limite definido pelo casal.

### 5.1 Status do convite — um funil operacional

**O princípio:** o status responde "o que o casal precisa saber ou fazer sobre este convite agora?", e não "quais fatos aconteceram com ele". Os fatos ficam registrados à parte (`enviado_em`, o evento `rsvp.first_access`, as linhas de `respostas_rsvp`, a Linha do Tempo); o status é a leitura deles.

**O problema que isso resolve.** Quatro coisas independentes funcionavam como status: `status_convite` (`pendente`/`enviado`, marcado à mão), o `status_resposta` derivado, `arquivado_em` e `excluido_em`. A coluna Status mostrava só a segunda, o modal empilhava três badges, e "abriu e não respondeu" — o dado mais acionável que existe — ficava enterrado na Linha do Tempo. O efeito prático: **"Pendente" cobria quatro situações com providências opostas** (não foi enviado, foi enviado e ninguém respondeu, alguém abriu e não respondeu, parte respondeu), distinguidas apenas pelo tom do badge.

**O funil**, o estágio mais avançado que o convite alcançou:

| Estágio | Significado | Providência |
|---|---|---|
| **Não enviado** | Nenhum fato aconteceu ainda | Enviar convite |
| **Enviado** | O casal informou que mandou; ninguém abriu nem respondeu | Aguardar |
| **Aberto** | Alguém acessou o convite e ninguém respondeu | Enviar lembrete |
| **Parcial** | Parte dos membros respondeu | Lembrar os que faltam |
| **Respondido** | Todos os membros têm resposta | Nenhuma |

Cada estágio implica os anteriores, então **uma coluna basta** e o modal mostra **um badge**. A providência ("Enviar lembrete", nunca "cobrar") é o que justifica o funil existir.

**Derivado, nunca uma fonte de verdade nova** (`convites_com_resumo.status_operacional`). Trocar `status_convite` por uma coluna de cinco valores só mudaria o tamanho do problema: seria mais um estado a manter sincronizado com os fatos. E derivado **em SQL**, não na tela: a listagem é paginada e o recorte por estágio é do endpoint — calculado no navegador, o filtro voltaria a recortar só a página carregada.

**"Aberto" é o único estágio comprovado pelo sistema**, e por isso passa na frente de "Enviado": se alguém acessou, o convite chegou — mesmo que o casal tenha esquecido de marcar o envio. É o que corrige o elo mais fraco do funil, já que "Enviado" significa apenas *o casal informou que enviou*, nunca *o sistema confirmou a entrega*.

**Acesso parcial não é resposta parcial.** O primeiro acesso é gravado por convite, não por convidado: João abriu e Maria não, sem ninguém responder, é **Aberto** — nunca Parcial.

**O funil não é só digital, e essa é a regra que o sustenta.** Nenhum estágio exige que o convidado use o site. A avó que recebe convite em papel, não sabe usar o formulário e confirma por telefone tem a resposta **registrada pelo casal** (seção 5.2) e o convite vai direto a *Respondido*, sem nunca passar por *Aberto*. O sistema nunca exige jornada digital para que uma confirmação exista.

**Arquivado e excluído ficam fora do funil.** Arquivar é escopo administrativo — um convite pode estar arquivado em qualquer estágio —, e continua sendo o recorte "Ativos / Arquivados" da listagem. Excluído segue sendo soft delete, invisível.

**A Linha do Tempo continua, com função distinta.** O status responde "onde este convite está agora"; a Linha do Tempo, "o que aconteceu para ele chegar aqui".

### 5.2 Resposta registrada pelo casal

Até esta rodada, `respostas_rsvp` era escrita em um lugar só — o fluxo do convidado. Quem nunca abria o link ficava eternamente pendente, e o acompanhamento funcionava apenas para convidado digital.

O casal agora registra a resposta pela linha do convidado, dentro do convite. Três garantias:

- **A origem fica registrada** (`admin_panel` contra `public_site`, no histórico). O sistema nunca finge que a avó acessou o site — são fatos diferentes, e a Linha do Tempo conta a diferença.
- **Não cria acesso falso**: nenhum evento `rsvp.first_access` é inventado, então o convite não passa por *Aberto* a caminho de *Respondido*.
- **Tem volta**: registrar "pendente" desfaz, porque registrar por engano precisa ter saída.

Duas decisões sobre o que conta como resposta:

- **`lista_espera` conta.** O convidado deu retorno; quem está segurando é o casal. Logo *Respondido* significa "todos deram algum retorno", não "todos confirmados".
- **`removido` não é oferecido.** É valor morto do vocabulário (nada no produto o grava; "Remover do convite" apenas desfaz o vínculo, e o fluxo do convidado o lê como pendente). Oferecê-lo o faria contar como resposta, e um convite sem ninguém confirmado passaria a dizer *Respondido*.

**O prazo de RSVP não se aplica a este caminho.** Ele bloqueia o convidado (`/api/rsvp/**`), não o casal: depois do prazo é exatamente quando se está ligando para quem não respondeu, e travar aqui deixaria essas respostas sem lugar para existir.

## 6. Sistema de Presentes

### 6.1 Conceito ("Presentes 2.0")

A lista de presentes é um "ecossistema de presentes", não uma lista fria de produtos: a página pública (`/{slug}/presentes`) abre com uma mensagem do casal e organiza os itens em três seções — **Lista de Presentes** (itens físicos, `categorias_presentes`), **Contribuições** (presentes de cota em dinheiro, agrupados por categoria) e **Presentes Emocionais** (contribuições com apresentação evocativa em vez de foto de produto). "Presente emocional" **não é uma entidade nova** — é um presente de cota comum (`presentes.e_presente_cota = true`) com `estilo_exibicao = 'emocional'` e um `icone_emocional` (catálogo fixo validado no Zod, `shared/schemas/gifts.ts#EMOTIONAL_GIFT_ICONS`) no lugar de foto.

**Nomenclatura "Pix" usada nesta seção**: por brevidade, o resto desta seção fala em "pagamento Pix"/"caminho pago", mas tecnicamente o que a plataforma gera é um **link de pagamento genérico da InfinitePay** — quais métodos ele aceita (Pix, cartão, ambos) é definido pela própria conta InfinitePay do casal, não pelo nosso código. A UI (convidado e admin) reflete essa nuance com o rótulo "pagamento online", nunca prometendo "Pix" especificamente.

### 6.2 Funcionalidades previstas

- CRUD de presentes pelo painel administrativo (título, descrição, foto, preço estimado, quantidade disponível, estilo de exibição, cota fixa).
- **A página de presentes é pública, sempre, sem link personalizado por convite** — diferente do RSVP (que ainda usa `credenciais_acesso_convite`), `/{slug}/presentes` nunca exigiu nem exige um `?code=`. **Identificação de quem está presenteando é o primeiro passo antes de qualquer ação**: o convidado informa nome (obrigatório) e telefone (opcional) — coletados uma única vez por sessão (`useGiftGiverIdentity`, `useState` do Nuxt, isolado por requisição no SSR) e reaproveitados em todos os presentes/contribuições da mesma visita. Gravados em `reservas_presentes.nome_contribuinte`/`telefone_presenteador` e `contribuicoes_presentes.nome_contribuinte`/`telefone_presenteador`. `convidado_id`/`convite_id` nunca são preenchidos pelo fluxo público atual — a identificação é **inteiramente** nome/telefone, sem nenhuma ligação com a lista de convidados cadastrados.
- **Presente físico (`e_presente_cota = false`) pode ter até duas formas de ser presenteado** — quais delas ficam disponíveis é decisão do casal (`casamentos.modo_entrega_presente_fisico`: `'ambos'` default, `'somente_compra_propria'`, `'somente_pagamento'` — em `/admin/configuracoes`, aba Geral); entre as habilitadas, o convidado escolhe qual usar, depois de se identificar:
  - **"Vou comprar e entregar"** — reserva de intenção grátis, fluxo original: `reservas_presentes` gravada diretamente via `reservar_presente()`, sem dinheiro passar pela plataforma. Escondida quando `modo_entrega_presente_fisico = 'somente_pagamento'`.
  - **"Enviar o valor pelo link de pagamento"** — exige `casamentos.handle_infinitepay` configurado **e** `modo_entrega_presente_fisico ≠ 'somente_compra_propria'`; o convidado paga `presentes.preco_centavos` via checkout online (InfinitePay) e, só depois do pagamento confirmado, a mesma `reservar_presente()` é chamada.
  - Se a combinação de configurações não deixar nenhuma opção disponível (`'somente_pagamento'` sem handle configurado), o botão "Presentear" some da vitrine e o modal, se já aberto, mostra que o casal ainda não configurou uma forma de receber.
  - Dentro do modal, a ordem é sempre: **escolher o método** (só exige clique quando há mais de uma opção — com uma só, já vem pré-selecionado) → **mensagem opcional** → **confirmar**.
- **Contribuições (presente de cota) e Presentes Emocionais sempre exigem pagamento online real** — sem `handle_infinitepay` configurado, essas duas seções ficam bloqueadas/somente leitura na vitrine pública, com uma mensagem explicando que o casal ainda não ativou pagamentos.
- **Cotas fixas**: um presente de cota pode opcionalmente definir `presentes.valor_cota_centavos` — quando preenchido, o convidado escolhe *quantidade de cotas* a comprar de uma vez em vez de digitar um valor livre (ex.: Air Fryer de R$800 dividida em cotas de R$100). Convive com o modo de contribuição de valor livre (sugestões de valor + campo aberto) para presentes sem cota fixa definida.
- Cartão/mensagem opcional do convidado ao presentear/contribuir (`reservas_presentes.mensagem` / `contribuicoes_presentes.mensagem`) — separado da identificação (nome/telefone), sempre visível ao casal no painel, nunca a outros convidados.
- Indicação visual clara de "já reservado"/progresso de arrecadação no site público, sem expor nome completo do convidado que reservou (apenas ao casal, no painel administrativo).

### 6.3 Regras de negócio (caminho gratuito, inalterado)

- Reserva grátis é **atômica**: `reservar_presente()` executa `SELECT ... FOR UPDATE` na linha do presente dentro de uma transação antes de decrementar `quantidade_disponivel` e inserir a reserva — nunca um `check-then-insert` feito na camada de aplicação.
- Presente com `quantidade_disponivel = 0` não aceita novas reservas e aparece como "Esgotado" na vitrine pública.
- **Não há cancelamento self-service** — sem token de convite, não haveria como provar posse com segurança (nome/telefone sozinhos são triviais de forjar). Qualquer ajuste é resolvido falando direto com o casal.
- Painel administrativo mostra quem reservou/contribuiu o quê (incluindo mensagem e status de pagamento) e uma atividade recente cross-presente (`/admin/presentes`), para fins de agradecimento pós-evento.

### 6.4 Pagamento online (InfinitePay) — fluxo pago

`pagamentos_presentes` é a peça central do caminho pago: uma linha por tentativa de checkout, nunca por presente. **Nenhum efeito de negócio (`reservas_presentes`/`contribuicoes_presentes`) nasce diretamente de uma requisição do convidado** — só a função `confirmar_pagamento_presente()` grava esses registros, e só depois de o pagamento ser confirmado servidor-a-servidor.

Fluxo detalhado, incluindo o modelo de confiança do webhook não assinado, está em [`ARCHITECTURE.md`](ARCHITECTURE.md), seção "Fluxo de Presentes". Resumo das regras de negócio:

1. Convidado escolhe pagar/contribuir → o servidor calcula `valor_centavos` **sempre**, nunca aceita valor do client (exceto contribuição de valor livre).
2. Pagamento confirmado → `reservar_presente()` (tipo `reserva`) ou insere em `contribuicoes_presentes` (tipo `contribuicao`), atomicamente.
3. **Corrida aceita como limitação conhecida**: se a última unidade de um presente físico for levada pelo caminho gratuito entre o checkout e a confirmação do pagamento, a reserva falha dentro de `confirmar_pagamento_presente()` — marca `status_pagamento = 'falhou'` (nunca propaga como exceção não tratada), porque "pago mas não conseguiu reservar" é um estado real que precisa ficar visível para o casal resolver manualmente (destacado na própria página `/admin/presentes`).
4. **Cancelamento de item já pago é bloqueado no self-service** — recusa com 409 orientando contato direto com o casal. Sem estorno automático: a InfinitePay não documenta publicamente uma API de estorno.

### 6.5 Limitações conhecidas da integração InfinitePay

A API pública de checkout da InfinitePay tem documentação técnica limitada — isso molda decisões acima, não é uma lacuna de implementação:

- **Sem sandbox documentado**: validação do fluxo completo é sempre manual, contra a API real, com valores baixos (R$1–2) em ambiente controlado, antes de qualquer merge que toque este fluxo.
- **Sem assinatura no webhook**: o corpo recebido em `POST /api/public/gifts/payments/webhook` nunca é tratado como prova de pagamento.
- **Sem split/marketplace nativo**: uma única conta (`handle`) recebe todo o dinheiro — não há hoje um modelo de múltiplas contas por casal (relevante para a transição SaaS, ver [`ROADMAP.md`](ROADMAP.md)).
- **Sem API de estorno documentada**: motivo direto da regra "cancelamento de item pago é bloqueado".

### 6.6 Fora de escopo desta fase

Timeline pública de contribuições, modo anônimo explícito, fotos pós-presente, agradecimentos em massa pelo painel, gamificação de metas atingidas, relatórios financeiros completos (taxas detalhadas, estornos, exportação) e suporte a moeda estrangeira/cartão internacional.

## 7. Sistema Administrativo

### 7.1 Conceito

Painel autenticado (`/admin/**`) onde o casal e colaboradores gerenciam todo o evento.

### 7.2 Módulos previstos

| Módulo | Função |
|---|---|
| **Dashboard** | Visão consolidada: total de convidados, % confirmados, presentes reservados, prazo de RSVP restante |
| **Convidados** | CRUD completo, importação CSV, filtros e busca |
| **Grupos** | Organização de convidados em grupos, definição de limites de acompanhantes |
| **Presentes** | CRUD de itens, categorias, visão de reservas/contribuições por item (com identificação de quem presenteou, mensagem e status de pagamento), resumo mínimo do arrecadado online e uma atividade recente cross-presente — tudo na própria página `/admin/presentes` |
| **Cronograma** | Gestão de `etapas_evento` — cerimônia, recepção, festa, cada um com local/horário próprios. O local é escolhido, não digitado (ver 7.4) |
| **Convites e Comunicações** | Geração de tokens de acesso (`credenciais_acesso_convite`), histórico completo de envios por canal (`comunicacoes`), reenvio de lembretes sem invalidar o link já compartilhado |
| **Configurações** | Dados do evento (data, nome dos noivos, `modo_lista_convidados`), tema visual, ordem das seções da home, prazo de RSVP, handle da InfinitePay (ativa pagamento online de presentes) |
| **Colaboradores** | Convidar/remover pessoas com acesso administrativo, definir permissões |

### 7.3 Regras de negócio

- Apenas `owner` pode gerenciar colaboradores e excluir o evento. **Nota de implementação**: essa checagem ainda não é aplicada no servidor (só existiria na UI) — não é uma vulnerabilidade ativa hoje porque a funcionalidade de Colaboradores em si não foi construída ainda; precisa ser implementada junto quando essa feature nascer (achado de auditoria, 2026-08).
- Toda ação sensível (exclusão de convidado, alteração de configurações do evento) é registrada em `trilha_auditoria`.
- Exportação de dados (CSV de convidados, lista de presentes reservados) disponível a qualquer momento — o casal é o dono dos seus dados.

### 7.4 Localização do Cronograma

O local de cada etapa é uma **entidade selecionada**, não um texto digitado. O casal nunca vê, nem informa, latitude ou longitude — coordenada é dado interno da localização.

**Caminho principal — escolher no Maps.** O casal digita o nome ou o endereço ("Buffet Leila Malouf", "Av. Miguel Sutil, 1234") e escolhe uma sugestão real do provedor de lugares. A sugestão tem duas linhas justamente para diferenciar homônimos: nome em cima, endereço/cidade embaixo. Escolhida a sugestão, o campo de busca some e dá lugar à confirmação: nome, endereço, um preview pequeno do mapa e duas ações — **Ver no mapa** e **Alterar local**.

**O preview é pequeno e só informativo.** Ele existe para o casal reconhecer o ponto, não para explorar o mapa; nenhum mapa grande abre por padrão.

**"Ver no mapa" nunca refaz busca textual** quando existe identificação do lugar. Busca por texto é exatamente o que produzia o ponto errado antes desta fase — dois buffets de nome parecido na mesma avenida resolvem para o primeiro que o Maps achar, não para o que o casal escolheu.

**"Alterar local" não apaga nada até haver substituto.** Abrir a busca e desistir mantém o local anterior; a troca só acontece quando uma nova escolha é concluída.

**Caminho alternativo — cadastro manual.** Nem todo local existe como Place: chácaras, sítios, salões pequenos, propriedades particulares, espaços novos, endereços rurais. "Nenhum resultado" **nunca** é tratado como erro bloqueante — junto da busca vazia aparece sempre "Não encontrou o local? Informar local manualmente". O cadastro manual pede endereço em partes (logradouro, número, complemento, cidade, UF) e, opcionalmente, **Definir localização no mapa**: um mapa em que o casal arrasta ou toca para posicionar o marcador e confirma. As coordenadas saem daí, sem nenhum campo numérico.

**O Maps é o caminho principal, nunca uma dependência.** Sem provedor configurado, ou com o provedor fora do ar, o cadastro manual continua completo por si só e o painel abre direto nele.

**Compatibilidade com o que já existe.** Etapas cadastradas antes desta fase têm só o endereço em texto. Elas continuam sendo exibidas normalmente e nenhuma é convertida automaticamente para um resultado do Maps — substituir o endereço de um casal por um palpite de geocodificação, sem ele confirmar, é o oposto do que esta mudança resolve.

### 7.5 Conteúdo do site — seções opcionais

Duas seções do site público não têm texto padrão de plataforma, ao contrário de todas as outras (boas-vindas, história, dress code, manual do convidado, presentes, FAQ, que já nascem preenchidas com uma redação genérica editável).

**Versículo.** Faixa colorida entre blocos claros, com o texto em dourado — o "respiro" que no convite impresso é a página cheia. Não tem texto padrão **de propósito**: é a única seção do site que fala em nome da fé do casal, e uma redação genérica da plataforma apareceria no site de todo mundo dizendo algo que ninguém escolheu. Sem texto preenchido, a seção não existe. A referência ("Salmos 118:24") é opcional e sozinha não sustenta a seção — sem o versículo em si, não há o que exibir.

**Manual dos Padrinhos.** Público diferente do Manual dos Convidados: aqui é o traje combinado e a paleta que padrinhos e madrinhas precisam comprar; lá é estacionamento, horário e hospedagem. Tem introdução, traje "para eles", traje "para elas" e uma paleta de até 8 cores. Todos os campos são opcionais e cada bloco aparece só se preenchido; sem nada, a seção some. A maioria dos casamentos não tem manual de padrinhos, e essa é a razão de a seção nascer vazia em vez de nascer com um exemplo.

**Toda cor da paleta tem nome obrigatório.** O nome aparece escrito embaixo da amostra e não é legenda decorativa: é a única forma de a informação chegar a quem não distingue aquele tom, e é também o que a madrinha usa para procurar o tecido numa loja. As cores da paleta são o único lugar do produto em que uma cor escolhida no painel não passa por validação de contraste — ali ela não pinta interface nenhuma, ela é o conteúdo (um champanhe ou um rosé são exatamente o tipo de cor que um casal quer mostrar, e a régua de contraste os proibiria).

**Esvaziar o conteúdo esconde a seção.** Vale para estas duas e para Manual, FAQ e Galeria — uma seção sem nada a mostrar não aparece.

### 7.5.1 Nossa História — texto corrido ou marcos

A seção aceita duas formas, e o casal escolhe preenchendo uma ou outra:

- **Texto corrido** (`Mensagem`), opcionalmente com uma foto ao lado — o padrão, e o que aparece enquanto ninguém mexer nos marcos.
- **Marcos** (`Marcos da história`): até 6 cartões com rótulo curto ("O começo"), título e um parágrafo. Havendo marcos preenchidos, eles substituem o texto corrido na página.

Não é uma configuração com interruptor: quem escreveu três marcos já escolheu contar a história assim. Texto corrido é uma carta; marcos são uma linha do tempo — e qual serve depende do casal, não da plataforma.

### 7.6 Ordem das seções da home

A sequência dos capítulos da página inicial é escolhida pelo casal em Configurações → Aparência → "Ordem das seções", arrastando as linhas ou usando as setas de subir/descer. O catálogo de seções é fixo (a plataforma decide quais existem); só a ordem é editável.

**A capa fica sempre no topo e não entra na lista** — o Hero não é um capítulo da narrativa, é a capa.

**Uma seção lançada depois nunca nasce invisível.** Se o casal salvou a ordem antes de uma seção existir, ela é anexada no fim automaticamente na hora de renderizar. Sem essa garantia, toda seção nova da plataforma deixaria de aparecer para quem já tivesse personalizado a ordem — um bug silencioso que só apareceria como "essa funcionalidade não funciona no meu site".

**A ordem padrão** é: Boas-vindas → Versículo → Nossa História → O Grande Dia → Confirme sua Presença → Dress Code → Manual dos Convidados → Manual dos Padrinhos → Lista de Presentes → Nossos Momentos → Perguntas Frequentes. O RSVP vem logo depois de "O Grande Dia" porque é ali que a pergunta faz mais sentido — o convidado acabou de ler onde e quando.

**Reordenar a lista nunca remove uma seção dela.** A ordem define a sequência, não o conjunto: uma seção que o casal não mencionou continua entrando, no fim. Quem tira do site é o interruptor abaixo.

### 7.7 Ligar e desligar seções

Cada linha da lista de ordem tem um interruptor (ícone de olho) que liga e desliga a seção no site. É diferente de esvaziar o conteúdo, e as duas coisas coexistem porque respondem a perguntas diferentes: *"não tenho o que dizer aqui"* (conteúdo vazio) e *"tenho, e não quero mostrar agora"* (desligada). Sem o interruptor, tirar o dress code da página exigiria apagar um texto que o casal talvez queira de volta na semana seguinte.

**Seção desligada some do site inteiro, não só da página.** Ela sai da home, dos atalhos do Hero e do menu de navegação — um atalho apontando para uma seção desligada seria um link que o convidado clica e nada acontece.

**Mas continua na lista do admin**, na posição dela, esmaecida e marcada como "Não aparece no site". Tirá-la da lista faria o casal perder de vista que a seção existe, e em que ordem ela voltaria ao ser religada.

**Toda seção pode virar atalho do Hero.** O catálogo de atalhos é o próprio catálogo de seções — se a seção existe e está ligada, ela pode ser escolhida como botão da capa. Duas apontam para página dedicada em vez de âncora (Lista de Presentes e Confirmar Presença), porque mandar o convidado para um teaser que só tem um botão custaria um clique a mais.

### 7.8 Fundo alternado das seções

O fundo de cada seção (off-white ou bege) é decidido pela **posição** dela entre as que aparecem, não fixado por seção. É o que garante que duas seções claras nunca fiquem coladas com o mesmo tom — o que passou a ser possível assim que a ordem e a visibilidade viraram configuráveis.

Versículo e "Confirme sua Presença" têm cor própria (a faixa na cor primária e a banda de destaque) e ficam fora do revezamento, sem interrompê-lo: uma faixa escura entre duas seções claras não dispensa que elas sejam diferentes entre si.


---

*Fonte original deste documento: `CLAUDE.md` (antes da reorganização de documentação de 2026-08-20, ver `docs/CHANGELOG.md`). Este documento evolui junto com o produto — toda mudança de regra de negócio deve ser refletida aqui.*
