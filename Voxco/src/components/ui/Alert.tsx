'use client'

import React, { useState, useEffect, ReactNode } from 'react'

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  description?: string
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
  icon?: ReactNode
  autoClose?: number // milliseconds
}

const typeStyles = {
  success: {
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-800',
    icon: 'text-green-500',
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    icon: 'text-red-500',
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-800',
    icon: 'text-yellow-500',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-500',
  },
}

const defaultIcons = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

export default function Alert({
  type,
  message,
  description,
  dismissible = false,
  onDismiss,
  className = '',
  icon,
  autoClose,
}: AlertProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    if (autoClose && autoClose > 0) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, autoClose)
      return () => clearTimeout(timer)
    }
  }, [autoClose])

  const handleDismiss = () => {
    setIsLeaving(true)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss?.()
    }, 300)
  }

  if (!isVisible) return null

  const styles = typeStyles[type]

  return (
    <div
      className={`
        ${styles.bg} border rounded-xl p-4 
        ${isLeaving ? 'animate-fade-out' : 'animate-fade-in-up'}
        transition-all duration-300
        ${className}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {icon || defaultIcons[type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${styles.text}`}>{message}</p>
          {description && (
            <p className={`mt-1 text-sm opacity-80 ${styles.text}`}>{description}</p>
          )}
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors ${styles.text}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// Toast Notification Component
interface ToastProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  onClose: (id: string) => void
  duration?: number
}

export function Toast({ id, type, message, onClose, duration = 5000 }: ToastProps) {
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => onClose(id), 300)
  }

  const styles = typeStyles[type]

  return (
    <div
      className={`
        ${styles.bg} border rounded-xl p-4 shadow-lg min-w-[300px] max-w-md
        ${isLeaving ? 'animate-slide-out-right' : 'animate-slide-in-right'}
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {defaultIcons[type]}
        </div>
        <p className={`flex-1 text-sm font-medium ${styles.text}`}>{message}</p>
        <button
          onClick={handleClose}
          className={`flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors ${styles.text}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// Toast Container
export function ToastContainer({ children }: { children: ReactNode }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
      {children}
    </div>
  )
}

// Empty State Component
interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`text-center py-12 px-6 animate-fade-in ${className}`}>
      {icon && (
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-gray-500 mb-6 max-w-md mx-auto">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}

