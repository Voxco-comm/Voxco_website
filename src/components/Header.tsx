'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './AuthContext'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { User, Settings, LogOut, ChevronDown, Shield } from 'lucide-react'
import ConfirmationModal from './ui/ConfirmationModal'
import NotificationBell from './ui/NotificationBell'

export default function Header() {
  const { signOut, user, signingOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false)
  const [mobileOpen, setMobileOpen] = useState<boolean>(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)

  const isAdminPage = pathname?.startsWith('/admin')

  useEffect(() => {
    if (user) {
      checkAdminStatus()
    }
  }, [user])

  const checkAdminStatus = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } else {
        setIsAdmin(!!data)
      }
    } catch (err) {
      console.error('Exception checking admin status:', err)
      setIsAdmin(false)
    }
  }

  const toggleProfileDropdown = () => setIsProfileDropdownOpen(!isProfileDropdownOpen)
  const closeProfileDropdown = () => setIsProfileDropdownOpen(false)
  const handleMouseEnterProfile = () => setIsProfileDropdownOpen(true)
  const handleMouseLeaveProfile = () => setIsProfileDropdownOpen(false)

  const handleServicesClick = () => {
    router.push('/about')
    setMobileOpen(false)
  }

  const handleResetPassword = () => {
    router.push('/reset-password')
    closeProfileDropdown()
    setMobileOpen(false)
  }

  const handleProfile = () => {
    router.push('/profile')
    closeProfileDropdown()
    setMobileOpen(false)
  }

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowLogoutModal(true)
    setIsProfileDropdownOpen(false)
    setMobileOpen(false)
  }

  const handleLogoutConfirm = async () => {
    await signOut()
    setShowLogoutModal(false)
    setMobileOpen(false)
  }

  const handleLogoutCancel = () => {
    setShowLogoutModal(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close dropdowns if modal is open
      if (showLogoutModal) return

      const target = event.target as Node

      // Check if click is inside profile dropdown
      const isInsideProfileDropdown = profileDropdownRef.current && profileDropdownRef.current.contains(target)

      if (!isInsideProfileDropdown) {
        setIsProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showLogoutModal])

  return (
    <>
      <header className="bg-gradient-to-r from-[#215F9A] to-[#2c78c0] text-white py-4 px-4 sm:px-8 shadow-xl relative z-50 animate-slide-in-down">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* LOGO */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => router.push('/')}
          >
            <img
              src="/logo.png"
              alt="Voxco Communications"
              className="w-28 sm:w-44 md:w-52 max-w-[min(100%,11rem)] sm:max-w-none transition-all group-hover:scale-105 duration-200"
            />
          </div>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-4 text-sm lg:text-base">
            {!isAdmin && (
              <>
                {pathname !== '/' && (
                  <button
                    onClick={() => router.push('/')}
                    className="px-4 py-2 rounded-xl cursor-pointer hover:bg-white/10 transition-all duration-200 font-medium"
                  >
                    Dashboard
                  </button>
                )}

                {/* Services */}

              </>
            )}
          </nav>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-2">
            {/* Notification Bell */}
            <NotificationBell />

            {/* PROFILE BUTTON (desktop) */}
            <div
              className="relative"
              ref={profileDropdownRef}
              onMouseEnter={handleMouseEnterProfile}
              onMouseLeave={handleMouseLeaveProfile}
            >
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-3 px-4 py-2 cursor-pointer rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <span className="font-medium hidden lg:block max-w-[120px] truncate">
                  {(user?.user_metadata as { name?: string })?.name || 'User'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown with Animation */}
              <div className={`absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl py-2 border border-gray-100 transition-all duration-200 origin-top-right ${isProfileDropdownOpen
                ? 'opacity-100 scale-100 visible'
                : 'opacity-0 scale-95 invisible'
                }`}>
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {(user?.user_metadata as { name?: string })?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>

                <button
                  onClick={() => { handleProfile(); closeProfileDropdown() }}
                  className="w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  Profile
                </button>

                <button
                  onClick={handleResetPassword}
                  className="w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  Reset Password
                </button>

                <Link
                  href="/privacy"
                  className="w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors cursor-pointer"
                  onClick={closeProfileDropdown}
                >
                  <Shield className="w-4 h-4 text-gray-400" />
                  Privacy Policy
                </Link>

                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={handleLogoutClick}
                    className="w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE MENU BUTTON */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {!mobileOpen ? (
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              ) : (
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              )}
            </svg>
          </button>
        </div>

        {/* MOBILE MENU with Animation */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'
          }`}>
          <div className="bg-white text-gray-800 rounded-2xl shadow-xl p-4 space-y-2">
            {!isAdmin && (
              <>
                {pathname !== '/' && (
                  <button
                    onClick={() => { router.push('/'); setMobileOpen(false) }}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 cursor-pointer font-medium transition-colors"
                  >
                    Dashboard
                  </button>
                )}

                <button
                  onClick={handleServicesClick}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 cursor-pointer font-medium transition-colors"
                >
                  SERVICES
                </button>
              </>
            )}

            {/* MOBILE PROFILE */}
            <div className="border-t pt-3 mt-3">
              <div className="px-4 py-2 mb-2">
                <p className="text-sm text-gray-500">Logged in as</p>
                <p className="font-medium text-gray-900 truncate">{user?.email}</p>
              </div>

              <button onClick={() => { handleProfile(); closeProfileDropdown() }} className="block w-full text-left px-4 py-3 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors">Profile</button>
              <button onClick={handleResetPassword} className="block w-full text-left px-4 py-3 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors">Reset Password</button>
              <Link href="/privacy" onClick={() => setMobileOpen(false)} className="block w-full text-left px-4 py-3 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors">Privacy Policy</Link>
              <button onClick={handleLogoutClick} className="block w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer transition-colors">Logout</button>
            </div>
          </div>
        </div>

      </header>

      {/* Logout Confirmation Modal - Rendered outside header for proper z-index stacking */}
      {showLogoutModal && (
        <ConfirmationModal
          isOpen={showLogoutModal}
          onClose={handleLogoutCancel}
          onConfirm={handleLogoutConfirm}
          title="Confirm Logout"
          message="Are you sure you want to logout? You will need to sign in again to access your account."
          confirmText="Logout"
          cancelText="Cancel"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
          isLoading={signingOut}
          loadingText="Logging out..."
        />
      )}
    </>
  )
}
