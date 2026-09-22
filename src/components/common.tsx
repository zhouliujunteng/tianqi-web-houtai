import { AlertCircleIcon, InboxIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn('animate-appear mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
      <div className="max-w-3xl space-y-2">
        {eyebrow && <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
        {description && <p className="text-muted-foreground text-sm text-balance sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

const TONES: Record<string, string> = {
  草稿: 'text-muted-foreground',
  待审核: 'text-brand border-brand/40 bg-brand/8',
  已驳回: 'text-destructive border-destructive/40 bg-destructive/8',
  待给出: 'text-brand border-brand/40 bg-brand/8',
  已给出: 'text-emerald-600 border-emerald-600/40 bg-emerald-500/8 dark:text-emerald-400',
  已结束: 'text-muted-foreground',
  待专员回复: 'text-amber-600 border-amber-600/40 bg-amber-500/8 dark:text-amber-400',
  待总监审核: 'text-amber-600 border-amber-600/40 bg-amber-500/8 dark:text-amber-400',
  待总管审核: 'text-amber-600 border-amber-600/40 bg-amber-500/8 dark:text-amber-400',
  已回复: 'text-emerald-600 border-emerald-600/40 bg-emerald-500/8 dark:text-emerald-400',
  处理中: 'text-muted-foreground',
  正常: 'text-emerald-600 border-emerald-600/40 bg-emerald-500/8 dark:text-emerald-400',
  停用: 'text-destructive border-destructive/40 bg-destructive/8',
}

export function StatusBadge({ value, className }: { value: string | null | undefined; className?: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  return <Badge variant="outline" className={cn('font-medium', TONES[value] ?? 'text-foreground', className)}>{value}</Badge>
}

export function StatCard({ label, value, hint, accent, icon }: { label: string; value: ReactNode; hint?: ReactNode; accent?: boolean; icon?: ReactNode }) {
  return (
    <Card className="glass-1 shadow-none">
      <CardHeader className="p-5 pb-0">
        <CardDescription className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase">{icon}{label}</CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-2">
        <div className={cn('font-mono text-3xl leading-none font-semibold tracking-tight tabular-nums', accent && 'text-brand')}>{value}</div>
        {hint && <p className="text-muted-foreground mt-2 text-xs">{hint}</p>}
      </CardContent>
    </Card>
  )
}

export function SectionCard({ title, description, actions, children, className, contentClassName }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; contentClassName?: string }) {
  return (
    <Card className={cn('shadow-none', className)}>
      <CardHeader className="border-border flex flex-row items-start justify-between gap-4 border-b p-5">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription className="text-sm">{description}</CardDescription>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </CardHeader>
      <CardContent className={cn('p-5', contentClassName)}>{children}</CardContent>
    </Card>
  )
}

export function EmptyState({ children = '暂无数据', icon = <InboxIcon className="size-5" /> }: { children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="text-muted-foreground border-border flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center text-sm">
      <span className="opacity-60">{icon}</span>
      <span className="text-balance">{children}</span>
    </div>
  )
}

export function ErrorState({ message, title = '请求未成功' }: { message: string | null; title?: string }) {
  if (!message) return null
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

export function LoadingRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  )
}

export function Field({ label, htmlFor, required, hint, children, className }: { label: string; htmlFor?: string; required?: boolean; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium tracking-wide uppercase">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  )
}

export function KV({ k, v, className }: { k: ReactNode; v: ReactNode; className?: string }) {
  return (
    <div className={cn('border-border flex flex-col gap-1 border-b py-3 last:border-b-0', className)}>
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{k}</span>
      <span className="text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">{v ?? '—'}</span>
    </div>
  )
}

export function Toast({ message, tone = 'ok' }: { message: string | null; tone?: 'ok' | 'err' }) {
  if (!message) return null
  return (
    <div className="animate-appear fixed inset-x-0 bottom-6 z-100 flex justify-center px-4">
      <div className={cn('glass-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-xl backdrop-blur-lg', tone === 'err' ? 'text-destructive-foreground' : 'text-foreground')}>{message}</div>
    </div>
  )
}
