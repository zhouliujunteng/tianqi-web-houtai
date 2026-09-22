import { ArrowUpRightIcon, ClockIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingRows, PageHeader, StatusBadge } from '@/components/common'
import { AppShell } from '@/components/layout/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ageFromBirthday, fmtDate } from '@/lib/format'
import { listPlans } from '@/lib/queries'
import { useAsync } from '@/lib/useAsync'

export default function ReviewQueuePage() {
  const { data, loading, error } = useAsync(() => listPlans({ status: { _eq: '待审核' } }), [])
  const rows = [...(data ?? [])].sort((a, b) => (a.submitted_at ?? '').localeCompare(b.submitted_at ?? ''))

  return (
    <AppShell>
      <PageHeader
        eyebrow={`${rows.length} 份待审核`}
        title="审核队列"
        description="按提交时间先后排序。进入详情后可通过（设定审核等级与给出时间）或驳回指定表单。"
      />
      <ErrorState message={error} />
      {loading ? <LoadingRows rows={4} /> : rows.length === 0 ? <EmptyState>当前没有待审核的方案</EmptyState> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p, i) => (
            <Link key={p.id} to={`/review/${p.id}`} className="group">
              <Card className="hover:border-brand/50 h-full shadow-none transition-colors">
                <CardHeader className="flex flex-row items-start justify-between gap-3 p-5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-mono text-xs">{String(i + 1).padStart(2, '0')}</span>
                    <StatusBadge value={p.status} />
                  </div>
                  <ArrowUpRightIcon className="text-muted-foreground group-hover:text-brand size-4 transition-colors" />
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <CardTitle className="text-lg">
                    {p.student?.name ?? '未命名学生'}
                    <span className="text-muted-foreground ml-2 font-mono text-sm font-normal">{ageFromBirthday(p.student?.birthday) ?? '?'} 岁</span>
                  </CardTitle>
                  <p className="text-muted-foreground mt-2 text-sm">家长 {p.parent?.real_name ?? p.parent?.username ?? '—'} · {p.plan_no}</p>
                  <p className="text-muted-foreground mt-3 flex items-center gap-1.5 font-mono text-xs"><ClockIcon className="size-3" />提交 {fmtDate(p.submitted_at)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  )
}
