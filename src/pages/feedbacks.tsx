import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingRows, PageHeader, StatusBadge } from '@/components/common'
import { Picker } from '@/components/common-select'
import { AppShell } from '@/components/layout/app-shell'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { gql } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { FEEDBACK_STATUS } from '@/lib/enums'
import { fmtDate } from '@/lib/format'
import { feedbackScope } from '@/lib/scope'
import { useAsync } from '@/lib/useAsync'

interface FbRow {
  id: number; seq: number; content: string | null; status: string; created_at: string
  plan: { id: number; plan_no: string | null; review_level: string | null; student: { name: string } | null; parent: { real_name: string | null } | null } | null
}

const KICKER: Record<string, string> = { 总管: '等待总管最终审核', 总监: '等待总监审核', 监护专员: '等待专员回复' }

export default function FeedbacksPage() {
  const { account } = useAuth()
  const acc = account!
  const [status, setStatus] = useState('')
  const { data, loading, error } = useAsync(async () => {
    const scope = acc.role === '超级管理员' ? {} : feedbackScope(acc)
    const where = status ? { _and: [scope, { status: { _eq: status } }] } : scope
    const d = await gql<{ feedback: FbRow[] }>(
      `query Fb($where: feedback_bool_exp) { feedback(where: $where, order_by: { created_at: asc }, limit: 300) { id seq content status created_at plan { id plan_no review_level student { name } parent { real_name } } } }`,
      { where },
    )
    return d.feedback
  }, [acc.id, status])

  return (
    <AppShell>
      <PageHeader
        eyebrow={`${data?.length ?? 0} 条`}
        title={acc.role === '超级管理员' ? '全部反馈' : KICKER[acc.role] ?? '反馈'}
        description="反馈按方案审核等级逐级流转：监护专员回复 → 总监审核 → 总管审核 → 延时后对家长可见。"
        actions={acc.role === '超级管理员' && <div className="w-44"><Picker value={status} onChange={setStatus} options={FEEDBACK_STATUS} placeholder="全部状态" /></div>}
      />
      <ErrorState message={error} />
      {loading ? <LoadingRows rows={4} /> : !data?.length ? <EmptyState>暂无需要处理的反馈</EmptyState> : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((f) => (
            <Link key={f.id} to={`/plans/${f.plan?.id}#feedback-${f.id}`} className="group">
              <Card className="hover:border-brand/50 h-full shadow-none transition-colors">
                <CardHeader className="flex flex-row items-center justify-between gap-3 p-5 pb-2">
                  <span className="text-muted-foreground font-mono text-xs">#{f.seq} · {f.plan?.plan_no}</span>
                  <StatusBadge value={f.status} />
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-sm font-medium">
                    {f.plan?.student?.name ?? '—'}
                    <span className="text-muted-foreground ml-2 text-xs font-normal">家长 {f.plan?.parent?.real_name ?? '—'} · {f.plan?.review_level ?? '未定级'}</span>
                  </p>
                  <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">{f.content}</p>
                  <p className="text-muted-foreground mt-3 font-mono text-xs">{fmtDate(f.created_at)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  )
}
