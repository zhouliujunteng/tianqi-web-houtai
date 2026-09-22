import { Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <AppShell>
      <div className="flex flex-col items-center gap-6 py-24 text-center">
        <p className="text-muted-foreground font-mono text-sm tracking-widest uppercase">404</p>
        <h1 className="text-3xl font-semibold tracking-tight">页面不存在</h1>
        <Button asChild><Link to="/">返回概览</Link></Button>
      </div>
    </AppShell>
  )
}
