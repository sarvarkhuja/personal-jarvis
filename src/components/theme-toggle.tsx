'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { setTheme as persistTheme } from '@/lib/actions/account'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  const isDark = theme === 'dark'

  const onClick = () => {
    const next = isDark ? 'light' : 'dark'
    setTheme(next)
    // Persist server-side too. Fire-and-forget; failure here doesn't break the
    // local toggle since next-themes already updated the cookie.
    void persistTheme({ theme: next }).catch((e) => {
      console.error('[theme] persist failed', e)
    })
  }

  return (
    <button
      onClick={onClick}
      aria-label="Toggle theme"
      className={cn(
        "relative flex w-full items-center gap-3 overflow-hidden rounded-none p-2 h-11",
        "font-mono text-[11px] tracking-[0.08em] uppercase",
        "text-sidebar-foreground/30 hover:text-sidebar-foreground/70",
        "transition-colors duration-150 outline-hidden",
        className
      )}
    >
      {isDark
        ? <Sun className="size-4 shrink-0" strokeWidth={1.5} />
        : <Moon className="size-4 shrink-0" strokeWidth={1.5} />
      }
      <span className="group-data-[collapsible=icon]:hidden truncate">
        {isDark ? 'Light mode' : 'Dark mode'}
      </span>
    </button>
  )
}
