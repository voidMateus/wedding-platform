# MeuSiteCasamento

Plataforma web para casais organizarem o site do casamento, lista de convidados, RSVP e lista de presentes. Stack: Nuxt 4 + TypeScript + Supabase (Postgres/Auth) + Tailwind CSS.

A especificação completa de produto, arquitetura, modelo de dados e convenções de código vive em [CLAUDE.md](CLAUDE.md) (fonte de verdade) e [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (execução técnica).

## Requisitos

- Node.js 22+
- npm
- Um projeto Supabase (hospedado, ou local via [Supabase CLI](https://supabase.com/docs/guides/local-development))

## Instalação

```bash
npm install
cp .env.example .env
```

Preencha o `.env` com as credenciais do seu projeto Supabase e os demais serviços — cada variável em [.env.example](.env.example) tem um comentário explicando de onde vem e para que serve (Supabase, Upstash Redis para rate limiting, segredo da sessão de RSVP, integração com Google Drive para a galeria, InfinitePay).

## Banco de dados

Migrations versionadas em `supabase/migrations/`. Para aplicar num projeto Supabase de desenvolvimento:

```bash
npx supabase link --project-ref <seu-project-ref>
npx supabase db push
```

Em **produção não se faz isso à mão**: o job `migrate-prod` do CI aplica as migrations pendentes a cada merge em `main` (docs/ARCHITECTURE.md seção 4.2).

### Primeiro operador da plataforma

Desde a Fase 6 (`docs/fase6-contas-e-acessos.md`) a gestão de operadores tem tela: **Painel interno → Contas**, onde se concede por e-mail e se revoga, com trilha própria da plataforma.

O script **continua existindo, e não foi aposentado** — ele mudou de papel. A tela exige um operador logado, e o primeiro operador de um ambiente novo não tem quem o conceda. Este é o caminho desse primeiro: cria o usuário no Auth, promove a operador e confere o projeto alvo antes de escrever.

```bash
# PowerShell, da raiz do repo
$env:SUPABASE_SERVICE_ROLE_KEY = "<service_role do projeto alvo>"
node scripts/criar-operador-plataforma.mjs --ref <project-ref> --email voce@exemplo.com
```

O `.env` **não** é lido de propósito: o alvo vai na linha de comando e é conferido contra o `ref` assinado dentro da própria chave, porque escrever no projeto errado é a falha muda clássica deste repositório. Rodar de novo com o mesmo e-mail é seguro.

### Links de e-mail (convite, acesso, senha)

Os quatro e-mails do Supabase Auth levam para `/auth/confirmar`, que verifica o `token_hash` no **servidor** e grava a sessão nos cookies da resposta. Nada depende de storage do navegador, então o link funciona no aparelho que abrir o e-mail — e não só naquele que o pediu.

O HTML dos quatro templates é gerado e versionado em [`supabase/templates/`](supabase/templates/), com um README dizendo **onde colar cada um** no dashboard. Eles são configuração do **projeto** Supabase, não do repositório: não há migration que os aplique, e precisam ser colados nos três ambientes.

```bash
node scripts/templates-de-email.mjs   # regenera supabase/templates/*.html
```

Enquanto algum ambiente ainda tiver o template antigo, o link chega no formato anterior (`?code=`) e a página `/auth/callback` continua atendendo. Para isso, cada ambiente precisa do seu endereço na allowlist do projeto, em Authentication → URL Configuration → Redirect URLs:

```
http://localhost:3000/auth/callback
https://<preview>.vercel.app/auth/callback
https://meusitecasamento.com.br/auth/callback
```

O histórico de por que o formato mudou está em `docs/rodada-usabilidade-2026-09.md`, itens A1 e B2.

## Desenvolvimento

```bash
npm run dev
```

Abre em `http://localhost:3000`.

## Qualidade e testes

```bash
npm run lint        # ESLint
npm run format       # Prettier (--check disponível como format:check)
npm run typecheck    # nuxt typecheck
npm run test          # Vitest (testes unitários)
npm run test:e2e      # Playwright (fluxos ponta a ponta)
```

## Build e deploy

```bash
npm run build
npm run preview   # serve o build de produção localmente
```

Deploy pensado para a Vercel (ver `vercel.json` — os crons de sincronização de galeria e de avisos automáticos). `main` é a branch de produção; todo merge passa por CI (lint/typecheck/test/build).

### Envio de e-mail

O envio por e-mail (convites, lembretes de RSVP e avisos de pagamento) é **opcional**: sem as variáveis abaixo, o canal some do painel e o WhatsApp assistido continua sendo o caminho completo.

1. Crie uma conta no provedor (Resend) e **verifique o domínio de envio** — são registros SPF/DKIM no DNS do domínio, e é a única parte que não se resolve no código. Sem domínio verificado, todo envio volta `403`.
2. Preencha `RESEND_API_KEY` e `EMAIL_REMETENTE` (só o endereço, ex.: `convites@seudominio.com.br`).
3. No painel do provedor, cadastre o webhook `https://SEU_SITE/api/webhooks/email` para os eventos de entrega/devolução e copie o segredo (`whsec_...`) para `RESEND_WEBHOOK_SECRET`.
4. Reimplante: o painel só enxerga o canal depois de um build novo (a flag é avaliada em build, como a da busca de locais).

Os avisos automáticos nascem **desligados** em cada casamento — quem liga é o casal, em Configurações › Avisos.

#### O e-mail do Supabase Auth é outro canal, e ele tem limite próprio

As variáveis acima cobrem o e-mail **da aplicação** (convite ao convidado, lembrete, aviso de vencimento). O e-mail **do login** — magic link, recuperação de senha e o convite que vincula o dono de um casamento novo (`inviteUserByEmail`) — sai pelo SMTP do **projeto Supabase**, que é configuração de projeto e não do código: nenhuma variável deste repositório o alcança.

Com o SMTP embutido do Supabase, esse canal é limitado a poucos envios por hora (2/h no projeto de desenvolvimento). O efeito prático é concreto e já observado: criar casamentos em sequência pelo painel interno falha com `email rate limit exceeded` — e, por causa da ordem transacional (o usuário do dono é resolvido **antes** da transação), o casamento não chega a ser criado.

**Aplicado em 2026-09-17** nos dois projetos (`wedding-platform` e `wedding-platform-prod`). A receita abaixo fica para projeto novo ou rotação de chave. Em **Authentication › Emails › SMTP Settings**:

| Campo        | Valor                                               |
| ------------ | --------------------------------------------------- |
| Host         | `smtp.resend.com`                                   |
| Port         | `465` (TLS implícito; `587` também serve)           |
| Username     | `resend`                                            |
| Password     | a mesma `RESEND_API_KEY` do `.env` daquele ambiente |
| Sender email | o mesmo `EMAIL_REMETENTE` (domínio verificado)      |
| Sender name  | `MeuSiteCasamento`                                  |

Ative também o limite de envio por hora (`rate_limit_email_sent`, hoje em **30**), que continua valendo **depois** de trocar o SMTP — é limite do Auth, não do provedor. E 30 é deliberado: o plano free da Resend dá 100 e-mails por **dia**, então um teto horário de 100 deixaria um laço acidental queimar a cota do dia inteiro em minutos, levando junto os convites do casal, que saem da mesma conta.

Equivalente por API, para quem preferir não abrir o painel (exige um Personal Access Token, `sbp_...`, gerado em Account › Access Tokens):

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"smtp_host":"smtp.resend.com","smtp_port":"465","smtp_user":"resend",
       "smtp_pass":"'"$RESEND_API_KEY"'","smtp_admin_email":"'"$EMAIL_REMETENTE"'",
       "smtp_sender_name":"MeuSiteCasamento","rate_limit_email_sent":30}'
```

**`smtp_port` vai como string** (`"465"`), não como número: com número a API devolve `400` sem dizer qual campo recusou. Só os campos enviados mudam. **Não** use `supabase config push` para isso: `supabase/config.toml` descreve o stack **local** (o `site_url` dele é `127.0.0.1:3000`), e empurrá-lo inteiro sobrescreveria a configuração do projeto hospedado com valores de desenvolvimento.

#### O `site_url` do projeto é o que monta o link do e-mail

Fica em **Authentication › URL Configuration**, e vale para todo link que o Auth envia: magic link, recuperação de senha e o convite que vincula o dono de um casamento novo. Os dois projetos nasceram com o default `http://localhost:3000` — em **produção**, isso mandava quem recebesse o e-mail para a própria máquina, e só o login por e-mail e senha escapava. Corrigido em 2026-09-17 para `https://www.meusitecasamento.com.br`. No projeto de desenvolvimento o valor certo continua sendo `localhost:3000`, e é por isso que o erro passou despercebido: nos dois lugares ele parecia igual, e num deles estava certo.
