'use client'

import React, { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'flat' | 'glass'
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  animate?: boolean
  animationDelay?: number
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

const variantClasses = {
  default: 'bg-white rounded-3xl shadow-lg',
  flat: 'bg-white rounded-2xl border border-gray-200',
  glass: 'glass rounded-2xl',
}

export default function Card({
  children,
  className = '',
  variant = 'default',
  hover = false,
  padding = 'md',
  animate = true,
  animationDelay = 0,
}: CardProps) {
  return (
    <div
      className={`
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${hover ? 'hover-lift cursor-pointer' : ''}
        ${animate ? 'animate-fade-in-up' : ''}
        ${className}
      `}
      style={animationDelay ? { animationDelay: `${animationDelay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

// Card Header
interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

export function CardHeader({ title, subtitle, action, icon, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-[#215F9A]/10 flex items-center justify-center text-[#215F9A]">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-xl font-semibold text-[#215F9A]">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// Card Content
export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}

// Card Footer
export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-100 ${className}`}>
      {children}
    </div>
  )
}

// Stat Card
interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  change?: {
    value: number
    type: 'increase' | 'decrease'
  }
  className?: string
  animationDelay?: number
}

export function StatCard({ label, value, icon, change, className = '', animationDelay = 0 }: StatCardProps) {
  return (
    <Card
      className={`${className}`}
      animationDelay={animationDelay}
      hover
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${change.type === 'increase' ? 'text-green-600' : 'text-red-600'
              }`}>
              <svg
                className={`w-4 h-4 ${change.type === 'decrease' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
              <span>{Math.abs(change.value)}%</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="w-14 h-14 rounded-2xl bg-[#215F9A]/10 flex items-center justify-center text-[#215F9A]">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

