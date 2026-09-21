# E-mails do Supabase Auth

Os quatro e-mails que o Supabase manda em nome da plataforma — convite, link de acesso,
redefinição de senha e confirmação de e-mail.

**Eles não são servidos por este repositório.** Quem os renderiza é o Auth do próprio projeto
Supabase, a partir de um HTML colado no dashboard. O que está aqui é a fonte desse HTML,
versionada para que os três ambientes possam ser conferidos um contra o outro — sem isso, os
textos existiriam só dentro de três dashboards, e ninguém saberia se eles combinam.

Os arquivos são **gerados**, nunca editados à mão:

```bash
node scripts/templates-de-email.mjs
```

`tests/unit/scripts/templates-de-email.spec.ts` falha se o HTML commitado divergir do gerador —
é o que impede um ajuste feito direto no arquivo de se perder na próxima geração.

## Onde colar cada um

No dashboard do projeto, em **Authentication → Emails**:

| Arquivo            | Template       | Assunto                                 |
| ------------------ | -------------- | --------------------------------------- |
| `convite.html`     | Invite user    | Seu acesso ao MeuSiteCasamento          |
| `link-magico.html` | Magic Link     | Seu link de acesso ao MeuSiteCasamento  |
| `recuperacao.html` | Reset Password | Redefinir sua senha do MeuSiteCasamento |
| `confirmacao.html` | Confirm signup | Confirme seu e-mail no MeuSiteCasamento |

O assunto é um campo separado do corpo, e o dashboard não o importa junto — ele precisa ser
digitado à mão, na linha **Subject heading** de cada template.

Aplicar nos **três** ambientes (desenvolvimento, preview e produção). Um ambiente com o template
antigo continua mandando o link no formato antigo, e o produto lida com os dois — mas só até
alguém supor que a troca foi feita em todos.

## O que o link carrega, e por quê

Todos os quatro apontam para:

```
{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=<tipo>
```

**`{{ .TokenHash }}` e não `{{ .ConfirmationURL }}`.** É o que faz a verificação acontecer no
servidor (`server/routes/auth/confirmar.get.ts`), que troca o token por sessão e grava os cookies
na resposta. O formato anterior (PKCE, com `?code=`) guardava um verificador de uso único no
navegador que pediu o link: quem pedia no computador e abria o e-mail no celular nunca entrava, e
pedir um segundo link inutilizava o primeiro. As três limitações estão medidas em
`docs/rodada-usabilidade-2026-09.md`, item A1.

O preço é conhecido e é o de todo link mágico: o link é credencial ao portador, então quem
interceptar o e-mail entra. A defesa é a validade curta do OTP, configurada no projeto
(**Authentication → Providers → Email → Email OTP Expiration**).

**`{{ .SiteURL }}` e não `{{ .RedirectTo }}`.** O segundo depende de a chamada ter passado um
`emailRedirectTo` **e** de ele estar na allowlist; quando qualquer uma das duas falha, o GoTrue o
substitui pelo Site URL em silêncio, e o link vira a raiz do domínio — que foi exatamente o
defeito do ponto 5 da rodada de usabilidade. O custo dessa escolha: em deploy de preview o link
leva ao ambiente do Site URL, então lá se entra por e-mail e senha.

## Configuração que precisa acompanhar

Em **Authentication → URL Configuration**:

- **Site URL** — a origem daquele ambiente (`http://127.0.0.1:3000` em desenvolvimento).
- **Redirect URLs** — `<origem>/auth/callback` continua na lista enquanto existir link no formato
  antigo em alguma caixa de entrada.
