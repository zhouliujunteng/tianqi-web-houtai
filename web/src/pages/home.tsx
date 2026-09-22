import { ArrowRightIcon, ClipboardListIcon, FolderKanbanIcon, MessageSquareIcon, TicketIcon, UsersIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, PageHeader, StatCard } from '@/components/common'
import { AppShell } from '@/components/layout/app-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { gql } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { PLAN_STATUS } from '@/lib/enums'
import { feedbackScope, planScope } from '@/lib/scope'
import { useAsync } from '@/lib/useAsync'

interface Counts { byStatus: Record<string, number>; feedbacks: number; parents?: number; accounts?: number }

const HERO: Record<string, { title: ReactNode; lead: string }> = {
  家长: { title: <>孩子的方案，从建档开始</>, lead: '填写四份表单并提交，总管审核后会按孩子的问题与年龄给出方案答复。方案给出后可持续反馈。' },
  总管: { title: <>每一份方案，先过一道审核</>, lead: '审核待审核方案、设定审核等级与给出时间、指派总监与监护专员，并对反馈做最终把关。' },
  总监: { title: <>分配到你的方案与反馈审阅</>, lead: '查看指派给你的方案，审核监护专员的反馈回复，或在二级审核下直接撰写回复。' },
  监护专员: { title: <>面向家长的回复，由你先写</>, lead: '查看指派给你的方案与家长反馈，撰写回复并提交给总监审核。' },
  客户端管理者: { title: <>管理你的家长与名额</>, lead: '为名下家长开通账号、分配方案名额，并跟踪他们的方案进度。' },
  超级管理员: { title: <>平台全局，一屏总览</>, lead: '账号、名额、方案、反馈，以及标签、题库、方案答复库与平台文档的维护。' },
}

export default function HomePage() {
  const { account } = useAuth()
  const acc = account!
  const hero = HERO[acc.role] ?? { title: <>概览</>, lead: '' }
  const remaining = acc.quota_total - acc.quota_used

  const { data, loading, error } = useAsync<Counts>(async () => {
    const scope = planScope(acc)
    const parts = PLAN_STATUS.map((_, i) => `s${i}: plan_aggregate(where: { _and: [$scope, { status: { _eq: $st${i} } }] }) { aggregate { count } }`).join('\n')
    const decl = PLAN_STATUS.map((_, i) => `$st${i}: fzu_3ae_3acefqe4la5!`).join(', ')
    const vars: Record<string, unknown> = { scope, fb: feedbackScope(acc) }
    PLAN_STATUS.forEach((s, i) => { vars[`st${i}`] = s })
    const extra = acc.role === '客户端管理者'
      ? `parents: account_aggregate(where: { manager_id: { _eq: ${acc.id} }, role: { _eq: "家长" } }) { aggregate { count } }`
      : ['总管', '超级管理员'].includes(acc.role) ? `accounts: account_aggregate { aggregate { count } }` : ''
    const d = await gql<Record<string, { aggregate: { count: number } }>>(
      `query Home($scope: plan_bool_exp!, $fb: feedback_bool_exp!, ${decl}) { ${parts} fb: feedback_aggregate(where: $fb) { aggregate { count } } ${extra} }`, vars)
    const byStatus: Record<string, number> = {}
    PLAN_STATUS.forEach((s, i) => { byStatus[s] = d[`s${i}`].aggregate.count })
    return { byStatus, feedbacks: d.fb.aggregate.count, parents: d.parents?.aggregate.count, accounts: d.accounts?.aggregate.count }
  }, [acc.id])

  const n = (v: number | undefined) => (loading ? '·' : data ? v ?? 0 : '—')

  return (
    <AppShell>
      <PageHeader
        eyebrow={<Badge variant="brand-secondary">{acc.role}</Badge>}
        title={hero.title}
        description={hero.lead}
        actions={
          <>
            {acc.role === '家长' && <Button asChild><Link to="/plans/new">新建方案<ArrowRightIcon /></Link></Button>}
            {acc.role === '家长' && <Button asChild variant="outline"><Link to="/plans">我的方案</Link></Button>}
            {['总管', '超级管理员'].includes(acc.role) && <Button asChild><Link to="/review">进入审核队列<ArrowRightIcon /></Link></Button>}
            {['总监', '监护专员'].includes(acc.role) && <Button asChild><Link to="/feedbacks">处理反馈<ArrowRightIcon /></Link></Button>}
            {acc.role === '客户端管理者' && <Button asChild><Link to="/parents">管理家长<ArrowRightIcon /></Link></Button>}
            {acc.role === '超级管理员' && <Button asChild variant="outline"><Link to="/library">内容库</Link></Button>}
          </>
        }
      />

      <ErrorState message={error} title="统计数据读取失败" />

      {(acc.role === '家长' || acc.role === '客户端管理者') && (
        <Card className="glass-3 mb-6 shadow-none">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{acc.role === '家长' ? '方案名额' : '可分配名额'}</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                {remaining}
                <span className="text-muted-foreground ml-2 text-sm font-normal">/ 共 {acc.quota_total} · 已用 {acc.quota_used}</span>
              </p>
            </div>
            {acc.role === '客户端管理者'
              ? <Button asChild variant="outline" size="sm"><Link to="/quota"><TicketIcon />发放名额</Link></Button>
              : remaining <= 0 && <Badge variant="destructive">名额已用完，请联系管理者</Badge>}
          </CardContent>
        </Card>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">方案统计</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="全部方案" value={n(data ? Object.values(data.byStatus).reduce((a, b) => a + b, 0) : undefined)} icon={<FolderKanbanIcon className="size-3.5" />} />
        {PLAN_STATUS.map((s) => (
          <StatCard key={s} label={s} value={n(data?.byStatus[s])} accent={s === '待审核' || s === '待给出'} />
        ))}
        {acc.role !== '家长' && acc.role !== '客户端管理者' && (
          <StatCard label={acc.role === '超级管理员' ? '全部反馈' : '待我处理的反馈'} value={n(data?.feedbacks)} accent icon={<MessageSquareIcon className="size-3.5" />} />
        )}
        {acc.role === '客户端管理者' && <StatCard label="名下家长" value={n(data?.parents)} icon={<UsersIcon className="size-3.5" />} />}
        {['总管', '超级管理员'].includes(acc.role) && <StatCard label="平台账号" value={n(data?.accounts)} icon={<UsersIcon className="size-3.5" />} />}
        {acc.role === '家长' && <StatCard label="剩余名额" value={remaining} accent hint={`共 ${acc.quota_total} · 已用 ${acc.quota_used}`} icon={<ClipboardListIcon className="size-3.5" />} />}
      </div>
    </AppShell>
  )
}
