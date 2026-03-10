'use client'

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useAuth } from './AuthContext'

const IDLE_TIMEOUT_MINUTES = typeof process.env.NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES !== 'undefined'
  ? Math.max(1, parseInt(process.env.NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES, 10) || 5)
  : 5
const WARNING_BEFORE_MINUTES = 1
const IDLE_MS = IDLE_TIMEOUT_MINUTES * 60 * 1000
const WARNING_MS = (IDLE_TIMEOUT_MINUTES - WARNING_BEFORE_MINUTES) * 60 * 1000

export function IdleTimeoutProvider({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
    setShowWarning(false)
  }, [])

  const startIdleTimers = useCallback(() => {
    if (!user) return
    clearTimers()
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      warningTimerRef.current = null
      idleTimerRef.current = setTimeout(() => {
        signOut()
        idleTimerRef.current = null
      }, WARNING_BEFORE_MINUTES * 60 * 1000)
    }, WARNING_MS)
  }, [user, signOut, clearTimers])

  useEffect(() => {
    if (!user) {
      clearTimers()
      return
    }
    startIdleTimers()
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    const onActivity = () => startIdleTimers()
    events.forEach((ev) => window.addEventListener(ev, onActivity))
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity))
      clearTimers()
    }
  }, [user, startIdleTimers, clearTimers])

  const handleStayLoggedIn = () => {
    startIdleTimers()
  }

  return (
    <>
      {children}
      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <p className="text-gray-800 mb-4">
              You will be logged out in {WARNING_BEFORE_MINUTES} minute{WARNING_BEFORE_MINUTES > 1 ? 's' : ''} due to inactivity.
            </p>
            <button
              type="button"
              onClick={handleStayLoggedIn}
              className="w-full bg-[#215F9A] text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Stay logged in
            </button>
          </div>
        </div>
      )}
    </>
  )
}
