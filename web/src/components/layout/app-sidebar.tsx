import { ChevronsUpDownIcon, LogOutIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { TianqiLogo } from '@/components/logo'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from '@/components/ui/sidebar'
import { useAuth } from '@/lib/auth'
import { navForRole } from '@/lib/nav'

export function AppSidebar() {
  const { account, logout } = useAuth()
  const { isMobile, setOpenMobile } = useSidebar()
  const { pathname } = useLocation()
  const groups = navForRole(account?.role)
  const active = (to: string, end?: boolean) => (end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`))
  const close = () => { if (isMobile) setOpenMobile(false) }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/" onClick={close}>
                <div className="bg-brand/10 text-brand flex aspect-square size-8 items-center justify-center rounded-lg">
                  <TianqiLogo className="size-5" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">天启</span>
                  <span className="text-muted-foreground truncate text-xs">学生方案管理平台</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((it) => (
                  <SidebarMenuItem key={it.to}>
                    <SidebarMenuButton asChild isActive={active(it.to, it.end)} tooltip={it.label}>
                      <Link to={it.to} onClick={close}><it.icon />{it.label}</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <div className="bg-sidebar-accent text-sidebar-accent-foreground flex aspect-square size-8 items-center justify-center rounded-lg text-xs font-semibold">
                    {(account?.real_name || account?.username || '?').slice(0, 2)}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{account?.real_name || account?.username}</span>
                    <span className="text-muted-foreground truncate text-xs">{account?.role}</span>
                  </div>
                  <ChevronsUpDownIcon className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side={isMobile ? 'bottom' : 'right'} align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span>{account?.real_name || account?.username}</span>
                  <span className="text-muted-foreground text-xs font-normal">{account?.role}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={logout}><LogOutIcon />退出登录</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
