import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import Numbers from '@/components/Numbers'

export default async function NumbersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Redirect admins to admin dashboard - admins should not access customer pages
  const admin = await isAdmin()
  if (admin) {
    redirect('/admin')
  }

  return <Numbers />
}

