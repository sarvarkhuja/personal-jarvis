import 'server-only'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

const USER_ID_HEADER = 'x-user-id'

export async function requireUserId(): Promise<string> {
  const h = await headers()
  const userId = h.get(USER_ID_HEADER)
  if (!userId) redirect('/login')
  return userId
}

export async function tryGetUserId(): Promise<string | null> {
  const h = await headers()
  return h.get(USER_ID_HEADER)
}
