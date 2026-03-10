import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import CustomerOrders from '@/components/CustomerOrders'

export default async function OrdersPageRoute() {
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

  return <CustomerOrders />
}

