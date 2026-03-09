'use client'

import React, { ReactNode, ButtonHTMLAttributes } from 'react'
import { LoadingDots } from './LoadingSpinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  loadingText?: string
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  children: ReactNode
}

const variantClasses = {
  primary: 'bg-[#215F9A] text-white hover:bg-[#2c78c0] focus:ring-[#215F9A]/30',
  secondary: 'bg-transparent text-[#215F9A] border-2 border-[#215F9A] hover:bg-[#215F9A] hover:text-white focus:ring-[#215F9A]/30',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500/30',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/30',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-300/30',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-base rounded-xl',
  lg: 'px-6 py-3 text-lg rounded-xl',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-4
        disabled:opacity-60 disabled:cursor-not-allowed
        active:scale-[0.98]
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <LoadingDots color={variant === 'secondary' || variant === 'ghost' ? 'primary' : 'white'} />
          {loadingText && <span className="ml-2">{loadingText}</span>}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
        </>
      )}
    </button>
  )
}

// Icon Button
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon: ReactNode
  'aria-label': string
}

const iconSizeClasses = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-3',
}

const iconVariantClasses = {
  primary: 'bg-[#215F9A] text-white hover:bg-[#2c78c0]',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100',
}

export function IconButton({
  variant = 'ghost',
  size = 'md',
  icon,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center
        rounded-lg
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-[#215F9A]/30
        disabled:opacity-60 disabled:cursor-not-allowed
        active:scale-95
        ${iconVariantClasses[variant]}
        ${iconSizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {icon}
    </button>
  )
}

// Button Group
export function ButtonGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`inline-flex rounded-xl overflow-hidden shadow-sm ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            className: `${(child.props as any).className || ''} rounded-none border-r border-white/20 last:border-r-0`,
          })
        }
        return child
      })}
    </div>
  )
}

