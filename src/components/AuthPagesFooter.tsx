'use client'

import Link from 'next/link'

export default function AuthPagesFooter() {
  return (
    <footer className="mt-8 text-center text-sm text-gray-500">
      <Link href="/privacy" className="text-[#215F9A] hover:text-[#2c78c0] underline">
        Privacy Policy
      </Link>
      <span className="mx-2">·</span>
      <Link href="/privacy#cookies" className="text-[#215F9A] hover:text-[#2c78c0] underline">
        Cookies
      </Link>
    </footer>
  )
}
