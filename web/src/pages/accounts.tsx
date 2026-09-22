import { PlusIcon, SearchIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AccountForm } from '@/components/account-form'
import { EmptyState, ErrorState, LoadingRows, PageHeader, SectionCard, StatusBadge, Toast } from '@/components/common'
import { Picker } from '@/components/common-select'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { errorMessage, gql } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { ROLES, type Role } from '@/lib/enums'
import { fmtDate } from '@/lib/format'
import { useAsync, useToast } from '@/lib/useAsync'

export interface AccRow {
  id: number; username: string | null; real_name: string | null; role: Role; account_status: string
  quota_total: number; quota_used: number; fz_phone_number: string | null; remark: string | null; created_at: string
  director: { id: number; real_name: string | null } | null
  manager: { id: number; real_name: string | null } | null
}

export const ACC_FIELDS = `id username real_name role account_status quota_total quota_used fz_phone_number remark created_at director { id real_name } manager { id real_name }`

export default function AccountsPage() {
  const { account } = useAuth()
  const acc = account!
  const [role, setRole] = useState('')
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const { toast, show } = useToast()
  const { data, loading, error, reload } = useAsync(async () =>
    (await gql<{ account: AccRow[] }>(`query Accs { account(where: { fz_deleted: { _eq: false } }, order_by: { id: asc }, limit: 500) { ${ACC_FIELDS} } }`)).account, [acc.id])

  const rows = useMemo(() => (data ?? []).filter((a) =>
    (!role || a.role === role) && (!q || (a.real_name ?? '').includes(q) || (a.username ?? '').includes(q) || (a.fz_phone_number ?? '').includes(q)),
  ), [data, role, q])
  const directors = useMemo(() => (data ?? []).filter((a) => a.role === '总监'), [data])
  const managers = useMemo(() => (data ?? []).filter((a) => a.role === '客户端管理者'), [data])

  const toggle = async (a: AccRow) => {
    const next = a.account_status === '正常' ? '停用' : '正常'
    try {
      await gql(`mutation Toggle($id: bigint!, $s: fzu_3ae_3aimpi71dey!) { update_account_by_pk(pk_columns: { id: $id }, _set: { account_status: $s }) { id } }`, { id: a.id, s: next })
      show(`已${next === '停用' ? '停用' : '恢复'} ${a.real_name ?? a.username}`); reload()
    } catch (e) { show(errorMessage(e), 'err') }
  }

  const creatable: Role[] = acc.role === '超级管理员' ? [...ROLES] : ['总监', '监护专员', '客户端管理者', '家长']

  return (
    <AppShell>
      <PageHeader
        eyebrow={`${rows.length} 个账号`}
        title="平台账号"
        description="创建并管理总管、总监、监护专员、客户端管理者与家长账号。停用后账号无法使用。"
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? '收起' : <><PlusIcon />新建账号</>}</Button>}
      />
      {showForm && <div className="mb-6"><SectionCard title="创建账号" description="创建后会自动绑定对应的平台权限角色。"><AccountForm allowedRoles={creatable} directors={directors} managers={managers} onDone={() => { setShowForm(false); show('账号已创建'); reload() }} /></SectionCard></div>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-44"><Picker value={role} onChange={setRole} options={ROLES} placeholder="全部角色" /></div>
        <div className="relative w-full sm:w-72">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input className="pl-9" placeholder="搜索姓名 / 用户名 / 手机" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <ErrorState message={error} />
      {loading ? <LoadingRows rows={6} /> : rows.length === 0 ? <EmptyState /> : (
        <Card className="overflow-hidden p-0 shadow-none">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead><TableHead>姓名</TableHead><TableHead>用户名</TableHead><TableHead>角色</TableHead>
                  <TableHead>状态</TableHead><TableHead>手机</TableHead><TableHead className="text-right">名额</TableHead>
                  <TableHead>归属</TableHead><TableHead>创建</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-muted-foreground font-mono text-xs">{String(a.id).slice(-6)}</TableCell>
                    <TableCell className="font-medium">{a.real_name ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{a.username ?? '—'}</TableCell>
                    <TableCell className="text-sm">{a.role}</TableCell>
                    <TableCell><StatusBadge value={a.account_status} /></TableCell>
                    <TableCell className="font-mono text-xs">{a.fz_phone_number || '—'}</TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">{(a.role === '家长' || a.role === '客户端管理者') ? `${a.quota_used}/${a.quota_total}` : '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{a.director ? `总监 ${a.director.real_name}` : a.manager ? `管理者 ${a.manager.real_name}` : '—'}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{fmtDate(a.created_at, false)}</TableCell>
                    <TableCell className="text-right">
                      {a.id !== acc.id && a.role !== '超级管理员' && (
                        <Button size="xs" variant={a.account_status === '正常' ? 'destructive' : 'outline'} onClick={() => toggle(a)}>
                          {a.account_status === '正常' ? '停用' : '恢复'}
                        </Button>
                      )}
                    </TableCell>
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
