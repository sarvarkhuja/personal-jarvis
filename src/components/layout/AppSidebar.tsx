'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Dumbbell, User, LogOut, Sun, Moon, ListChecks, Pill, Target, CalendarDays, Timer, Wallet, Settings } from 'lucide-react'
import { signOut } from '@/actions/auth'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar'

const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/today', icon: Sun, label: 'Today' },
  { href: '/habits', icon: ListChecks, label: 'Habits' },
  { href: '/pills', icon: Pill, label: 'Pills' },
  { href: '/salah', icon: Moon, label: 'Salah' },
  { href: '/goals', icon: Target, label: 'Goals' },
  { href: '/plans', icon: CalendarDays, label: 'Plans' },
  { href: '/focus', icon: Timer, label: 'Focus' },
  { href: '/expenses', icon: Wallet, label: 'Expenses' },
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/workout', icon: Dumbbell, label: 'Workout' },
  { href: '/body', icon: User, label: 'Body' },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  // Close the mobile drawer after navigating to a new route.
  useEffect(() => {
    setOpenMobile(false)
  }, [pathname, setOpenMobile])

  return (
    <Sidebar collapsible="icon">

      {/* Wordmark */}
      <SidebarHeader className="px-3 py-4 dot-grid-subtle">
        <div className="flex items-center gap-2.5 overflow-hidden min-h-[2rem]">
          {/* Signal dot — the one expressive moment */}
          <div className="size-5 shrink-0 border border-sidebar-foreground/30 flex items-center justify-center">
            <div className="size-1.5 rounded-full bg-accent" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden leading-none">
            <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-sidebar-foreground font-bold">
              JARVIS
            </p>
            <p className="font-mono text-[9px] tracking-[0.08em] uppercase text-sidebar-foreground/40 mt-0.5">
              TRAINING SYS.
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="py-1">
        <SidebarMenu>
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip={label}
                  render={<Link href={href} />}
                  className={
                    isActive
                      ? 'font-mono text-[11px] tracking-[0.08em] uppercase text-sidebar-foreground'
                      : 'font-mono text-[11px] tracking-[0.08em] uppercase text-sidebar-foreground/40 hover:text-sidebar-foreground/80'
                  }
                >
                  <Icon strokeWidth={1.5} />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer — theme + sign out */}
      <SidebarFooter className="px-2 py-2">
        <ThemeToggle />
        <SidebarMenuItem>
          <form action={signOut} className="w-full">
            <SidebarMenuButton
              tooltip="Sign out"
              render={<button type="submit" />}
              className="font-mono text-[11px] tracking-[0.08em] uppercase text-sidebar-foreground/30 hover:text-sidebar-foreground/70"
            >
              <LogOut strokeWidth={1.5} />
              <span>Sign out</span>
            </SidebarMenuButton>
          </form>
        </SidebarMenuItem>
      </SidebarFooter>

    </Sidebar>
  )
}
