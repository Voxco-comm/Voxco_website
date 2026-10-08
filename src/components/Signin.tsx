'use client'

import React, { useState, FormEvent, ChangeEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Lock, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Alert from './ui/Alert'
import AuthLayout, {
  AuthHeader,
  AuthPrimaryButton,
  AuthSwitchPrompt,
  PasswordToggle,
  authIconClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  fieldBorder,
} from './AuthLayout'

export default function Signin() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const disabledParam = searchParams.get('disabled')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [resetLoading, setResetLoading] = useState<boolean>(false)
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const supabase = createClient()

  const handleClick = async (e: FormEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message || 'Invalid email or password')
        setLoading(false)
        return
      }

      if (data.user) {
        // Check if customer account is disabled before allowing access
        const { data: customer } = await supabase
          .from('customers')
          .select('is_disabled')
          .eq('user_id', data.user.id)
          .maybeSingle()

        if (customer?.is_disabled) {
          await supabase.auth.signOut()
          router.push('/sign-in?disabled=1')
          router.refresh()
          setLoading(false)
          return
        }

        // Update last_login_at for the customer record
        try {
          await supabase
            .from('customers')
            .update({ last_login_at: new Date().toISOString() })
            .eq('user_id', data.user.id)
        } catch (updateErr) {
          // Silently ignore - customer record might not exist yet
          console.warn('Could not update last login:', updateErr)
        }

        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleInputChange = () => {
    if (error) {
      setError('')
    }
    if (success) {
      setSuccess('')
    }
  }

  const handleResetPassword = async () => {
    const normalizedEmail = email.trim()

    if (!normalizedEmail) {
      setError('Please enter your email address to receive a password reset link.')
      return
    }

    setResetLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) throw resetError

      setSuccess('Password reset link sent. Please check your email inbox and spam folder.')
    } catch (err: any) {
      console.error('Password reset error:', err)
      setError(err?.message || 'Failed to send password reset email. Please try again.')
    } finally {
      setResetLoading(false)
    }
  }

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    handleInputChange()
  }

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    handleInputChange()
  }


  // Presentational only: outline the empty field(s) when the existing
  // "fill in all fields" validation message is showing.
  const missingFields = error === 'Please fill in all fields.'
  const emailInvalid = missingFields && !email.trim()
  const passwordInvalid = missingFields && !password.trim()

  return (
    <AuthLayout showSecureNote>
      <AuthHeader title="Welcome back" subtitle="Sign in to Voxco Number Portal" />

      {/* Disabled account message */}
      {disabledParam === '1' && (
        <div className="mb-5">
          <Alert
            type="error"
            message="Your account has been disabled. Please contact support."
            dismissible
            onDismiss={() => router.replace('/sign-in')}
          />
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-5" role="alert">
          <Alert
            type="error"
            message={error}
            dismissible
            onDismiss={() => setError('')}
          />
        </div>
      )}

      {success && (
        <div className="mb-5" role="status">
          <Alert
            type="success"
            message={success}
            dismissible
            onDismiss={() => setSuccess('')}
          />
        </div>
      )}

      {/* Form */}
      <form className="space-y-5">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className={authLabelClass}>
            Email address
          </label>
          <div className="relative">
            <input
              className={`${authInputClass} pr-4 ${fieldBorder(emailInvalid)}`}
              type="email"
              id="email"
              name="email"
              placeholder="you@example.com"
              value={email}
              onChange={handleEmailChange}
              required
              disabled={loading}
              autoComplete="email"
              aria-invalid={emailInvalid || undefined}
            />
            <Mail className={authIconClass} strokeWidth={1.75} aria-hidden="true" />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className={authLabelClass}>
            Password
          </label>
          <div className="relative">
            <input
              className={`${authInputClass} pr-12 ${fieldBorder(passwordInvalid)}`}
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              placeholder="••••••••"
              value={password}
              onChange={handlePasswordChange}
              required
              disabled={loading}
              autoComplete="current-password"
              aria-invalid={passwordInvalid || undefined}
            />
            <Lock className={authIconClass} strokeWidth={1.75} aria-hidden="true" />
            <PasswordToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />
          </div>

          <div className="mt-2.5 flex justify-end">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetLoading}
              className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-[#215F9A] transition-colors duration-200 hover:text-[#2c78c0] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A]/40 focus-visible:ring-offset-2 disabled:cursor-wait disabled:no-underline disabled:opacity-70"
            >
              {resetLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {resetLoading ? 'Sending reset link...' : 'Forgot password?'}
            </button>
          </div>
        </div>

        {/* Sign In Button */}
        <AuthPrimaryButton
          type="submit"
          onClick={handleClick}
          loading={loading}
          loadingText="Signing in..."
          className="!mt-7"
        >
          Sign In
        </AuthPrimaryButton>
      </form>

      {/* Sign Up Link */}
      <AuthSwitchPrompt>
        Don&apos;t have an account?{' '}
        <button type="button" onClick={() => router.push('/sign-up')} className={authLinkClass}>
          Sign Up
        </button>
      </AuthSwitchPrompt>
    </AuthLayout>
  )
}
