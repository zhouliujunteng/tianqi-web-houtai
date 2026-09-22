import { gql } from './api'
import { GQL_ENUM } from './enums'

export const PLAN_LIST_FIELDS = `
  id plan_no status review_level grade_at_filing submitted_at approved_at deliver_at service_expire_at feedback_count rejected_form reject_reason created_at updated_at
  parent_id chief_id director_id specialist_id student_id
  form_student_done form_family_done form_plan_done form_answer_done
  student { id name gender birthday }
  parent { id real_name username fz_phone_number }
  director { id real_name }
  specialist { id real_name }
`

export interface PlanRow {
  id: number
  plan_no: string | null
  status: string
  review_level: string | null
  grade_at_filing: string | null
  submitted_at: string | null
  approved_at: string | null
  deliver_at: string | null
  service_expire_at: string | null
  feedback_count: number
  rejected_form: string | null
  reject_reason: string | null
  created_at: string
  updated_at: string
  parent_id: number | null
  chief_id: number | null
  director_id: number | null
  specialist_id: number | null
  student_id: number | null
  form_student_done: boolean
  form_family_done: boolean
  form_plan_done: boolean
  form_answer_done: boolean
  student: { id: number; name: string; gender: string | null; birthday: string | null } | null
  parent: { id: number; real_name: string | null; username: string | null; fz_phone_number: string | null } | null
  director: { id: number; real_name: string | null } | null
  specialist: { id: number; real_name: string | null } | null
}

export async function listPlans(where: Record<string, unknown>, limit = 200): Promise<PlanRow[]> {
  const data = await gql<{ plan: PlanRow[] }>(
    `query Plans($where: plan_bool_exp, $limit: Int) { plan(where: $where, order_by: { updated_at: desc }, limit: $limit) { ${PLAN_LIST_FIELDS} } }`,
    { where, limit },
  )
  return data.plan
}

export async function countPlans(where: Record<string, unknown>): Promise<number> {
  const data = await gql<{ plan_aggregate: { aggregate: { count: number } } }>(
    `query C($where: plan_bool_exp) { plan_aggregate(where: $where) { aggregate { count } } }`,
    { where },
  )
  return data.plan_aggregate.aggregate.count
}

export const enumVar = (name: string, key: keyof typeof GQL_ENUM) => `$${name}: ${GQL_ENUM[key]}`
