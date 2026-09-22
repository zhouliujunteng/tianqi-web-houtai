export const ROLES = ['超级管理员', '总管', '总监', '监护专员', '客户端管理者', '家长'] as const
export type Role = (typeof ROLES)[number]

export const ACCOUNT_STATUS = ['正常', '停用'] as const
export const PLAN_STATUS = ['草稿', '待审核', '已驳回', '待给出', '已给出', '已结束'] as const
export type PlanStatus = (typeof PLAN_STATUS)[number]
export const REVIEW_LEVELS = ['一级审核', '二级审核', '三级审核'] as const
export type ReviewLevel = (typeof REVIEW_LEVELS)[number]
export const FORM_TYPES = ['学生基本信息', '家庭信息', '学生方案', '父母必答'] as const
export type FormType = (typeof FORM_TYPES)[number]
export const REVIEW_ACTIONS = ['通过', '驳回'] as const
export const FEEDBACK_STATUS = ['待专员回复', '待总监审核', '待总管审核', '已回复'] as const
export type FeedbackStatus = (typeof FEEDBACK_STATUS)[number]
export const REPLY_ACTIONS = ['提交回复', '审核通过', '驳回'] as const
export const GENDERS = ['男', '女'] as const
export const RELATIONS = ['父亲', '母亲', '爷爷', '奶奶', '外公', '外婆', '其他'] as const
export const GRANT_TYPES = ['管理端分配给管理者', '管理者分配给家长'] as const
export const GRADES = ['幼儿园', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三', '其他'] as const
export const DOC_TYPES = ['平台方案郑重声明', '建档须知', '提交信息说明', '父母必答说明'] as const
export const QUESTION_SECTIONS = ['父母必答', '亲属环境', '孩子性格行为描述', '孩子以往对抗点和对抗程度', '孩子经济状况'] as const

export const STATUS_TONE: Record<string, string> = {
  草稿: 'text-muted border-black/15',
  待审核: 'text-warn border-warn/40 bg-warn/5',
  已驳回: 'text-danger border-danger/40 bg-danger/5',
  待给出: 'text-primary border-primary/40 bg-primary-soft',
  已给出: 'text-success border-success/40 bg-success/5',
  已结束: 'text-muted border-black/15 bg-black/[0.03]',
  待专员回复: 'text-warn border-warn/40 bg-warn/5',
  待总监审核: 'text-warn border-warn/40 bg-warn/5',
  待总管审核: 'text-warn border-warn/40 bg-warn/5',
  已回复: 'text-success border-success/40 bg-success/5',
  正常: 'text-success border-success/40 bg-success/5',
  停用: 'text-danger border-danger/40 bg-danger/5',
}

/** 反馈按方案审核等级决定起始状态 */
export function initialFeedbackStatus(level: ReviewLevel | null | undefined): FeedbackStatus {
  if (level === '一级审核') return '待总管审核'
  if (level === '二级审核') return '待总监审核'
  return '待专员回复'
}

/** Zion 枚举在 GraphQL 里是自定义标量 fzu_3ae_3a<typeId>，变量声明要用这个类型名 */
export const GQL_ENUM = {
  role: 'fzu_3ae_3awybc1df8j',
  accountStatus: 'fzu_3ae_3aimpi71dey',
  planStatus: 'fzu_3ae_3acefqe4la5',
  reviewLevel: 'fzu_3ae_3acaxtbc6lt',
  formType: 'fzu_3ae_3aunm1zmcof',
  reviewAction: 'fzu_3ae_3ayib0pnd3u',
  feedbackStatus: 'fzu_3ae_3ab0v5evnux',
  replyAction: 'fzu_3ae_3as2qadiwga',
  gender: 'fzu_3ae_3aopspbqbfr',
  relation: 'fzu_3ae_3ah4lgjrqac',
  grantType: 'fzu_3ae_3av2b1b80z3',
  grade: 'fzu_3ae_3agu96jr6sv',
  docType: 'fzu_3ae_3atcyq9zqyx',
  questionSection: 'fzu_3ae_3av8wlsvybx',
} as const
