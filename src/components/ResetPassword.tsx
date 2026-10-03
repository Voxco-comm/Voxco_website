'use client'

import React, { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Link2Off, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Alert from './ui/Alert'
import AuthLayout, {
  AuthHeader,
  AuthPrimaryButton,
  AuthStatusIcon,
  AuthSwitchPrompt,
  PasswordToggle,
  authIconClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  fieldBorder,
} from './AuthLayout'

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
      <AuthLayout>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-500" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-[#215F9A]" aria-hidden="true" />
          <div className="text-[15px]">Loading...</div>
        </div>
      </AuthLayout>
    )
  }

  if (!hasRecoverySession) {
    return (
      <AuthLayout>
        <AuthHeader
          icon={
            <AuthStatusIcon tone="warning">
              <Link2Off className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            </AuthStatusIcon>
          }
          title="Invalid or expired link"
          subtitle="Please request a new password reset link."
        />
        <AuthPrimaryButton type="button" onClick={() => router.push('/sign-in')}>
          Go to Sign In
        </AuthPrimaryButton>
      </AuthLayout>
    )
  }

  if (success) {
    return (
      <AuthLayout>
        <AuthHeader
          icon={
            <AuthStatusIcon tone="success">
              <CheckCircle2 className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            </AuthStatusIcon>
          }
          title="Password updated"
          subtitle="You can now sign in with your new password."
        />
        <AuthPrimaryButton type="button" onClick={() => router.push('/sign-in')}>
          Sign In
        </AuthPrimaryButton>
      </AuthLayout>
    )
  }

  // Presentational only: tint the field an existing error message refers to.
  const passwordInvalid = error === 'Password must be at least 6 characters.'
  const confirmInvalid = error === 'Passwords do not match.'

  return (
    <AuthLayout>
      <AuthHeader title="Set new password" subtitle="Enter your new password below." />
      {error && (
        <div className="mb-5" role="alert">
          <Alert type="error" message={error} dismissible onDismiss={() => setError('')} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className={authLabelClass}>New password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${authInputClass} pr-12 ${fieldBorder(passwordInvalid)}`}
              placeholder="••••••••"
              required
              minLength={6}
              disabled={loading}
              autoComplete="new-password"
              aria-invalid={passwordInvalid || undefined}
            />
            <Lock className={authIconClass} strokeWidth={1.75} aria-hidden="true" />
            <PasswordToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />
          </div>
        </div>
        <div>
          <label htmlFor="confirmPassword" className={authLabelClass}>Confirm password</label>
          <div className="relative">
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${authInputClass} pr-4 ${fieldBorder(confirmInvalid)}`}
              placeholder="••••••••"
              required
              minLength={6}
              disabled={loading}
              autoComplete="new-password"
              aria-invalid={confirmInvalid || undefined}
            />
            <ShieldCheck className={authIconClass} strokeWidth={1.75} aria-hidden="true" />
          </div>
        </div>
        <AuthPrimaryButton type="submit" loading={loading} loadingText="Updating..." className="!mt-7">
          Update password
        </AuthPrimaryButton>
      </form>
      <AuthSwitchPrompt>
        <button type="button" onClick={() => router.push('/sign-in')} className={authLinkClass}>Back to Sign In</button>
      </AuthSwitchPrompt>
    </AuthLayout>
  )
}
