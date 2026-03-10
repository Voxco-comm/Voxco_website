'use client'

import React, { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from './ui/Button'
import Alert from './ui/Alert'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const check = () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      supabase.auth.getSession().then(({ data: { session } }) => {
        const hasHash = hash.includes('type=recovery') || hash.includes('access_token')
        if (session) setHasRecoverySession(true)
        else if (hasHash) {
          setHasRecoverySession(true)
        } else setHasRecoverySession(false)
      })
    }
    check()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') check()
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess(true)
      setPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.message || 'Failed to update password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (hasRecoverySession === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!hasRecoverySession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid or expired link</h1>
          <p className="text-gray-600 mb-6">Please request a new password reset link.</p>
          <Button onClick={() => router.push('/sign-in')} fullWidth>Go to Sign In</Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-green-700 mb-2">Password updated</h1>
          <p className="text-gray-600 mb-6">You can now sign in with your new password.</p>
          <Button onClick={() => router.push('/sign-in')} fullWidth>Sign In</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Set new password</h1>
        <p className="text-gray-600 mb-6">Enter your new password below.</p>
        {error && (
          <div className="mb-4">
            <Alert type="error" message={error} dismissible onDismiss={() => setError('')} />
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">New password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full pl-4 pr-12"
                placeholder="••••••••"
                required
                minLength={6}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input w-full"
              placeholder="••••••••"
              required
              minLength={6}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" loading={loading} loadingText="Updating..." fullWidth>Update password</Button>
        </form>
        <p className="mt-6 text-center">
          <button type="button" onClick={() => router.push('/sign-in')} className="text-[#215F9A] font-semibold hover:underline">Back to Sign In</button>
        </p>
      </div>
    </div>
  )
}
