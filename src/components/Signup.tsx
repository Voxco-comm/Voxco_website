'use client'

import React, { useState, FormEvent, ChangeEvent, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Check, Clock, Lock, Mail, ShieldCheck, User, X } from 'lucide-react'
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
  authTextareaClass,
  fieldBorder,
} from './AuthLayout'

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

  // Presentational only: highlight the field(s) an existing validation
  // message refers to. No validation happens here.
  const missingRequired = error === 'Please fill in all required fields.'
  const privacyInvalid = error === 'Please read and agree to the Privacy Policy to continue.'
  const passwordWeak = error === 'Password is too weak. Please use a stronger password.'
  const nameInvalid = missingRequired && !name.trim()
  const emailInvalid = missingRequired && !email.trim()
  const passwordInvalid = (missingRequired && !password.trim()) || passwordWeak
  const confirmTone =
    confirmPassword && password !== confirmPassword
      ? 'error'
      : confirmPassword && password === confirmPassword
        ? 'success'
        : missingRequired && !confirmPassword.trim()
          ? 'error'
          : 'default'

  // Two-up rows where the column is wide enough (tablet card, wide desktop).
  const pairRow = 'grid grid-cols-1 gap-5 sm:grid-cols-2 sm:items-start lg:grid-cols-1 xl:grid-cols-2'

  return (
    <AuthLayout width="wide">
      <AuthHeader title="Create an account" subtitle="Join Voxco Number Portal" />

      {/* Alerts */}
      {error && (
        <div className="mb-5" role="alert">
          <Alert type="error" message={error} dismissible onDismiss={() => setError('')} />
        </div>
      )}
      {successMessage && (
        <div className="mb-5" role="status">
          <Alert type="success" message={successMessage} />
        </div>
      )}

      {/* Form */}
      <form className="space-y-5">
        <div className={pairRow}>
          {/* Name Field */}
          <div>
            <label htmlFor="name" className={authLabelClass}>
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => { setName(e.target.value); handleInputChange() }}
                className={`${authInputClass} pr-4 ${fieldBorder(nameInvalid)}`}
                placeholder="John Doe"
                disabled={loading}
                autoComplete="name"
                aria-invalid={nameInvalid || undefined}
              />
              <User className={authIconClass} strokeWidth={1.75} aria-hidden="true" />
            </div>
          </div>

          {/* Company Name Field */}
          <div>
            <label htmlFor="companyName" className={authLabelClass}>
              Company Name <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => { setCompanyName(e.target.value); handleInputChange() }}
                className={`${authInputClass} pr-4 ${fieldBorder()}`}
                placeholder="Your company name"
                disabled={loading}
                autoComplete="organization"
              />
              <Building2 className={authIconClass} strokeWidth={1.75} aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className={authLabelClass}>
            Email address
          </label>
          <div className="relative">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); handleInputChange() }}
              className={`${authInputClass} pr-4 ${fieldBorder(emailInvalid)}`}
              placeholder="you@company.com"
              disabled={loading}
              autoComplete="email"
              aria-invalid={emailInvalid || undefined}
            />
            <Mail className={authIconClass} strokeWidth={1.75} aria-hidden="true" />
          </div>
        </div>

        <div className={pairRow}>
          {/* Password Field */}
          <div>
            <label htmlFor="password" className={authLabelClass}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); handleInputChange() }}
                className={`${authInputClass} pr-12 ${fieldBorder(passwordInvalid)}`}
                placeholder="••••••••"
                disabled={loading}
                autoComplete="new-password"
                aria-invalid={passwordInvalid || undefined}
              />
              <Lock className={authIconClass} strokeWidth={1.75} aria-hidden="true" />
              <PasswordToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />
            </div>
            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="mt-2.5 animate-fade-in" aria-live="polite">
                <div className="mb-1.5 flex items-center gap-2.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${passwordStrength.color} transition-all duration-300`}
                      style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold ${passwordStrength.label === 'Weak' ? 'text-red-500' :
                      passwordStrength.label === 'Fair' ? 'text-yellow-600' :
                        passwordStrength.label === 'Good' ? 'text-blue-500' : 'text-green-500'
                    }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                {passwordStrength.suggestions.length > 0 && (
                  <ul className="space-y-0.5 text-xs text-slate-500">
                    {passwordStrength.suggestions.slice(0, 2).map((s, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" />
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className={authLabelClass}>
              Confirm Password
            </label>
            <div className="relative">
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); handleInputChange() }}
                className={`${authInputClass} pr-11 ${fieldBorder(confirmTone)}`}
                placeholder="••••••••"
                disabled={loading}
                autoComplete="new-password"
                aria-invalid={confirmTone === 'error' || undefined}
              />
              <ShieldCheck className={authIconClass} strokeWidth={1.75} aria-hidden="true" />
              {confirmPassword && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                  {password === confirmPassword ? (
                    <Check className="h-[18px] w-[18px] text-emerald-500" strokeWidth={2.25} aria-label="Passwords match" />
                  ) : (
                    <X className="h-[18px] w-[18px] text-red-500" strokeWidth={2.25} aria-label="Passwords do not match" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message Field (Optional) */}
        <div>
          <label htmlFor="message" className={authLabelClass}>
            Tell us about your business <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => { setMessage(e.target.value); handleInputChange() }}
            rows={3}
            className={`${authTextareaClass} ${fieldBorder()}`}
            placeholder="What are your business needs?"
            disabled={loading}
          />
        </div>

        {/* Privacy consent (required for GDPR) */}
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors duration-200 ${
            privacyInvalid ? 'border-red-300 bg-red-50/60' : 'border-slate-200 bg-slate-50/70'
          }`}
        >
          <input
            type="checkbox"
            id="agreeToPrivacy"
            checked={agreeToPrivacy}
            onChange={(e) => { setAgreeToPrivacy(e.target.checked); handleInputChange() }}
            disabled={loading}
            aria-invalid={privacyInvalid || undefined}
            className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 cursor-pointer rounded border-slate-300 accent-[#215F9A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
          />
          <label htmlFor="agreeToPrivacy" className="cursor-pointer text-sm leading-relaxed text-slate-600">
            I have read and agree to the{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-[#215F9A] underline underline-offset-2 hover:text-[#2c78c0]">
              Privacy Policy
            </a>
            , which explains how my data is collected and used.
          </label>
        </div>

        {/* Submit Button */}
        <AuthPrimaryButton
          type="submit"
          onClick={handleClick}
          loading={loading}
          loadingText="Submitting..."
          className="!mt-7"
        >
          Sign Up
        </AuthPrimaryButton>
      </form>

      {/* Sign In Link */}
      <AuthSwitchPrompt>
        Already have an account?{' '}
        <button type="button" onClick={() => router.push('/sign-in')} className={authLinkClass}>
          Sign in
        </button>
      </AuthSwitchPrompt>

      {/* Notice */}
      <p className="mx-auto mt-5 max-w-sm text-center text-xs leading-relaxed text-slate-500">
        <Clock className="-mt-0.5 mr-1.5 inline h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
        Your signup request will be reviewed by our team. You&apos;ll receive an email once approved.
      </p>
    </AuthLayout>
  )
}
