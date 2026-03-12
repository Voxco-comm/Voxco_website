'use client'

import React, { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthContext'
import { createClient } from '@/lib/supabase/client'

const PUBLIC_PATHS = ['/sign-in', '/sign-up', '/reset-password']
const ADMIN_PATH_PREFIX = '/admin'

export default function DisabledUserGuard({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const checkedRef = useRef(false)

  useEffect(() => {
    if (!user || !pathname) return
    if (pathname.startsWith(ADMIN_PATH_PREFIX)) return
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return

    const userId = user.id
    let cancelled = false
    const supabase = createClient()

    async function checkDisabled() {
      try {
        const { data: customer, error } = await supabase
          .from('customers')
          .select('is_disabled')
          .eq('user_id', userId)
          .maybeSingle()

        if (cancelled || error) return
        if (customer?.is_disabled) {
          await signOut()
          window.location.href = '/sign-in?disabled=1'
        }
      } catch {
        // ignore
      } finally {
        checkedRef.current = true
      }
    }

    checkDisabled()
    return () => {
      cancelled = true
    }
  }, [user, pathname, signOut])

  return <>{children}</>
}
