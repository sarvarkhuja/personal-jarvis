import { SidebarTrigger } from '@/components/ui/sidebar'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-3 h-14 px-4">
        <SidebarTrigger />
        <h1 className="font-semibold text-base">{title ?? 'Training'}</h1>
      </div>
    </header>
  )
}
