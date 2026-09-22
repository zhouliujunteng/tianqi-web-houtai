import { CheckIcon, TriangleAlertIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, Field, LoadingRows, PageHeader, SectionCard, Toast } from '@/components/common'
import { Picker } from '@/components/common-select'
import { ImageGallery, ImagePicker } from '@/components/image-picker'
import { AppShell } from '@/components/layout/app-shell'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage, gql } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { FORM_TYPES, GENDERS, GRADES, RELATIONS, type FormType } from '@/lib/enums'
import { genPlanNo, isUniqueViolation } from '@/lib/format'
import type { UploadedImage } from '@/lib/upload'
import { useAsync, useToast } from '@/lib/useAsync'
import { cn } from '@/lib/utils'

interface Tag { id: number; name: string }
interface Question { id: number; section: string; title: string; is_required: boolean; sort: number }
interface Loaded {
  plan: {
    id: number; status: string; rejected_form: string | null; reject_reason: string | null; grade_at_filing: string | null
    form_student_done: boolean; form_family_done: boolean; form_plan_done: boolean; form_answer_done: boolean
    student: { id: number; name: string; gender: string | null; birthday: string | null; identify_condition: string | null } | null
    family_info: { id: number; father_name: string | null; father_job: string | null; father_cognition: { text?: string } | null; mother_name: string | null; mother_job: string | null; mother_cognition: { text?: string } | null; other_members: string | null; is_divorced: boolean | null; relation_to_child: string | null; executors: string | null } | null
    student_plan_form: { id: number; grade: string | null; influence_factors: string | null; income_source: string | null; specific_problem: string | null; photo: { id: number; url: string } | null } | null
    photos: { id: number; sort: number; photo: { id: number; url: string } | null }[]
    behaviors: { tag_id: number }[]
    problems: { tag_id: number }[]
    answers: { question_id: number; answer: string | null }[]
  } | null
}

const STEP_INDEX: Record<FormType, number> = { 学生基本信息: 0, 家庭信息: 1, 学生方案: 2, 父母必答: 3 }

export default function PlanWizardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { account, refresh } = useAuth()
  const acc = account!
  const { toast, show } = useToast()
  const [planId, setPlanId] = useState<number | null>(id ? Number(id) : null)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [student, setStudent] = useState({ name: '', gender: '', birthday: '', identify_condition: '', grade_at_filing: '' })
  const [family, setFamily] = useState({ father_name: '', father_job: '', father_cognition: '', mother_name: '', mother_job: '', mother_cognition: '', other_members: '', is_divorced: 'false', relation_to_child: '', executors: '' })
  const [planForm, setPlanForm] = useState({ grade: '', influence_factors: '', income_source: '', specific_problem: '' })
  const [studentPhoto, setStudentPhoto] = useState<UploadedImage | null>(null)
  const [planPhotos, setPlanPhotos] = useState<UploadedImage[]>([])
  const [behaviors, setBehaviors] = useState<number[]>([])
  const [problems, setProblems] = useState<number[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [done, setDone] = useState({ s: false, f: false, p: false, a: false })
  const [status, setStatus] = useState('草稿')
  const [rejected, setRejected] = useState<{ form: string | null; reason: string | null }>({ form: null, reason: null })

  const { data: refs, loading: refsLoading } = useAsync(async () => gql<{ behavior_tag: Tag[]; problem_tag: Tag[]; answer_question: Question[] }>(
    `query Refs { behavior_tag(where: { is_active: { _eq: true } }, order_by: { sort: asc }) { id name } problem_tag(where: { is_active: { _eq: true } }, order_by: { sort: asc }) { id name } answer_question(where: { is_active: { _eq: true } }, order_by: { sort: asc }) { id section title is_required sort } }`,
  ), [])

  const { data: loaded, loading: planLoading, error: planErr } = useAsync(async () => {
    if (!id) return null
    return gql<Loaded>(`query Plan($id: bigint!) { plan: plan_by_pk(id: $id) {
      id status rejected_form reject_reason grade_at_filing form_student_done form_family_done form_plan_done form_answer_done
      student { id name gender birthday identify_condition }
      family_info { id father_name father_job father_cognition mother_name mother_job mother_cognition other_members is_divorced relation_to_child executors }
      student_plan_form { id grade influence_factors income_source specific_problem photo { id url } }
      photos(order_by: { sort: asc }) { id sort photo { id url } }
      behaviors { tag_id } problems { tag_id } answers { question_id answer }
    } }`, { id: Number(id) })
  }, [id])

  useEffect(() => {
    const p = loaded?.plan
    if (!p) return
    setPlanId(p.id); setStatus(p.status); setRejected({ form: p.rejected_form, reason: p.reject_reason })
    setDone({ s: p.form_student_done, f: p.form_family_done, p: p.form_plan_done, a: p.form_answer_done })
    if (p.student) setStudent({ name: p.student.name, gender: p.student.gender ?? '', birthday: p.student.birthday ?? '', identify_condition: p.student.identify_condition ?? '', grade_at_filing: p.grade_at_filing ?? '' })
    if (p.family_info) setFamily({ father_name: p.family_info.father_name ?? '', father_job: p.family_info.father_job ?? '', father_cognition: p.family_info.father_cognition?.text ?? '', mother_name: p.family_info.mother_name ?? '', mother_job: p.family_info.mother_job ?? '', mother_cognition: p.family_info.mother_cognition?.text ?? '', other_members: p.family_info.other_members ?? '', is_divorced: String(p.family_info.is_divorced ?? false), relation_to_child: p.family_info.relation_to_child ?? '', executors: p.family_info.executors ?? '' })
    if (p.student_plan_form) {
      setPlanForm({ grade: p.student_plan_form.grade ?? '', influence_factors: p.student_plan_form.influence_factors ?? '', income_source: p.student_plan_form.income_source ?? '', specific_problem: p.student_plan_form.specific_problem ?? '' })
      setStudentPhoto(p.student_plan_form.photo ?? null)
    }
    setPlanPhotos(p.photos.map((x) => x.photo).filter((x): x is UploadedImage => !!x))
    setBehaviors(p.behaviors.map((b) => b.tag_id)); setProblems(p.problems.map((b) => b.tag_id))
    const a: Record<number, string> = {}; p.answers.forEach((x) => { a[x.question_id] = x.answer ?? '' }); setAnswers(a)
    if (p.rejected_form && p.status === '已驳回') setStep(STEP_INDEX[p.rejected_form as FormType] ?? 0)
  }, [loaded])

  const remaining = acc.quota_total - acc.quota_used
  const sections = useMemo(() => {
    const m = new Map<string, Question[]>()
    refs?.answer_question.forEach((q) => { m.set(q.section, [...(m.get(q.section) ?? []), q]) })
    return [...m.entries()]
  }, [refs])

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true); setErr(null)
    try { await fn(); show(ok) } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }

  const saveStudent = () => run(async () => {
    if (!student.name.trim()) throw new Error('请填写学生姓名')
    const sObj = { name: student.name.trim(), gender: student.gender || null, birthday: student.birthday || null, identify_condition: student.identify_condition || null, parent_id: acc.id }
    if (!planId) {
      if (remaining <= 0) throw new Error('方案名额不足，请联系您的客户端管理者')
      // 学生 + 方案 + 扣名额放在同一个 mutation 里，Zion 会整批原子执行，避免扣了名额却没建成方案
      // 名额扣减用「断言前值 + 写入绝对值」而不是自增：
      // where 里带上读到的旧值，并发时 affected_rows 会是 0；_set 也让后端的行级权限条件
      //（只增不减、不超过总数）能明确拿到写入值来判定。
      const createOnce = () => gql<{ insert_student_one: { id: number; plans: { id: number }[] }; update_account: { affected_rows: number } }>(
        `mutation NewPlan($s: student_insert_input!, $me: bigint!, $was: bigint!, $now: bigint!) {
          insert_student_one(object: $s) { id plans { id } }
          update_account(where: { id: { _eq: $me }, quota_used: { _eq: $was } }, _set: { quota_used: $now }) { affected_rows }
        }`,
        {
          s: {
            ...sObj,
            plans: { data: [{ plan_no: genPlanNo(), status: '草稿', parent_id: acc.id, grade_at_filing: student.grade_at_filing || null, form_student_done: true, feedback_count: 0, form_family_done: false, form_plan_done: false, form_answer_done: false }] },
          },
          me: acc.id, was: acc.quota_used, now: acc.quota_used + 1,
        },
      )
      // 方案编号有唯一约束，极小概率撞号，换一个编号重试一次
      let d: Awaited<ReturnType<typeof createOnce>>
      try { d = await createOnce() } catch (e1) {
        if (!isUniqueViolation(e1)) throw e1
        d = await createOnce()
      }
      if (d.update_account.affected_rows !== 1) throw new Error('名额状态已变化，请刷新后重试')
      const newId = d.insert_student_one.plans[0]?.id
      if (!newId) throw new Error('方案创建失败，请重试')
      setPlanId(newId); refresh()
    } else {
      await gql(`mutation SaveStudent($sid: bigint!, $s: student_set_input!, $pid: bigint!, $p: plan_set_input!) { update_student_by_pk(pk_columns: { id: $sid }, _set: $s) { id } update_plan_by_pk(pk_columns: { id: $pid }, _set: $p) { id } }`,
        { sid: loaded?.plan?.student?.id, s: sObj, pid: planId, p: { grade_at_filing: student.grade_at_filing || null, form_student_done: true } })
    }
    setDone((d) => ({ ...d, s: true })); setStep(1)
  }, '学生基本信息已保存')

  const saveFamily = () => run(async () => {
    if (!planId) throw new Error('请先保存学生基本信息')
    const obj = { plan_id: planId, father_name: family.father_name || null, father_job: family.father_job || null, father_cognition: family.father_cognition ? { text: family.father_cognition } : null, mother_name: family.mother_name || null, mother_job: family.mother_job || null, mother_cognition: family.mother_cognition ? { text: family.mother_cognition } : null, other_members: family.other_members || null, is_divorced: family.is_divorced === 'true', relation_to_child: family.relation_to_child || null, executors: family.executors || null }
    await gql(`mutation SaveFamily($pid: bigint!, $o: family_info_insert_input!) { delete_family_info(where: { plan_id: { _eq: $pid } }) { affected_rows } insert_family_info_one(object: $o) { id } update_plan_by_pk(pk_columns: { id: $pid }, _set: { form_family_done: true }) { id } }`, { pid: planId, o: obj })
    setDone((d) => ({ ...d, f: true })); setStep(2)
  }, '家庭信息已保存')

  const savePlanForm = () => run(async () => {
    if (!planId) throw new Error('请先保存学生基本信息')
    if (problems.length === 0) throw new Error('请至少选择一个问题标签，方案答复将按问题匹配')
    const obj = { plan_id: planId, grade: planForm.grade || null, influence_factors: planForm.influence_factors || null, income_source: planForm.income_source || null, specific_problem: planForm.specific_problem || null, photo_id: studentPhoto?.id ?? null }
    await gql(`mutation SavePlanForm($pid: bigint!, $o: student_plan_form_insert_input!, $b: [plan_behavior_insert_input!]!, $p: [plan_problem_insert_input!]!, $ph: [plan_photo_insert_input!]!) {
      delete_student_plan_form(where: { plan_id: { _eq: $pid } }) { affected_rows }
      insert_student_plan_form_one(object: $o) { id }
      delete_plan_behavior(where: { plan_id: { _eq: $pid } }) { affected_rows }
      insert_plan_behavior(objects: $b) { affected_rows }
      delete_plan_problem(where: { plan_id: { _eq: $pid } }) { affected_rows }
      insert_plan_problem(objects: $p) { affected_rows }
      delete_plan_photo(where: { plan_id: { _eq: $pid } }) { affected_rows }
      insert_plan_photo(objects: $ph) { affected_rows }
      update_plan_by_pk(pk_columns: { id: $pid }, _set: { form_plan_done: true }) { id }
    }`, {
      pid: planId, o: obj,
      b: behaviors.map((t) => ({ plan_id: planId, tag_id: t })),
      p: problems.map((t) => ({ plan_id: planId, tag_id: t })),
      ph: planPhotos.map((img, i) => ({ plan_id: planId, photo_id: img.id, sort: i + 1 })),
    })
    setDone((d) => ({ ...d, p: true })); setStep(3)
  }, '学生方案已保存')

  const saveAnswers = () => run(async () => {
    if (!planId) throw new Error('请先保存学生基本信息')
    const missing = refs?.answer_question.filter((q) => q.is_required && !answers[q.id]?.trim()) ?? []
    if (missing.length) throw new Error(`还有 ${missing.length} 道必答题未填写：${missing.slice(0, 3).map((q) => q.title).join('、')}${missing.length > 3 ? '…' : ''}`)
    const objs = Object.entries(answers).filter(([, v]) => v.trim()).map(([qid, v]) => ({ plan_id: planId, question_id: Number(qid), answer: v.trim() }))
    await gql(`mutation SaveAnswers($pid: bigint!, $a: [plan_answer_insert_input!]!) { delete_plan_answer(where: { plan_id: { _eq: $pid } }) { affected_rows } insert_plan_answer(objects: $a) { affected_rows } update_plan_by_pk(pk_columns: { id: $pid }, _set: { form_answer_done: true }) { id } }`, { pid: planId, a: objs })
    setDone((d) => ({ ...d, a: true }))
  }, '父母必答已保存')

  const submitPlan = () => run(async () => {
    if (!planId) throw new Error('请先完成四份表单')
    await gql(`mutation Submit($pid: bigint!, $now: timestamptz!) { update_plan_by_pk(pk_columns: { id: $pid }, _set: { status: "待审核", submitted_at: $now, rejected_form: null, reject_reason: null }) { id } }`, { pid: planId, now: new Date().toISOString() })
    navigate(`/plans/${planId}`)
  }, '方案已提交，等待总管审核')

  if (id && planLoading) return <AppShell><LoadingRows rows={6} /></AppShell>
  if (id && (planErr || !loaded?.plan)) return <AppShell><EmptyState>{planErr ?? '找不到该方案'}</EmptyState></AppShell>
  if (id && !['草稿', '已驳回'].includes(status)) {
    return <AppShell><EmptyState>该方案当前状态为「{status}」，不能修改。<Link to={`/plans/${id}`} className="text-brand ml-2 underline">查看详情</Link></EmptyState></AppShell>
  }
  if (!id && remaining <= 0) {
    return (
      <AppShell className="max-w-3xl">
        <PageHeader eyebrow="新建方案" title="方案名额不足" description={`当前名额 ${acc.quota_used} / ${acc.quota_total}。请联系您的客户端管理者分配名额后再建档。`} />
        <Button asChild variant="outline"><Link to="/docs/建档须知">查看建档须知</Link></Button>
      </AppShell>
    )
  }

  const stepDone = [done.s, done.f, done.p, done.a]
  const allDone = stepDone.every(Boolean)

  return (
    <AppShell className="max-w-4xl">
      <PageHeader
        eyebrow={id ? `修改方案 · ${status}` : '新建方案'}
        title={id ? '补充并重新提交' : '四份表单，建立孩子的方案'}
        description={id ? undefined : `保存第一份表单后即占用 1 个名额（剩余 ${remaining}）。四份都完成后再提交审核。`}
        actions={planId && <Button asChild variant="outline"><Link to={`/plans/${planId}`}>查看详情</Link></Button>}
      />

      {status === '已驳回' && rejected.form && (
        <Alert variant="destructive" className="mb-6">
          <TriangleAlertIcon />
          <AlertTitle>已驳回 · {rejected.form}</AlertTitle>
          <AlertDescription>{rejected.reason || '总管要求修改该表单后重新提交。'}</AlertDescription>
        </Alert>
      )}

      <ol className="border-border bg-card mb-6 grid grid-cols-2 overflow-hidden rounded-lg border md:grid-cols-4">
        {FORM_TYPES.map((t, i) => {
          const active = step === i
          const disabled = !planId && i > 0
          return (
            <li key={t} className={cn('border-border border-b md:border-b-0', i < 3 && 'md:border-r', i % 2 === 0 && 'border-r md:border-r')}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setStep(i)}
                className={cn('flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors', active ? 'bg-accent' : 'hover:bg-accent/50', disabled && 'cursor-not-allowed opacity-50')}
              >
                <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium', stepDone[i] ? 'border-brand bg-brand text-primary-foreground' : active ? 'border-brand text-brand' : 'border-border text-muted-foreground')}>
                  {stepDone[i] ? <CheckIcon className="size-3.5" /> : i + 1}
                </span>
                <span className={cn('truncate text-sm font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>{t}</span>
                {rejected.form === t && status === '已驳回' && <span className="text-destructive ml-auto text-xs">需修改</span>}
              </button>
            </li>
          )
        })}
      </ol>

      <ErrorState message={err} title="保存失败" />

      {step === 0 && (
        <SectionCard title="学生基本信息" description="方案答复按孩子周岁匹配，生日请准确填写。">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="学生姓名" required><Input value={student.name} onChange={(e) => setStudent({ ...student, name: e.target.value })} /></Field>
            <Field label="性别"><Picker value={student.gender} onChange={(v) => setStudent({ ...student, gender: v })} options={GENDERS} placeholder="未填写" /></Field>
            <Field label="生日" required><Input type="date" value={student.birthday} onChange={(e) => setStudent({ ...student, birthday: e.target.value })} /></Field>
            <Field label="建档时年级"><Picker value={student.grade_at_filing} onChange={(v) => setStudent({ ...student, grade_at_filing: v })} options={GRADES} placeholder="未填写" /></Field>
            <Field label="辨别条件" className="md:col-span-2" hint="帮助工作人员区分孩子的特征描述">
              <Textarea value={student.identify_condition} onChange={(e) => setStudent({ ...student, identify_condition: e.target.value })} />
            </Field>
          </div>
          <div className="mt-6 flex gap-3"><Button disabled={busy} onClick={saveStudent}>{busy ? '保存中…' : '保存并继续'}</Button></div>
        </SectionCard>
      )}

      {step === 1 && (
        <SectionCard title="家庭信息" description="家庭结构与父母认知会影响方案的执行建议。">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="父亲姓名"><Input value={family.father_name} onChange={(e) => setFamily({ ...family, father_name: e.target.value })} /></Field>
            <Field label="父亲职业"><Input value={family.father_job} onChange={(e) => setFamily({ ...family, father_job: e.target.value })} /></Field>
            <Field label="父亲认知（对孩子问题的看法）" className="md:col-span-2"><Textarea value={family.father_cognition} onChange={(e) => setFamily({ ...family, father_cognition: e.target.value })} /></Field>
            <Field label="母亲姓名"><Input value={family.mother_name} onChange={(e) => setFamily({ ...family, mother_name: e.target.value })} /></Field>
            <Field label="母亲职业"><Input value={family.mother_job} onChange={(e) => setFamily({ ...family, mother_job: e.target.value })} /></Field>
            <Field label="母亲认知（对孩子问题的看法）" className="md:col-span-2"><Textarea value={family.mother_cognition} onChange={(e) => setFamily({ ...family, mother_cognition: e.target.value })} /></Field>
            <Field label="其他家庭成员"><Input value={family.other_members} onChange={(e) => setFamily({ ...family, other_members: e.target.value })} /></Field>
            <Field label="是否离异"><Picker value={family.is_divorced} onChange={(v) => setFamily({ ...family, is_divorced: v })} options={[{ value: 'false', label: '否' }, { value: 'true', label: '是' }]} allowEmpty={false} /></Field>
            <Field label="填写人与孩子关系"><Picker value={family.relation_to_child} onChange={(v) => setFamily({ ...family, relation_to_child: v })} options={RELATIONS} placeholder="未填写" /></Field>
            <Field label="方案执行成员"><Input placeholder="例：父亲、母亲" value={family.executors} onChange={(e) => setFamily({ ...family, executors: e.target.value })} /></Field>
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => setStep(0)}>上一步</Button>
            <Button disabled={busy} onClick={saveFamily}>{busy ? '保存中…' : '保存并继续'}</Button>
          </div>
        </SectionCard>
      )}

      {step === 2 && (
        <SectionCard title="学生方案" description="问题标签决定审核通过后匹配到哪些方案答复，必须至少选一个。">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="学生年级"><Picker value={planForm.grade} onChange={(v) => setPlanForm({ ...planForm, grade: v })} options={GRADES} placeholder="未填写" /></Field>
            <Field label="经济来源"><Input placeholder="零花钱来源、数额等" value={planForm.income_source} onChange={(e) => setPlanForm({ ...planForm, income_source: e.target.value })} /></Field>
            <Field label="影响因素" className="md:col-span-2"><Textarea value={planForm.influence_factors} onChange={(e) => setPlanForm({ ...planForm, influence_factors: e.target.value })} /></Field>
            <Field label="具体问题描述" className="md:col-span-2"><Textarea value={planForm.specific_problem} onChange={(e) => setPlanForm({ ...planForm, specific_problem: e.target.value })} /></Field>
            <Field label="学生大头照" className="md:col-span-2" hint="用于工作人员辨认孩子，非必填">
              <ImagePicker value={studentPhoto} onChange={setStudentPhoto} label="上传大头照" />
            </Field>
            <Field label="方案补充照片" className="md:col-span-2" hint="最多 9 张，例如孩子的作业、房间、聊天记录等佐证材料">
              <ImageGallery value={planPhotos} onChange={setPlanPhotos} max={9} />
            </Field>
            <Field label="日常表现（可多选）" className="md:col-span-2">
              {refsLoading ? <LoadingRows rows={2} /> : <TagPicker tags={refs?.behavior_tag ?? []} value={behaviors} onChange={setBehaviors} />}
            </Field>
            <Field label="问题选择（可多选）" required className="md:col-span-2">
              {refsLoading ? <LoadingRows rows={2} /> : <TagPicker tags={refs?.problem_tag ?? []} value={problems} onChange={setProblems} accent />}
            </Field>
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>上一步</Button>
            <Button disabled={busy} onClick={savePlanForm}>{busy ? '保存中…' : '保存并继续'}</Button>
          </div>
        </SectionCard>
      )}

      {step === 3 && (
        <SectionCard title="父母必答" description="带 * 的题目为必填，全部填写后才能保存。">
          <div className="flex flex-col gap-8">
            {sections.map(([sec, qs]) => (
              <section key={sec}>
                <h3 className="text-muted-foreground mb-4 text-xs font-medium tracking-wide uppercase">{sec}</h3>
                <div className="grid gap-5 md:grid-cols-2">
                  {qs.map((q) => (
                    <Field key={q.id} label={q.title} required={q.is_required}>
                      <Input value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                    </Field>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)}>上一步</Button>
            <Button disabled={busy} onClick={saveAnswers}>{busy ? '保存中…' : '保存父母必答'}</Button>
          </div>
        </SectionCard>
      )}

      <div className="border-border mt-8 flex flex-col gap-3 border-t pt-6 md:flex-row md:items-center md:justify-between">
        <p className="text-muted-foreground text-sm">{allDone ? '四份表单已完成，可以提交审核。' : `还有 ${stepDone.filter((x) => !x).length} 份表单未保存。`}</p>
        <Button size="lg" disabled={!allDone || busy} onClick={submitPlan}>{status === '已驳回' ? '重新提交审核' : '提交审核'}</Button>
      </div>
      <Toast message={toast?.message ?? null} tone={toast?.tone} />
    </AppShell>
  )
}

function TagPicker({ tags, value, onChange, accent }: { tags: Tag[]; value: number[]; onChange: (v: number[]) => void; accent?: boolean }) {
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => {
        const on = value.includes(t.id)
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors',
              on
                ? accent ? 'border-brand bg-brand text-primary-foreground' : 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
            )}
          >
            {t.name}
          </button>
        )
      })}
    </div>
  )
}
