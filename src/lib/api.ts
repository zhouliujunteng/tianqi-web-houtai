export const PROJECT_EX_ID = 'bZ7yl9D0nJY'
export const ENDPOINT = `https://zion-app.functorz.com/zero/${PROJECT_EX_ID}/api/graphql-v2`

const TOKEN_KEY = 'tq_token'

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* ignore */ }
}

export class GqlError extends Error {
  errors: { message: string; path?: string[] }[]
  constructor(errors: { message: string; path?: string[] }[]) {
    super(errors.map((e) => e.message).join('; '))
    this.errors = errors
  }
}

export async function gql<T = unknown>(query: string, variables?: Record<string, unknown>, opts?: { anonymous?: boolean }): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = opts?.anonymous ? null : getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify({ query, variables }) })
  const json = await res.json().catch(() => ({}))
  if (json.errors?.length) throw new GqlError(json.errors)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return json.data as T
}

export const ACTIONFLOW = {
  chiefApprove: 'ec837508-3eb6-4a81-9bdf-a4066d121b3e',
  chiefReject: '3c0b9c09-22ac-4482-9568-037e3a53f789',
}

export async function invokeActionFlow<T = unknown>(actionFlowId: string, args: Record<string, unknown>): Promise<T> {
  const data = await gql<{ fz_invoke_action_flow_default_by_latest_version: T }>(
    `mutation Invoke($actionFlowId: String!, $args: Json!) { fz_invoke_action_flow_default_by_latest_version(actionFlowId: $actionFlowId, args: $args) }`,
    { actionFlowId, args },
  )
  return data.fz_invoke_action_flow_default_by_latest_version
}

export function errorMessage(e: unknown): string {
  if (e instanceof GqlError) {
    const m = e.errors[0]?.message ?? '请求失败'
    if (/permission denied/i.test(m)) return '没有权限执行此操作（后端权限未开放）'
    return m
  }
  if (e instanceof Error) return e.message
  return String(e)
}
