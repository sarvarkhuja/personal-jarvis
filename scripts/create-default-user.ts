#!/usr/bin/env npx tsx
/**
 * Creates the default app user in Supabase.
 * Run: npx tsx scripts/create-default-user.ts
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const DEFAULT_EMAIL = 'aki@training.app'
const DEFAULT_PASSWORD = 'Tr4!n1ng#Jarv!s2026$Aki'

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  console.log(`Creating user: ${DEFAULT_EMAIL}`)

  const { data, error } = await supabase.auth.signUp({
    email: DEFAULT_EMAIL,
    password: DEFAULT_PASSWORD,
  })

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  if (data.session) {
    console.log('✓ User created and logged in (email confirmation disabled)')
  } else {
    console.log('✓ User created — check email to confirm (or disable email confirmation in Supabase Dashboard → Authentication → Settings)')
  }

  console.log('\nCredentials:')
  console.log(`  Email:    ${DEFAULT_EMAIL}`)
  console.log(`  Password: ${DEFAULT_PASSWORD}`)
  console.log(`  User ID:  ${data.user?.id ?? 'pending confirmation'}`)
}

main()
