import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { requireUserId } from '@/lib/auth/server-user';
import { DeleteAccountButton } from '@/components/account/DeleteAccountButton';

export default async function SettingsPage() {
  await requireUserId();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="font-heading text-2xl font-medium">Settings</h1>
        <p className="text-sm text-muted-foreground">Account &amp; data.</p>
      </header>

      <Card className="flex flex-col gap-3 p-4">
        <h2 className="text-sm font-medium">Export</h2>
        <p className="text-sm text-muted-foreground">
          Download a JSON file containing every row across your tracker tables.
        </p>
        <Button render={<Link href="/api/export" download data-testid="export-link" />}>
          Download my data
        </Button>
      </Card>

      <Card className="flex flex-col gap-3 border-destructive/50 p-4">
        <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated tracker data.
          This cannot be undone.
        </p>
        <DeleteAccountButton />
      </Card>
    </main>
  );
}
