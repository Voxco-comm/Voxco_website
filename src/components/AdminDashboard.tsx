'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import BackButton from './BackButton'
import NumberFileUpload from './NumberFileUpload'
import DocumentsModal from './DocumentsModal'
import LoadingSpinner, { TableSkeleton, CardSkeleton } from './ui/LoadingSpinner'
import Alert from './ui/Alert'
import Button from './ui/Button'
import { formatDecimal, formatPricePerUnit } from '@/lib/utils/formatNumber'
import SelectWithCustom from './ui/SelectWithCustom'

// Default options for dropdown fields
const BILL_PULSE_OPTIONS = [
  '7/3',
  '7/7',
  '7/15',
  '15/3',
  '15/7',
  '15/15',
  '30/7',
  '30/15',
  '30/30',
  '30/45',
  'PrePay',
  'None',
]

const SUPPLIER_OPTIONS = [
  'Globe Teleservices',
  'BICS',
  'Tata Communications',
  'Bandwidth',
  'Sinch',
  'Vonage',
  'Twilio',
  'Plivo',
  'Nexmo',
  'Telnyx',
  'IDT',
  'Alcazar Networks',
]

const FEATURE_OPTIONS = {
  voice: ['Supported', 'Not supported', 'N/A'],
  sms: ['Enabled', 'Disabled', 'N/A'],
  reach: ['International', 'Local', 'N/A'],
  emergency_services: ['Supported', 'Not Available', 'Required', 'Optional', 'N/A'],
}

interface Country {
  id: string
  name: string
  country_code: string
  regulator: string | null
}

interface OtherCharges {
  inbound_call?: number | null
  outbound_call_fixed?: number | null
  outbound_call_mobile?: number | null
  inbound_sms?: number | null
  outbound_sms?: number | null
  other_fees?: string | null
}

// Form-state version: keep user input as strings so decimals like "1." don't get lost
interface OtherChargesForm {
  inbound_call?: string
  outbound_call_fixed?: string
  outbound_call_mobile?: string
  inbound_sms?: string
  outbound_sms?: string
  other_fees?: string
}

interface Features {
  voice?: string | null
  sms?: string | null
  reach?: string | null
  emergency_services?: string | null
}

interface NumberFormData {
  country_id: string
  available_numbers: string  // Store as string to allow empty
  number_type: 'Geographic' | 'Mobile' | 'Toll-Free' | 'Non-Geographic' | '2WV'
  sms_capability: 'SMS only' | 'Voice only' | 'Both'
  direction: 'Inbound only' | 'Outbound only' | 'Both'
  mrc: string  // Store as string to allow empty/decimal
  nrc: string  // Store as string to allow empty/decimal
  currency: string
  moq: string  // Store as string to allow empty
  supplier_mrc?: string
  supplier_nrc?: string
  supplier_currency?: string
  supplier?: string
  specification?: string
  bill_pulse?: string
  requirements_text?: string
  other_charges: OtherChargesForm
  supplier_other_charges: OtherChargesForm
  features: Features
}

const DECIMAL_INPUT_RE = /^\d*(?:[.,]?\d*)?$/
const normalizeDecimalInput = (value: string) => value.replace(/,/g, '.')

// Helper to convert string to number for saving
const parseNumberField = (value: string, defaultValue: number = 0): number => {
  if (value === '' || value === null || value === undefined) return defaultValue
  const parsed = parseFloat(normalizeDecimalInput(String(value)))
  return isNaN(parsed) ? defaultValue : parsed
}

const parseIntField = (value: string, defaultValue: number = 1): number => {
  if (value === '' || value === null || value === undefined) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

const parseNullableNumberField = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const s = normalizeDecimalInput(String(value)).trim()
  if (!s) return null
  const parsed = parseFloat(s)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeOtherChargesForDb = (oc: any): OtherCharges => {
  const otherFees = oc?.other_fees
  return {
    inbound_call: parseNullableNumberField(oc?.inbound_call),
    outbound_call_fixed: parseNullableNumberField(oc?.outbound_call_fixed),
    outbound_call_mobile: parseNullableNumberField(oc?.outbound_call_mobile),
    inbound_sms: parseNullableNumberField(oc?.inbound_sms),
    outbound_sms: parseNullableNumberField(oc?.outbound_sms),
    other_fees: otherFees === null || otherFees === undefined || String(otherFees).trim() === '' ? null : String(otherFees),
  }
}

interface CountryFormData {
  name: string
  country_code: string
  regulator: string
}

interface Number {
  id: string
  number?: string
  available_numbers: number
  number_type: string
  sms_capability: string
  direction: string
  mrc: number
  nrc: number
  currency: string
  moq: number
  supplier?: string
  specification?: string
  bill_pulse?: string
  requirements_text?: string
  other_charges?: any
  features?: any
  is_available: boolean
  is_reserved: boolean
  country_name: string
  country_code: string
  country_id: string
  supplier_mrc?: number | null
  supplier_nrc?: number | null
  supplier_currency?: string | null
  supplier_other_charges?: any
}

interface UploadedDocumentInfo {
  requirement_key: string
  title: string
  file_path: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_at: string
}

interface UploadedDocuments {
  documents: UploadedDocumentInfo[]
  customer_type: 'individual' | 'business'
  notes?: string
  documents_deleted?: boolean
  deleted_at?: string
  other_documents?: UploadedDocumentInfo[]
}

interface Order {
  id: string
  customer_id: string
  number_id: string
  quantity: number
  status: string
  mrc_at_order: number
  nrc_at_order: number
  currency_at_order: string
  created_at: string
  customer_name: string
  customer_email: string
  phone_number: string
  country_id?: string
  country_name: string
  country_code?: string
  number_type?: string
  sms_capability?: string
  direction?: string
  moq?: number
  requirements_text?: string
  uploaded_documents?: UploadedDocuments
  admin_request_changes?: string | null
  admin_request_changes_at?: string | null
  supplier_mrc?: number | null
  supplier_nrc?: number | null
  supplier_currency?: string | null
}

interface SignupRequest {
  id: string
  email: string
  name: string
  message: string
  status: string
  created_at: string
  rejected_reason?: string
}

interface AdminSettings {
  notification_email: string
}

type TabType = 'inventory' | 'orders' | 'custom_requests' | 'signup_requests' | 'users' | 'settings'

interface CustomNumberRequest {
  id: string
  customer_id: string
  country_id: string
  number_type: string
  sms_capability: string
  direction: string
  mrc: number
  nrc: number
  currency: string
  moq: number
  specification: string | null
  bill_pulse: string | null
  requirements_text: string | null
  status: string
  admin_notes: string | null
  created_at: string
  customer_name?: string
  customer_email?: string
  country_name?: string
}

interface UserProfile {
  id: string
  user_id: string
  name: string
  email: string
  company_name: string | null
  created_at: string
  is_disabled: boolean
  last_login_at: string | null
  order_count: number
  is_admin: boolean
}

export default function AdminDashboard() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<TabType>('inventory')
  const [countries, setCountries] = useState<Country[]>([])
  const [allNumbers, setAllNumbers] = useState<Number[]>([])
  const [inventoryFilters, setInventoryFilters] = useState({
    country: '',
    smsVoice: '',
    inboundOutbound: '',
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrderForDocs, setSelectedOrderForDocs] = useState<Order | null>(null)
  const [signupRequests, setSignupRequests] = useState<SignupRequest[]>([])
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({ notification_email: '' })
  const [loading, setLoading] = useState(true)
  const [loadingNumbers, setLoadingNumbers] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingSignupRequests, setLoadingSignupRequests] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [sendingTestEmail, setSendingTestEmail] = useState(false)
  const [showAddNumber, setShowAddNumber] = useState(false)
  const [showAddCountry, setShowAddCountry] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [fetchingRequirements, setFetchingRequirements] = useState(false)
  const [uploadingNumbers, setUploadingNumbers] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [editingNumber, setEditingNumber] = useState<Number | null>(null)
  const [processingSignup, setProcessingSignup] = useState<string | null>(null)
  const [pendingSignupCount, setPendingSignupCount] = useState(0)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
  const [pendingCustomRequestsCount, setPendingCustomRequestsCount] = useState(0)
  const [formData, setFormData] = useState<NumberFormData>({
    country_id: '',
    available_numbers: '',
    number_type: 'Geographic',
    sms_capability: 'Both',
    direction: 'Both',
    mrc: '',
    nrc: '',
    currency: 'USD',
    moq: '',
    supplier_mrc: '',
    supplier_nrc: '',
    supplier_currency: '',
    supplier: '',
    specification: '',
    bill_pulse: '',
    requirements_text: '',
    other_charges: {},
    supplier_other_charges: {},
    features: {},
  })
  const [countryFormData, setCountryFormData] = useState<CountryFormData>({
    name: '',
    country_code: '',
    regulator: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [processingOrder, setProcessingOrder] = useState<string | null>(null)
  const [orderForRequestChanges, setOrderForRequestChanges] = useState<Order | null>(null)
  const [requestChangesMessage, setRequestChangesMessage] = useState('')

  // Users tab state
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [processingUser, setProcessingUser] = useState<string | null>(null)
  const [selectedUserOrders, setSelectedUserOrders] = useState<Order[] | null>(null)
  const [viewingUserOrders, setViewingUserOrders] = useState<UserProfile | null>(null)
  // Custom number requests tab state
  const [customRequests, setCustomRequests] = useState<CustomNumberRequest[]>([])
  const [loadingCustomRequests, setLoadingCustomRequests] = useState(false)
  const [processingCustomRequest, setProcessingCustomRequest] = useState<string | null>(null)
  const [fulfillCustomRequestModal, setFulfillCustomRequestModal] = useState<CustomNumberRequest | null>(null)
  const [orderForRequirementsModal, setOrderForRequirementsModal] = useState<Order | null>(null)
  const [orderRequirementsData, setOrderRequirementsData] = useState<any>(null)
  const [loadingOrderRequirements, setLoadingOrderRequirements] = useState(false)
  const [fulfillForm, setFulfillForm] = useState({
    mrc: '',
    nrc: '',
    currency: 'USD',
    moq: '1',
    supplier_mrc: '',
    supplier_nrc: '',
    supplier_currency: '',
    specification: '',
    bill_pulse: '',
    requirements_text: '',
  })

  useEffect(() => {
    loadCountries()
    loadPendingSignupCount()
    loadPendingOrdersCount()
    loadPendingCustomRequestsCount()
    if (activeTab === 'inventory') {
      loadAllNumbers()
    } else if (activeTab === 'orders') {
      loadOrders()
      loadPendingOrdersCount()
    } else if (activeTab === 'custom_requests') {
      loadCustomRequests()
      loadPendingCustomRequestsCount()
    } else if (activeTab === 'signup_requests') {
      loadSignupRequests()
    } else if (activeTab === 'users') {
      loadUsers()
    } else if (activeTab === 'settings') {
      loadAdminSettings()
    }
  }, [activeTab])

  const loadPendingSignupCount = async () => {
    try {
      const { count, error } = await supabase
        .from('signup_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (!error && count !== null) {
        setPendingSignupCount(count)
      } else {
        setPendingSignupCount(0)
      }
    } catch (err) {
      setPendingSignupCount(0)
    }
  }

  const loadPendingOrdersCount = async () => {
    try {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'documentation_review')

      if (!error && count !== null) {
        setPendingOrdersCount(count)
      } else {
        setPendingOrdersCount(0)
      }
    } catch (err) {
      setPendingOrdersCount(0)
    }
  }

  const loadPendingCustomRequestsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('custom_number_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (!error && count !== null) {
        setPendingCustomRequestsCount(count)
      } else {
        setPendingCustomRequestsCount(0)
      }
    } catch (err) {
      setPendingCustomRequestsCount(0)
    }
  }

  const loadSignupRequests = async () => {
    setLoadingSignupRequests(true)
    setError(null)
    try {
      // Debug: Check current user and admin status
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user:', user?.id, user?.email)

      // Debug: Check if user is in admin_users
      const { data: adminCheck, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user?.id || '')
      console.log('Admin check:', adminCheck, 'Error:', adminError)

      const { data, error } = await supabase
        .from('signup_requests')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('Signup requests result:', { data, error })

      if (error) {
        console.error('Signup requests error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        setError(`Unable to load signup requests: ${error.message || error.code || 'Permission denied'}`)
        setSignupRequests([])
        return
      }
      setSignupRequests(data || [])
    } catch (err: any) {
      console.error('Error loading signup requests:', err?.message || err)
      setError('Unable to load signup requests.')
      setSignupRequests([])
    } finally {
      setLoadingSignupRequests(false)
    }
  }

  const loadAdminSettings = async () => {
    setLoadingSettings(true)
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')

      console.log('Admin settings result:', { data, error })

      if (error) {
        console.error('Admin settings error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        setError(`Unable to load settings: ${error.message || error.code || 'Permission denied'}`)
        setAdminSettings({ notification_email: '' })
        return
      }

      const settings: AdminSettings = { notification_email: '' }
      data?.forEach((s: any) => {
        if (s.setting_key === 'notification_email') {
          settings.notification_email = s.setting_value
        }
      })
      setAdminSettings(settings)
    } catch (err: any) {
      console.error('Error loading admin settings:', err?.message || err)
      setAdminSettings({ notification_email: '' })
    } finally {
      setLoadingSettings(false)
    }
  }

  const handleApproveSignup = async (requestId: string) => {
    setProcessingSignup(requestId)
    setError(null)

    try {
      const request = signupRequests.find(r => r.id === requestId)
      if (!request) throw new Error('Request not found')

      // Get admin user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .single()

      // Use API route to create user (requires service role key)
      const response = await fetch('/api/approve-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: requestId,
          adminUserId: adminData?.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve signup request')
      }

      if (result.userAlreadyExists) {
        setSuccess(`User ${request.email} already exists. Signup request marked as approved.`)
      } else {
        setSuccess(`User ${request.email} has been created! A confirmation email has been sent to verify their account.`)
      }

      await loadSignupRequests()
      await loadPendingSignupCount()
    } catch (err: any) {
      setError(err.message || 'Failed to approve signup request')
    } finally {
      setProcessingSignup(null)
    }
  }

  const handleRejectSignup = async (requestId: string, reason?: string) => {
    setProcessingSignup(requestId)
    setError(null)

    try {
      const { error } = await supabase
        .from('signup_requests')
        .update({
          status: 'rejected',
          rejected_reason: reason || 'Application rejected',
          rejected_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (error) throw error

      setSuccess('Signup request rejected')
      await loadSignupRequests()
      await loadPendingSignupCount()
    } catch (err: any) {
      setError(err.message || 'Failed to reject signup request')
    } finally {
      setProcessingSignup(null)
    }
  }

  const handleSaveSettings = async () => {
    setLoadingSettings(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          setting_key: 'notification_email',
          setting_value: adminSettings.notification_email,
        }, { onConflict: 'setting_key' })

      if (error) {
        console.error('Save settings error:', error.message || error.code || JSON.stringify(error))
        setError('Failed to save settings. Please check your permissions.')
        return
      }
      setSuccess('Settings saved successfully!')
    } catch (err: any) {
      console.error('Save settings error:', err?.message || err)
      setError('Failed to save settings.')
    } finally {
      setLoadingSettings(false)
    }
  }

  const handleSendTestEmail = async () => {
    setSendingTestEmail(true)
    setError(null)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test_notification', data: {} }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`)
      }
      setSuccess('Test email sent. Check the notification inbox (and spam folder).')
    } catch (err: any) {
      setError(err.message || 'Failed to send test email')
    } finally {
      setSendingTestEmail(false)
    }
  }

  const handleDeleteNumber = async (numberId: string) => {
    setError(null)
    if (!confirm('Are you sure you want to delete this number?')) return

    try {
      // Always soft-delete: mark as unavailable (never hard-delete from DB)
      const { error: updateError } = await supabase
        .from('numbers')
        .update({ is_available: false })
        .eq('id', numberId)

      if (updateError) throw updateError
      setSuccess('Number deleted successfully.')
      await loadAllNumbers()
    } catch (err: any) {
      setError(err.message || 'Failed to delete number')
    }
  }

  const handleUpdateNumber = async (number: Number) => {
    setError(null)

    // Parse numeric fields (they might be strings if user edited them)
    const mrc = parseNumberField(String(number.mrc), 0)
    const nrc = parseNumberField(String(number.nrc), 0)
    const moq = parseIntField(String(number.moq), 1)

    if (moq < 1) {
      setError('MOQ must be at least 1')
      return
    }

    try {
      const { error } = await supabase
        .from('numbers')
        .update({
          number_type: number.number_type,
          sms_capability: number.sms_capability,
          direction: number.direction,
          mrc: mrc,
          nrc: nrc,
          currency: number.currency,
          moq: moq,
          is_available: number.is_available,
          specification: number.specification || null,
          bill_pulse: number.bill_pulse || null,
          other_charges: normalizeOtherChargesForDb(number.other_charges),
          supplier_other_charges: normalizeOtherChargesForDb((number as any).supplier_other_charges),
          features: (number.features && typeof number.features === 'object' && Object.keys(number.features).length > 0)
            ? { voice: (number.features as any).voice || null, sms: (number.features as any).sms || null, reach: (number.features as any).reach || null, emergency_services: (number.features as any).emergency_services || null }
            : {},
          supplier_mrc: parseNullableNumberField((number as any).supplier_mrc),
          supplier_nrc: parseNullableNumberField((number as any).supplier_nrc),
          supplier_currency: (number as any).supplier_currency || null,
          supplier: (number as any).supplier || null,
        })
        .eq('id', number.id)

      if (error) throw error
      setSuccess('Number updated successfully!')
      setEditingNumber(null)
      await loadAllNumbers()
    } catch (err: any) {
      setError(err.message || 'Failed to update number')
    }
  }

  const loadUsers = async () => {
    setLoadingUsers(true)
    setError(null)
    try {
      // Get all customers with their order counts
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          user_id,
          name,
          email,
          company_name,
          created_at,
          is_disabled,
          last_login_at,
          orders:orders(count)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading users:', error)
        setError('Unable to load users.')
        setUsers([])
        return
      }

      // Get list of admin user IDs to check which customers are also admins
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('is_active', true)

      const adminUserIds = new Set((adminData || []).map((a: any) => a.user_id))

      // Transform the data to include order_count and admin status
      const transformedUsers: UserProfile[] = (data || []).map((user: any) => ({
        id: user.id,
        user_id: user.user_id,
        name: user.name || 'N/A',
        email: user.email,
        company_name: user.company_name ?? null,
        created_at: user.created_at,
        is_disabled: user.is_disabled || false,
        last_login_at: user.last_login_at,
        order_count: user.orders?.[0]?.count || 0,
        is_admin: adminUserIds.has(user.user_id),
      }))

      setUsers(transformedUsers)
    } catch (err: any) {
      console.error('Error loading users:', err?.message || err)
      setError('Unable to load users.')
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleToggleUserStatus = async (user: UserProfile) => {
    if (processingUser) return

    // Prevent modifying admin users
    if (user.is_admin) {
      setError('Cannot modify admin users. Please use the admin management system.')
      return
    }

    setProcessingUser(user.id)
    setError(null)

    try {
      const newStatus = !user.is_disabled
      const { error } = await supabase
        .from('customers')
        .update({ is_disabled: newStatus })
        .eq('id', user.id)

      if (error) throw error

      // Update local state
      setUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, is_disabled: newStatus } : u
      ))
      setSuccess(`User ${newStatus ? 'disabled' : 'enabled'} successfully.`)
    } catch (err: any) {
      console.error('Error updating user status:', err)
      setError('Failed to update user status.')
    } finally {
      setProcessingUser(null)
    }
  }

  const handleSendPasswordReset = async (user: UserProfile) => {
    if (processingUser) return

    // Prevent modifying admin users
    if (user.is_admin) {
      setError('Cannot reset password for admin users. Please contact system administrator.')
      return
    }

    setProcessingUser(user.id)
    setError(null)

    try {
      // Use Supabase auth to send password reset
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error
      setSuccess(`Password reset email sent to ${user.email}`)
    } catch (err: any) {
      console.error('Error sending password reset:', err)
      setError('Failed to send password reset email.')
    } finally {
      setProcessingUser(null)
    }
  }

  const handleDeleteUser = async (user: UserProfile) => {
    if (processingUser) return

    // Prevent deleting admin users
    if (user.is_admin) {
      setError('Cannot delete admin users. Please use the admin management system.')
      return
    }

    if (!confirm(`Are you sure you want to delete user "${user.name}"? This action cannot be undone.`)) {
      return
    }

    setProcessingUser(user.id)
    setError(null)

    try {
      // Delete customer record (this will cascade delete orders due to FK constraint)
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', user.id)

      if (error) throw error

      // Update local state
      setUsers(prev => prev.filter(u => u.id !== user.id))
      setSuccess('User deleted successfully.')
    } catch (err: any) {
      console.error('Error deleting user:', err)
      setError('Failed to delete user.')
    } finally {
      setProcessingUser(null)
    }
  }

  const handleViewUserOrders = async (user: UserProfile) => {
    setViewingUserOrders(user)
    setSelectedUserOrders(null)

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          number:numbers(
            *,
            countries(name, country_code)
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSelectedUserOrders(data || [])
    } catch (err: any) {
      console.error('Error loading user orders:', err)
      setSelectedUserOrders([])
    }
  }

  const loadCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name, country_code, regulator')
        .order('name')

      if (error) throw error
      setCountries(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAllNumbers = async () => {
    setLoadingNumbers(true)
    setError(null)
    try {
      // Query numbers table: only show available or reserved (hide soft-deleted/unavailable)
      const { data, error } = await supabase
        .from('numbers')
        .select(`
          id,
          number,
          country_id,
          available_numbers,
          number_type,
          sms_capability,
          direction,
          mrc,
          nrc,
          currency,
          moq,
          supplier_mrc,
          supplier_nrc,
          supplier_currency,
          supplier,
          specification,
          bill_pulse,
          requirements_text,
          other_charges,
          supplier_other_charges,
          features,
          is_available,
          is_reserved,
          countries!inner(name, country_code)
        `)
        .or('is_available.eq.true,is_reserved.eq.true')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Query error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        setError('Failed to load numbers: ' + (error.message || error.details || 'Unknown error'))
        return
      }

      if (data) {
        const formatted: Number[] = data.map((n: any) => ({
          id: n.id,
          number: n.number,
          number_type: n.number_type,
          sms_capability: n.sms_capability,
          direction: n.direction,
          mrc: n.mrc,
          nrc: n.nrc,
          currency: n.currency,
          moq: n.moq,
          supplier_mrc: n.supplier_mrc,
          supplier_nrc: n.supplier_nrc,
          supplier_currency: n.supplier_currency,
          supplier: n.supplier,
          specification: n.specification,
          bill_pulse: n.bill_pulse,
          requirements_text: n.requirements_text,
          other_charges: n.other_charges,
          supplier_other_charges: n.supplier_other_charges,
          features: n.features,
          is_available: n.is_available,
          is_reserved: n.is_reserved,
          country_name: n.countries?.name || 'Unknown',
          country_code: n.countries?.country_code || 'N/A',
          available_numbers: n.available_numbers ?? 0,
          country_id: n.country_id || '',
        }))
        // Sort by country name alphabetically
        formatted.sort((a, b) =>
          a.country_name.localeCompare(b.country_name)
        )
        setAllNumbers(formatted)
      }
    } catch (err: any) {
      console.error('Error loading numbers:', {
        error: err,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
      })
      setError('Failed to load numbers. Please refresh the page.')
    } finally {
      setLoadingNumbers(false)
    }
  }

  const loadOrders = async () => {
    setLoadingOrders(true)
    setError(null)
    try {
      // Try querying orders directly with joins (more reliable than view)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          customer_id,
          number_id,
          quantity,
          status,
          mrc_at_order,
          nrc_at_order,
          currency_at_order,
          created_at,
          granted_at,
          rejected_at,
          rejected_reason,
          uploaded_documents,
          admin_request_changes,
          admin_request_changes_at,
          customers!inner(id, name, email),
          numbers!inner(id, number, number_type, sms_capability, direction, moq, requirements_text, other_charges, country_id, supplier_mrc, supplier_nrc, supplier_currency, countries!inner(id, name, country_code))
        `)
        .order('created_at', { ascending: false })

      if (ordersError) {
        console.error('Orders query error:', {
          message: ordersError.message,
          details: ordersError.details,
          hint: ordersError.hint,
          code: ordersError.code,
        })
        throw ordersError
      }

      // Format the data
      const formatted = (ordersData || []).map((o: any) => ({
        id: o.id,
        customer_id: o.customer_id,
        number_id: o.number_id,
        quantity: o.quantity,
        status: o.status,
        mrc_at_order: o.mrc_at_order,
        nrc_at_order: o.nrc_at_order,
        currency_at_order: o.currency_at_order,
        created_at: o.created_at,
        customer_name: o.customers?.name || 'Unknown',
        customer_email: o.customers?.email || 'Unknown',
        phone_number: o.numbers?.number || 'N/A',
        country_id: o.numbers?.country_id || o.numbers?.countries?.id,
        country_name: o.numbers?.countries?.name || 'Unknown',
        country_code: o.numbers?.countries?.country_code || '',
        number_type: o.numbers?.number_type || 'N/A',
        sms_capability: o.numbers?.sms_capability || 'N/A',
        direction: o.numbers?.direction || 'N/A',
        moq: o.numbers?.moq || 1,
        requirements_text: o.numbers?.requirements_text || '',
        other_charges: o.numbers?.other_charges || {},
        uploaded_documents: o.uploaded_documents || null,
        admin_request_changes: o.admin_request_changes ?? null,
        admin_request_changes_at: o.admin_request_changes_at ?? null,
        supplier_mrc: o.numbers?.supplier_mrc ?? null,
        supplier_nrc: o.numbers?.supplier_nrc ?? null,
        supplier_currency: o.numbers?.supplier_currency ?? null,
      }))

      setOrders(formatted)
    } catch (err: any) {
      console.error('Error loading orders:', {
        error: err,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
      })
      const errorMessage = err?.message || err?.details || err?.hint || 'Failed to load orders'
      setError('Failed to load orders: ' + errorMessage)
    } finally {
      setLoadingOrders(false)
    }
  }

  const loadCustomRequests = async () => {
    setLoadingCustomRequests(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('custom_number_requests')
        .select(`
          id,
          customer_id,
          country_id,
          number_type,
          sms_capability,
          direction,
          mrc,
          nrc,
          currency,
          moq,
          specification,
          bill_pulse,
          requirements_text,
          status,
          admin_notes,
          created_at,
          customers!inner(name, email),
          countries!inner(name)
        `)
        .order('created_at', { ascending: false })
      if (err) throw err
      const formatted = (data || []).map((r: any) => ({
        id: r.id,
        customer_id: r.customer_id,
        country_id: r.country_id,
        number_type: r.number_type,
        sms_capability: r.sms_capability,
        direction: r.direction,
        mrc: r.mrc,
        nrc: r.nrc,
        currency: r.currency,
        moq: r.moq,
        specification: r.specification,
        bill_pulse: r.bill_pulse,
        requirements_text: r.requirements_text,
        status: r.status,
        admin_notes: r.admin_notes,
        created_at: r.created_at,
        customer_name: r.customers?.name,
        customer_email: r.customers?.email,
        country_name: r.countries?.name,
      }))
      setCustomRequests(formatted)
    } catch (err: any) {
      setError(err.message || 'Failed to load custom number requests')
      setCustomRequests([])
    } finally {
      setLoadingCustomRequests(false)
    }
  }

  const handleCustomRequestStatus = async (requestId: string, status: 'approved' | 'rejected', adminNotes?: string) => {
    setProcessingCustomRequest(requestId)
    setError(null)
    try {
      // Fetch request details for notification (before update)
      const { data: reqData } = await supabase
        .from('custom_number_requests')
        .select('customer_id, number_type, moq, countries!inner(name)')
        .eq('id', requestId)
        .single()
      const countryName = (reqData?.countries as { name?: string } | null)?.name || 'Unknown'
      const numberType = reqData?.number_type || 'number'
      const moq = reqData?.moq ?? 1

      const { error: updateError } = await supabase
        .from('custom_number_requests')
        .update({ status, admin_notes: adminNotes ?? null, updated_at: new Date().toISOString() })
        .eq('id', requestId)
      if (updateError) throw updateError

      // Notify customer
      if (reqData?.customer_id) {
        const { data: customerRow } = await supabase
          .from('customers')
          .select('user_id')
          .eq('id', reqData.customer_id)
          .single()
        if (customerRow?.user_id) {
          try {
            await supabase.from('notifications').insert({
              user_id: customerRow.user_id,
              type: status === 'approved' ? 'custom_request_approved' : 'custom_request_rejected',
              title: status === 'approved' ? 'Custom number request approved' : 'Custom number request declined',
              message: status === 'approved'
                ? `Your custom number request for ${moq} ${numberType} number(s) in ${countryName} has been approved.`
                : `Your custom number request for ${moq} ${numberType} number(s) in ${countryName} has been declined.${adminNotes ? ` ${adminNotes}` : ''}`,
              metadata: { request_id: requestId, status, country: countryName, number_type: numberType },
            })
          } catch (e) {
            console.warn('Failed to send custom request notification to customer:', e)
          }
        }
      }

      setSuccess(`Request ${status}.`)
      await loadCustomRequests()
    } catch (err: any) {
      setError(err.message || `Failed to ${status} request`)
    } finally {
      setProcessingCustomRequest(null)
    }
  }

  const handleFulfillCustomRequestSubmit = async () => {
    const req = fulfillCustomRequestModal
    if (!req) return
    const mrc = parseFloat(fulfillForm.mrc)
    const nrc = parseFloat(fulfillForm.nrc)
    const moq = parseInt(fulfillForm.moq, 10)
    if (isNaN(mrc) || mrc < 0) {
      setError('MRC must be a valid number (0 or greater).')
      return
    }
    if (isNaN(nrc) || nrc < 0) {
      setError('NRC must be a valid number (0 or greater).')
      return
    }
    if (isNaN(moq) || moq < 1) {
      setError('MOQ must be at least 1.')
      return
    }
    setProcessingCustomRequest(req.id)
    setError(null)
    try {
      const supplierMrc = fulfillForm.supplier_mrc ? parseFloat(fulfillForm.supplier_mrc) : null
      const supplierNrc = fulfillForm.supplier_nrc ? parseFloat(fulfillForm.supplier_nrc) : null
      const placeholderNumber = `REQ-${req.id}`
      const { data: insertedNumber, error: insertError } = await supabase
        .from('numbers')
        .insert({
          country_id: req.country_id,
          number: placeholderNumber,
          number_type: req.number_type,
          sms_capability: req.sms_capability,
          direction: req.direction,
          mrc,
          nrc,
          currency: fulfillForm.currency,
          moq,
          supplier_mrc: Number.isFinite(supplierMrc) ? supplierMrc : null,
          supplier_nrc: Number.isFinite(supplierNrc) ? supplierNrc : null,
          supplier_currency: fulfillForm.supplier_currency?.trim() || null,
          specification: fulfillForm.specification.trim() || null,
          bill_pulse: fulfillForm.bill_pulse.trim() || null,
          requirements_text: fulfillForm.requirements_text.trim() || null,
          other_charges: {},
          supplier_other_charges: {},
          features: {},
          is_available: true,
        })
        .select('id')
        .single()
      if (insertError || !insertedNumber?.id) throw insertError || new Error('Failed to get inserted number id')
      const newNumberId = insertedNumber.id
      await supabase
        .from('custom_number_requests')
        .update({ status: 'approved', admin_notes: 'Fulfilled: number added to inventory.', updated_at: new Date().toISOString() })
        .eq('id', req.id)
      const customerName = req.customer_name || 'Customer'
      const customerEmail = req.customer_email || ''
      const countryName = req.country_name || 'Unknown'
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: req.customer_id,
          number_id: newNumberId,
          quantity: moq,
          status: 'documentation_review',
          mrc_at_order: mrc,
          nrc_at_order: nrc,
          currency_at_order: fulfillForm.currency,
          uploaded_documents: { documents: [], customer_type: 'business', notes: undefined },
        })
      if (orderError) {
        setError(`Number was added to inventory but order creation failed: ${orderError.message}. You may need to create the order manually for the customer.`)
        setProcessingCustomRequest(null)
        return
      }
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_order',
            data: {
              customerName,
              customerEmail,
              country: countryName,
              numberType: req.number_type,
              quantity: moq,
              mrc,
              nrc,
              currency: fulfillForm.currency,
            },
          }),
        })
      } catch (e) { /* ignore */ }
      try {
        const { data: adminUsers } = await supabase.from('admin_users').select('user_id').eq('is_active', true)
        if (adminUsers?.length) {
          await supabase.from('notifications').insert(adminUsers.map((a) => ({
            user_id: a.user_id,
            type: 'new_order',
            title: 'New Order Received',
            message: `Custom number fulfilled: order for ${moq} ${req.number_type} number(s) in ${countryName}`,
            metadata: { country: countryName, number_type: req.number_type, quantity: moq },
          })))
        }
      } catch (e) { /* ignore */ }

      // Notify customer that a new order was created for them (custom number fulfilled)
      try {
        const { data: customerRow } = await supabase
          .from('customers')
          .select('user_id')
          .eq('id', req.customer_id)
          .single()
        if (customerRow?.user_id) {
          await supabase.from('notifications').insert({
            user_id: customerRow.user_id,
            type: 'new_order',
            title: 'New order created',
            message: `Your custom number request was fulfilled. A new order for ${moq} ${req.number_type} number(s) in ${countryName} has been created. Check My Orders to upload documents.`,
            metadata: { country: countryName, number_type: req.number_type, quantity: moq },
          })
        }
      } catch (e) {
        console.warn('Failed to send new-order notification to customer:', e)
      }

      setSuccess('Number added to inventory and order created. The order appears under Orders for the customer. You can edit the number in Inventory to set the real number.')
      setFulfillCustomRequestModal(null)
      setFulfillForm({ mrc: '', nrc: '', currency: 'USD', moq: '1', supplier_mrc: '', supplier_nrc: '', supplier_currency: '', specification: '', bill_pulse: '', requirements_text: '' })
      await loadCustomRequests()
      await loadAllNumbers()
    } catch (err: any) {
      setError(err.message || 'Failed to add number to inventory')
    } finally {
      setProcessingCustomRequest(null)
    }
  }

  const handleAddCountry = async () => {
    if (!countryFormData.name || !countryFormData.country_code) {
      setError('Country name and code are required')
      return
    }

    setFetchingRequirements(true)
    setError(null)

    try {
      const response = await fetch('/api/country-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryName: countryFormData.name,
          countryCode: countryFormData.country_code,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch country requirements')
      }

      const { requirements, prefix_area_code } = await response.json()

      const { data, error } = await supabase
        .from('countries')
        .insert({
          name: countryFormData.name,
          country_code: countryFormData.country_code,
          regulator: countryFormData.regulator || null,
          requirements: requirements,
          prefix_area_code: prefix_area_code,
        })
        .select()
        .single()

      if (error) throw error

      setSuccess('Country added successfully with requirements fetched!')
      setCountryFormData({ name: '', country_code: '', regulator: '' })
      setShowAddCountry(false)
      await loadCountries()
    } catch (err: any) {
      setError(err.message || 'Failed to add country')
    } finally {
      setFetchingRequirements(false)
    }
  }

  const handleAddNumber = async () => {
    if (!formData.country_id) {
      setError('Country is required')
      return
    }

    // Parse and validate numeric fields
    const availableNumbers = parseIntField(formData.available_numbers, 0)
    const mrc = parseNumberField(formData.mrc, 0)
    const nrc = parseNumberField(formData.nrc, 0)
    const moq = parseIntField(formData.moq, 1)

    if (availableNumbers < 0) {
      setError('Available numbers cannot be negative')
      return
    }

    if (moq < 1) {
      setError('MOQ must be at least 1')
      return
    }

    setError(null)

    try {
      const supplierMrc = formData.supplier_mrc ? parseNumberField(formData.supplier_mrc, 0) : null
      const supplierNrc = formData.supplier_nrc ? parseNumberField(formData.supplier_nrc, 0) : null
      const { error } = await supabase.from('numbers').insert({
        country_id: formData.country_id,
        available_numbers: availableNumbers,
        number_type: formData.number_type,
        sms_capability: formData.sms_capability,
        direction: formData.direction,
        mrc: mrc,
        nrc: nrc,
        currency: formData.currency,
        moq: moq,
        supplier_mrc: supplierMrc,
        supplier_nrc: supplierNrc,
        supplier_currency: formData.supplier_currency || null,
        supplier: formData.supplier || null,
        specification: formData.specification || null,
        bill_pulse: formData.bill_pulse || null,
        requirements_text: formData.requirements_text || null,
        other_charges: normalizeOtherChargesForDb(formData.other_charges),
        supplier_other_charges: normalizeOtherChargesForDb(formData.supplier_other_charges),
        features: formData.features,
        is_available: true,
      })

      if (error) {
        console.error('Insert error:', error)
        throw error
      }

      setSuccess('Number added to inventory successfully!')
      setFormData({
        country_id: '',
        available_numbers: '',
        number_type: 'Geographic',
        sms_capability: 'Both',
        direction: 'Both',
        mrc: '',
        nrc: '',
        currency: 'USD',
        moq: '',
        supplier_mrc: '',
        supplier_nrc: '',
        supplier_currency: '',
        supplier: '',
        specification: '',
        bill_pulse: '',
        requirements_text: '',
        other_charges: {},
        supplier_other_charges: {},
        features: {},
      })
      setShowAddNumber(false)
      await loadAllNumbers()
    } catch (err: any) {
      console.error('Add number error:', err)
      setError(err.message || 'Failed to add number')
    }
  }

  const handleBulkAddNumbers = async (extractedNumbers: any[]) => {
    setUploadingNumbers(true)
    setError(null)

    // Valid values for constrained fields
    const validSmsCapabilities = ['SMS only', 'Voice only', 'Both']
    const validDirections = ['Inbound only', 'Outbound only', 'Both']
    const validNumberTypes = ['Geographic', 'Mobile', 'Toll-Free', 'Non-Geographic', '2WV']

    try {
      const numbersToAdd = extractedNumbers.map((num, index) => {
        // Country is required
        if (!num.country_id) {
          throw new Error(`Row ${index + 1}: Country is required.`)
        }

        // Default sms_capability to "Both" if not provided or invalid
        let smsCapability = num.sms_capability
        if (!smsCapability || !validSmsCapabilities.includes(smsCapability)) {
          smsCapability = 'Both'
        }

        // Default direction to "Both" if not provided or invalid
        let direction = num.direction
        if (!direction || !validDirections.includes(direction)) {
          direction = 'Both'
        }

        // Default number_type to "Geographic" if not provided or invalid
        let numberType = num.number_type || 'Geographic'
        if (!validNumberTypes.includes(numberType)) {
          numberType = 'Geographic'
        }

        const soc = num.supplier_other_charges
        const hasSupplierOc =
          soc &&
          typeof soc === 'object' &&
          Object.keys(soc).some((k) => (soc as any)[k] !== null && (soc as any)[k] !== undefined)

        return {
          country_id: num.country_id,
          available_numbers: num.available_numbers || 1,
          number_type: numberType,
          sms_capability: smsCapability,
          direction: direction,
          mrc: num.mrc !== undefined && num.mrc !== null ? num.mrc : 0,
          nrc: num.nrc !== undefined && num.nrc !== null ? num.nrc : 0,
          currency: num.currency || 'USD',
          moq: num.moq !== undefined && num.moq !== null ? num.moq : 1,
          supplier: num.supplier || null,
          specification: num.specification || null,
          bill_pulse: num.bill_pulse || null,
          requirements_text: num.requirements_text || null,
          other_charges: num.other_charges || {},
          supplier_mrc: num.supplier_mrc ?? null,
          supplier_nrc: num.supplier_nrc ?? null,
          supplier_currency: num.supplier_currency || null,
          supplier_other_charges: hasSupplierOc ? soc : {},
          features: num.features || {},
          is_available: true,
        }
      })

      // Insert numbers in batches
      const batchSize = 50
      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < numbersToAdd.length; i += batchSize) {
        const batch = numbersToAdd.slice(i, i + batchSize)
        console.log('Inserting batch:', batch)
        const { error } = await supabase.from('numbers').insert(batch)

        if (error) {
          console.error('Batch insert error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          })
          errorCount += batch.length
          // Store first error for display
          if (errorCount === batch.length) {
            setError(`Insert failed: ${error.message || error.code || 'Unknown error'}. Have you run the database migration (update_numbers_to_inventory.sql)?`)
          }
        } else {
          successCount += batch.length
        }
      }

      if (errorCount > 0 && successCount > 0) {
        setError(`Added ${successCount} row(s) successfully, but ${errorCount} failed.`)
      } else if (errorCount > 0 && successCount === 0) {
        // Error already set above with details
      } else {
        setSuccess(`Successfully added ${successCount} row(s) to inventory!`)
      }

      setShowFileUpload(false)
      await loadAllNumbers()
    } catch (err: any) {
      setError(err.message || 'Failed to add numbers')
    } finally {
      setUploadingNumbers(false)
    }
  }

  const handleOrderStatus = async (orderId: string, status: 'granted' | 'rejected', notes?: string) => {
    setProcessingOrder(orderId)
    setError(null)

    try {
      // Get admin user ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .single()

      // Get order details including uploaded documents and customer_id
      const { data: orderData, error: orderFetchError } = await supabase
        .from('orders')
        .select('uploaded_documents, customer_id')
        .eq('id', orderId)
        .single()

      if (orderFetchError) {
        console.error('Error fetching order:', orderFetchError)
      }

      // Save documents to customer_documents table instead of deleting them
      // This allows documents to persist for future orders
      if (orderData?.uploaded_documents?.documents && Array.isArray(orderData.uploaded_documents.documents)) {
        const documents = orderData.uploaded_documents.documents

        if (documents.length > 0 && orderData.customer_id) {
          // Save each document to customer_documents table
          for (const doc of documents) {
            try {
              await supabase
                .from('customer_documents')
                .insert({
                  customer_id: orderData.customer_id,
                  document_type: doc.requirement_key || 'order_document',
                  title: doc.title || doc.file_name,
                  file_path: doc.file_path,
                  file_name: doc.file_name,
                  file_size: doc.file_size,
                  file_type: doc.file_type,
                  uploaded_at: doc.uploaded_at || new Date().toISOString(),
                  is_verified: status === 'granted', // Auto-verify if order is granted
                  verified_by: status === 'granted' ? adminData?.id : null,
                  verified_at: status === 'granted' ? new Date().toISOString() : null,
                  metadata: {
                    order_id: orderId,
                    customer_type: orderData.uploaded_documents.customer_type,
                  },
                })
            } catch (docErr) {
              console.warn('Failed to save document to customer profile:', docErr)
            }
          }
          console.log(`Saved ${documents.length} documents to customer profile for order ${orderId}`)
        }
      }

      // Update order - keep document references but mark as processed
      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString(),
        // Keep documents but mark as saved to profile
        uploaded_documents: {
          ...(orderData?.uploaded_documents || {}),
          documents_saved_to_profile: true,
          saved_at: new Date().toISOString(),
        },
      }

      if (status === 'granted') {
        updateData.granted_at = new Date().toISOString()
        updateData.admin_notes = notes || null
      } else if (status === 'rejected') {
        updateData.rejected_at = new Date().toISOString()
        updateData.rejected_reason = notes || 'Order rejected by admin'
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

      if (error) throw error

      // Get the order with customer details to send notification and email
      const { data: orderWithCustomer } = await supabase
        .from('orders')
        .select(`
          *,
          customers:customer_id (
            user_id,
            name,
            email
          ),
          number:number_id (
            number_type,
            countries (name)
          )
        `)
        .eq('id', orderId)
        .single()

      const countryName = orderWithCustomer?.number?.countries?.name || 'Unknown'
      const numberType = orderWithCustomer?.number?.number_type || 'Unknown'
      const quantity = orderWithCustomer?.quantity ?? 1
      const customerName = orderWithCustomer?.customers?.name || 'Customer'
      const customerEmail = orderWithCustomer?.customers?.email

      // Send in-app notification to customer
      if (orderWithCustomer?.customers?.user_id) {
        const customerUserId = orderWithCustomer.customers.user_id
        const notificationTitle = status === 'granted' ? 'Order Approved!' : 'Order Rejected'
        const notificationMessage = status === 'granted'
          ? `Your order for ${numberType} number(s) in ${countryName} has been approved.`
          : `Your order for ${numberType} number(s) in ${countryName} has been rejected. ${notes || ''}`

        try {
          await supabase.from('notifications').insert({
            user_id: customerUserId,
            type: status === 'granted' ? 'order_approved' : 'order_rejected',
            title: notificationTitle,
            message: notificationMessage,
            metadata: {
              order_id: orderId,
              status: status,
              country: countryName,
              number_type: numberType,
            },
          })
        } catch (notificationErr) {
          console.warn('Failed to send notification to customer:', notificationErr)
        }
      }

      // Send email notification to customer
      if (customerEmail) {
        try {
          const emailRes = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'order_status_update',
              data: {
                customerEmail,
                customerName,
                status,
                country: countryName,
                numberType,
                quantity,
                reason: status === 'rejected' ? (notes || undefined) : undefined,
              },
            }),
          })
          if (!emailRes.ok) {
            const errData = await emailRes.json().catch(() => ({}))
            console.warn('Failed to send order status email:', errData?.error || emailRes.statusText)
          }
        } catch (emailErr) {
          console.warn('Failed to send order status email:', emailErr)
        }
      }

      setSuccess(`Order ${status} successfully! Documents have been cleaned up.`)
      await loadOrders()
    } catch (err: any) {
      setError(err.message || `Failed to ${status} order`)
    } finally {
      setProcessingOrder(null)
    }
  }

  const handleOpenOrderRequirements = async (order: Order) => {
    setOrderForRequirementsModal(order)
    setOrderRequirementsData(null)
    setLoadingOrderRequirements(true)
    try {
      const response = await fetch('/api/country-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryId: order.country_id,
          countryName: order.country_name,
          countryCode: order.country_code || '',
          numberType: order.number_type,
          direction: order.direction,
          smsCapability: order.sms_capability,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setOrderRequirementsData(data.requirements || null)
      }
    } catch (err) {
      console.error('Error fetching order requirements:', err)
    } finally {
      setLoadingOrderRequirements(false)
    }
  }

  const handleSaveRequestChanges = async () => {
    if (!orderForRequestChanges) return
    setProcessingOrder(orderForRequestChanges.id)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          admin_request_changes: requestChangesMessage.trim() || null,
          admin_request_changes_at: requestChangesMessage.trim() ? new Date().toISOString() : null,
        })
        .eq('id', orderForRequestChanges.id)
      if (updateError) throw updateError
      setSuccess('Request sent to customer.')
      setOrderForRequestChanges(null)
      setRequestChangesMessage('')
      await loadOrders()
    } catch (err: any) {
      setError(err.message || 'Failed to save request')
    } finally {
      setProcessingOrder(null)
    }
  }

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === 'new') {
      setShowAddCountry(true)
      setFormData({ ...formData, country_id: '' })
    } else {
      setFormData({ ...formData, country_id: value })
    }
  }

  const toggleRowExpansion = (numberId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(numberId)) {
      newExpanded.delete(numberId)
    } else {
      newExpanded.add(numberId)
    }
    setExpandedRows(newExpanded)
  }

  const filteredInventoryNumbers = useMemo(() => {
    let list = [...allNumbers]
    if (inventoryFilters.country) {
      list = list.filter((n) => n.country_id === inventoryFilters.country)
    }
    if (inventoryFilters.smsVoice) {
      list = list.filter((n) => n.sms_capability === inventoryFilters.smsVoice)
    }
    if (inventoryFilters.inboundOutbound) {
      list = list.filter((n) => n.direction === inventoryFilters.inboundOutbound)
    }
    return list
  }, [allNumbers, inventoryFilters])

  const inventoryPricingDetailContent = (num: Number) => {
    const otherCharges =
      typeof num.other_charges === 'object' && num.other_charges !== null ? (num.other_charges as any) : {}
    const supOther =
      typeof num.supplier_other_charges === 'object' && num.supplier_other_charges !== null
        ? (num.supplier_other_charges as any)
        : {}
    const supCur = num.supplier_currency || num.currency || 'USD'
    return (
      <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 space-y-6">
        <div>
          <h4 className="font-semibold text-[#215F9A] mb-3">Supplier rates &amp; fees (admin)</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Supplier MRC</p>
              <p className="font-medium">
                {num.supplier_mrc != null ? `${supCur} ${formatDecimal(num.supplier_mrc, 2)}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Supplier NRC</p>
              <p className="font-medium">
                {num.supplier_nrc != null ? `${supCur} ${formatDecimal(num.supplier_nrc, 2)}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Supplier currency</p>
              <p className="font-medium">{num.supplier_currency || '—'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-gray-600 mb-1">Inbound Call (supplier)</p>
              <p className="font-medium">{formatPricePerUnit(supOther.inbound_call, supCur, '/min')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Outbound Call Fixed (supplier)</p>
              <p className="font-medium">{formatPricePerUnit(supOther.outbound_call_fixed, supCur, '/min')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Outbound Call Mobile (supplier)</p>
              <p className="font-medium">{formatPricePerUnit(supOther.outbound_call_mobile, supCur, '/min')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Inbound SMS (supplier)</p>
              <p className="font-medium">{formatPricePerUnit(supOther.inbound_sms, supCur, '/msg')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Outbound SMS (supplier)</p>
              <p className="font-medium">{formatPricePerUnit(supOther.outbound_sms, supCur, '/msg')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Other fees (supplier)</p>
              <p className="font-medium">
                {supOther.other_fees != null && supOther.other_fees !== '' ? String(supOther.other_fees) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-[#215F9A] mb-3">Customer pricing</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Customer MRC</p>
              <p className="font-medium">
                {num.currency} {formatDecimal(num.mrc, 2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Customer NRC</p>
              <p className="font-medium">
                {num.currency} {formatDecimal(num.nrc, 2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Customer currency</p>
              <p className="font-medium">{num.currency}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-gray-600 mb-1">Inbound Call (customer)</p>
              <p className="font-medium">{formatPricePerUnit(otherCharges.inbound_call, num.currency, '/min')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Outbound Call (Fixed) (customer)</p>
              <p className="font-medium">{formatPricePerUnit(otherCharges.outbound_call_fixed, num.currency, '/min')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Outbound Call (Mobile) (customer)</p>
              <p className="font-medium">{formatPricePerUnit(otherCharges.outbound_call_mobile, num.currency, '/min')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Inbound SMS (customer)</p>
              <p className="font-medium">{formatPricePerUnit(otherCharges.inbound_sms, num.currency, '/msg')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Outbound SMS (customer)</p>
              <p className="font-medium">{formatPricePerUnit(otherCharges.outbound_sms, num.currency, '/msg')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Other fees (customer)</p>
              <p className="font-medium">{otherCharges.other_fees || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const openInventoryEditorForModal = (num: Number) => {
    const oc = (num.other_charges || {}) as any
    const soc = (num.supplier_other_charges || {}) as any
    const feat = (num.features || {}) as Record<string, string | null>
    setEditingNumber({
      ...num,
      mrc: num.mrc === null || num.mrc === undefined ? ('' as any) : (String(num.mrc) as any),
      nrc: num.nrc === null || num.nrc === undefined ? ('' as any) : (String(num.nrc) as any),
      moq: num.moq === null || num.moq === undefined ? ('' as any) : (String(num.moq) as any),
      other_charges: {
        ...oc,
        inbound_call: oc.inbound_call === null || oc.inbound_call === undefined ? '' : String(oc.inbound_call),
        outbound_call_fixed: oc.outbound_call_fixed === null || oc.outbound_call_fixed === undefined ? '' : String(oc.outbound_call_fixed),
        outbound_call_mobile: oc.outbound_call_mobile === null || oc.outbound_call_mobile === undefined ? '' : String(oc.outbound_call_mobile),
        inbound_sms: oc.inbound_sms === null || oc.inbound_sms === undefined ? '' : String(oc.inbound_sms),
        outbound_sms: oc.outbound_sms === null || oc.outbound_sms === undefined ? '' : String(oc.outbound_sms),
        other_fees: oc.other_fees === null || oc.other_fees === undefined ? '' : String(oc.other_fees),
      },
      supplier_other_charges: {
        ...soc,
        inbound_call: soc.inbound_call === null || soc.inbound_call === undefined ? '' : String(soc.inbound_call),
        outbound_call_fixed: soc.outbound_call_fixed === null || soc.outbound_call_fixed === undefined ? '' : String(soc.outbound_call_fixed),
        outbound_call_mobile: soc.outbound_call_mobile === null || soc.outbound_call_mobile === undefined ? '' : String(soc.outbound_call_mobile),
        inbound_sms: soc.inbound_sms === null || soc.inbound_sms === undefined ? '' : String(soc.inbound_sms),
        outbound_sms: soc.outbound_sms === null || soc.outbound_sms === undefined ? '' : String(soc.outbound_sms),
        other_fees: soc.other_fees === null || soc.other_fees === undefined ? '' : String(soc.other_fees),
      },
      features: {
        voice: feat.voice ?? '',
        sms: feat.sms ?? '',
        reach: feat.reach ?? '',
        emergency_services: feat.emergency_services ?? '',
      },
      supplier_mrc: num.supplier_mrc != null ? String(num.supplier_mrc) : ('' as any),
      supplier_nrc: num.supplier_nrc != null ? String(num.supplier_nrc) : ('' as any),
      supplier_currency: num.supplier_currency ?? ('' as any),
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="mb-6">
            <img
              src="/logo.png"
              className="bg-[#215F9A] px-6 py-3 rounded-2xl mx-auto shadow-lg animate-pulse-slow"
              alt="logo"
            />
          </div>
          <LoadingSpinner size="lg" text="Loading Admin Dashboard..." />
          <p className="text-sm text-gray-500 mt-4">Fetching your data securely</p>
        </div>
      </div>
    )
  }

  return (
    <main className="bg-gray-50 min-h-screen px-4 sm:px-6 md:px-8 py-8 md:py-10">
      <div className="max-w-7xl mx-auto">
        {/* Tabs - Main Navigation */}
        <div className="bg-white rounded-t-lg shadow-lg border-b mb-4 sm:mb-6 overflow-x-auto">
          <div className="flex flex-wrap sm:flex-nowrap min-w-0">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-2.5 sm:px-6 sm:py-4 font-semibold text-sm sm:text-lg transition-colors whitespace-nowrap ${activeTab === 'inventory'
                ? 'text-[#215F9A] border-b-2 border-[#215F9A]'
                : 'text-gray-600 hover:text-[#215F9A]'
                }`}
            >
              Inventory
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-2.5 sm:px-6 sm:py-4 font-semibold text-sm sm:text-lg transition-colors relative whitespace-nowrap ${activeTab === 'orders'
                ? 'text-[#215F9A] border-b-2 border-[#215F9A]'
                : 'text-gray-600 hover:text-[#215F9A]'
                }`}
            >
              <span className="sm:hidden">Orders</span>
              <span className="hidden sm:inline">Orders Management</span>
              {pendingOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center">
                  {pendingOrdersCount > 99 ? '99+' : pendingOrdersCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('custom_requests')}
              className={`px-3 py-2.5 sm:px-6 sm:py-4 font-semibold text-sm sm:text-lg transition-colors relative whitespace-nowrap ${activeTab === 'custom_requests'
                ? 'text-[#215F9A] border-b-2 border-[#215F9A]'
                : 'text-gray-600 hover:text-[#215F9A]'
                }`}
            >
              <span className="sm:hidden">Custom</span>
              <span className="hidden sm:inline">Custom number requests</span>
              {pendingCustomRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center">
                  {pendingCustomRequestsCount > 99 ? '99+' : pendingCustomRequestsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('signup_requests')}
              className={`px-3 py-2.5 sm:px-6 sm:py-4 font-semibold text-sm sm:text-lg transition-colors relative whitespace-nowrap ${activeTab === 'signup_requests'
                ? 'text-[#215F9A] border-b-2 border-[#215F9A]'
                : 'text-gray-600 hover:text-[#215F9A]'
                }`}
            >
              <span className="sm:hidden">Signups</span>
              <span className="hidden sm:inline">Signup Requests</span>
              {pendingSignupCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingSignupCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-2.5 sm:px-6 sm:py-4 font-semibold text-sm sm:text-lg transition-colors whitespace-nowrap ${activeTab === 'users'
                ? 'text-[#215F9A] border-b-2 border-[#215F9A]'
                : 'text-gray-600 hover:text-[#215F9A]'
                }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-2.5 sm:px-6 sm:py-4 font-semibold text-sm sm:text-lg transition-colors whitespace-nowrap ${activeTab === 'settings'
                ? 'text-[#215F9A] border-b-2 border-[#215F9A]'
                : 'text-gray-600 hover:text-[#215F9A]'
                }`}
            >
              Settings
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
            <button
              onClick={() => setSuccess(null)}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-b-lg shadow-lg p-6">
            {/* Add Number Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-[#215F9A]">
                  Add Number to Inventory
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowFileUpload(!showFileUpload)
                      setShowAddNumber(false)
                      setError(null)
                      setSuccess(null)
                    }}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                  >
                    {showFileUpload ? 'Cancel Upload' : 'Upload from File'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddNumber(!showAddNumber)
                      setShowFileUpload(false)
                      setError(null)
                      setSuccess(null)
                    }}
                    className="bg-[#215F9A] text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    {showAddNumber ? 'Cancel' : 'Add Number'}
                  </button>
                </div>
              </div>

              {/* File Upload Section */}
              {showFileUpload && (
                <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <h3 className="text-xl font-semibold text-[#215F9A] mb-4">
                    Upload Numbers from File
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload a CSV, Excel, Word, or PDF file containing a table with phone numbers.
                    The system will automatically detect the number column and extract additional
                    information if available (country, type, pricing, etc.).
                  </p>
                  <NumberFileUpload
                    countries={countries}
                    onNumbersExtracted={handleBulkAddNumbers}
                    onError={(error) => setError(error)}
                    onSuccess={(message) => setSuccess(message)}
                  />
                  {uploadingNumbers && (
                    <div className="mt-4 flex items-center gap-2 text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Adding numbers to inventory...</span>
                    </div>
                  )}
                </div>
              )}

              {showAddNumber && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleAddNumber()
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Country *
                      </label>
                      <select
                        value={formData.country_id}
                        onChange={handleCountryChange}
                        className="w-full p-2 border rounded-lg"
                        required
                      >
                        <option value="">Select Country</option>
                        {countries.map((country) => (
                          <option key={country.id} value={country.id}>
                            {country.name} ({country.country_code})
                          </option>
                        ))}
                        <option value="new">+ Add New Country</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Available Numbers
                      </label>
                      <input
                        type="text"
                        value={formData.available_numbers}
                        onChange={(e) => {
                          const value = e.target.value
                          // Allow empty and integers
                          if (value === '' || /^\d*$/.test(value)) {
                            setFormData({ ...formData, available_numbers: value })
                          }
                        }}
                        placeholder="Enter quantity available"
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Number Type *
                      </label>
                      <select
                        value={formData.number_type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            number_type: e.target.value as NumberFormData['number_type'],
                          })
                        }
                        className="w-full p-2 border rounded-lg"
                        required
                      >
                        <option value="Geographic">Geographic</option>
                        <option value="Mobile">Mobile</option>
                        <option value="Toll-Free">Toll-Free</option>
                        <option value="Non-Geographic">Non-Geographic</option>
                        <option value="2WV">2WV</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        SMS/Voice Capability *
                      </label>
                      <select
                        value={formData.sms_capability}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sms_capability: e.target.value as NumberFormData['sms_capability'],
                          })
                        }
                        className="w-full p-2 border rounded-lg"
                        required
                      >
                        <option value="SMS only">SMS only</option>
                        <option value="Voice only">Voice only</option>
                        <option value="Both">Both</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Inbound/Outbound *
                      </label>
                      <select
                        value={formData.direction}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            direction: e.target.value as NumberFormData['direction'],
                          })
                        }
                        className="w-full p-2 border rounded-lg"
                        required
                      >
                        <option value="Inbound only">Inbound only</option>
                        <option value="Outbound only">Outbound only</option>
                        <option value="Both">Both</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Customer MRC (Monthly Recurring Charge)
                      </label>
                      <input
                        type="text"
                        value={formData.mrc}
                        onChange={(e) => {
                          const value = e.target.value
                          // Allow empty, digits, and a single decimal separator ('.' or ',')
                          if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                            setFormData({ ...formData, mrc: normalizeDecimalInput(value) })
                          }
                        }}
                        className="w-full p-2 border rounded-lg"
                        inputMode="decimal"
                        placeholder="Enter MRC (e.g., 12.50)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Customer NRC (Non-Recurring Charge)
                      </label>
                      <input
                        type="text"
                        value={formData.nrc}
                        onChange={(e) => {
                          const value = e.target.value
                          // Allow empty, digits, and a single decimal separator ('.' or ',')
                          if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                            setFormData({ ...formData, nrc: normalizeDecimalInput(value) })
                          }
                        }}
                        className="w-full p-2 border rounded-lg"
                        inputMode="decimal"
                        placeholder="Enter NRC (e.g., 20.00)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Customer currency *
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) =>
                          setFormData({ ...formData, currency: e.target.value })
                        }
                        className="w-full p-2 border rounded-lg"
                        required
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                      </select>
                    </div>

                    <div className="col-span-2 text-sm font-semibold text-[#215F9A] mt-2">Supplier rate (admin only)</div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Supplier MRC</label>
                      <input
                        type="text"
                        value={formData.supplier_mrc ?? ''}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                            setFormData({ ...formData, supplier_mrc: normalizeDecimalInput(value) })
                          }
                        }}
                        className="w-full p-2 border rounded-lg"
                        inputMode="decimal"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Supplier NRC</label>
                      <input
                        type="text"
                        value={formData.supplier_nrc ?? ''}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                            setFormData({ ...formData, supplier_nrc: normalizeDecimalInput(value) })
                          }
                        }}
                        className="w-full p-2 border rounded-lg"
                        inputMode="decimal"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Supplier Currency</label>
                      <select
                        value={formData.supplier_currency ?? ''}
                        onChange={(e) => setFormData({ ...formData, supplier_currency: e.target.value })}
                        className="w-full p-2 border rounded-lg"
                      >
                        <option value="">—</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        MOQ (Minimum Order Quantity)
                      </label>
                      <input
                        type="text"
                        value={formData.moq}
                        onChange={(e) => {
                          const value = e.target.value
                          // Allow empty and integers
                          if (value === '' || /^\d*$/.test(value)) {
                            setFormData({ ...formData, moq: value })
                          }
                        }}
                        className="w-full p-2 border rounded-lg"
                        placeholder="Enter MOQ (e.g., 1)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Supplier
                      </label>
                      <SelectWithCustom
                        value={formData.supplier || ''}
                        onChange={(value) =>
                          setFormData({ ...formData, supplier: value })
                        }
                        options={SUPPLIER_OPTIONS}
                        placeholder="Select supplier..."
                        customPlaceholder="Enter supplier name..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Specification (Prefix/Area)
                      </label>
                      <input
                        type="text"
                        value={formData.specification || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, specification: e.target.value })
                        }
                        placeholder="e.g., Landline, France (07), France (093)"
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Bill Pulse
                      </label>
                      <SelectWithCustom
                        value={formData.bill_pulse || ''}
                        onChange={(value) =>
                          setFormData({ ...formData, bill_pulse: value })
                        }
                        options={BILL_PULSE_OPTIONS}
                        placeholder="Select bill pulse..."
                        customPlaceholder="Enter custom (e.g., 45/45)..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Requirements Text
                      </label>
                      <textarea
                        value={formData.requirements_text || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, requirements_text: e.target.value })
                        }
                        placeholder="Requirements and documentation needed"
                        className="w-full p-2 border rounded-lg"
                        rows={3}
                      />
                    </div>

                  </div>

                  {/* Customer other charges */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Customer other charges</label>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="p-2 text-left">Charge Type</th>
                            <th className="p-2 text-left">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t">
                            <td className="p-2">Inbound Call (per min)</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={formData.other_charges.inbound_call ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                    setFormData({
                                      ...formData,
                                      other_charges: {
                                        ...formData.other_charges,
                                        inbound_call: normalizeDecimalInput(value)
                                      }
                                    })
                                  }
                                }}
                                className="w-full p-1 border rounded"
                                inputMode="decimal"
                                placeholder="0.0000"
                              />
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Outbound Call Fixed (per min)</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={formData.other_charges.outbound_call_fixed ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                    setFormData({
                                      ...formData,
                                      other_charges: {
                                        ...formData.other_charges,
                                        outbound_call_fixed: normalizeDecimalInput(value)
                                      }
                                    })
                                  }
                                }}
                                className="w-full p-1 border rounded"
                                inputMode="decimal"
                                placeholder="0.0000"
                              />
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Outbound Call Mobile (per min)</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={formData.other_charges.outbound_call_mobile ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                    setFormData({
                                      ...formData,
                                      other_charges: {
                                        ...formData.other_charges,
                                        outbound_call_mobile: normalizeDecimalInput(value)
                                      }
                                    })
                                  }
                                }}
                                className="w-full p-1 border rounded"
                                inputMode="decimal"
                                placeholder="0.0000"
                              />
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Inbound SMS (per msg)</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={formData.other_charges.inbound_sms ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                    setFormData({
                                      ...formData,
                                      other_charges: {
                                        ...formData.other_charges,
                                        inbound_sms: normalizeDecimalInput(value)
                                      }
                                    })
                                  }
                                }}
                                className="w-full p-1 border rounded"
                                inputMode="decimal"
                                placeholder="0.0000"
                              />
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Outbound SMS (per msg)</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={formData.other_charges.outbound_sms ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                    setFormData({
                                      ...formData,
                                      other_charges: {
                                        ...formData.other_charges,
                                        outbound_sms: normalizeDecimalInput(value)
                                      }
                                    })
                                  }
                                }}
                                className="w-full p-1 border rounded"
                                inputMode="decimal"
                                placeholder="0.0000"
                              />
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Other Fees</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={formData.other_charges.other_fees ?? ''}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  other_charges: {
                                    ...formData.other_charges,
                                    other_fees: e.target.value || undefined
                                  }
                                })}
                                className="w-full p-1 border rounded"
                                placeholder="Description or amount"
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Supplier other charges (add form) */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Supplier other charges (admin)</label>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="p-2 text-left">Charge Type</th>
                            <th className="p-2 text-left">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(['inbound_call', 'outbound_call_fixed', 'outbound_call_mobile', 'inbound_sms', 'outbound_sms'] as const).map((key) => (
                            <tr key={key} className="border-t">
                              <td className="p-2 capitalize">{key.replace(/_/g, ' ')}</td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={formData.supplier_other_charges[key] ?? ''}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                      setFormData({
                                        ...formData,
                                        supplier_other_charges: {
                                          ...formData.supplier_other_charges,
                                          [key]: normalizeDecimalInput(value),
                                        },
                                      })
                                    }
                                  }}
                                  className="w-full p-1 border rounded"
                                  inputMode="decimal"
                                  placeholder="0.0000"
                                />
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t">
                            <td className="p-2">Other Fees</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={formData.supplier_other_charges.other_fees ?? ''}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    supplier_other_charges: {
                                      ...formData.supplier_other_charges,
                                      other_fees: e.target.value || undefined,
                                    },
                                  })
                                }
                                className="w-full p-1 border rounded"
                                placeholder="Description or amount"
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Features Table */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Features</label>
                    <div className="border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="p-2 text-left">Feature</th>
                            <th className="p-2 text-left">Status/Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t">
                            <td className="p-2">Voice</td>
                            <td className="p-2">
                              {/* Make the select with custom dropdown's z-index 1000 */}
                              <SelectWithCustom
                                value={formData.features.voice ?? ''}
                                onChange={(value) => setFormData({
                                  ...formData,
                                  features: {
                                    ...formData.features,
                                    voice: value || null
                                  }
                                })}
                                options={FEATURE_OPTIONS.voice}
                                placeholder="Select..."
                              />
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">SMS</td>
                            <td className="p-2">
                              <SelectWithCustom
                                value={formData.features.sms ?? ''}
                                onChange={(value) => setFormData({
                                  ...formData,
                                  features: {
                                    ...formData.features,
                                    sms: value || null
                                  }
                                })}
                                options={FEATURE_OPTIONS.sms}
                                placeholder="Select..."
                              />
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Reach</td>
                            <td className="p-2">
                              <SelectWithCustom
                                value={formData.features.reach ?? ''}
                                onChange={(value) => setFormData({
                                  ...formData,
                                  features: {
                                    ...formData.features,
                                    reach: value || null
                                  }
                                })}
                                options={FEATURE_OPTIONS.reach}
                                placeholder="Select..."
                              />
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Emergency Services</td>
                            <td className="p-2">
                              <SelectWithCustom
                                value={formData.features.emergency_services ?? ''}
                                onChange={(value) => setFormData({
                                  ...formData,
                                  features: {
                                    ...formData.features,
                                    emergency_services: value || null
                                  }
                                })}
                                options={FEATURE_OPTIONS.emergency_services}
                                placeholder="Select..."
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#215F9A] text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Add Number to Inventory
                  </button>
                </form>
              )}
            </div>

            {/* All Numbers Table */}
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-[#215F9A] mb-2">
                Inventory ({filteredInventoryNumbers.length}
                {(inventoryFilters.country || inventoryFilters.smsVoice || inventoryFilters.inboundOutbound) &&
                  allNumbers.length !== filteredInventoryNumbers.length
                  ? ` of ${allNumbers.length}`
                  : ''}
                )
              </h2>

              <section className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1">Filter by Country</label>
                    <select
                      className="w-full p-2 border rounded-lg text-sm"
                      value={inventoryFilters.country}
                      onChange={(e) => setInventoryFilters({ ...inventoryFilters, country: e.target.value })}
                    >
                      <option value="">All Countries</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.country_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1">Filter by SMS/Voice</label>
                    <select
                      className="w-full p-2 border rounded-lg text-sm"
                      value={inventoryFilters.smsVoice}
                      onChange={(e) => setInventoryFilters({ ...inventoryFilters, smsVoice: e.target.value })}
                    >
                      <option value="">All Types</option>
                      <option>SMS only</option>
                      <option>Voice only</option>
                      <option>Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1">Filter by Inbound/Outbound</label>
                    <select
                      className="w-full p-2 border rounded-lg text-sm"
                      value={inventoryFilters.inboundOutbound}
                      onChange={(e) => setInventoryFilters({ ...inventoryFilters, inboundOutbound: e.target.value })}
                    >
                      <option value="">All Directions</option>
                      <option>Inbound only</option>
                      <option>Outbound only</option>
                      <option>Both</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => setInventoryFilters({ country: '', smsVoice: '', inboundOutbound: '' })}
                      disabled={loadingNumbers}
                      className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 text-sm disabled:opacity-50"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
                {(inventoryFilters.country || inventoryFilters.smsVoice || inventoryFilters.inboundOutbound) && (
                  <p className="text-xs text-gray-500 mt-2">Filters narrow the list below; totals show matched rows.</p>
                )}
              </section>

              {loadingNumbers ? (
                <div className="py-4 animate-fade-in">
                  <TableSkeleton rows={5} cols={8} />
                </div>
              ) : (
                <>
                  <div className="md:hidden space-y-3 mb-2">
                    {filteredInventoryNumbers.map((num) => {
                      const isCardExpanded = expandedRows.has(num.id)
                      const supCurM = num.supplier_currency || num.currency || 'USD'
                      return (
                        <div key={`m-${num.id}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                          <div className="flex justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-[#215F9A] truncate">{num.country_name}</p>
                              <p className="text-xs text-gray-600">
                                {num.number_type} · {num.sms_capability} · {num.direction}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 break-words">Supplier: {num.supplier || '—'}</p>
                            </div>
                            <div className="text-right text-sm shrink-0">
                              <p className="text-xs text-gray-500">Supplier MRC</p>
                              <p className="font-medium">
                                {num.supplier_mrc != null ? `${supCurM} ${formatDecimal(num.supplier_mrc, 2)}` : '—'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">NRC</p>
                              <p className="font-medium">
                                {num.supplier_nrc != null ? `${supCurM} ${formatDecimal(num.supplier_nrc, 2)}` : '—'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleRowExpansion(num.id)}
                              className="text-[#215F9A] text-sm font-medium"
                            >
                              {isCardExpanded ? '▼ Hide details' : '▶ Details'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openInventoryEditorForModal(num)}
                              className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNumber(num.id)}
                              className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                            >
                              Delete
                            </button>
                          </div>
                          {isCardExpanded && <div className="pt-1">{inventoryPricingDetailContent(num)}</div>}
                        </div>
                      )
                    })}
                  </div>
                  <div className="hidden md:block overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
                    <table className="w-full border-collapse min-w-[1040px] text-sm">
                    <thead>
                      <tr className="bg-[#215F9A] text-white text-xs sm:text-sm">
                        <th className="p-2 sm:p-3 text-left">Country</th>
                        <th className="p-2 sm:p-3 text-center">Available</th>
                        <th className="p-2 sm:p-3 text-left">Type</th>
                        <th className="p-2 sm:p-3 text-left">Specification</th>
                        <th className="p-2 sm:p-3 text-left">SMS/Voice</th>
                        <th className="p-2 sm:p-3 text-left">In/Out</th>
                        <th className="p-2 sm:p-3 text-left max-w-[120px]">Supplier</th>
                        <th className="p-2 sm:p-3 text-right" title="Supplier MRC">MRC</th>
                        <th className="p-2 sm:p-3 text-right" title="Supplier NRC">NRC</th>
                        <th className="p-2 sm:p-3 text-left" title="Supplier currency">Curr.</th>
                        <th className="p-2 sm:p-3 text-center">MOQ</th>
                        <th className="p-2 sm:p-3 text-left">Pulse</th>
                        <th className="p-2 sm:p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventoryNumbers.map((num) => {
                        const isExpanded = expandedRows.has(num.id)
                        const supCur = num.supplier_currency || num.currency || 'USD'

                        return (
                          <React.Fragment key={num.id}>
                            <tr className="border-b hover:bg-gray-50">
                              <td className="p-2 sm:p-3">
                                {num.country_name} ({num.country_code})
                              </td>
                              <td className="p-2 sm:p-3 text-center font-semibold">{num.available_numbers ?? 0}</td>
                              <td className="p-2 sm:p-3">{num.number_type}</td>
                              <td className="p-2 sm:p-3 text-xs sm:text-sm">{num.specification || '-'}</td>
                              <td className="p-2 sm:p-3">{num.sms_capability}</td>
                              <td className="p-2 sm:p-3">{num.direction}</td>
                              <td className="p-2 sm:p-3 text-xs max-w-[120px] truncate" title={num.supplier || undefined}>
                                {num.supplier || '—'}
                              </td>
                              <td className="p-2 sm:p-3 text-right whitespace-nowrap">
                                {num.supplier_mrc != null ? `${supCur} ${formatDecimal(num.supplier_mrc, 2)}` : '—'}
                              </td>
                              <td className="p-2 sm:p-3 text-right whitespace-nowrap">
                                {num.supplier_nrc != null ? `${supCur} ${formatDecimal(num.supplier_nrc, 2)}` : '—'}
                              </td>
                              <td className="p-2 sm:p-3">{num.supplier_currency || (num.supplier_mrc != null || num.supplier_nrc != null ? num.currency : '—')}</td>
                              <td className="p-2 sm:p-3 text-center">{num.moq}</td>
                              <td className="p-2 sm:p-3 text-xs">{num.bill_pulse || '-'}</td>
                              <td className="p-2 sm:p-3 text-center">
                                <div className="flex flex-wrap gap-1 justify-center">
                                  <button
                                    onClick={() => toggleRowExpansion(num.id)}
                                    className="text-[#215F9A] hover:text-[#2c78c0] font-medium text-xs"
                                  >
                                    {isExpanded ? '▼ Hide' : '▶ Details'}
                                  </button>
                                  <button
                                    onClick={() => openInventoryEditorForModal(num)}
                                    className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNumber(num.id)}
                                    className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-gray-50">
                                <td colSpan={13} className="p-3 sm:p-4">
                                  {inventoryPricingDetailContent(num)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                    </table>
                  </div>
                  {allNumbers.length === 0 && (
                    <div className="text-center py-8 text-gray-600">
                      No numbers in inventory yet.
                    </div>
                  )}
                  {allNumbers.length > 0 && filteredInventoryNumbers.length === 0 && (
                    <div className="text-center py-8 text-gray-600">
                      No rows match the current filters. Try resetting filters.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-b-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-[#215F9A] mb-4">
              Customer Orders ({orders.length})
            </h2>

            {loadingOrders ? (
              <div className="py-4 animate-fade-in">
                <TableSkeleton rows={5} cols={10} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#215F9A] text-white text-xs">
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Customer</th>
                      <th className="p-2 text-left">Country</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">SMS/Voice</th>
                      <th className="p-2 text-left">Inbound/Outbound</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-center">MOQ</th>
                      <th className="p-2 text-right">Supplier MRC</th>
                      <th className="p-2 text-right">Supplier NRC</th>
                      <th className="p-2 text-left">Requirements</th>
                      <th className="p-2 text-center">Documents</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-xs">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <div>
                            <div className="font-medium text-xs">{order.customer_name}</div>
                            <div className="text-xs text-gray-500">{order.customer_email}</div>
                          </div>
                        </td>
                        <td className="p-2 text-xs">{order.country_name}</td>
                        <td className="p-2 text-xs">{order.number_type}</td>
                        <td className="p-2 text-xs">{order.sms_capability}</td>
                        <td className="p-2 text-xs">{order.direction}</td>
                        <td className="p-2 text-center text-xs">{order.quantity}</td>
                        <td className="p-2 text-center text-xs">{order.moq}</td>
                        <td className="p-2 text-right text-xs">
                          {order.supplier_mrc != null ? `${order.supplier_currency || 'USD'} ${formatDecimal(order.supplier_mrc, 2)}` : '—'}
                        </td>
                        <td className="p-2 text-right text-xs">
                          {order.supplier_nrc != null ? `${order.supplier_currency || 'USD'} ${formatDecimal(order.supplier_nrc, 2)}` : '—'}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleOpenOrderRequirements(order)}
                            className="bg-[#215F9A] text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                          >
                            View
                          </button>
                        </td>
                        <td className="p-2 text-center">
                          {(() => {
                            const docs = order.uploaded_documents?.documents ?? []
                            const otherDocs = order.uploaded_documents?.other_documents ?? []
                            const hasDocs = docs.length > 0 || otherDocs.length > 0
                            if (hasDocs) {
                              return (
                                <div className="flex flex-col items-center gap-1">
                                  {docs.length > 0 && (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                                      {docs.length} file(s)
                                    </span>
                                  )}
                                  {otherDocs.length > 0 && (
                                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">
                                      {otherDocs.length} custom doc{otherDocs.length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500 capitalize">
                                    {order.uploaded_documents?.customer_type || 'N/A'}
                                  </span>
                                  <button
                                    onClick={() => setSelectedOrderForDocs(order)}
                                    className="text-[#215F9A] hover:text-blue-700 text-xs underline"
                                  >
                                    View
                                  </button>
                                </div>
                              )
                            }
                            if (order.uploaded_documents?.documents_deleted) {
                              return <span className="text-gray-400 text-xs italic">Cleaned up</span>
                            }
                            return <span className="text-gray-400 text-xs">None</span>
                          })()}
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`px-2 py-1 rounded text-xs ${order.status === 'granted'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : order.status === 'documentation_review'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                          >
                            {order.status === 'documentation_review' ? 'Doc Review' : order.status}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1 justify-center flex-wrap">
                            {(order.status === 'pending' || order.status === 'documentation_review') && (
                              <>
                                <button
                                  onClick={() => handleOrderStatus(order.id, 'granted')}
                                  disabled={processingOrder === order.id}
                                  className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                >
                                  Grant
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Rejection reason:')
                                    if (reason) {
                                      handleOrderStatus(order.id, 'rejected', reason)
                                    }
                                  }}
                                  disabled={processingOrder === order.id}
                                  className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50"
                                >
                                  Deny
                                </button>
                                <button
                                  onClick={() => {
                                    setOrderForRequestChanges(order)
                                    setRequestChangesMessage(order.admin_request_changes || '')
                                  }}
                                  disabled={processingOrder === order.id}
                                  className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                                >
                                  Request changes
                                </button>
                              </>
                            )}
                            {order.status !== 'pending' && order.status !== 'documentation_review' && (
                              <span className="text-xs text-gray-500">
                                {order.status === 'granted' ? 'Approved' : 'Rejected'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && (
                  <div className="text-center py-8 text-gray-600">
                    No orders yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Custom number requests Tab */}
        {activeTab === 'custom_requests' && (
          <div className="bg-white rounded-b-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-[#215F9A] mb-4">
              Custom number requests ({customRequests.length})
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Requests from clients for numbers not in inventory. Different from regular orders (inventory orders).
            </p>
            {loadingCustomRequests ? (
              <div className="py-4 animate-fade-in">
                <TableSkeleton rows={5} cols={10} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#215F9A] text-white text-xs">
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Customer</th>
                      <th className="p-2 text-left">Country</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">SMS/Voice</th>
                      <th className="p-2 text-left">Direction</th>
                      <th className="p-2 text-right">MRC</th>
                      <th className="p-2 text-right">NRC</th>
                      <th className="p-2 text-center">MOQ</th>
                      <th className="p-2 text-left">Requirements</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customRequests.map((req) => (
                      <tr key={req.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-xs">{new Date(req.created_at).toLocaleDateString()}</td>
                        <td className="p-2">
                          <div className="font-medium text-xs">{req.customer_name || '—'}</div>
                          <div className="text-xs text-gray-500">{req.customer_email || '—'}</div>
                        </td>
                        <td className="p-2 text-xs">{req.country_name || '—'}</td>
                        <td className="p-2 text-xs">{req.number_type}</td>
                        <td className="p-2 text-xs">{req.sms_capability}</td>
                        <td className="p-2 text-xs">{req.direction}</td>
                        <td className="p-2 text-right text-xs">{req.currency} {formatDecimal(req.mrc, 2)}</td>
                        <td className="p-2 text-right text-xs">{req.currency} {formatDecimal(req.nrc, 2)}</td>
                        <td className="p-2 text-center text-xs">{req.moq}</td>
                        <td className="p-2 text-xs max-w-[150px]" title={req.requirements_text || undefined}>
                          {req.requirements_text ? (req.requirements_text.length > 50 ? `${req.requirements_text.slice(0, 50)}…` : req.requirements_text) : '—'}
                        </td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${req.status === 'approved' ? 'bg-green-100 text-green-800' :
                            req.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1 justify-center flex-wrap">
                            {req.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => {
                                    setFulfillCustomRequestModal(req)
                                    setFulfillForm({
                                      mrc: req.mrc != null ? String(req.mrc) : '',
                                      nrc: req.nrc != null ? String(req.nrc) : '',
                                      currency: req.currency || 'USD',
                                      moq: req.moq != null ? String(req.moq) : '1',
                                      supplier_mrc: '',
                                      supplier_nrc: '',
                                      supplier_currency: '',
                                      specification: req.specification || '',
                                      bill_pulse: req.bill_pulse || '',
                                      requirements_text: req.requirements_text || '',
                                    })
                                    setError(null)
                                  }}
                                  disabled={processingCustomRequest === req.id}
                                  className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                  title="Fill mandatory fields in popup, then approve to add to inventory"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Rejection reason (optional):')
                                    if (reason !== null) handleCustomRequestStatus(req.id, 'rejected', reason)
                                  }}
                                  disabled={processingCustomRequest === req.id}
                                  className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {req.status !== 'pending' && (
                              <span className="text-xs text-gray-500">{req.status === 'approved' ? 'Approved' : 'Rejected'}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {customRequests.length === 0 && (
                  <div className="text-center py-8 text-gray-600">No custom number requests yet.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Signup Requests Tab */}
        {activeTab === 'signup_requests' && (
          <div className="bg-white rounded-b-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-[#215F9A] mb-4">
              Signup Requests ({signupRequests.length})
            </h2>

            {loadingSignupRequests ? (
              <div className="py-4 animate-fade-in">
                <TableSkeleton rows={5} cols={6} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#215F9A] text-white text-sm">
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Message</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signupRequests.map((request) => (
                      <tr key={request.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm">
                          {new Date(request.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 font-medium">{request.name}</td>
                        <td className="p-3">{request.email}</td>
                        <td className="p-3 text-sm max-w-xs truncate" title={request.message}>
                          {request.message}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-1 rounded text-xs ${request.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : request.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                              }`}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2 justify-center">
                            {request.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveSignup(request.id)}
                                  disabled={processingSignup === request.id}
                                  className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Rejection reason:')
                                    if (reason !== null) {
                                      handleRejectSignup(request.id, reason)
                                    }
                                  }}
                                  disabled={processingSignup === request.id}
                                  className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {request.status === 'rejected' && request.rejected_reason && (
                              <span className="text-xs text-red-600" title={request.rejected_reason}>
                                {request.rejected_reason.substring(0, 20)}...
                              </span>
                            )}
                            {request.status === 'approved' && (
                              <span className="text-xs text-green-600">Approved</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {signupRequests.length === 0 && (
                  <div className="text-center py-8 text-gray-600">
                    No signup requests yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-b-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-[#215F9A] mb-4">
              User Management
            </h2>
            <p className="text-gray-600 mb-2">
              View and manage customer accounts, reset passwords, and handle user issues.
            </p>
          

            {loadingUsers ? (
              <TableSkeleton rows={5} />
            ) : users.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-500">No users found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="p-3 text-left font-semibold">Name</th>
                      <th className="p-3 text-left font-semibold">Email</th>
                      <th className="p-3 text-left font-semibold">Company</th>
                      <th className="p-3 text-left font-semibold">Signup Date</th>
                      <th className="p-3 text-left font-semibold">Last Login</th>
                      <th className="p-3 text-left font-semibold">Orders</th>
                      <th className="p-3 text-left font-semibold">Status</th>
                      <th className="p-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className={`border-b hover:bg-gray-50 ${user.is_admin ? 'bg-purple-50' : ''}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.name}</span>
                            {user.is_admin && (
                              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                                Admin
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-600">{user.email}</td>
                        <td className="p-3 text-sm text-gray-600">{user.company_name ?? '—'}</td>
                        <td className="p-3 text-sm text-gray-600">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {user.last_login_at
                            ? new Date(user.last_login_at).toLocaleDateString()
                            : <span className="text-gray-400 italic">Not tracked</span>
                          }
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleViewUserOrders(user)}
                            className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            {user.order_count} orders
                          </button>
                        </td>
                        <td className="p-3">
                          {user.is_disabled ? (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                              Disabled
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {user.is_admin ? (
                            <span className="text-xs text-gray-400 italic">Protected</span>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleToggleUserStatus(user)}
                                disabled={processingUser === user.id}
                                className={`px-3 py-1 text-xs rounded transition-colors ${user.is_disabled
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                  } disabled:opacity-50`}
                                title={user.is_disabled ? 'Enable user' : 'Disable user'}
                              >
                                {processingUser === user.id ? '...' : user.is_disabled ? 'Enable' : 'Disable'}
                              </button>
                              <button
                                onClick={() => handleSendPasswordReset(user)}
                                disabled={processingUser === user.id}
                                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
                                title="Send password reset email"
                              >
                                {processingUser === user.id ? '...' : 'Reset Pass'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                disabled={processingUser === user.id}
                                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                                title="Delete user"
                              >
                                {processingUser === user.id ? '...' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* User Orders Modal */}
            {viewingUserOrders && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                  <div className="p-6 border-b flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        Orders for {viewingUserOrders.name}
                      </h3>
                      <p className="text-sm text-gray-500">{viewingUserOrders.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setViewingUserOrders(null)
                        setSelectedUserOrders(null)
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {selectedUserOrders === null ? (
                      <div className="text-center py-8">
                        <LoadingSpinner size="md" text="Loading orders..." />
                      </div>
                    ) : selectedUserOrders.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No orders found for this user.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedUserOrders.map((order: any) => (
                          <div key={order.id} className="p-4 bg-gray-50 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">
                                {order.number?.countries?.name || 'Unknown'} - {order.number?.number_type || 'Unknown'}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                              <div>Quantity: {order.quantity}</div>
                              <div>Created: {new Date(order.created_at).toLocaleDateString()}</div>
                              <div>MRC: {order.currency_at_order} {order.mrc_at_order}</div>
                              <div>NRC: {order.currency_at_order} {order.nrc_at_order}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-b-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-[#215F9A] mb-6">
              Admin Settings
            </h2>

            {loadingSettings ? (
              <div className="text-center py-8">
                <div className="text-gray-600">Loading settings...</div>
              </div>
            ) : (
              <div className="max-w-xl">
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Email Notifications</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure the email address to receive notifications for new signup requests and orders.
                    Delivery also requires SMTP environment variables on the server:{' '}
                    <code className="text-xs bg-gray-100 px-1 rounded">SMTP_HOST</code>,{' '}
                    <code className="text-xs bg-gray-100 px-1 rounded">SMTP_PORT</code>,{' '}
                    <code className="text-xs bg-gray-100 px-1 rounded">SMTP_USER</code>,{' '}
                    <code className="text-xs bg-gray-100 px-1 rounded">SMTP_PASS</code>
                    (and optionally <code className="text-xs bg-gray-100 px-1 rounded">EMAIL_FROM</code>). You can set a fallback recipient with{' '}
                    <code className="text-xs bg-gray-100 px-1 rounded">ADMIN_NOTIFICATION_EMAIL</code> if the database value is empty.
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      Notification Email Address
                    </label>
                    <input
                      type="email"
                      value={adminSettings.notification_email}
                      onChange={(e) => setAdminSettings({ ...adminSettings, notification_email: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                      placeholder="admin@yourcompany.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This email will receive notifications for new signup requests and customer orders.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={loadingSettings}
                      className="bg-[#215F9A] text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loadingSettings ? 'Saving...' : 'Save Settings'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={sendingTestEmail || !adminSettings.notification_email?.trim()}
                      className="bg-white text-[#215F9A] border border-[#215F9A] px-6 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      title={!adminSettings.notification_email?.trim() ? 'Save a notification email first' : undefined}
                    >
                      {sendingTestEmail ? 'Sending…' : 'Send test email'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit Number Modal */}
        {editingNumber && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-4 sm:p-8 max-w-2xl sm:max-w-4xl w-full max-h-[min(90vh,100dvh)] overflow-y-auto">
              <h2 className="text-2xl font-semibold text-[#215F9A] mb-6">
                Edit Number
              </h2>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleUpdateNumber(editingNumber)
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Country</label>
                    <input
                      type="text"
                      value={editingNumber.country_name}
                      disabled
                      className="w-full p-2 border rounded-lg bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Number Type</label>
                    <select
                      value={editingNumber.number_type}
                      onChange={(e) => setEditingNumber({ ...editingNumber, number_type: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="Geographic">Geographic</option>
                      <option value="Mobile">Mobile</option>
                      <option value="Toll-Free">Toll-Free</option>
                      <option value="Non-Geographic">Non-Geographic</option>
                      <option value="2WV">2WV</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">SMS/Voice</label>
                    <select
                      value={editingNumber.sms_capability}
                      onChange={(e) => setEditingNumber({ ...editingNumber, sms_capability: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="SMS only">SMS only</option>
                      <option value="Voice only">Voice only</option>
                      <option value="Both">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Inbound/Outbound</label>
                    <select
                      value={editingNumber.direction}
                      onChange={(e) => setEditingNumber({ ...editingNumber, direction: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="Inbound only">Inbound only</option>
                      <option value="Outbound only">Outbound only</option>
                      <option value="Both">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Supplier name</label>
                    <SelectWithCustom
                      value={editingNumber.supplier || ''}
                      onChange={(value) => setEditingNumber({ ...editingNumber, supplier: value })}
                      options={SUPPLIER_OPTIONS}
                      placeholder="Select supplier..."
                      customPlaceholder="Enter supplier name..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Customer MRC</label>
                    <input
                      type="text"
                      value={editingNumber.mrc}
                      onChange={(e) => {
                        const value = e.target.value
                        // Allow empty, digits, and a single decimal separator ('.' or ',')
                        if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                          setEditingNumber({ ...editingNumber, mrc: normalizeDecimalInput(value) as any })
                        }
                      }}
                      className="w-full p-2 border rounded-lg"
                      inputMode="decimal"
                      placeholder="Enter MRC"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Customer NRC</label>
                    <input
                      type="text"
                      value={editingNumber.nrc}
                      onChange={(e) => {
                        const value = e.target.value
                        // Allow empty, digits, and a single decimal separator ('.' or ',')
                        if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                          setEditingNumber({ ...editingNumber, nrc: normalizeDecimalInput(value) as any })
                        }
                      }}
                      className="w-full p-2 border rounded-lg"
                      inputMode="decimal"
                      placeholder="Enter NRC"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Customer currency</label>
                    <select
                      value={editingNumber.currency}
                      onChange={(e) => setEditingNumber({ ...editingNumber, currency: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                    </select>
                  </div>
                  <div className="col-span-2 text-sm font-semibold text-[#215F9A]">Supplier rate (admin only)</div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Supplier MRC</label>
                    <input
                      type="text"
                      value={((editingNumber as any).supplier_mrc ?? '') as string}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                          setEditingNumber({ ...editingNumber, supplier_mrc: normalizeDecimalInput(value) as any })
                        }
                      }}
                      className="w-full p-2 border rounded-lg"
                      inputMode="decimal"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Supplier NRC</label>
                    <input
                      type="text"
                      value={((editingNumber as any).supplier_nrc ?? '') as string}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                          setEditingNumber({ ...editingNumber, supplier_nrc: normalizeDecimalInput(value) as any })
                        }
                      }}
                      className="w-full p-2 border rounded-lg"
                      inputMode="decimal"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Supplier Currency</label>
                    <select
                      value={((editingNumber as any).supplier_currency ?? '') as string}
                      onChange={(e) => setEditingNumber({ ...editingNumber, supplier_currency: e.target.value as any })}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="">—</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">MOQ</label>
                    <input
                      type="text"
                      value={editingNumber.moq}
                      onChange={(e) => {
                        const value = e.target.value
                        // Allow empty and integers
                        if (value === '' || /^\d*$/.test(value)) {
                          setEditingNumber({ ...editingNumber, moq: value as any })
                        }
                      }}
                      className="w-full p-2 border rounded-lg"
                      placeholder="Enter MOQ"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Available</label>
                    <select
                      value={editingNumber.is_available ? 'true' : 'false'}
                      onChange={(e) => setEditingNumber({ ...editingNumber, is_available: e.target.value === 'true' })}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="true">Available</option>
                      <option value="false">Unavailable</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Specification (Prefix/Area)</label>
                    <input
                      type="text"
                      value={editingNumber.specification || ''}
                      onChange={(e) => setEditingNumber({ ...editingNumber, specification: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                      placeholder="e.g., Landline, France (07)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Bill Pulse</label>
                    <SelectWithCustom
                      value={editingNumber.bill_pulse || ''}
                      onChange={(value) => setEditingNumber({ ...editingNumber, bill_pulse: value })}
                      options={BILL_PULSE_OPTIONS}
                      placeholder="Select bill pulse..."
                      customPlaceholder="Enter custom (e.g., 45/45)..."
                    />
                  </div>
                </div>

                {/* Supplier other charges (edit) */}
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Supplier other charges (admin)</label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left">Charge Type</th>
                          <th className="p-2 text-left">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(['inbound_call', 'outbound_call_fixed', 'outbound_call_mobile', 'inbound_sms', 'outbound_sms'] as const).map((key) => (
                          <tr key={key} className="border-t">
                            <td className="p-2 capitalize">{key.replace(/_/g, ' ')}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={((editingNumber as any).supplier_other_charges?.[key] ?? '') as string}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                    setEditingNumber({
                                      ...editingNumber,
                                      supplier_other_charges: {
                                        ...((editingNumber as any).supplier_other_charges || {}),
                                        [key]: normalizeDecimalInput(value),
                                      },
                                    })
                                  }
                                }}
                                className="w-full p-1 border rounded"
                                inputMode="decimal"
                                placeholder="0.0000"
                              />
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t">
                          <td className="p-2">Other Fees</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={((editingNumber as any).supplier_other_charges?.other_fees ?? '') as string}
                              onChange={(e) =>
                                setEditingNumber({
                                  ...editingNumber,
                                  supplier_other_charges: {
                                    ...((editingNumber as any).supplier_other_charges || {}),
                                    other_fees: e.target.value || undefined,
                                  },
                                })
                              }
                              className="w-full p-1 border rounded"
                              placeholder="Description or amount"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Other Charges Section for Edit (customer) */}
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Customer other charges</label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left">Charge Type</th>
                          <th className="p-2 text-left">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="p-2">Inbound Call (per min)</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={(editingNumber.other_charges as any)?.inbound_call ?? ''}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                  setEditingNumber({
                                    ...editingNumber,
                                    other_charges: {
                                      ...(editingNumber.other_charges || {}),
                                      inbound_call: normalizeDecimalInput(value)
                                    }
                                  })
                                }
                              }}
                              className="w-full p-1 border rounded"
                              inputMode="decimal"
                              placeholder="0.0000"
                            />
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2">Outbound Call Fixed (per min)</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={(editingNumber.other_charges as any)?.outbound_call_fixed ?? ''}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                  setEditingNumber({
                                    ...editingNumber,
                                    other_charges: {
                                      ...(editingNumber.other_charges || {}),
                                      outbound_call_fixed: normalizeDecimalInput(value)
                                    }
                                  })
                                }
                              }}
                              className="w-full p-1 border rounded"
                              inputMode="decimal"
                              placeholder="0.0000"
                            />
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2">Outbound Call Mobile (per min)</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={(editingNumber.other_charges as any)?.outbound_call_mobile ?? ''}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                  setEditingNumber({
                                    ...editingNumber,
                                    other_charges: {
                                      ...(editingNumber.other_charges || {}),
                                      outbound_call_mobile: normalizeDecimalInput(value)
                                    }
                                  })
                                }
                              }}
                              className="w-full p-1 border rounded"
                              inputMode="decimal"
                              placeholder="0.0000"
                            />
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2">Inbound SMS (per msg)</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={(editingNumber.other_charges as any)?.inbound_sms ?? ''}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                  setEditingNumber({
                                    ...editingNumber,
                                    other_charges: {
                                      ...(editingNumber.other_charges || {}),
                                      inbound_sms: normalizeDecimalInput(value)
                                    }
                                  })
                                }
                              }}
                              className="w-full p-1 border rounded"
                              inputMode="decimal"
                              placeholder="0.0000"
                            />
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2">Outbound SMS (per msg)</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={(editingNumber.other_charges as any)?.outbound_sms ?? ''}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                  setEditingNumber({
                                    ...editingNumber,
                                    other_charges: {
                                      ...(editingNumber.other_charges || {}),
                                      outbound_sms: normalizeDecimalInput(value)
                                    }
                                  })
                                }
                              }}
                              className="w-full p-1 border rounded"
                              inputMode="decimal"
                              placeholder="0.0000"
                            />
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2">Other Fees</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={(editingNumber.other_charges as any)?.other_fees ?? ''}
                              onChange={(e) => setEditingNumber({
                                ...editingNumber,
                                other_charges: {
                                  ...(editingNumber.other_charges || {}),
                                  other_fees: e.target.value || undefined
                                }
                              })}
                              className="w-full p-1 border rounded"
                              placeholder="Description or amount"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Features (editable) */}
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Features</label>
                  <div className="border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left">Feature</th>
                          <th className="p-2 text-left">Status/Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="p-2">Voice</td>
                          <td className="p-2">
                            <SelectWithCustom
                              value={((editingNumber as any).features?.voice ?? '') as string}
                              onChange={(value) => setEditingNumber({
                                ...editingNumber,
                                features: {
                                  ...((editingNumber as any).features || {}),
                                  voice: value || null
                                }
                              })}
                              options={FEATURE_OPTIONS.voice}
                              placeholder="Select..."
                            />
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2">SMS</td>
                          <td className="p-2">
                            <SelectWithCustom
                              value={((editingNumber as any).features?.sms ?? '') as string}
                              onChange={(value) => setEditingNumber({
                                ...editingNumber,
                                features: {
                                  ...((editingNumber as any).features || {}),
                                  sms: value || null
                                }
                              })}
                              options={FEATURE_OPTIONS.sms}
                              placeholder="Select..."
                            />
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2">Reach</td>
                          <td className="p-2">
                            <SelectWithCustom
                              value={((editingNumber as any).features?.reach ?? '') as string}
                              onChange={(value) => setEditingNumber({
                                ...editingNumber,
                                features: {
                                  ...((editingNumber as any).features || {}),
                                  reach: value || null
                                }
                              })}
                              options={FEATURE_OPTIONS.reach}
                              placeholder="Select..."
                            />
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2">Emergency Services</td>
                          <td className="p-2">
                            <SelectWithCustom
                              value={((editingNumber as any).features?.emergency_services ?? '') as string}
                              onChange={(value) => setEditingNumber({
                                ...editingNumber,
                                features: {
                                  ...((editingNumber as any).features || {}),
                                  emergency_services: value || null
                                }
                              })}
                              options={FEATURE_OPTIONS.emergency_services}
                              placeholder="Select..."
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-[#215F9A] text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingNumber(null)}
                    className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Country Modal */}
        {showAddCountry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl shadow-lg p-8 max-w-2xl w-full mx-4">
              <h2 className="text-2xl font-semibold text-[#215F9A] mb-6">
                Add New Country
              </h2>
              <p className="text-gray-600 mb-4">
                Country requirements will be automatically fetched using AI.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleAddCountry()
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Country Name *
                  </label>
                  <input
                    type="text"
                    value={countryFormData.name}
                    onChange={(e) =>
                      setCountryFormData({
                        ...countryFormData,
                        name: e.target.value,
                      })
                    }
                    placeholder="Ethiopia"
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Country Code *
                  </label>
                  <input
                    type="text"
                    value={countryFormData.country_code}
                    onChange={(e) =>
                      setCountryFormData({
                        ...countryFormData,
                        country_code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="ET"
                    className="w-full p-2 border rounded-lg"
                    required
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Regulator (Optional)
                  </label>
                  <input
                    type="text"
                    value={countryFormData.regulator}
                    onChange={(e) =>
                      setCountryFormData({
                        ...countryFormData,
                        regulator: e.target.value,
                      })
                    }
                    placeholder="Ethiopian Communications Authority"
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={fetchingRequirements}
                    className="flex-1 bg-[#215F9A] text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
                  >
                    {fetchingRequirements
                      ? 'Fetching Requirements...'
                      : 'Add Country'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCountry(false)
                      setCountryFormData({
                        name: '',
                        country_code: '',
                        regulator: '',
                      })
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Order requirements modal (like client Numbers page) */}
      {orderForRequirementsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setOrderForRequirementsModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-[#215F9A]">
                Requirements – {orderForRequirementsModal.country_name}
              </h3>
              <button onClick={() => setOrderForRequirementsModal(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
              <p className="text-gray-700">
                <strong>Number Type:</strong> {orderForRequirementsModal.number_type} | <strong>Direction:</strong> {orderForRequirementsModal.direction} | <strong>SMS/Voice:</strong> {orderForRequirementsModal.sms_capability}
              </p>
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-[#215F9A] mb-2">Customer rate (view)</h4>
              <p className="text-sm text-gray-700">
                MRC: {orderForRequirementsModal.currency_at_order} {formatDecimal(orderForRequirementsModal.mrc_at_order, 2) ?? '0'} &nbsp;|&nbsp; NRC: {orderForRequirementsModal.currency_at_order} {formatDecimal(orderForRequirementsModal.nrc_at_order, 2) ?? '0'}
              </p>
            </div>
            {loadingOrderRequirements ? (
              <div className="text-center py-8 text-gray-600">Loading requirements...</div>
            ) : orderRequirementsData ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <h4 className="font-semibold mb-2">Number Allocation</h4>
                  <div className="ml-4 space-y-2">
                    <div>
                      <p className="font-medium text-sm">Individual Documentation:</p>
                      <ul className="list-disc list-inside ml-2 text-sm text-gray-600">
                        {orderRequirementsData.number_allocation?.end_user_documentation?.individual?.map((doc: string, idx: number) => (
                          <li key={idx}>{doc}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Business Documentation:</p>
                      <ul className="list-disc list-inside ml-2 text-sm text-gray-600">
                        {orderRequirementsData.number_allocation?.end_user_documentation?.business?.map((doc: string, idx: number) => (
                          <li key={idx}>{doc}</li>
                        ))}
                      </ul>
                    </div>
                    {orderRequirementsData.number_allocation?.address_requirements && (
                      <p className="text-sm text-gray-600">
                        <strong>Address Requirements:</strong> {orderRequirementsData.number_allocation.address_requirements}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Sub-Allocation</h4>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">
                      <strong>Allowed:</strong> {orderRequirementsData.sub_allocation?.allowed ? 'Yes' : 'No'}
                    </p>
                    {orderRequirementsData.sub_allocation?.rules && (
                      <p className="text-sm text-gray-600 mt-1">{orderRequirementsData.sub_allocation.rules}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Number Porting</h4>
                  <div className="ml-4 space-y-2">
                    <div>
                      <p className="font-medium text-sm">Individual Documentation:</p>
                      <ul className="list-disc list-inside ml-2 text-sm text-gray-600">
                        {orderRequirementsData.number_porting?.end_user_documentation?.individual?.map((doc: string, idx: number) => (
                          <li key={`port-ind-${idx}`}>{doc}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Business Documentation:</p>
                      <ul className="list-disc list-inside ml-2 text-sm text-gray-600">
                        {orderRequirementsData.number_porting?.end_user_documentation?.business?.map((doc: string, idx: number) => (
                          <li key={`port-biz-${idx}`}>{doc}</li>
                        ))}
                      </ul>
                    </div>
                    {orderRequirementsData.number_porting?.process_notes && (
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Process Notes:</strong> {orderRequirementsData.number_porting.process_notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : orderForRequirementsModal.requirements_text ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{orderForRequirementsModal.requirements_text}</p>
            ) : (
              <p className="text-gray-600">No specific requirements on file for this combination.</p>
            )}
            <div className="mt-6">
              <button onClick={() => setOrderForRequirementsModal(null)} className="bg-[#215F9A] text-white px-4 py-2 rounded-lg hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Request changes modal */}
      {orderForRequestChanges && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-semibold text-[#215F9A] mb-2">Request changes from customer</h3>
            <p className="text-sm text-gray-600 mb-4">
              Ask the customer to upload or update specific requirements/documents. They will see this message on their orders page.
            </p>
            <textarea
              value={requestChangesMessage}
              onChange={(e) => setRequestChangesMessage(e.target.value)}
              className="w-full p-3 border rounded-lg text-sm min-h-[120px]"
              placeholder="e.g. Please upload a copy of your business license and proof of address."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSaveRequestChanges}
                disabled={processingOrder === orderForRequestChanges.id}
                className="flex-1 bg-[#215F9A] text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {processingOrder === orderForRequestChanges.id ? 'Sending...' : 'Send request'}
              </button>
              <button
                onClick={() => {
                  setOrderForRequestChanges(null)
                  setRequestChangesMessage('')
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fulfill custom request modal - fill mandatory fields before adding to inventory */}
      {fulfillCustomRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-semibold text-[#215F9A] mb-2">Approve request – mandatory fields</h3>
            <p className="text-sm text-gray-600 mb-4">
              Fill in the mandatory fields below to approve this request and add the number to inventory.
            </p>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">MRC *</label>
                  <input
                    type="text"
                    value={fulfillForm.mrc}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, mrc: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="e.g. 12.50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">NRC *</label>
                  <input
                    type="text"
                    value={fulfillForm.nrc}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, nrc: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="e.g. 20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Currency *</label>
                  <select
                    value={fulfillForm.currency}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, currency: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">MOQ *</label>
                  <input
                    type="text"
                    value={fulfillForm.moq}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, moq: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="text-sm font-semibold text-[#215F9A] mt-2">Supplier rate (optional, admin only)</div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier MRC</label>
                  <input
                    type="text"
                    value={fulfillForm.supplier_mrc}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, supplier_mrc: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier NRC</label>
                  <input
                    type="text"
                    value={fulfillForm.supplier_nrc}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, supplier_nrc: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier Currency</label>
                  <select
                    value={fulfillForm.supplier_currency}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, supplier_currency: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">—</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Specification (optional)</label>
                <input
                  type="text"
                  value={fulfillForm.specification}
                  onChange={(e) => setFulfillForm({ ...fulfillForm, specification: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="e.g. Landline, France (07)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bill pulse (optional)</label>
                <input
                  type="text"
                  value={fulfillForm.bill_pulse}
                  onChange={(e) => setFulfillForm({ ...fulfillForm, bill_pulse: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="e.g. 30/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Requirements text (optional)</label>
                <textarea
                  value={fulfillForm.requirements_text}
                  onChange={(e) => setFulfillForm({ ...fulfillForm, requirements_text: e.target.value })}
                  className="w-full p-2 border rounded-lg min-h-[80px]"
                  placeholder="Documentation or regulatory requirements"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleFulfillCustomRequestSubmit}
                disabled={processingCustomRequest === fulfillCustomRequestModal.id}
                className="flex-1 bg-[#215F9A] text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {processingCustomRequest === fulfillCustomRequestModal.id ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={() => {
                  setFulfillCustomRequestModal(null)
                  setFulfillForm({ mrc: '', nrc: '', currency: 'USD', moq: '1', supplier_mrc: '', supplier_nrc: '', supplier_currency: '', specification: '', bill_pulse: '', requirements_text: '' })
                  setError(null)
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents Modal for viewing uploaded documents */}
      {selectedOrderForDocs && selectedOrderForDocs.uploaded_documents && (
        <DocumentsModal
          isOpen={!!selectedOrderForDocs}
          onClose={() => setSelectedOrderForDocs(null)}
          uploadedDocuments={selectedOrderForDocs.uploaded_documents}
          orderId={selectedOrderForDocs.id}
          customerName={selectedOrderForDocs.customer_name}
          isAdmin={true}
        />
      )}
    </main>
  )
}
