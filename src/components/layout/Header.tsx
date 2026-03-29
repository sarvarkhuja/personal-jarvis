import { signOut } from '@/actions/auth'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <h1 className="font-semibold text-base">{title ?? 'Training'}</h1>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground text-xs">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  )
}
