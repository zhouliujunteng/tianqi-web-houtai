import {
  BookTextIcon, ClipboardCheckIcon, FilePlus2Icon, FolderKanbanIcon, LayoutDashboardIcon,
  LibraryBigIcon, MessageSquareIcon, TicketIcon, UsersIcon, type LucideIcon,
} from 'lucide-react'
import type { Role } from './enums'

export interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }
export interface NavGroup { label: string; items: NavItem[] }

const HOME: NavItem = { to: '/', label: '概览', icon: LayoutDashboardIcon, end: true }

export function navForRole(role: Role | undefined): NavGroup[] {
  switch (role) {
    case '家长':
      return [
        { label: '工作台', items: [HOME, { to: '/plans', label: '我的方案', icon: FolderKanbanIcon }, { to: '/plans/new', label: '新建方案', icon: FilePlus2Icon }] },
        { label: '资料', items: [{ to: '/docs', label: '平台文档', icon: BookTextIcon }] },
      ]
    case '客户端管理者':
      return [
        { label: '工作台', items: [HOME, { to: '/parents', label: '家长', icon: UsersIcon }, { to: '/plans', label: '方案', icon: FolderKanbanIcon }] },
        { label: '管理', items: [{ to: '/quota', label: '名额发放', icon: TicketIcon }, { to: '/docs', label: '平台文档', icon: BookTextIcon }] },
      ]
    case '总管':
      return [
        { label: '工作台', items: [HOME, { to: '/review', label: '待审核', icon: ClipboardCheckIcon }, { to: '/plans', label: '全部方案', icon: FolderKanbanIcon }, { to: '/feedbacks', label: '反馈', icon: MessageSquareIcon }] },
        { label: '管理', items: [{ to: '/accounts', label: '账号', icon: UsersIcon }, { to: '/quota', label: '名额', icon: TicketIcon }, { to: '/library', label: '内容库', icon: LibraryBigIcon }] },
      ]
    case '总监':
    case '监护专员':
      return [
        { label: '工作台', items: [HOME, { to: '/plans', label: '分配方案', icon: FolderKanbanIcon }, { to: '/feedbacks', label: '反馈', icon: MessageSquareIcon }] },
        { label: '资料', items: [{ to: '/docs', label: '平台文档', icon: BookTextIcon }] },
      ]
    case '超级管理员':
      return [
        { label: '工作台', items: [HOME, { to: '/review', label: '待审核', icon: ClipboardCheckIcon }, { to: '/plans', label: '方案', icon: FolderKanbanIcon }, { to: '/feedbacks', label: '反馈', icon: MessageSquareIcon }] },
        { label: '管理', items: [{ to: '/accounts', label: '账号', icon: UsersIcon }, { to: '/quota', label: '名额', icon: TicketIcon }, { to: '/library', label: '内容库', icon: LibraryBigIcon }] },
      ]
    default:
      return [{ label: '资料', items: [{ to: '/docs', label: '平台文档', icon: BookTextIcon }] }]
  }
}

/** 面包屑标题：按路径前缀匹配 */
const TITLES: [RegExp, string][] = [
  [/^\/$/, '概览'],
  [/^\/plans\/new$/, '新建方案'],
  [/^\/plans\/\d+\/edit$/, '修改方案'],
  [/^\/plans\/\d+$/, '方案详情'],
  [/^\/plans$/, '方案'],
  [/^\/review\/\d+$/, '方案审核'],
  [/^\/review$/, '待审核'],
  [/^\/feedbacks$/, '反馈'],
  [/^\/accounts$/, '账号'],
  [/^\/parents$/, '家长'],
  [/^\/quota$/, '名额'],
  [/^\/library/, '内容库'],
  [/^\/docs\/.+/, '文档详情'],
  [/^\/docs$/, '平台文档'],
]

export function titleForPath(path: string): string {
  return TITLES.find(([re]) => re.test(path))?.[1] ?? '天启'
}
