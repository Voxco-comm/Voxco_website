'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  href?: string
  label?: string
  onClick?: () => void
  className?: string
}

export default function BackButton({ href, label = 'Back', onClick, className = '' }: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (href) {
      router.push(href)
    } else {
      router.back()
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`
        group flex items-center gap-2 text-[#215F9A] hover:text-[#2c78c0] 
        transition-all duration-200 mb-6 py-2 px-3 -ml-3 rounded-xl
        hover:bg-[#215F9A]/5 active:scale-95
        ${className}
      `}
    >
      <ArrowLeft className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-1" />
      <span className="font-medium">{label}</span>
    </button>
  )
}
