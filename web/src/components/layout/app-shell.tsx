import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ModeToggle } from '@/components/ui/mode-toggle'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { titleForPath } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { AppSidebar } from './app-sidebar'

export function AppShell({ children, className }: { children: ReactNode; className?: string }) {
  const { pathname } = useLocation()
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="bg-background/80 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b backdrop-blur-lg">
          <div className="flex w-full items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
            <span className="truncate text-sm font-medium">{titleForPath(pathname)}</span>
            <div className="ml-auto flex items-center gap-2">
              <ModeToggle />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className={cn('w-full min-w-0', className)}>{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
