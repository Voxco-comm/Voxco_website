'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'
import BackButton from './BackButton'

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
      <main className="bg-gray-50 min-h-screen py-12 px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8">
            <div className="text-gray-600">Loading profile...</div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-gray-50 min-h-screen py-12 px-8">
      <div className="max-w-2xl mx-auto">
        <BackButton href="/" label="Back to Dashboard" />
        <section className="text-center mb-8">
          <h2 className="text-4xl font-bold text-[#215F9A] mb-4">My Profile</h2>
          <p className="text-xl text-gray-600">
            Manage your account settings
          </p>
        </section>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button onClick={() => setError(null)} className="float-right font-bold">×</button>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
            <button onClick={() => setSuccess(null)} className="float-right font-bold">×</button>
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-[#215F9A] mb-4">Profile Information</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={userData.name}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={userData.company_name || ''}
                onChange={(e) => setUserData({ ...userData, company_name: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="Your company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={userData.email}
                disabled
                className="w-full p-2 border rounded-lg bg-gray-100"
                placeholder="Your email"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={userData.phone || ''}
                onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="Your phone number"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full bg-[#215F9A] text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* Password Section */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-[#215F9A] mb-4">Password</h3>

          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Change Password
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Enter new password"
                />
                {/* Password Strength Indicator */}
                {newPassword.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength.color} transition-all duration-300`}
                          style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${passwordStrength.label === 'Weak' ? 'text-red-500' :
                          passwordStrength.label === 'Fair' ? 'text-yellow-600' :
                            passwordStrength.label === 'Good' ? 'text-blue-500' :
                              'text-green-500'
                        }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    {passwordStrength.suggestions.length > 0 && (
                      <ul className="text-xs text-gray-500 list-disc list-inside">
                        {passwordStrength.suggestions.slice(0, 2).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full p-2 border rounded-lg ${confirmPassword && newPassword !== confirmPassword
                      ? 'border-red-500'
                      : confirmPassword && newPassword === confirmPassword
                        ? 'border-green-500'
                        : ''
                    }`}
                  placeholder="Confirm new password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                )}
                {confirmPassword && newPassword === confirmPassword && (
                  <p className="text-green-500 text-xs mt-1">Passwords match</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || newPassword !== confirmPassword || passwordStrength.score < 3}
                  className="flex-1 bg-[#215F9A] text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false)
                    setNewPassword('')
                    setConfirmPassword('')
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
