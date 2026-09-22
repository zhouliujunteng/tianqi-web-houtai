import { useState, type FormEvent } from 'react'
import { ErrorState, Field } from '@/components/common'
import { Picker } from '@/components/common-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorMessage, gql } from '@/lib/api'
import { ROLES, type Role } from '@/lib/enums'

interface Props {
  allowedRoles: Role[]
  fixed?: { manager_id?: number; role?: Role }
  directors?: { id: number; real_name: string | null }[]
  managers?: { id: number; real_name: string | null }[]
  onDone: () => void
}

/** 创建账号：先匿名注册拿到 id，再以当前登录者身份补齐资料并绑定权限角色 */
export function AccountForm({ allowedRoles, fixed, directors, managers, onDone }: Props) {
  const [f, setF] = useState({
    username: '', password: '', real_name: '', role: (fixed?.role ?? allowedRoles[0]) as string, phone: '',
    director_id: '', manager_id: fixed?.manager_id ? String(fixed.manager_id) : '', quota: '0', remark: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const reg = await gql<{ authenticateWithUsername: { account: { id: number } } }>(
        `mutation Reg($u: String!, $p: String!) { authenticateWithUsername(username: $u, password: $p, register: true) { account { id } } }`,
        { u: f.username.trim(), p: f.password }, { anonymous: true },
      )
      const id = reg.authenticateWithUsername.account.id
      const roles = await gql<{ fz_permission_role: { id: number; name: string }[] }>(`query Roles { fz_permission_role { id name } }`)
      const roleRow = roles.fz_permission_role.find((r) => r.name === f.role)
      const setObj: Record<string, unknown> = {
        role: f.role, real_name: f.real_name.trim() || null, remark: f.remark || null,
        quota_total: Number(f.quota) || 0,
        director_id: f.director_id ? Number(f.director_id) : null,
        manager_id: f.manager_id ? Number(f.manager_id) : null,
      }
      if (f.phone.trim()) setObj.fz_phone_number = f.phone.trim()
      await gql(
        `mutation Fix($id: bigint!, $set: account_set_input!${roleRow ? ', $rid: bigint!' : ''}) {
          update_account_by_pk(pk_columns: { id: $id }, _set: $set) { id }
          ${roleRow ? 'insert_fz_account_has_permission_role_one(object: { account_id: $id, role_id: $rid }) { id }' : ''}
        }`,
        roleRow ? { id, set: setObj, rid: roleRow.id } : { id, set: setObj },
      )
      onDone()
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
      <Field label="用户名" required><Input value={f.username} onChange={(e) => set('username')(e.target.value)} required minLength={3} placeholder="手机号或英文用户名" /></Field>
      <Field label="初始密码" required hint="至少 6 位"><Input value={f.password} onChange={(e) => set('password')(e.target.value)} required minLength={6} /></Field>
      <Field label="真实姓名"><Input value={f.real_name} onChange={(e) => set('real_name')(e.target.value)} /></Field>
      <Field label="手机号"><Input value={f.phone} onChange={(e) => set('phone')(e.target.value)} /></Field>
      <Field label="角色" required>
        {fixed?.role ? <Input value={fixed.role} disabled /> : <Picker value={f.role} onChange={set('role')} options={allowedRoles.length ? allowedRoles : [...ROLES]} allowEmpty={false} />}
      </Field>
      {f.role === '监护专员' && directors && (
        <Field label="所属总监"><Picker value={f.director_id} onChange={set('director_id')} options={directors.map((d) => ({ value: String(d.id), label: d.real_name ?? `#${d.id}` }))} placeholder="未指定" /></Field>
      )}
      {f.role === '家长' && !fixed?.manager_id && managers && (
        <Field label="所属客户端管理者"><Picker value={f.manager_id} onChange={set('manager_id')} options={managers.map((d) => ({ value: String(d.id), label: d.real_name ?? `#${d.id}` }))} placeholder="未指定" /></Field>
      )}
      {(f.role === '家长' || f.role === '客户端管理者') && (
        <Field label="初始名额"><Input type="number" min={0} value={f.quota} onChange={(e) => set('quota')(e.target.value)} /></Field>
      )}
      <Field label="备注"><Input value={f.remark} onChange={(e) => set('remark')(e.target.value)} /></Field>
      <div className="md:col-span-2"><ErrorState message={error} title="创建失败" /></div>
      <div className="md:col-span-2"><Button type="submit" disabled={busy}>{busy ? '创建中…' : '创建账号'}</Button></div>
    </form>
  )
}
