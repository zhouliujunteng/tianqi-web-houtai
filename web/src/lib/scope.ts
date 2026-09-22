import type { Account } from './auth'

/** 每个角色能看到的方案范围（前端过滤；真正的边界由 Zion 行级权限决定） */
export function planScope(acc: Account): Record<string, unknown> {
  switch (acc.role) {
    case '家长': return { parent_id: { _eq: acc.id } }
    case '总监': return { director_id: { _eq: acc.id } }
    case '监护专员': return { specialist_id: { _eq: acc.id } }
    case '客户端管理者': return { parent: { manager_id: { _eq: acc.id } } }
    default: return {}
  }
}

export function feedbackScope(acc: Account): Record<string, unknown> {
  switch (acc.role) {
    case '总管': return { status: { _eq: '待总管审核' } }
    case '总监': return { status: { _eq: '待总监审核' }, plan: { director_id: { _eq: acc.id } } }
    case '监护专员': return { status: { _eq: '待专员回复' }, plan: { specialist_id: { _eq: acc.id } } }
    case '家长': return { plan: { parent_id: { _eq: acc.id } } }
    default: return {}
  }
}

export const isStaff = (role: string) => ['超级管理员', '总管', '总监', '监护专员'].includes(role)
export const isChief = (role: string) => ['超级管理员', '总管'].includes(role)
