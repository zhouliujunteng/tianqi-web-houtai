import { ArrowLeftIcon, ClockIcon, TriangleAlertIcon } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, Field, KV, LoadingRows, PageHeader, SectionCard, StatusBadge, Toast } from '@/components/common'
import { Picker } from '@/components/common-select'
import { ImagePicker } from '@/components/image-picker'
import { AppShell } from '@/components/layout/app-shell'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { ACTIONFLOW, errorMessage, gql, invokeActionFlow } from '@/lib/api'
import { useAuth, type Account } from '@/lib/auth'
import { FORM_TYPES, REVIEW_LEVELS, initialFeedbackStatus, type FeedbackStatus, type ReviewLevel } from '@/lib/enums'
import { ageFromBirthday, fmtDate, isVisible } from '@/lib/format'
import { isChief, isStaff } from '@/lib/scope'
import type { UploadedImage } from '@/lib/upload'
import { useAsync, useToast } from '@/lib/useAsync'

interface Feedback {
  id: number; seq: number; content: string | null; image: { id: number; url: string } | null; status: FeedbackStatus; reply_content: string | null; visible_at: string | null; replied_at: string | null; created_at: string
  replies: { id: number; action: string; content: string | null; comment: string | null; delay_hours: number | null; created_at: string; operator: { real_name: string | null; role: string } | null }[]
}
interface Detail {
  id: number; plan_no: string | null; status: string; review_level: ReviewLevel | null; grade_at_filing: string | null
  submitted_at: string | null; approved_at: string | null; deliver_at: string | null; service_days: number | null; service_expire_at: string | null
  feedback_count: number; rejected_form: string | null; reject_reason: string | null; outline: string | null; created_at: string
  parent_id: number | null; chief_id: number | null; director_id: number | null; specialist_id: number | null
  student: { id: number; name: string; gender: string | null; birthday: string | null; identify_condition: string | null } | null
  parent: { id: number; real_name: string | null; username: string | null; fz_phone_number: string | null; manager: { real_name: string | null } | null } | null
  chief: { real_name: string | null } | null
  director: { id: number; real_name: string | null } | null
  specialist: { id: number; real_name: string | null } | null
  family_info: { father_name: string | null; father_job: string | null; father_cognition: { text?: string } | null; mother_name: string | null; mother_job: string | null; mother_cognition: { text?: string } | null; other_members: string | null; is_divorced: boolean | null; relation_to_child: string | null; executors: string | null } | null
  student_plan_form: { grade: string | null; influence_factors: string | null; income_source: string | null; specific_problem: string | null; photo: { id: number; url: string } | null } | null
  photos: { id: number; photo: { id: number; url: string } | null }[]
  behaviors: { tag: { name: string } | null }[]
  problems: { tag: { id: number; name: string } | null }[]
  answers: { answer: string | null; question: { title: string; section: string; sort: number } | null }[]
  principles: { id: number; problem_name: string | null; principle: string | null; reply: string | null; sort: number }[]
  reviews: { id: number; action: string; review_level: string | null; rejected_form: string | null; comment: string | null; delay_hours: number | null; deliver_at: string | null; created_at: string; reviewer: { real_name: string | null } | null }[]
  feedbacks: Feedback[]
}

const DETAIL_QUERY = `query Detail($id: bigint!) { plan_by_pk(id: $id) {
  id plan_no status review_level grade_at_filing submitted_at approved_at deliver_at service_days service_expire_at feedback_count rejected_form reject_reason outline created_at
  parent_id chief_id director_id specialist_id
  student { id name gender birthday identify_condition }
  parent { id real_name username fz_phone_number manager { real_name } }
  chief { real_name } director { id real_name } specialist { id real_name }
  family_info { father_name father_job father_cognition mother_name mother_job mother_cognition other_members is_divorced relation_to_child executors }
  student_plan_form { grade influence_factors income_source specific_problem photo { id url } }
  photos(order_by: { sort: asc }) { id photo { id url } }
  behaviors { tag { name } } problems { tag { id name } }
  answers { answer question { title section sort } }
  principles(order_by: { sort: asc }) { id problem_name principle reply sort }
  reviews(order_by: { created_at: desc }) { id action review_level rejected_form comment delay_hours deliver_at created_at reviewer { real_name } }
  feedbacks(order_by: { seq: asc }) { id seq content image { id url } status reply_content visible_at replied_at created_at replies(order_by: { created_at: asc }) { id action content comment delay_hours created_at operator { real_name role } } }
} }`

export default function PlanDetailPage() {
  const { id } = useParams()
  const { account } = useAuth()
  const acc = account!
  const { toast, show } = useToast()
  const { data: p, loading, error, reload } = useAsync(async () => (await gql<{ plan_by_pk: Detail | null }>(DETAIL_QUERY, { id: Number(id) })).plan_by_pk, [id])

  useEffect(() => {
    if (!p || !window.location.hash) return
    document.querySelector(window.location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [p])

  if (loading) return <AppShell><LoadingRows rows={6} /></AppShell>
  if (error || !p) return <AppShell><ErrorState message={error ?? '找不到该方案'} /></AppShell>

  const age = ageFromBirthday(p.student?.birthday)
  const parentView = acc.role === '家长'
  const principlesVisible = !parentView || (!['待给出', '待审核', '草稿', '已驳回'].includes(p.status) && (isVisible(p.deliver_at) || p.status === '已结束'))
  const deliverPending = p.status === '待给出' && p.deliver_at && !isVisible(p.deliver_at)

  return (
    <AppShell>
      <PageHeader
        eyebrow={<><span className="font-mono">{p.plan_no ?? `#${p.id}`}</span><StatusBadge value={p.status} />{p.review_level && <Badge variant="secondary">{p.review_level}</Badge>}</>}
        title={<>{p.student?.name ?? '未命名学生'}{age != null && <span className="text-muted-foreground ml-3 font-mono text-xl font-normal">{age} 岁</span>}</>}
        description={<>家长 {p.parent?.real_name ?? p.parent?.username ?? '—'}{p.parent?.manager && <> · 管理者 {p.parent.manager.real_name}</>}{p.director && <> · 总监 {p.director.real_name}</>}{p.specialist && <> · 监护专员 {p.specialist.real_name}</>}</>}
        actions={
          <>
            {parentView && ['草稿', '已驳回'].includes(p.status) && <Button asChild><Link to={`/plans/${p.id}/edit`}>{p.status === '已驳回' ? '修改并重新提交' : '继续填写'}</Link></Button>}
            {isChief(acc.role) && <Button asChild variant="outline"><Link to="/review">审核队列</Link></Button>}
            <Button asChild variant="outline"><Link to="/plans"><ArrowLeftIcon />返回列表</Link></Button>
          </>
        }
      />

      {p.status === '已驳回' && (
        <Alert variant="destructive" className="mb-6">
          <TriangleAlertIcon />
          <AlertTitle>已驳回 · {p.rejected_form}</AlertTitle>
          <AlertDescription>{p.reject_reason || '—'}</AlertDescription>
        </Alert>
      )}
      {parentView && deliverPending && (
        <Alert className="border-brand/40 bg-brand/5 mb-6">
          <ClockIcon />
          <AlertTitle>方案已通过审核</AlertTitle>
          <AlertDescription>正在准备给出，预计 {fmtDate(p.deliver_at)} 可见。</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <SectionCard title="原则答复" description={p.deliver_at ? `给出时间 ${fmtDate(p.deliver_at)}` : undefined} contentClassName="p-0">
            {!principlesVisible ? (
              <div className="p-5"><EmptyState>{p.status === '待审核' ? '等待总管审核' : p.status === '待给出' ? '方案将于给出时间后显示' : '方案尚未生成'}</EmptyState></div>
            ) : p.principles.length === 0 ? (
              <div className="p-5"><EmptyState>{isStaff(acc.role) ? '尚未匹配到答复（孩子年龄可能低于该问题的起始年龄，可在内容库补充）' : '方案内容准备中'}</EmptyState></div>
            ) : (
              <div className="divide-border divide-y">
                {p.outline && (
                  <div className="p-5">
                    <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">基本纲要</p>
                    <p className="text-sm leading-7 whitespace-pre-wrap">{p.outline}</p>
                  </div>
                )}
                {p.principles.map((pr, i) => (
                  <article key={pr.id} className="p-5">
                    <div className="flex items-baseline gap-3">
                      <span className="text-muted-foreground font-mono text-xs">{String(i + 1).padStart(2, '0')}</span>
                      <h3 className="text-base font-semibold tracking-tight">{pr.problem_name}</h3>
                    </div>
                    {pr.principle && <p className="border-brand text-brand mt-3 border-l-2 pl-3 text-sm">{pr.principle}</p>}
                    <p className="mt-3 text-sm leading-7 whitespace-pre-wrap">{pr.reply}</p>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title={`反馈（${p.feedbacks.length}）`} description="家长反馈与逐级回复记录。">
            {p.feedbacks.length === 0 && <EmptyState>还没有反馈</EmptyState>}
            <div className="flex flex-col gap-4">
              {p.feedbacks.map((f) => <FeedbackCard key={f.id} f={f} plan={p} acc={acc} onDone={(m) => { show(m); reload() }} />)}
            </div>
            {parentView && p.status === '已给出' && <NewFeedback plan={p} onDone={(m) => { show(m); reload() }} />}
            {parentView && p.status !== '已给出' && p.feedbacks.length === 0 && <p className="text-muted-foreground mt-3 text-xs">方案给出后可在此提交反馈。</p>}
          </SectionCard>

          <SectionCard title="表单 01 · 学生基本信息">
            <div className="grid gap-x-8 md:grid-cols-2">
              <KV k="姓名" v={p.student?.name} /><KV k="性别" v={p.student?.gender} />
              <KV k="生日" v={p.student?.birthday ? `${p.student.birthday}（${age} 岁）` : null} /><KV k="建档时年级" v={p.grade_at_filing} />
              <KV k="辨别条件" v={p.student?.identify_condition} className="md:col-span-2" />
            </div>
          </SectionCard>

          <SectionCard title="表单 02 · 家庭信息">
            {!p.family_info ? <EmptyState>未填写</EmptyState> : (
              <div className="grid gap-x-8 md:grid-cols-2">
                <KV k="父亲" v={[p.family_info.father_name, p.family_info.father_job].filter(Boolean).join(' · ')} />
                <KV k="母亲" v={[p.family_info.mother_name, p.family_info.mother_job].filter(Boolean).join(' · ')} />
                <KV k="父亲认知" v={p.family_info.father_cognition?.text} /><KV k="母亲认知" v={p.family_info.mother_cognition?.text} />
                <KV k="其他家庭成员" v={p.family_info.other_members} />
                <KV k="是否离异" v={p.family_info.is_divorced == null ? null : p.family_info.is_divorced ? '是' : '否'} />
                <KV k="填写人与孩子关系" v={p.family_info.relation_to_child} /><KV k="方案执行成员" v={p.family_info.executors} />
              </div>
            )}
          </SectionCard>

          <SectionCard title="表单 03 · 学生方案">
            {!p.student_plan_form ? <EmptyState>未填写</EmptyState> : (
              <div className="grid gap-x-8 md:grid-cols-2">
                <KV k="学生年级" v={p.student_plan_form.grade} /><KV k="经济来源" v={p.student_plan_form.income_source} />
                <KV k="影响因素" v={p.student_plan_form.influence_factors} className="md:col-span-2" />
                <KV k="具体问题" v={p.student_plan_form.specific_problem} className="md:col-span-2" />
                <KV k="日常表现" v={p.behaviors.length ? <span className="flex flex-wrap gap-1.5">{p.behaviors.map((b, i) => <Badge key={i} variant="secondary">{b.tag?.name}</Badge>)}</span> : null} />
                <KV k="问题选择" v={p.problems.length ? <span className="flex flex-wrap gap-1.5">{p.problems.map((b, i) => <Badge key={i} variant="brand-secondary">{b.tag?.name}</Badge>)}</span> : null} />
                {p.student_plan_form.photo && (
                  <KV k="学生大头照" v={<a href={p.student_plan_form.photo.url} target="_blank" rel="noreferrer"><img src={p.student_plan_form.photo.url} alt="学生大头照" className="border-border mt-1 h-28 w-28 rounded-lg border object-cover" /></a>} />
                )}
                {p.photos.length > 0 && (
                  <KV k={`补充照片（${p.photos.length}）`} className="md:col-span-2" v={
                    <span className="mt-1 flex flex-wrap gap-2">
                      {p.photos.map((x) => x.photo && (
                        <a key={x.id} href={x.photo.url} target="_blank" rel="noreferrer">
                          <img src={x.photo.url} alt="" className="border-border h-24 w-24 rounded-lg border object-cover transition-opacity hover:opacity-80" />
                        </a>
                      ))}
                    </span>
                  } />
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard title="表单 04 · 父母必答">
            {p.answers.length === 0 ? <EmptyState>未填写</EmptyState> : (
              <div className="grid gap-x-8 md:grid-cols-2">
                {[...p.answers].sort((a, b) => (a.question?.sort ?? 0) - (b.question?.sort ?? 0)).map((a, i) => (
                  <KV key={i} k={`${a.question?.section ?? ''} · ${a.question?.title ?? ''}`} v={a.answer} />
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <aside className="flex flex-col gap-6">
          {isChief(acc.role) && <ChiefActions plan={p} acc={acc} onDone={(m) => { show(m); reload() }} />}
          <SectionCard title="时间线">
            <div className="flex flex-col">
              <KV k="创建" v={fmtDate(p.created_at)} /><KV k="提交审核" v={fmtDate(p.submitted_at)} />
              <KV k="审核通过" v={fmtDate(p.approved_at)} /><KV k="方案给出" v={fmtDate(p.deliver_at)} />
              <KV k="服务到期" v={fmtDate(p.service_expire_at)} /><KV k="反馈次数" v={p.feedback_count} />
            </div>
          </SectionCard>
          {isStaff(acc.role) && (
            <SectionCard title="审核记录">
              {p.reviews.length === 0 ? <EmptyState>暂无</EmptyState> : (
                <ol className="divide-border flex flex-col divide-y">
                  {p.reviews.map((r) => (
                    <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={r.action === '通过' ? 'text-sm font-medium text-emerald-600 dark:text-emerald-400' : 'text-destructive text-sm font-medium'}>
                          {r.action}{r.review_level && ` · ${r.review_level}`}{r.rejected_form && ` · ${r.rejected_form}`}
                        </span>
                        <span className="text-muted-foreground font-mono text-xs">{fmtDate(r.created_at)}</span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {r.reviewer?.real_name ?? '—'}{r.delay_hours != null && ` · 延时 ${r.delay_hours} 小时`}{r.comment && ` · ${r.comment}`}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>
          )}
        </aside>
      </div>
      <Toast message={toast?.message ?? null} tone={toast?.tone} />
    </AppShell>
  )
}

function ChiefActions({ plan: p, acc, onDone }: { plan: Detail; acc: Account; onDone: (m: string) => void }) {
  const [level, setLevel] = useState<string>(p.review_level ?? '一级审核')
  const [delay, setDelay] = useState('24')
  const [comment, setComment] = useState('')
  const [rejForm, setRejForm] = useState('')
  const [rejReason, setRejReason] = useState('')
  const [director, setDirector] = useState(p.director_id ? String(p.director_id) : '')
  const [specialist, setSpecialist] = useState(p.specialist_id ? String(p.specialist_id) : '')
  const [outline, setOutline] = useState(p.outline ?? '')
  const [serviceDays, setServiceDays] = useState(p.service_days ? String(p.service_days) : '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const { data: staff } = useAsync(async () => gql<{ account: { id: number; real_name: string | null; role: string }[] }>(
    `query Staff { account(where: { role: { _in: ["总监", "监护专员"] }, account_status: { _eq: "正常" } }, order_by: { id: asc }) { id real_name role } }`), [])
  const directors = staff?.account.filter((a) => a.role === '总监') ?? []
  const specialists = staff?.account.filter((a) => a.role === '监护专员') ?? []

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true); setErr(null)
    try { await fn(); onDone(ok) } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }

  const approve = () => run(async () => {
    const n = await invokeActionFlow<number>(ACTIONFLOW.chiefApprove, { plan_id: p.id, review_level: level, delay_hours: Number(delay) || 0, comment: comment || null })
    if (Number(n) === 0) setErr('已通过，但没有匹配到任何原则答复（年龄可能低于该问题的起始年龄）。')
  }, '审核已通过，原则答复已生成')

  const reject = () => run(async () => {
    if (!rejForm) throw new Error('请选择驳回的表单')
    await invokeActionFlow(ACTIONFLOW.chiefReject, { plan_id: p.id, rejected_form: rejForm, reason: rejReason || null })
  }, '已驳回，家长可修改后重新提交')

  const assign = () => run(async () => {
    const days = serviceDays ? Number(serviceDays) : null
    // 服务到期时间 = 给出时间 + 服务天数，给出时间未定则从今天起算
    const base = p.deliver_at ? new Date(p.deliver_at) : new Date()
    const expire = days && days > 0 ? new Date(base.getTime() + days * 86400000).toISOString() : null
    await gql(`mutation Assign($id: bigint!, $set: plan_set_input!) { update_plan_by_pk(pk_columns: { id: $id }, _set: $set) { id } }`,
      { id: p.id, set: { director_id: director ? Number(director) : null, specialist_id: specialist ? Number(specialist) : null, outline: outline || null, service_days: days, service_expire_at: expire } })
  }, '指派与纲要已保存')

  const markDelivered = () => run(async () => {
    await gql(`mutation Deliver($id: bigint!) { update_plan_by_pk(pk_columns: { id: $id }, _set: { status: "已给出" }) { id } }`, { id: p.id })
  }, '已标记为已给出')

  const finish = () => run(async () => {
    await gql(`mutation Finish($id: bigint!, $now: timestamptz!) { update_plan_by_pk(pk_columns: { id: $id }, _set: { status: "已结束", service_expire_at: $now }) { id } }`, { id: p.id, now: new Date().toISOString() })
  }, '方案已结束')

  if (p.status === '待审核') {
    return (
      <SectionCard title="审核" description="通过将按问题与孩子周岁自动生成原则答复。">
        <div className="flex flex-col gap-5">
          <Field label="审核等级" required hint="决定反馈从哪一级开始：一级→总管，二级→总监，三级→监护专员">
            <Picker value={level} onChange={setLevel} options={REVIEW_LEVELS} allowEmpty={false} />
          </Field>
          <Field label="延迟给出（小时）" hint="通过后方案在此时间后对家长可见">
            <Input type="number" min={0} step={0.5} value={delay} onChange={(e) => setDelay(e.target.value)} />
          </Field>
          <Field label="说明"><Input value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
          <Button disabled={busy} onClick={approve}>{busy ? '处理中…' : '通过并生成原则答复'}</Button>
          <Separator />
          <Field label="驳回表单"><Picker value={rejForm} onChange={setRejForm} options={FORM_TYPES} placeholder="选择需要修改的表单" /></Field>
          <Field label="驳回原因"><Textarea value={rejReason} onChange={(e) => setRejReason(e.target.value)} /></Field>
          <Button variant="destructive" disabled={busy || !rejForm} onClick={reject}>驳回</Button>
          <ErrorState message={err} />
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="指派与纲要">
      <div className="flex flex-col gap-5">
        <Field label="总监"><Picker value={director} onChange={setDirector} options={directors.map((d) => ({ value: String(d.id), label: d.real_name ?? `#${d.id}` }))} placeholder="未指派" /></Field>
        <Field label="监护专员"><Picker value={specialist} onChange={setSpecialist} options={specialists.map((d) => ({ value: String(d.id), label: d.real_name ?? `#${d.id}` }))} placeholder="未指派" /></Field>
        <Field label="服务天数" hint="保存时按「给出时间 + 天数」自动算出服务到期时间"><Input type="number" min={0} value={serviceDays} onChange={(e) => setServiceDays(e.target.value)} /></Field>
        <Field label="基本纲要" hint="家长在原则答复上方看到的总纲"><Textarea value={outline} onChange={(e) => setOutline(e.target.value)} /></Field>
        <Button disabled={busy} onClick={assign}>保存</Button>
        {p.status === '待给出' && isVisible(p.deliver_at) && <Button variant="outline" disabled={busy} onClick={markDelivered}>标记为已给出</Button>}
        {['待给出', '已给出'].includes(p.status) && <Button variant="destructive" disabled={busy} onClick={finish}>结束方案</Button>}
        <ErrorState message={err} />
      </div>
    </SectionCard>
  )
}

function NewFeedback({ plan: p, onDone }: { plan: Detail; onDone: (m: string) => void }) {
  const [content, setContent] = useState('')
  const [image, setImage] = useState<UploadedImage | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setBusy(true); setErr(null)
    try {
      await gql(`mutation NewFb($f: feedback_insert_input!, $pid: bigint!) { insert_feedback_one(object: $f) { id } update_plan_by_pk(pk_columns: { id: $pid }, _inc: { feedback_count: 1 }) { id } }`,
        { f: { plan_id: p.id, seq: p.feedback_count + 1, content: content.trim(), image_id: image?.id ?? null, status: initialFeedbackStatus(p.review_level) }, pid: p.id })
      setContent(''); setImage(null); onDone('反馈已提交')
    } catch (e2) { setErr(errorMessage(e2)) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="border-border mt-6 flex flex-col gap-4 border-t pt-5">
      <Field label={`第 ${p.feedback_count + 1} 次反馈`} required>
        <Textarea placeholder="描述执行方案后的情况、遇到的困难或新的问题" value={content} onChange={(e) => setContent(e.target.value)} />
      </Field>
      <Field label="反馈图片" hint="可选，例如孩子的表现记录截图">
        <ImagePicker value={image} onChange={setImage} label="上传图片" />
      </Field>
      <ErrorState message={err} />
      <Button type="submit" className="self-start" disabled={busy || !content.trim()}>{busy ? '提交中…' : '提交反馈'}</Button>
    </form>
  )
}

function nextStatus(s: FeedbackStatus): FeedbackStatus {
  if (s === '待专员回复') return '待总监审核'
  if (s === '待总监审核') return '待总管审核'
  return '已回复'
}
function prevStatus(s: FeedbackStatus, level: ReviewLevel | null): FeedbackStatus {
  if (s === '待总管审核') return level === '一级审核' ? '待总管审核' : '待总监审核'
  if (s === '待总监审核') return level === '二级审核' ? '待总监审核' : '待专员回复'
  return s
}
function canAct(role: string, s: FeedbackStatus): boolean {
  if (role === '超级管理员') return s !== '已回复'
  if (role === '总管') return s === '待总管审核'
  if (role === '总监') return s === '待总监审核'
  if (role === '监护专员') return s === '待专员回复'
  return false
}

function FeedbackCard({ f, plan: p, acc, onDone }: { f: Feedback; plan: Detail; acc: Account; onDone: (m: string) => void }) {
  const parentView = acc.role === '家长'
  const replyVisible = f.status === '已回复' && (!parentView || isVisible(f.visible_at))
  const [reply, setReply] = useState(f.reply_content ?? '')
  const [comment, setComment] = useState('')
  const [delay, setDelay] = useState('0')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const actor = canAct(acc.role, f.status)
  const isFinal = f.status === '待总管审核' || (acc.role === '超级管理员' && nextStatus(f.status) === '已回复')
  const writesFirst = f.status === '待专员回复' || (f.status === '待总监审核' && p.review_level === '二级审核') || (f.status === '待总管审核' && p.review_level === '一级审核')

  const act = async (action: '提交回复' | '审核通过' | '驳回') => {
    setBusy(true); setErr(null)
    try {
      if (action !== '驳回' && !reply.trim()) throw new Error('请填写回复内容')
      const next = action === '驳回' ? prevStatus(f.status, p.review_level) : nextStatus(f.status)
      const set: Record<string, unknown> = { reply_content: reply.trim() || null, status: next }
      if (action !== '驳回' && next === '已回复') {
        set.replied_at = new Date().toISOString()
        set.visible_at = new Date(Date.now() + (Number(delay) || 0) * 3600 * 1000).toISOString()
      }
      await gql(`mutation Act($id: bigint!, $set: feedback_set_input!, $r: feedback_reply_insert_input!) { update_feedback_by_pk(pk_columns: { id: $id }, _set: $set) { id } insert_feedback_reply_one(object: $r) { id } }`,
        { id: f.id, set, r: { feedback_id: f.id, operator_id: acc.id, action, content: reply.trim() || null, comment: comment || null, delay_hours: action !== '驳回' && next === '已回复' ? Number(delay) || 0 : null } })
      onDone(action === '驳回' ? '已驳回回复' : next === '已回复' ? '回复已完成' : '已提交至下一级审核')
    } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }

  return (
    <Card id={`feedback-${f.id}`} className="scroll-mt-24 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground font-mono text-xs">#{f.seq} · {fmtDate(f.created_at)}</span>
          {(!parentView || f.status === '已回复') && <StatusBadge value={parentView ? (replyVisible ? '已回复' : '处理中') : f.status} />}
        </div>
        <p className="mt-3 text-sm whitespace-pre-wrap">{f.content}</p>
        {f.image && (
          <a href={f.image.url} target="_blank" rel="noreferrer" className="mt-3 inline-block">
            <img src={f.image.url} alt="反馈图片" className="border-border h-28 w-28 rounded-lg border object-cover transition-opacity hover:opacity-80" />
          </a>
        )}

        {replyVisible && (
          <div className="border-brand bg-brand/5 mt-4 rounded-r-md border-l-2 px-4 py-3">
            <p className="text-brand text-xs font-medium tracking-wide uppercase">
              回复{f.replied_at && <span className="text-muted-foreground ml-2 font-mono normal-case">{fmtDate(f.replied_at)}</span>}
            </p>
            <p className="mt-2 text-sm leading-7 whitespace-pre-wrap">{f.reply_content}</p>
          </div>
        )}
        {parentView && f.status === '已回复' && !replyVisible && <p className="text-muted-foreground mt-3 text-xs">回复将于 {fmtDate(f.visible_at)} 可见。</p>}
        {!parentView && f.status !== '已回复' && f.reply_content && !actor && (
          <div className="border-border mt-4 rounded-r-md border-l-2 px-4 py-3">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">回复草稿</p>
            <p className="mt-2 text-sm whitespace-pre-wrap">{f.reply_content}</p>
          </div>
        )}

        {!parentView && f.replies.length > 0 && (
          <details className="text-muted-foreground mt-3 text-xs">
            <summary className="cursor-pointer tracking-wide uppercase">流转记录 · {f.replies.length}</summary>
            <ol className="mt-2 flex flex-col gap-1.5">
              {f.replies.map((r) => (
                <li key={r.id}>
                  <span className="font-mono">{fmtDate(r.created_at)}</span> · {r.operator?.real_name ?? '—'}（{r.operator?.role}）{r.action}
                  {r.comment && ` · ${r.comment}`}{r.delay_hours != null && ` · 延时 ${r.delay_hours}h`}
                </li>
              ))}
            </ol>
          </details>
        )}

        {actor && (
          <div className="border-border mt-5 flex flex-col gap-4 border-t pt-5">
            <Field label={writesFirst ? '撰写回复' : '审阅回复（可修改）'} required>
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} />
            </Field>
            {isFinal && (
              <Field label="延迟可见（小时）" hint="回复完成后，家长在此时间后可见">
                <Input type="number" min={0} step={0.5} value={delay} onChange={(e) => setDelay(e.target.value)} />
              </Field>
            )}
            <Field label="说明（驳回原因等）"><Input value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
            <ErrorState message={err} />
            <div className="flex flex-wrap gap-3">
              <Button disabled={busy} onClick={() => act(f.status === '待专员回复' ? '提交回复' : '审核通过')}>
                {isFinal ? '通过并完成回复' : f.status === '待专员回复' ? '提交给总监' : '通过并提交总管'}
              </Button>
              {f.status !== '待专员回复' && prevStatus(f.status, p.review_level) !== f.status && (
                <Button variant="destructive" disabled={busy} onClick={() => act('驳回')}>驳回至上一级</Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
