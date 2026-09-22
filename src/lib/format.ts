export function fmtDate(v: string | null | undefined, withTime = true): string {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const p = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  return withTime ? `${date} ${p(d.getHours())}:${p(d.getMinutes())}` : date
}

export function ageFromBirthday(b: string | null | undefined): number | null {
  if (!b) return null
  const d = new Date(b)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}

export function isVisible(at: string | null | undefined): boolean {
  if (!at) return false
  return new Date(at).getTime() <= Date.now()
}

export function pad2(n: number) { return String(n).padStart(2, '0') }

/**
 * 方案编号：日期 + 当日毫秒数(base36) + 随机串。
 * 「方案编号」上有唯一约束 plan_plan_no_unique，撞号会让插入失败，
 * 所以这里把熵拉大，调用方再配合一次重试即可。
 */
export function genPlanNo(): string {
  const d = new Date()
  const day = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
  const msOfDay = d.getHours() * 3600000 + d.getMinutes() * 60000 + d.getSeconds() * 1000 + d.getMilliseconds()
  const t = msOfDay.toString(36).toUpperCase().padStart(5, '0')
  const r = (Math.random().toString(36).slice(2, 8) + '000000').slice(0, 6).toUpperCase()
  return `TQ-${day}-${t}${r}`
}

/** 是否是唯一约束冲突（编号撞号） */
export function isUniqueViolation(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e)
  return /unique|duplicate|已存在/i.test(m)
}
