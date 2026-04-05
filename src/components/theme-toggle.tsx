'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
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
