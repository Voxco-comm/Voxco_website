import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Signup from '@/components/Signup'

export default async function SignUpPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  return <Signup />
}

