import { PlusIcon, SearchIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingRows, PageHeader, StatusBadge } from '@/components/common'
import { Picker } from '@/components/common-select'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth'
import { PLAN_STATUS } from '@/lib/enums'
import { ageFromBirthday, fmtDate } from '@/lib/format'
import { listPlans } from '@/lib/queries'
import { planScope } from '@/lib/scope'
import { useAsync } from '@/lib/useAsync'

const TITLES: Record<string, string> = { 家长: '我的方案', 总监: '分配给我的方案', 监护专员: '分配给我的方案', 客户端管理者: '名下家长的方案' }

export default function PlansPage() {
  const { account } = useAuth()
  const acc = account!
  const [sp, setSp] = useSearchParams()
  const status = sp.get('status') ?? ''
  const [q, setQ] = useState('')
  const { data, loading, error } = useAsync(() => listPlans(planScope(acc)), [acc.id])

  const rows = useMemo(() => (data ?? []).filter((p) =>
    (!status || p.status === status) &&
    (!q || (p.student?.name ?? '').includes(q) || (p.plan_no ?? '').includes(q) || (p.parent?.real_name ?? '').includes(q)),
  ), [data, status, q])

  return (
    <AppShell>
      <PageHeader
        eyebrow={`共 ${rows.length} 份`}
        title={TITLES[acc.role] ?? '全部方案'}
        description="点击任一行查看方案详情、原则答复、审核记录与反馈。"
        actions={acc.role === '家长' && <Button asChild><Link to="/plans/new"><PlusIcon />新建方案</Link></Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-44"><Picker value={status} onChange={(v) => { if (v) sp.set('status', v); else sp.delete('status'); setSp(sp) }} options={PLAN_STATUS} placeholder="全部状态" /></div>
        <div className="relative w-full sm:w-72">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input className="pl-9" placeholder="搜索学生 / 编号 / 家长" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <ErrorState message={error} />
      {loading ? <LoadingRows rows={6} /> : rows.length === 0 ? <EmptyState>没有符合条件的方案</EmptyState> : (
        <Card className="overflow-hidden p-0 shadow-none">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>编号</TableHead>
                  <TableHead>学生</TableHead>
                  <TableHead className="text-right">年龄</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>审核等级</TableHead>
                  {acc.role !== '家长' && <TableHead>家长</TableHead>}
                  <TableHead>总监 / 专员</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead>给出时间</TableHead>
                  <TableHead className="text-right">反馈</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id} className="group">
                    <TableCell className="font-mono text-xs">
                      <Link to={`/plans/${p.id}`} className="text-brand hover:underline">{p.plan_no ?? `#${p.id}`}</Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link to={`/plans/${p.id}`} className="hover:underline">{p.student?.name ?? '—'}</Link>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{ageFromBirthday(p.student?.birthday) ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusBadge value={p.status} />
                        {p.status === '已驳回' && p.rejected_form && <span className="text-muted-foreground text-xs">{p.rejected_form}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.review_level ?? '—'}</TableCell>
                    {acc.role !== '家长' && <TableCell className="text-sm">{p.parent?.real_name ?? p.parent?.username ?? '—'}</TableCell>}
                    <TableCell className="text-muted-foreground text-xs">{p.director?.real_name ?? '—'} / {p.specialist?.real_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{fmtDate(p.submitted_at)}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{fmtDate(p.deliver_at)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{p.feedback_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </AppShell>
  )
}
