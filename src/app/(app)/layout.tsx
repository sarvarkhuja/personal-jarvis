import { Doto, Space_Grotesk, Space_Mono } from 'next/font/google'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
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
          {children}
        </SidebarInset>
      </SidebarProvider>
      <ShortcutsProvider />
    </div>
  )
}
