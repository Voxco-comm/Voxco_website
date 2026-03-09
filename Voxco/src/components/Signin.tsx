'use client'

import React, { useState, FormEvent, ChangeEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from './ui/Button'
import Alert from './ui/Alert'

export default function Signin() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const disabledParam = searchParams.get('disabled')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
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
  }

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    handleInputChange()
  }

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    handleInputChange()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#215F9A]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#215F9A]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
          {/* Logo */}
          <div className="flex justify-center mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="bg-[#215F9A] px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <img src="/logo.png" className="h-8" alt="Voxco logo" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h1>
            <p className="text-gray-500">Sign in to Voxco Number Portal</p>
          </div>

          {/* Disabled account message */}
          {disabledParam === '1' && (
            <div className="mb-6">
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
            <div className="mb-6">
              <Alert
                type="error"
                message={error}
                dismissible
                onDismiss={() => setError('')}
              />
            </div>
          )}

          {/* Form */}
          <form className="space-y-5">
            {/* Email Field */}
            <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  className="input pl-12"
                  style={{ textIndent: '1.5rem' }}
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  className="input pl-12 pr-12"
                  style={{ textIndent: '1.5rem' }}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <div className="animate-fade-in" style={{ animationDelay: '500ms' }}>
              <Button
                onClick={handleClick}
                loading={loading}
                loadingText="Signing in..."
                fullWidth
                size="lg"
                className="mt-2"
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: '600ms' }}>
            <p className="text-gray-600">
              Don&apos;t have an account?{' '}
              <button
                onClick={() => router.push('/sign-up')}
                className="text-[#215F9A] font-semibold hover:text-[#2c78c0] transition-colors"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6 animate-fade-in" style={{ animationDelay: '700ms' }}>
          Secure login powered by Supabase
        </p>
      </div>
    </div>
  )
}
