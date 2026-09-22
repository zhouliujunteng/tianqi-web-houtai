import { PlusIcon, TicketIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AccountForm } from '@/components/account-form'
import { EmptyState, ErrorState, LoadingRows, PageHeader, SectionCard, StatCard, StatusBadge, Toast } from '@/components/common'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { gql } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useAsync, useToast } from '@/lib/useAsync'
import { ACC_FIELDS, type AccRow } from './accounts'

export default function ParentsPage() {
  const { account, refresh } = useAuth()
  const acc = account!
  const [showForm, setShowForm] = useState(false)
  const { toast, show } = useToast()
  const { data, loading, error, reload } = useAsync(async () =>
    (await gql<{ account: (AccRow & { plans_aggregate: { aggregate: { count: number } } })[] }>(
      `query Parents($m: bigint!) { account(where: { manager_id: { _eq: $m }, role: { _eq: "家长" } }, order_by: { id: asc }) { ${ACC_FIELDS} plans_aggregate { aggregate { count } } } }`,
      { m: acc.id },
    )).account, [acc.id])

  const remaining = acc.quota_total - acc.quota_used

  return (
    <AppShell>
      <PageHeader
        eyebrow={`${data?.length ?? 0} 位家长`}
        title="名下家长"
        description="为家长开通登录账号，并在名额页把方案名额分配给他们。"
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? '收起' : <><PlusIcon />新建家长账号</>}</Button>}
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="名额总数" value={acc.quota_total} />
        <StatCard label="已分配" value={acc.quota_used} />
        <StatCard label="可分配" value={remaining} accent />
      </div>

      {showForm && <div className="mb-6"><SectionCard title="创建家长账号"><AccountForm allowedRoles={['家长']} fixed={{ role: '家长', manager_id: acc.id }} onDone={() => { setShowForm(false); show('家长账号已创建'); reload(); refresh() }} /></SectionCard></div>}

      <ErrorState message={error} />
      {loading ? <LoadingRows rows={5} /> : !data?.length ? <EmptyState>还没有家长，点击右上角创建。</EmptyState> : (
        <Card className="overflow-hidden p-0 shadow-none">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow><TableHead>姓名</TableHead><TableHead>用户名</TableHead><TableHead>手机</TableHead><TableHead>状态</TableHead><TableHead className="text-right">名额</TableHead><TableHead className="text-right">方案数</TableHead><TableHead /></TableRow>
              </TableHeader>
              <TableBody>
                {data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.real_name ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{a.username ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{a.fz_phone_number || '—'}</TableCell>
                    <TableCell><StatusBadge value={a.account_status} /></TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">{a.quota_used}/{a.quota_total}</TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">{a.plans_aggregate.aggregate.count}</TableCell>
                    <TableCell className="text-right"><Button asChild size="xs" variant="outline"><Link to={`/quota?to=${a.id}`}><TicketIcon />分配名额</Link></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
      <Toast message={toast?.message ?? null} tone={toast?.tone} />
    </AppShell>
  )
}
