import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, Field, LoadingRows, PageHeader, SectionCard, StatCard, Toast } from '@/components/common'
import { Picker } from '@/components/common-select'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { errorMessage, gql } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { fmtDate } from '@/lib/format'
import { useAsync, useToast } from '@/lib/useAsync'

interface Grant {
  id: number; grant_type: string; quantity: number; remark: string | null; created_at: string
  grantor: { real_name: string | null; username: string | null } | null
  grantee: { id: number; real_name: string | null; username: string | null; role: string } | null
}
interface Target { id: number; real_name: string | null; username: string | null; quota_total: number; quota_used: number }

export default function QuotaPage() {
  const { account, refresh } = useAuth()
  const acc = account!
  const isManager = acc.role === '客户端管理者'
  const [sp] = useSearchParams()
  const [to, setTo] = useState(sp.get('to') ?? '')
  const [qty, setQty] = useState('1')
  const [remark, setRemark] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const { toast, show } = useToast()

  const { data, loading, error, reload } = useAsync(async () => {
    const targetWhere = isManager ? { manager_id: { _eq: acc.id }, role: { _eq: '家长' } } : { role: { _eq: '客户端管理者' } }
    const grantWhere = isManager ? { grantor_id: { _eq: acc.id } } : {}
    return gql<{ account: Target[]; quota_grant: Grant[] }>(`query Q($tw: account_bool_exp!, $gw: quota_grant_bool_exp!) {
      account(where: $tw, order_by: { id: asc }) { id real_name username quota_total quota_used }
      quota_grant(where: $gw, order_by: { created_at: desc }, limit: 200) { id grant_type quantity remark created_at grantor { real_name username } grantee { id real_name username role } }
    }`, { tw: targetWhere, gw: grantWhere })
  }, [acc.id])

  const targets = useMemo(() => data?.account ?? [], [data])
  const remaining = acc.quota_total - acc.quota_used

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const n = Number(qty)
    if (!to || !n || n <= 0) return
    if (isManager && n > remaining) { setErr(`可分配名额不足（剩余 ${remaining}）`); return }
    setBusy(true); setErr(null)
    try {
      const target = targets.find((t) => String(t.id) === to)
      if (!target) throw new Error('接收人不存在，请刷新后重试')
      // 同上：断言前值 + 写入绝对值，既防并发也让行级权限能判定写入值
      const res = await gql<{ grantee: { affected_rows: number }; self?: { affected_rows: number } }>(
        `mutation Grant($obj: quota_grant_insert_input!, $to: bigint!, $wasTotal: bigint!, $newTotal: bigint!${isManager ? ', $me: bigint!, $wasUsed: bigint!, $newUsed: bigint!' : ''}) {
          insert_quota_grant_one(object: $obj) { id }
          grantee: update_account(where: { id: { _eq: $to }, quota_total: { _eq: $wasTotal } }, _set: { quota_total: $newTotal }) { affected_rows }
          ${isManager ? 'self: update_account(where: { id: { _eq: $me }, quota_used: { _eq: $wasUsed } }, _set: { quota_used: $newUsed }) { affected_rows }' : ''}
        }`, {
          obj: { grant_type: isManager ? '管理者分配给家长' : '管理端分配给管理者', quantity: n, remark: remark || null, grantor_id: acc.id, grantee_id: Number(to) },
          to: Number(to), wasTotal: target.quota_total, newTotal: target.quota_total + n,
          ...(isManager ? { me: acc.id, wasUsed: acc.quota_used, newUsed: acc.quota_used + n } : {}),
        },
      )
      if (res.grantee.affected_rows !== 1 || (isManager && res.self?.affected_rows !== 1)) {
        throw new Error('名额状态已变化，请刷新后重试')
      }
      show(`已发放 ${n} 个名额`); setQty('1'); setRemark(''); reload(); refresh()
    } catch (e2) { setErr(errorMessage(e2)) } finally { setBusy(false) }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="名额"
        title={isManager ? '分配名额给家长' : '发放名额给客户端管理者'}
        description={isManager ? '每分配 1 个名额，家长可新建 1 份方案；分配会消耗你自己的可分配名额。' : '管理端向客户端管理者发放名额，管理者再向名下家长分配。'}
      />

      {isManager && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <StatCard label="名额总数" value={acc.quota_total} />
          <StatCard label="已分配" value={acc.quota_used} />
          <StatCard label="可分配" value={remaining} accent />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <SectionCard title="新建发放">
          <form onSubmit={submit} className="flex flex-col gap-5">
            <Field label={isManager ? '家长' : '客户端管理者'} required>
              <Picker value={to} onChange={setTo} options={targets.map((t) => ({ value: String(t.id), label: `${t.real_name ?? t.username ?? t.id}（${t.quota_used}/${t.quota_total}）` }))} placeholder="选择接收人" />
            </Field>
            <Field label="数量" required><Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
            <Field label="备注"><Input value={remark} onChange={(e) => setRemark(e.target.value)} /></Field>
            <ErrorState message={err} title="发放失败" />
            <Button type="submit" disabled={busy || !to}>{busy ? '发放中…' : '确认发放'}</Button>
          </form>
        </SectionCard>

        <div>
          <h2 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">发放记录</h2>
          <ErrorState message={error} />
          {loading ? <LoadingRows rows={5} /> : !data?.quota_grant.length ? <EmptyState>暂无发放记录</EmptyState> : (
            <Card className="overflow-hidden p-0 shadow-none">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>时间</TableHead><TableHead>类型</TableHead><TableHead>发放人</TableHead><TableHead>接收人</TableHead><TableHead className="text-right">数量</TableHead><TableHead>备注</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.quota_grant.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="text-muted-foreground font-mono text-xs">{fmtDate(g.created_at)}</TableCell>
                        <TableCell className="text-xs">{g.grant_type}</TableCell>
                        <TableCell className="text-sm">{g.grantor?.real_name ?? g.grantor?.username ?? '—'}</TableCell>
                        <TableCell className="text-sm">{g.grantee?.real_name ?? g.grantee?.username ?? '—'} <span className="text-muted-foreground text-xs">{g.grantee?.role}</span></TableCell>
                        <TableCell className="text-brand text-right font-mono font-medium tabular-nums">+{g.quantity}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{g.remark ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      </div>
      <Toast message={toast?.message ?? null} tone={toast?.tone} />
    </AppShell>
  )
}
