import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { gql, getToken, setToken } from './api'
import type { Role } from './enums'

export interface Account {
  id: number
  username: string | null
  real_name: string | null
  role: Role
  account_status: string
  quota_total: number
  quota_used: number
  director_id: number | null
  manager_id: number | null
  fz_phone_number: string | null
}

interface AuthState {
  account: Account | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

const ACCOUNT_FIELDS = `id username real_name role account_status quota_total quota_used director_id manager_id fz_phone_number`

function decodeJwtAccountId(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const id = payload.accountId ?? payload.account_id ?? payload.sub ?? payload.id
    return id != null ? Number(id) : null
  } catch { return null }
}

const ACCOUNT_ID_KEY = 'tq_account_id'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAccount = useCallback(async (id: number) => {
    const data = await gql<{ account_by_pk: Account | null }>(
      `query Me($id: bigint!) { account_by_pk(id: $id) { ${ACCOUNT_FIELDS} } }`,
      { id },
    )
    if (!data.account_by_pk) throw new Error('账户不存在')
    setAccount(data.account_by_pk)
  }, [])

  const refresh = useCallback(async () => {
    // 仅开发环境：?mock=<角色> 用一个假账号预览页面布局（数据请求仍走真实权限）
    if (import.meta.env.DEV) {
      const mock = new URLSearchParams(window.location.search).get('mock') || sessionStorage.getItem('tq_mock')
      if (mock) {
        sessionStorage.setItem('tq_mock', mock)
        setAccount({ id: 0, username: 'preview', real_name: '预览用户', role: mock as Role, account_status: '正常', quota_total: 3, quota_used: 1, director_id: null, manager_id: null, fz_phone_number: null })
        return
      }
    }
    const token = getToken()
    const stored = localStorage.getItem(ACCOUNT_ID_KEY)
    const id = stored ? Number(stored) : token ? decodeJwtAccountId(token) : null
    if (!token || !id) { setAccount(null); return }
    try { await loadAccount(id) } catch { setToken(null); localStorage.removeItem(ACCOUNT_ID_KEY); setAccount(null) }
  }, [loadAccount])

  useEffect(() => { refresh().finally(() => setLoading(false)) }, [refresh])

  const login = useCallback(async (username: string, password: string) => {
    const data = await gql<{ authenticateWithUsername: { account: { id: number }; jwt: { token: string } } }>(
      `mutation Login($username: String!, $password: String!) {
        authenticateWithUsername(username: $username, password: $password, register: false) {
          account { id }
          jwt { token }
        }
      }`,
      { username, password },
      { anonymous: true },
    )
    const { account: acc, jwt } = data.authenticateWithUsername
    setToken(jwt.token)
    localStorage.setItem(ACCOUNT_ID_KEY, String(acc.id))
    try { await loadAccount(acc.id) } catch (e) {
      setToken(null); localStorage.removeItem(ACCOUNT_ID_KEY)
      const msg = e instanceof Error ? e.message : String(e)
      if (/无访问权限|permission/i.test(msg)) throw new Error('登录成功，但该账号尚未绑定平台角色权限。请联系管理员在 Zion 编辑器中为账号分配角色后再试。')
      throw e
    }
  }, [loadAccount])

  const logout = useCallback(() => {
    sessionStorage.removeItem('tq_mock')
    setToken(null)
    localStorage.removeItem(ACCOUNT_ID_KEY)
    setAccount(null)
  }, [])

  const value = useMemo(() => ({ account, loading, login, logout, refresh }), [account, loading, login, logout, refresh])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}
