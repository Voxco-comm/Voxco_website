'use client'

import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'white' | 'gray'
  text?: string
  fullScreen?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
}

const colorClasses = {
  primary: 'text-[#215F9A]',
  white: 'text-white',
  gray: 'text-gray-400',
}

export default function LoadingSpinner({
  size = 'md',
  color = 'primary',
  text,
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <svg
        className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {text && (
        <p className={`text-sm font-medium ${colorClasses[color]} animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gray-50/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-scale-in">
          {spinner}
        </div>
      </div>
    )
  }

  return spinner
}

// Loading skeleton component
export function Skeleton({
  className = '',
  variant = 'text'
}: {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
}) {
  const baseClass = 'skeleton animate-pulse bg-gray-200'
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }

  return <div className={`${baseClass} ${variantClasses[variant]} ${className}`} />
}

// Loading dots component
export function LoadingDots({ color = 'primary' }: { color?: 'primary' | 'white' }) {
  const dotColor = color === 'primary' ? 'bg-[#215F9A]' : 'bg-white'

  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${dotColor} animate-bounce`}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

// Page loading component
export function PageLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="mb-6">
          <img
            src="/logo.png"
            className="bg-[#215F9A] px-6 py-3 rounded-2xl mx-auto animate-pulse-slow"
            alt="logo"
          />
        </div>
        <LoadingSpinner size="lg" text={message} />
      </div>
    </div>
  )
}

// Table skeleton loader
export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200">
      {/* Header */}
      <div className="bg-gray-100 p-4 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" variant="text" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="p-4 flex gap-4 border-t border-gray-100"
          style={{ animationDelay: `${rowIndex * 50}ms` }}
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" variant="text" />
          ))}
        </div>
      ))}
    </div>
  )
}

// Card skeleton loader
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
      <Skeleton className="h-6 w-1/3 mb-4" variant="text" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" variant="text" />
        <Skeleton className="h-4 w-5/6" variant="text" />
        <Skeleton className="h-4 w-4/6" variant="text" />
      </div>
    </div>
  )
}

