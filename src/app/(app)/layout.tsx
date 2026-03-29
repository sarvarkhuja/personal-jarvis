import { BottomNav } from '@/components/layout/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <main>{children}</main>
      <BottomNav />
    </div>
  )
}
