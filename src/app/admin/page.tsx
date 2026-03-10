import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import AdminDashboard from '@/components/AdminDashboard'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Only admins can access admin pages - redirect customers to customer dashboard
  const admin = await isAdmin()
  if (!admin) {
    redirect('/')
  }

  return <AdminDashboard />
}


