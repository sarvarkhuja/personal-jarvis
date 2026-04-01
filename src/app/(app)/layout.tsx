import { Doto, Space_Grotesk, Space_Mono } from 'next/font/google'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { cn } from '@/lib/utils'

const doto = Doto({ subsets: ['latin'], variable: '--font-doto' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })
const spaceMono = Space_Mono({ subsets: ['latin'], variable: '--font-space-mono', weight: ['400', '700'] })

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(
      "min-h-screen bg-black text-[#E8E8E8] antialiased selection:bg-red-500/30",
      doto.variable,
      spaceGrotesk.variable,
      spaceMono.variable
    )}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset suppressHydrationWarning className="bg-black">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
