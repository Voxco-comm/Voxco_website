import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import OrdersPage from '@/components/OrdersPage'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Redirect admins to admin dashboard - admins should not see customer pages
  const admin = await isAdmin()
  if (admin) {
    redirect('/admin')
  }

  // Show customer dashboard for non-admin users only
  return <OrdersPage />
}

