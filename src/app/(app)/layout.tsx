import { Doto, Space_Grotesk, Space_Mono } from 'next/font/google'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { ShortcutsProvider } from '@/components/keyboard/ShortcutsProvider'
import { cn } from '@/lib/utils'

const doto = Doto({ subsets: ['latin'], variable: '--font-doto' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })
const spaceMono = Space_Mono({ subsets: ['latin'], variable: '--font-space-mono', weight: ['400', '700'] })

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(
      "min-h-screen bg-background text-foreground antialiased selection:bg-accent/20",
      doto.variable,
      spaceGrotesk.variable,
      spaceMono.variable
    )}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset suppressHydrationWarning className="bg-background">
          {/* Mobile-only menu trigger — opens the off-canvas sidebar drawer.
              Hidden at md+, where the persistent rail is always visible. */}
          <SidebarTrigger
            className="fixed left-3 top-3 z-50 size-9 border border-sidebar-border bg-background/80 text-foreground backdrop-blur-md md:hidden"
          />
          {children}
        </SidebarInset>
      </SidebarProvider>
      <ShortcutsProvider />
    </div>
  )
}
