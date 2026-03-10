import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Signin from '@/components/Signin'

export default async function SignInPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  return <Signin />
}

