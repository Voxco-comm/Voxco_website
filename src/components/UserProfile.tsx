'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'
import BackButton from './BackButton'
import {
  User,
  Building2,
  Mail,
  Phone,
  Lock,
  Check,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react'

interface UserData {
  name: string
  email: string
  phone?: string
  company_name?: string
}

interface PasswordStrength {
  score: number
  label: string
  color: string
  suggestions: string[]
}

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-[#215F9A] focus:outline-none focus:ring-2 focus:ring-[#215F9A]/20 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500'

// Purely presentational wrapper: forwards every prop straight to a native
// <input>, only adding a leading icon around it.
function IconInput({
  icon: Icon,
  ...inputProps
}: { icon: React.ComponentType<{ className?: string }> } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input {...inputProps} className={INPUT_CLASS} />
    </div>
  )
}

export default function UserProfile() {
  const { user } = useAuth()
  const supabase = createClient()
  const [userData, setUserData] = useState<UserData>({
    name: '',
    email: '',
    phone: '',
    company_name: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user])

  const loadUserData = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get customer data
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('name, email, phone, company_name')
        .eq('user_id', user.id)
        .single()

      if (customerError && customerError.code !== 'PGRST116') {
        throw customerError
      }

      if (customerData) {
        setUserData({
          name: customerData.name || '',
          email: customerData.email || user.email || '',
          phone: customerData.phone || '',
          company_name: customerData.company_name || '',
        })
      } else {
        // Use auth user data
        setUserData({
          name: (user.user_metadata as { name?: string })?.name || '',
          email: user.email || '',
          phone: '',
          company_name: (user.user_metadata as { company_name?: string })?.company_name || '',
        })
      }
    } catch (err: any) {
      console.error('Error loading user data:', err)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Update customer record
      const { error: updateError } = await supabase
        .from('customers')
        .upsert({
          user_id: user.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone || null,
          company_name: userData.company_name || null,
        }, { onConflict: 'user_id' })

      if (updateError) throw updateError

      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { name: userData.name, company_name: userData.company_name },
      })

      if (authError) throw authError

      setSuccess('Profile updated successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  // Password strength calculator
  const calculatePasswordStrength = (password: string): PasswordStrength => {
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
  }

  const passwordStrength = calculatePasswordStrength(newPassword)

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (passwordStrength.score < 3) {
      setError('Please use a stronger password')
      return
    }

    setChangingPassword(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setSuccess('Password changed successfully!')
      setShowPasswordForm(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.message || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#215F9A]/10">
            <Loader2 className="h-5 w-5 animate-spin text-[#215F9A]" />
          </div>
          <p className="text-sm font-medium text-slate-600">Loading profile…</p>
        </div>
      </main>
    )
  }

  const initial = (userData.name || userData.email || '?').trim().charAt(0).toUpperCase()

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <BackButton href="/" label="Back to Dashboard" />

        <div className="mb-6 sm:mb-8">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F97316]" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#215F9A]">
              Voxco Number Portal
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">My Profile</h1>
          <p className="mt-1.5 text-sm text-slate-600">Manage your account settings.</p>
        </div>

        {/* Account summary */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#215F9A] text-xl font-semibold text-white">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900">{userData.name || 'Your account'}</p>
            <p className="truncate text-sm text-slate-500">{userData.email}</p>
            {userData.company_name && (
              <p className="truncate text-xs text-slate-400">{userData.company_name}</p>
            )}
          </div>
        </div>

        {(error || success) && (
          <div className="mb-6 space-y-3">
            {error && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </span>
                <button onClick={() => setError(null)} aria-label="Dismiss" className="shrink-0 text-red-400 transition-colors hover:text-red-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {success && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <span className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  {success}
                </span>
                <button onClick={() => setSuccess(null)} aria-label="Dismiss" className="shrink-0 text-emerald-500 transition-colors hover:text-emerald-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Profile Information */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#215F9A]/10 text-[#215F9A]">
              <User className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Profile information</h3>
              <p className="mt-0.5 text-sm text-slate-500">Keep your account details up to date.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
              <IconInput
                icon={User}
                type="text"
                value={userData.name}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Company name</label>
              <IconInput
                icon={Building2}
                type="text"
                value={userData.company_name || ''}
                onChange={(e) => setUserData({ ...userData, company_name: e.target.value })}
                placeholder="Your company name"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <IconInput
                icon={Mail}
                type="email"
                value={userData.email}
                disabled
                placeholder="Your email"
              />
              <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
                <Lock className="h-3 w-3" />
                Email cannot be changed
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
              <IconInput
                icon={Phone}
                type="tel"
                value={userData.phone || ''}
                onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                placeholder="Your phone number"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#215F9A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1b4e80] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        </section>

        {/* Password Section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#215F9A]/10 text-[#215F9A]">
              <Lock className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Password</h3>
              <p className="mt-0.5 text-sm text-slate-500">Update your password to keep your account secure.</p>
            </div>
          </div>

          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Lock className="h-3.5 w-3.5" />
              Change password
            </button>
          ) : (
            <div className="mt-5 space-y-5 border-t border-slate-100 pt-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">New password</label>
                <IconInput
                  icon={Lock}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                {/* Password Strength Indicator */}
                {newPassword.length > 0 && (
                  <div className="mt-2.5">
                    <div className="mb-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full ${passwordStrength.color} transition-all duration-300`}
                          style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-semibold ${passwordStrength.label === 'Weak' ? 'text-red-500' :
                          passwordStrength.label === 'Fair' ? 'text-amber-600' :
                            passwordStrength.label === 'Good' ? 'text-blue-500' :
                              'text-emerald-600'
                        }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    {passwordStrength.suggestions.length > 0 && (
                      <ul className="space-y-1">
                        {passwordStrength.suggestions.slice(0, 2).map((s, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm new password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${confirmPassword && newPassword !== confirmPassword
                        ? 'border-red-400 focus:ring-red-500/20'
                        : confirmPassword && newPassword === confirmPassword
                          ? 'border-emerald-400 focus:ring-emerald-500/20'
                          : 'border-slate-300 hover:border-slate-400 focus:border-[#215F9A] focus:ring-[#215F9A]/20'
                      }`}
                  />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-500">
                    <X className="h-3 w-3" />
                    Passwords do not match
                  </p>
                )}
                {confirmPassword && newPassword === confirmPassword && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600">
                    <Check className="h-3 w-3" />
                    Passwords match
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row">
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || newPassword !== confirmPassword || passwordStrength.score < 3}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#215F9A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1b4e80] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Changing…
                    </>
                  ) : (
                    'Change password'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false)
                    setNewPassword('')
                    setConfirmPassword('')
                  }}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
