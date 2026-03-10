import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RequirementsUpload from '@/components/RequirementsUpload'
import { Suspense } from 'react'

function RequirementsUploadWrapper() {
  return <RequirementsUpload />
}

export default async function OrderPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  return (
    <Suspense fallback={
      <main className="bg-gray-50 min-h-screen py-12 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    }>
      <RequirementsUploadWrapper />
    </Suspense>
  )
}
