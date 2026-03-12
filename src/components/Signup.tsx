'use client'

import React, { useState, FormEvent, ChangeEvent, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from './ui/Button'
import Alert from './ui/Alert'
import AuthPagesFooter from './AuthPagesFooter'

interface PasswordStrength {
  score: number
  label: string
  color: string
  suggestions: string[]
}

export default function Signup() {
  const router = useRouter()
  const [email, setEmail] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [agreeToPrivacy, setAgreeToPrivacy] = useState<boolean>(false)
  const supabase = createClient()

  // Password strength calculator
  const passwordStrength = useMemo((): PasswordStrength => {
    const suggestions: string[] = []
    let score = 0

    if (password.length === 0) {
      return { score: 0, label: '', color: '', suggestions: [] }
    }

    if (password.length >= 8) score += 1
    else suggestions.push('Use at least 8 characters')

    if (password.length >= 12) score += 1

    if (/[A-Z]/.test(password)) score += 1
    else suggestions.push('Add uppercase letters')

    if (/[a-z]/.test(password)) score += 1
    else suggestions.push('Add lowercase letters')

    if (/[0-9]/.test(password)) score += 1
    else suggestions.push('Add numbers')

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1
    else suggestions.push('Add special characters (!@#$%^&*)')

    let label = ''
    let color = ''

    if (score <= 2) {
      label = 'Weak'
      color = 'bg-red-500'
    } else if (score <= 4) {
      label = 'Fair'
      color = 'bg-yellow-500'
    } else if (score <= 5) {
      label = 'Good'
      color = 'bg-blue-500'
    } else {
      label = 'Strong'
      color = 'bg-green-500'
    }

    return { score, label, color, suggestions }
  }, [password])

  const handleClick = async (e: FormEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (!email.trim() || !name.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (passwordStrength.score < 3) {
      setError('Password is too weak. Please use a stronger password.')
      return
    }

    if (!agreeToPrivacy) {
      setError('Please read and agree to the Privacy Policy to continue.')
      return
    }

    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      // Use API route to bypass RLS issues
      const response = await fetch('/api/signup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          company_name: companyName.trim() || null,
          password_hash: password,
          message: message.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setError(result.error || 'A signup request with this email already exists.')
        } else {
          setError(result.error || 'Failed to submit signup request')
        }
        setLoading(false)
        return
      }

      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_signup_request',
            data: {
              name: name.trim(),
              email: email.trim(),
              company_name: companyName.trim() || null,
              message: message.trim(),
            },
          }),
        })
      } catch (emailErr) {
        console.warn('Failed to send email notification:', emailErr)
      }

      setSuccessMessage('Your signup request has been submitted successfully! You will receive an email once your account is approved.')
      setEmail('')
      setName('')
      setCompanyName('')
      setPassword('')
      setConfirmPassword('')
      setMessage('')
      setLoading(false)
      setTimeout(() => router.push('/sign-in'), 3000)
    } catch (err) {
      console.error('Signup error:', err)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleInputChange = () => {
    if (error) setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex items-center justify-center p-4 py-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#215F9A]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#215F9A]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg animate-fade-in-up">
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
          {/* Logo */}
          <div className="flex justify-center mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="bg-[#215F9A] px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <img src="/logo.png" className="h-8" alt="Voxco logo" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-6 animate-fade-in" style={{ animationDelay: '150ms' }}>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create an account</h1>
            <p className="text-gray-500">Join Voxco Number Portal</p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4">
              <Alert type="error" message={error} dismissible onDismiss={() => setError('')} />
            </div>
          )}
          {successMessage && (
            <div className="mb-4">
              <Alert type="success" message={successMessage} />
            </div>
          )}

          {/* Form */}
          <form className="space-y-4">
            {/* Name Field */}
            <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); handleInputChange() }}
                  className="input pl-12"
                  style={{ textIndent: '1.5rem' }}
                  placeholder="John Doe"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Company Name Field */}
            <div className="animate-fade-in" style={{ animationDelay: '225ms' }}>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1.5">
                Company Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="companyName"
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); handleInputChange() }}
                  className="input pl-12"
                  style={{ textIndent: '1.5rem' }}
                  placeholder="Your company name"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="animate-fade-in" style={{ animationDelay: '275ms' }}>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); handleInputChange() }}
                  className="input pl-12"
                  style={{ textIndent: '1.5rem' }}
                  placeholder="you@company.com"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); handleInputChange() }}
                  className="input pl-12 pr-12"
                  style={{ textIndent: '1.5rem' }}
                  placeholder="••••••••"
                  disabled={loading}
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
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="mt-2 animate-fade-in">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${passwordStrength.label === 'Weak' ? 'text-red-500' :
                        passwordStrength.label === 'Fair' ? 'text-yellow-600' :
                          passwordStrength.label === 'Good' ? 'text-blue-500' : 'text-green-500'
                      }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  {passwordStrength.suggestions.length > 0 && (
                    <ul className="text-xs text-gray-500 space-y-0.5">
                      {passwordStrength.suggestions.slice(0, 2).map((s, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-gray-400 rounded-full" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="animate-fade-in" style={{ animationDelay: '350ms' }}>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); handleInputChange() }}
                  className={`input pl-12 ${confirmPassword && password !== confirmPassword ? 'border-red-500 focus:border-red-500' :
                      confirmPassword && password === confirmPassword ? 'border-green-500 focus:border-green-500' : ''
                    }`}
                  style={{ textIndent: '1.5rem' }}
                  placeholder="••••••••"
                  disabled={loading}
                />
                {confirmPassword && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    {password === confirmPassword ? (
                      <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Privacy consent (required for GDPR) */}
            <div className="animate-fade-in flex items-start gap-3" style={{ animationDelay: '375ms' }}>
              <input
                type="checkbox"
                id="agreeToPrivacy"
                checked={agreeToPrivacy}
                onChange={(e) => { setAgreeToPrivacy(e.target.checked); handleInputChange() }}
                disabled={loading}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#215F9A] focus:ring-[#215F9A]"
              />
              <label htmlFor="agreeToPrivacy" className="text-sm text-gray-700">
                I have read and agree to the{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#215F9A] hover:text-[#2c78c0] underline font-medium">
                  Privacy Policy
                </a>
                , which explains how my data is collected and used.
              </label>
            </div>

            {/* Message Field (Optional) */}
            <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
                Tell us about your business <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => { setMessage(e.target.value); handleInputChange() }}
                rows={3}
                className="input resize-none"
                placeholder="What are your business needs?"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <div className="animate-fade-in pt-2" style={{ animationDelay: '450ms' }}>
              <Button
                onClick={handleClick}
                loading={loading}
                loadingText="Submitting..."
                fullWidth
                size="lg"
              >
                Sign Up
              </Button>
            </div>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center animate-fade-in" style={{ animationDelay: '500ms' }}>
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/sign-in')}
                className="text-[#215F9A] font-semibold hover:text-[#2c78c0] transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>

          {/* Notice */}
          <p className="text-xs text-gray-500 text-center mt-4 animate-fade-in" style={{ animationDelay: '550ms' }}>
            Your signup request will be reviewed by our team. You&apos;ll receive an email once approved.
          </p>
          <div className="mt-6 animate-fade-in" style={{ animationDelay: '600ms' }}>
            <AuthPagesFooter />
          </div>
        </div>
      </div>
    </div>
  )
}
