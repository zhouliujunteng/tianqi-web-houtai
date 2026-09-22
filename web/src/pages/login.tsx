import { ArrowRightIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ErrorState, Field } from '@/components/common'
import { TianqiLogo } from '@/components/logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Glow from '@/components/ui/glow'
import { Input } from '@/components/ui/input'
import { Section } from '@/components/ui/section'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'

export default function LoginPage() {
  const { account, login, loading } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const from = (loc.state as { from?: string } | null)?.from || '/'

  if (!loading && account) return <Navigate to={from} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      const m = errorMessage(err)
      setError(m === '请求失败' ? '用户名或密码错误' : m)
    } finally { setBusy(false) }
  }

  return (
    <Section className="relative flex min-h-svh items-center justify-center overflow-hidden border-b-0 py-0">
      <div className="max-w-container relative z-10 mx-auto flex w-full flex-col items-center gap-8 py-16 sm:gap-12">
        <Badge variant="outline" className="animate-appear gap-2">
          <TianqiLogo className="text-brand size-3.5" />
          <span className="text-muted-foreground">天启 · 学生方案管理平台</span>
        </Badge>
        <h1 className="animate-appear from-foreground to-foreground dark:to-muted-foreground relative z-10 inline-block max-w-3xl bg-linear-to-r bg-clip-text text-center text-4xl leading-tight font-semibold text-balance text-transparent drop-shadow-2xl sm:text-5xl sm:leading-tight md:text-6xl md:leading-tight">
          一个孩子，一份方案，全程有人把关
        </h1>
        <p className="text-md animate-appear text-muted-foreground relative z-10 max-w-[620px] text-center font-medium text-balance opacity-0 delay-100 sm:text-lg">
          家长建档提交，总管审核后按问题与年龄匹配方案答复，反馈逐级审阅回复。请使用平台分配的账号登录。
        </p>

        <Card className="animate-appear glass-3 relative z-10 w-full max-w-sm opacity-0 shadow-xl delay-300">
          <CardContent className="p-6">
            <form onSubmit={submit} className="flex flex-col gap-5">
              <Field label="用户名" htmlFor="username">
                <Input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="手机号或用户名" required />
              </Field>
              <Field label="密码" htmlFor="password">
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
              <ErrorState message={error} title="登录失败" />
              <Button type="submit" size="lg" disabled={busy} className="w-full">
                {busy ? '登录中…' : '登录'}
                {!busy && <ArrowRightIcon />}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="animate-appear text-muted-foreground text-xs opacity-0 delay-500">账号由平台统一开通，忘记密码请联系管理员</p>
      </div>
      <Glow variant="center" className="animate-appear-zoom opacity-0 delay-700" />
    </Section>
  )
}
