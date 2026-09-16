import { resolveDevPort } from '../../scripts/dev-port.mjs'

/**
 * Aquece as rotas do painel antes de qualquer teste rodar.
 *
 * O `webServer` do Playwright espera o dev server responder em `/` — e só. Mas
 * o Nuxt compila rota sob demanda, então o PRIMEIRO acesso a `/login` e a
 * `/admin` paga a compilação inteira, que numa máquina de CI passa de vinte
 * segundos.
 *
 * Sem este aquecimento, quem paga a conta são os primeiros arquivos da suíte —
 * e eles pagam ao mesmo tempo, porque rodam em paralelo. Foi exatamente o que
 * aconteceu quando `acesso-de-suporte.spec.ts` entrou e virou o primeiro
 * arquivo em ordem alfabética: ele e `acompanhantes.spec.ts` passaram a
 * disputar o cold start, e os dois falharam no CI com a mesma assinatura — o
 * clique em "Entrar" e a URL parada em `/login`.
 *
 * Aquecer em série aqui troca N compilações concorrentes por uma, antes de o
 * relógio de qualquer teste começar. É a correção da causa; aumentar o timeout
 * dos testes só esconderia o custo até a próxima máquina mais lenta.
 */
export default async function globalSetup() {
  const baseURL = `http://localhost:${resolveDevPort()}`

  // `/admin` responde redirecionando para `/login` sem sessão — o que importa
  // é que a rota seja compilada, não o que ela devolve.
  for (const rota of ['/login', '/admin']) {
    try {
      await fetch(`${baseURL}${rota}`, { redirect: 'manual' })
    } catch {
      // Um aquecimento que falha não pode derrubar a suíte: o teste seguinte
      // dirá a verdade sobre o servidor estar de pé ou não.
    }
  }
}
