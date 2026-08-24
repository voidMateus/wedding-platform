import { TEST_SERVER_BASE_URL } from './test-server'

export interface TestApiClient {
  get(path: string, init?: RequestInit): Promise<Response>
  post(path: string, body?: unknown, init?: RequestInit): Promise<Response>
  put(path: string, body?: unknown, init?: RequestInit): Promise<Response>
  patch(path: string, body?: unknown, init?: RequestInit): Promise<Response>
  del(path: string, init?: RequestInit): Promise<Response>
}

export interface CreateTestApiClientOptions {
  /** Cookie de sessão já pronto (ex.: tests/integration/helpers/admin-session.ts) — usado nas rotas administrativas. */
  cookie?: string
}

function randomOctet(): number {
  return Math.floor(Math.random() * 254) + 1
}

/**
 * Client HTTP de teste com jar de cookie simples (guarda o último Set-Cookie
 * e reenvia automaticamente nas próximas chamadas do mesmo client) e um
 * `X-Forwarded-For` fixo e exclusivo por instância — o rate limiting do
 * caminho do convidado (CLAUDE.md, seção 14.5; server/middleware/rate-limit.ts)
 * é por IP, então todo teste que faz várias chamadas HTTP contra o mesmo
 * fluxo cria seu próprio client via `createTestApiClient()`, nunca
 * reaproveita o de outro teste — evita um teste consumir o orçamento de
 * rate limit de outro só por rodarem na mesma janela de tempo.
 */
export function createTestApiClient(options: CreateTestApiClientOptions = {}): TestApiClient {
  const fakeIp = `10.${randomOctet()}.${randomOctet()}.${randomOctet()}`
  let cookieJar = options.cookie ?? ''

  async function request(method: string, path: string, body?: unknown, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers)
    headers.set('x-forwarded-for', fakeIp)
    if (cookieJar) headers.set('cookie', cookieJar)
    if (body !== undefined) headers.set('content-type', 'application/json')

    const response = await fetch(`${TEST_SERVER_BASE_URL}${path}`, {
      ...init,
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : init.body,
    })

    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      cookieJar = setCookie.split(';')[0] ?? ''
    }

    return response
  }

  return {
    get: (path, init) => request('GET', path, undefined, init),
    post: (path, body, init) => request('POST', path, body, init),
    put: (path, body, init) => request('PUT', path, body, init),
    patch: (path, body, init) => request('PATCH', path, body, init),
    del: (path, init) => request('DELETE', path, undefined, init),
  }
}
