'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

const COOKIE_CONSENT_KEY = 'voxco_cookie_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (consent !== 'accepted') {
      setVisible(true)
    }
  }, [])

  const accept = () => {
    if (typeof window === 'undefined') return
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] p-4 sm:p-5"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-gray-700">
          We use strictly necessary cookies to run the site (e.g. sign-in and session). By continuing, you agree to our use of cookies as described in our{' '}
          <Link href="/privacy#cookies" className="text-[#215F9A] hover:text-[#2c78c0] underline font-medium">
            Privacy Policy
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 px-5 py-2.5 rounded-xl bg-[#215F9A] hover:bg-[#2c78c0] text-white font-medium text-sm transition-colors"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
