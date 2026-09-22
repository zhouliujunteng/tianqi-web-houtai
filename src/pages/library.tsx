import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, Field, LoadingRows, PageHeader, SectionCard, Toast } from '@/components/common'
import { Picker } from '@/components/common-select'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage, gql } from '@/lib/api'
import { DOC_TYPES, QUESTION_SECTIONS } from '@/lib/enums'
import { useAsync, useToast } from '@/lib/useAsync'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'behavior', label: '日常表现标签' },
  { key: 'problem', label: '问题标签' },
  { key: 'questions', label: '父母必答题目' },
  { key: 'answers', label: '方案答复库' },
  { key: 'coverage', label: '覆盖检查' },
  { key: 'docs', label: '平台文档' },
] as const
type TabKey = (typeof TABS)[number]['key']

export default function LibraryPage() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const active = (TABS.find((t) => t.key === tab)?.key ?? 'behavior') as TabKey

  return (
    <AppShell>
      <PageHeader
        eyebrow="内容库"
        title="标签、题库、答复库与文档"
        description="这些内容决定家长表单里能选什么、总管审核通过后自动匹配到哪条答复。修改立即生效。"
      />
      <Tabs value={active} onValueChange={(v) => navigate(`/library/${v}`)} className="mb-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          {TABS.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {active === 'behavior' && <TagTable table="behavior_tag" label="日常表现标签" />}
      {active === 'problem' && <TagTable table="problem_tag" label="问题标签" />}
      {active === 'questions' && <QuestionTable />}
      {active === 'answers' && <AnswerTable />}
      {active === 'coverage' && <CoverageMatrix />}
      {active === 'docs' && <DocTable />}
    </AppShell>
  )
}

interface Tag { id: number; name: string; sort: number; is_active: boolean }

function TagTable({ table, label }: { table: 'behavior_tag' | 'problem_tag'; label: string }) {
  const { toast, show } = useToast()
  const [name, setName] = useState('')
  const { data, loading, error, reload } = useAsync(async () =>
    (await gql<Record<string, Tag[]>>(`query Tags { ${table}(order_by: { sort: asc }) { id name sort is_active } }`))[table], [table])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const sort = (data?.reduce((m, t) => Math.max(m, t.sort), 0) ?? 0) + 1
    try {
      await gql(`mutation AddTag($o: ${table}_insert_input!) { insert_${table}_one(object: $o) { id } }`, { o: { name: name.trim(), sort, is_active: true } })
      setName(''); show('已添加'); reload()
    } catch (err) { show(errorMessage(err), 'err') }
  }
  const patch = async (id: number, set: Partial<Tag>) => {
    try { await gql(`mutation PatchTag($id: bigint!, $s: ${table}_set_input!) { update_${table}_by_pk(pk_columns: { id: $id }, _set: $s) { id } }`, { id, s: set }); reload() }
    catch (err) { show(errorMessage(err), 'err') }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <SectionCard title={`新增${label}`}>
        <form onSubmit={add} className="flex flex-col gap-4">
          <Field label="名称" required><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Button type="submit">添加</Button>
        </form>
      </SectionCard>
      <div>
        <ErrorState message={error} />
        {loading ? <LoadingRows rows={6} /> : !data?.length ? <EmptyState /> : (
          <Card className="overflow-hidden p-0 shadow-none">
            <Table>
              <TableHeader><TableRow><TableHead className="w-24">排序</TableHead><TableHead>名称</TableHead><TableHead className="w-20">启用</TableHead><TableHead className="w-20">ID</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell><Input className="h-8 w-16" type="number" defaultValue={t.sort} onBlur={(e) => Number(e.target.value) !== t.sort && patch(t.id, { sort: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input className="h-8" defaultValue={t.name} onBlur={(e) => e.target.value !== t.name && patch(t.id, { name: e.target.value })} /></TableCell>
                    <TableCell><input type="checkbox" className="accent-brand size-4" checked={t.is_active} onChange={(e) => patch(t.id, { is_active: e.target.checked })} /></TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">#{t.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
      <Toast message={toast?.message ?? null} tone={toast?.tone} />
    </div>
  )
}

interface Question { id: number; section: string; title: string; is_required: boolean; sort: number; is_active: boolean }

function QuestionTable() {
  const { toast, show } = useToast()
  const [f, setF] = useState({ section: QUESTION_SECTIONS[0] as string, title: '', is_required: true })
  const { data, loading, error, reload } = useAsync(async () =>
    (await gql<{ answer_question: Question[] }>(`query Qs { answer_question(order_by: { sort: asc }) { id section title is_required sort is_active } }`)).answer_question, [])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!f.title.trim()) return
    const sort = (data?.reduce((m, t) => Math.max(m, t.sort), 0) ?? 0) + 1
    try {
      await gql(`mutation AddQ($o: answer_question_insert_input!) { insert_answer_question_one(object: $o) { id } }`, { o: { ...f, title: f.title.trim(), sort, is_active: true } })
      setF((s) => ({ ...s, title: '' })); show('已添加'); reload()
    } catch (err) { show(errorMessage(err), 'err') }
  }
  const patch = async (id: number, set: Partial<Question>) => {
    try { await gql(`mutation PatchQ($id: bigint!, $s: answer_question_set_input!) { update_answer_question_by_pk(pk_columns: { id: $id }, _set: $s) { id } }`, { id, s: set }); reload() }
    catch (err) { show(errorMessage(err), 'err') }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <SectionCard title="新增题目">
        <form onSubmit={add} className="flex flex-col gap-4">
          <Field label="分区" required><Picker value={f.section} onChange={(v) => setF((s) => ({ ...s, section: v }))} options={QUESTION_SECTIONS} allowEmpty={false} /></Field>
          <Field label="题目" required><Input value={f.title} onChange={(e) => setF((s) => ({ ...s, title: e.target.value }))} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand size-4" checked={f.is_required} onChange={(e) => setF((s) => ({ ...s, is_required: e.target.checked }))} />必填</label>
          <Button type="submit">添加</Button>
        </form>
      </SectionCard>
      <div>
        <ErrorState message={error} />
        {loading ? <LoadingRows rows={6} /> : !data?.length ? <EmptyState /> : (
          <Card className="overflow-hidden p-0 shadow-none">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead className="w-24">排序</TableHead><TableHead>分区</TableHead><TableHead>题目</TableHead><TableHead className="w-20">必填</TableHead><TableHead className="w-20">启用</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell><Input className="h-8 w-16" type="number" defaultValue={t.sort} onBlur={(e) => Number(e.target.value) !== t.sort && patch(t.id, { sort: Number(e.target.value) })} /></TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{t.section}</TableCell>
                      <TableCell><Input className="h-8" defaultValue={t.title} onBlur={(e) => e.target.value !== t.title && patch(t.id, { title: e.target.value })} /></TableCell>
                      <TableCell><input type="checkbox" className="accent-brand size-4" checked={t.is_required} onChange={(e) => patch(t.id, { is_required: e.target.checked })} /></TableCell>
                      <TableCell><input type="checkbox" className="accent-brand size-4" checked={t.is_active} onChange={(e) => patch(t.id, { is_active: e.target.checked })} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
      <Toast message={toast?.message ?? null} tone={toast?.tone} />
    </div>
  )
}

interface Answer { id: number; age_min: number; age_max: number; principle: string | null; reply: string | null; is_active: boolean; problem_id: number | null }

function AnswerTable() {
  const { toast, show } = useToast()
  const [problem, setProblem] = useState('')
  const [age, setAge] = useState('')
  const [editing, setEditing] = useState<Answer | null>(null)
  const [creating, setCreating] = useState(false)

  const { data: problems } = useAsync(async () => (await gql<{ problem_tag: { id: number; name: string }[] }>(`query PTags { problem_tag(order_by: { sort: asc }) { id name } }`)).problem_tag, [])
  const { data, loading, error, reload } = useAsync(async () => {
    if (!problem) return [] as Answer[]
    return (await gql<{ principle_answer: Answer[] }>(
      `query Ans($p: bigint!) { principle_answer(where: { problem_id: { _eq: $p } }, order_by: { age_min: asc }) { id age_min age_max principle reply is_active problem_id } }`,
      { p: Number(problem) },
    )).principle_answer
  }, [problem])

  const rows = useMemo(() => (data ?? []).filter((a) => !age || (a.age_min <= Number(age) && a.age_max >= Number(age))), [data, age])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    try {
      if (creating) {
        await gql(`mutation AddAns($o: principle_answer_insert_input!) { insert_principle_answer_one(object: $o) { id } }`,
          { o: { problem_id: Number(problem), age_min: editing.age_min, age_max: editing.age_max, principle: editing.principle, reply: editing.reply, is_active: editing.is_active } })
      } else {
        await gql(`mutation PatchAns($id: bigint!, $s: principle_answer_set_input!) { update_principle_answer_by_pk(pk_columns: { id: $id }, _set: $s) { id } }`,
          { id: editing.id, s: { age_min: editing.age_min, age_max: editing.age_max, principle: editing.principle, reply: editing.reply, is_active: editing.is_active } })
      }
      show('已保存'); setEditing(null); setCreating(false); reload()
    } catch (err) { show(errorMessage(err), 'err') }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-52"><Picker value={problem} onChange={setProblem} options={(problems ?? []).map((p) => ({ value: String(p.id), label: p.name }))} placeholder="选择问题标签" /></div>
        <Input className="w-28" type="number" placeholder="年龄" value={age} onChange={(e) => setAge(e.target.value)} />
        {problem && <Button onClick={() => { setCreating(true); setEditing({ id: 0, age_min: 3, age_max: 3, principle: '', reply: '', is_active: true, problem_id: Number(problem) }) }}>新增答复</Button>}
        <p className="text-muted-foreground text-xs">一行 = 一个问题 × 一个年龄段；审核通过时按「问题 + 周岁」精确匹配。</p>
      </div>

      {editing && (
        <SectionCard title={creating ? '新增答复' : `编辑答复 #${editing.id}`} className="mb-6">
          <form onSubmit={save} className="grid gap-5 md:grid-cols-4">
            <Field label="最小年龄" required><Input type="number" value={editing.age_min} onChange={(e) => setEditing({ ...editing, age_min: Number(e.target.value) })} /></Field>
            <Field label="最大年龄" required><Input type="number" value={editing.age_max} onChange={(e) => setEditing({ ...editing, age_max: Number(e.target.value) })} /></Field>
            <label className="flex items-end gap-2 pb-2.5 text-sm md:col-span-2"><input type="checkbox" className="accent-brand size-4" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />启用</label>
            <Field label="基本原则" className="md:col-span-2"><Textarea value={editing.principle ?? ''} onChange={(e) => setEditing({ ...editing, principle: e.target.value })} /></Field>
            <Field label="答复" required className="md:col-span-2"><Textarea className="min-h-48" value={editing.reply ?? ''} onChange={(e) => setEditing({ ...editing, reply: e.target.value })} /></Field>
            <div className="flex gap-3 md:col-span-4"><Button type="submit">保存</Button><Button type="button" variant="outline" onClick={() => { setEditing(null); setCreating(false) }}>取消</Button></div>
          </form>
        </SectionCard>
      )}

      <ErrorState message={error} />
      {!problem ? <EmptyState>先选择一个问题标签</EmptyState> : loading ? <LoadingRows rows={5} /> : rows.length === 0 ? <EmptyState>该问题下没有答复</EmptyState> : (
        <Card className="overflow-hidden p-0 shadow-none">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead className="w-28">年龄</TableHead><TableHead className="w-52">基本原则</TableHead><TableHead>答复</TableHead><TableHead className="w-20">启用</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-sm tabular-nums">{a.age_min === a.age_max ? `${a.age_min} 岁` : `${a.age_min}–${a.age_max} 岁`}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{a.principle || <span className="italic">待补充</span>}</TableCell>
                    <TableCell><p className="line-clamp-3 text-xs whitespace-pre-wrap">{a.reply}</p></TableCell>
                    <TableCell className="text-sm">{a.is_active ? '是' : '否'}</TableCell>
                    <TableCell className="text-right"><Button size="xs" variant="outline" onClick={() => { setCreating(false); setEditing(a) }}>编辑</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
      <Toast message={toast?.message ?? null} tone={toast?.tone} />
    </div>
  )
}

interface Doc { id: number; doc_type: string; title: string | null; content: string | null; is_active: boolean }

function DocTable() {
  const { toast, show } = useToast()
  const [editing, setEditing] = useState<Doc | null>(null)
  const { data, loading, error, reload } = useAsync(async () =>
    (await gql<{ platform_doc: Doc[] }>(`query Docs { platform_doc(order_by: { id: asc }) { id doc_type title content is_active } }`)).platform_doc, [])

  const missing = DOC_TYPES.filter((t) => !data?.some((d) => d.doc_type === t))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    try {
      if (editing.id) {
        await gql(`mutation PatchDoc($id: bigint!, $s: platform_doc_set_input!) { update_platform_doc_by_pk(pk_columns: { id: $id }, _set: $s) { id } }`,
          { id: editing.id, s: { title: editing.title, content: editing.content, is_active: editing.is_active } })
      } else {
        await gql(`mutation AddDoc($o: platform_doc_insert_input!) { insert_platform_doc_one(object: $o) { id } }`,
          { o: { doc_type: editing.doc_type, title: editing.title, content: editing.content, is_active: editing.is_active } })
      }
      show('已保存'); setEditing(null); reload()
    } catch (err) { show(errorMessage(err), 'err') }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div>
        <ErrorState message={error} />
        {loading ? <LoadingRows rows={4} /> : (
          <Card className="divide-border divide-y p-0 shadow-none">
            {data?.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">{d.doc_type}{!d.is_active && ' · 已停用'}</p>
                  <p className="truncate text-sm font-medium">{d.title || '（无标题）'}</p>
                </div>
                <Button size="xs" variant="outline" onClick={() => setEditing(d)}>编辑</Button>
              </div>
            ))}
            {missing.map((t) => (
              <div key={t} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">{t}</p>
                  <p className="text-muted-foreground text-sm">尚未创建</p>
                </div>
                <Button size="xs" onClick={() => setEditing({ id: 0, doc_type: t, title: t, content: '', is_active: true })}>创建</Button>
              </div>
            ))}
          </Card>
        )}
      </div>
      {editing ? (
        <SectionCard title={editing.doc_type} description="内容会直接显示在家长端的平台文档页。">
          <form onSubmit={save} className="flex flex-col gap-5">
            <Field label="标题"><Input value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
            <Field label="内容"><Textarea className="min-h-80" value={editing.content ?? ''} onChange={(e) => setEditing({ ...editing, content: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand size-4" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />启用（家长端可见）</label>
            <div className="flex gap-3"><Button type="submit">保存</Button><Button type="button" variant="outline" onClick={() => setEditing(null)}>取消</Button></div>
          </form>
        </SectionCard>
      ) : <EmptyState>选择左侧文档进行编辑</EmptyState>}
      <Toast message={toast?.message ?? null} tone={toast?.tone} />
    </div>
  )
}


/* ---------------- 答复覆盖检查：问题 × 年龄 ---------------- */

const AGES = Array.from({ length: 21 }, (_, i) => i)

function CoverageMatrix() {
  const { data, loading, error } = useAsync(async () => {
    const d = await gql<{
      problem_tag: { id: number; name: string; is_active: boolean }[]
      principle_answer: { problem_id: number | null; age_min: number; age_max: number; is_active: boolean }[]
    }>(`query Coverage {
      problem_tag(order_by: { sort: asc }) { id name is_active }
      principle_answer(limit: 2000) { problem_id age_min age_max is_active }
    }`)
    return d
  }, [])

  const rows = useMemo(() => {
    if (!data) return []
    return data.problem_tag.map((p) => {
      const spans = data.principle_answer.filter((a) => a.problem_id === p.id && a.is_active)
      const covered = new Set<number>()
      spans.forEach((a) => { for (let x = a.age_min; x <= a.age_max; x++) covered.add(x) })
      const missing = AGES.filter((a) => !covered.has(a))
      return { ...p, covered, missing, total: spans.length }
    })
  }, [data])

  const totalMissing = rows.reduce((n, r) => n + r.missing.length, 0)

  return (
    <div className="space-y-4">
      <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
        <span>审核通过时按「问题 + 孩子周岁」精确匹配，空格处会匹配不到答复、不生成内容。</span>
        <span className="flex items-center gap-1.5"><span className="bg-brand inline-block size-3 rounded-sm" />已覆盖</span>
        <span className="flex items-center gap-1.5"><span className="border-border bg-muted inline-block size-3 rounded-sm border" />缺失</span>
      </div>
      <ErrorState message={error} />
      {loading ? <LoadingRows rows={8} /> : !rows.length ? <EmptyState /> : (
        <>
          <p className="text-sm">
            共 <span className="font-mono font-medium">{rows.length}</span> 个问题标签，0–20 岁合计缺
            <span className="text-brand font-mono font-medium"> {totalMissing} </span>个年龄格。
          </p>
          <Card className="overflow-hidden p-0 shadow-none">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card w-32">问题</TableHead>
                    {AGES.map((a) => <TableHead key={a} className="px-0 text-center font-mono text-[11px]">{a}</TableHead>)}
                    <TableHead className="text-right">缺口</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="bg-card sticky left-0 text-sm font-medium">
                        {r.name}{!r.is_active && <span className="text-muted-foreground ml-1 text-xs">停用</span>}
                      </TableCell>
                      {AGES.map((a) => (
                        <TableCell key={a} className="px-0 text-center">
                          <span
                            title={`${r.name} · ${a} 岁${r.covered.has(a) ? '已覆盖' : '缺失'}`}
                            className={cn('inline-block size-3 rounded-sm', r.covered.has(a) ? 'bg-brand' : 'border-border bg-muted border')}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {r.missing.length === 0
                          ? <span className="text-muted-foreground">—</span>
                          : <span className="text-brand">{r.missing[0]}–{r.missing[r.missing.length - 1]} 岁</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
