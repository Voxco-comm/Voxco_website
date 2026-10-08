'use client'

import React, { useState, ChangeEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BackButton from './BackButton'
import DualScrollbar from './ui/DualScrollbar'
import { formatDecimal } from '@/lib/utils/formatNumber'
import { getCountryFlagEmoji } from '@/lib/utils/countryFlag'
import { DetailCaption, DetailPill, RateList, RateRow, detailIconFor } from './ui/NumberDetails'
import {
  Globe,
  MessageSquare,
  ArrowLeftRight,
  RotateCcw,
  Sparkles,
  Receipt,
  ClipboardList,
  ListChecks,
  Loader2,
  X,
  AlertTriangle,
  ArrowRight,
  Info,
  SearchX,
  ChevronDown,
  Check,
  CheckCircle2,
  XCircle,
  User,
  Building2,
  Hash,
  Minus,
  Plus,
  Zap,
} from 'lucide-react'

interface FormState {
  country: string
  smsVoice: string
  inboundOutbound: string
}

interface AvailableNumber {
  id: string
  available_numbers: number
  number_type: string
  sms_capability: string
  direction: string
  mrc: number
  nrc: number
  currency: string
  moq: number
  country_name: string
  country_code: string
  country_id: string
  is_available: boolean
  is_reserved: boolean
  supplier?: string
  specification?: string
  bill_pulse?: string
  requirements_text?: string
  other_charges?: any
  features?: any
}

interface QuantityState {
  [key: string]: string  // Store as string to preserve empty state
}

interface QuantityErrorState {
  [key: string]: string | null
}

interface ModalState {
  [key: string]: {
    open: boolean
    data: any
    type: string
  }
}

// Presentation-only helpers below (badges, shared control styling). None of
// these read or write component state, fetch data, or alter any value —
// they only decide how existing data is displayed. The country flag helper
// itself lives in @/lib/utils/countryFlag so it stays identical across
// Numbers, My Orders, and Complete Your Order.

const BADGE_CLASS =
  'inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600'

const DETAIL_BUTTON_CLASS =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-[#215F9A]/40 hover:bg-[#215F9A]/5 hover:text-[#215F9A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A]/30'

const SELECT_CLASS =
  'w-full appearance-none rounded-lg border border-slate-300 bg-white py-3.5 pl-11 pr-10 text-[15px] text-slate-900 shadow-sm transition-colors hover:border-slate-400 focus:border-[#215F9A] focus:outline-none focus:ring-2 focus:ring-[#215F9A]/20 disabled:cursor-not-allowed disabled:opacity-60'

// Purely presentational wrapper: forwards every prop straight to a native
// <select>, only adding a leading icon and custom chevron around it.
function IconSelect({
  icon: Icon,
  children,
  ...selectProps
}: { icon: React.ComponentType<{ className?: string }> } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
      <select {...selectProps} className={SELECT_CLASS}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
    </div>
  )
}

// Shared chrome for the three detail modals (Other Charges / Requirements / Features):
// backdrop, panel, header (icon + title + optional subtitle + close), scrollable body,
// and an optional compact footer. Every prop below is passed in by the caller — this
// component holds no state and calls nothing but the `onClose` callback it is given,
// so modal open/close behavior is entirely controlled by the caller (renderModal).
function ModalShell({
  icon: Icon,
  title,
  subtitle,
  onClose,
  widthClassName,
  footer,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: React.ReactNode
  onClose: () => void
  widthClassName: string
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px] motion-safe:animate-[fadeIn_150ms_ease-out] sm:p-6"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[min(88vh,100dvh)] w-full ${widthClassName} flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 motion-safe:animate-[scaleIn_150ms_ease-out]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#215F9A]/10 text-[#215F9A]">
              <Icon className="h-[19px] w-[19px]" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-slate-900 sm:text-[17px]">{title}</h3>
              {subtitle}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A]/30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="scroll-smooth overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end border-t border-slate-100 px-5 py-3 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Numbers() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState<FormState>({
    country: '',
    smsVoice: '',
    inboundOutbound: '',
  })
  const [countries, setCountries] = useState<Array<{ id: string; name: string; country_code: string }>>([])
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([])
  const [quantities, setQuantities] = useState<QuantityState>({})
  const [quantityErrors, setQuantityErrors] = useState<QuantityErrorState>({})
  const [quantityWarnings, setQuantityWarnings] = useState<QuantityErrorState>({})
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [countriesError, setCountriesError] = useState<string | null>(null)
  const [modals, setModals] = useState<ModalState>({})
  const [loadingRequirements, setLoadingRequirements] = useState<{ [key: string]: boolean }>({})
  const [countryRequirements, setCountryRequirements] = useState<{ [key: string]: any }>({})
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)
  const [showCustomRequestModal, setShowCustomRequestModal] = useState(false)
  const [customRequestForm, setCustomRequestForm] = useState({
    country_id: '',
    number_type: 'Geographic' as 'Geographic' | 'National' | 'Local' | 'Mobile' | 'Toll-Free' | 'Non-Geographic' | '2WV',
    sms_capability: 'Both' as 'SMS only' | 'Voice only' | 'Both',
    direction: 'Both' as 'Inbound only' | 'Outbound only' | 'Both',
  })
  const [customRequestError, setCustomRequestError] = useState<string | null>(null)
  const [customRequestSuccess, setCustomRequestSuccess] = useState<string | null>(null)
  const [submittingCustomRequest, setSubmittingCustomRequest] = useState(false)
  const [showMoqWarningModal, setShowMoqWarningModal] = useState(false)
  const [moqWarningMoq, setMoqWarningMoq] = useState<number>(1)
  const [pendingBelowMoqOrder, setPendingBelowMoqOrder] = useState<{
    numberId: string
    quantity: number
  } | null>(null)
  const [showCustomOrderStepsModal, setShowCustomOrderStepsModal] = useState(false)

  useEffect(() => {
    loadCountries()
    // Load all numbers on mount (before any filter is applied)
    loadAllNumbers()
  }, [])

  // Show steps explanation by default when custom order modal opens
  useEffect(() => {
    if (showCustomRequestModal) {
      setShowCustomOrderStepsModal(true)
    }
  }, [showCustomRequestModal])

  // Auto-filter when form values change
  useEffect(() => {
    if (availableNumbers.length > 0 || searched) {
      applyFilters()
    }
  }, [form.country, form.smsVoice, form.inboundOutbound])

  const [allLoadedNumbers, setAllLoadedNumbers] = useState<AvailableNumber[]>([])

  const loadAllNumbers = async () => {
    setLoading(true)
    setSearched(true)

    try {
      // Load all available numbers without filters
      const { data: searchData, error: searchError } = await supabase.rpc('search_numbers', {
        p_country_id: null,
        p_number_type: null,
        p_sms_capability: null,
        p_direction: null,
        p_limit: 500,
        p_offset: 0,
      })

      if (searchError) throw searchError

      if (searchData && searchData.length > 0) {
        const numberIds = searchData.map((n: any) => n.id)
        const { data: fullData, error: fullError } = await supabase
          .from('numbers')
          .select('id, other_charges, features, country_id')
          .in('id', numberIds)

        if (!fullError && fullData) {
          const merged = searchData.map((num: any) => {
            const full = fullData.find((f: any) => f.id === num.id)
            return {
              ...num,
              country_id: full?.country_id || '',
              other_charges: full?.other_charges || {},
              features: full?.features || {},
            }
          })
          // Sort by country name alphabetically
          merged.sort((a: AvailableNumber, b: AvailableNumber) =>
            a.country_name.localeCompare(b.country_name)
          )
          setAllLoadedNumbers(merged)
          setAvailableNumbers(merged)
        } else {
          const sorted = [...searchData].sort((a: AvailableNumber, b: AvailableNumber) =>
            a.country_name.localeCompare(b.country_name)
          )
          setAllLoadedNumbers(sorted)
          setAvailableNumbers(sorted)
        }
      } else {
        setAllLoadedNumbers([])
        setAvailableNumbers([])
      }
    } catch (err: any) {
      console.error('Error loading numbers:', err)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...allLoadedNumbers]

    // Filter by country
    if (form.country) {
      filtered = filtered.filter(num => num.country_id === form.country)
    }

    // Filter by SMS/Voice capability: "only" means exclusive (exclude "Both")
    if (form.smsVoice) {
      filtered = filtered.filter(num => num.sms_capability === form.smsVoice)
    }

    // Filter by Inbound/Outbound: "only" means exclusive (exclude "Both")
    if (form.inboundOutbound) {
      filtered = filtered.filter(num => num.direction === form.inboundOutbound)
    }

    setAvailableNumbers(filtered)
  }

  const loadCountries = async () => {
    try {
      setCountriesError(null)

      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('countries')
        .select('id, name, country_code')
        .order('name')

      if (error) {
        console.error('Supabase error loading countries:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        setCountriesError(error.message || 'Failed to load countries')
        throw error
      }

      console.log('Countries loaded successfully:', data?.length || 0)
      setCountries(data || [])
    } catch (err: any) {
      const errorMessage = err?.message || err?.error?.message || 'Unknown error loading countries'
      console.error('Error loading countries:', {
        message: errorMessage,
        error: err,
        stack: err?.stack
      })
      setCountriesError(errorMessage)
    }
  }

  const onSearch = async () => {
    setLoading(true)
    setSearched(true)
    setAvailableNumbers([])
    setQuantities({})

    try {
      // Map form values to database values
      const smsCapabilityMap: Record<string, string> = {
        'SMS only': 'SMS only',
        'Voice only': 'Voice only',
        'Both': 'Both',
      }

      const directionMap: Record<string, string> = {
        'Inbound only': 'Inbound only',
        'Outbound only': 'Outbound only',
        'Both': 'Both',
      }

      // Build search parameters - all filters are optional
      const searchParams: any = {
        p_country_id: form.country && form.country !== '' ? form.country : null,
        p_number_type: null,
        p_sms_capability: form.smsVoice && form.smsVoice !== '' ? smsCapabilityMap[form.smsVoice] : null,
        p_direction: form.inboundOutbound && form.inboundOutbound !== '' ? directionMap[form.inboundOutbound] : null,
        p_limit: 100,
        p_offset: 0,
      }

      // First get the basic search results
      const { data: searchData, error: searchError } = await supabase.rpc('search_numbers', searchParams)

      if (searchError) throw searchError

      // Now fetch full details including other_charges and features
      if (searchData && searchData.length > 0) {
        const numberIds = searchData.map((n: any) => n.id)
        const { data: fullData, error: fullError } = await supabase
          .from('numbers')
          .select('id, other_charges, features, country_id')
          .in('id', numberIds)

        if (!fullError && fullData) {
          // Merge the data
          const merged = searchData.map((num: any) => {
            const full = fullData.find((f: any) => f.id === num.id)
            return {
              ...num,
              country_id: full?.country_id || form.country,
              other_charges: full?.other_charges || {},
              features: full?.features || {},
            }
          })
          setAvailableNumbers(merged)
        } else {
          setAvailableNumbers(searchData || [])
        }
      } else {
        setAvailableNumbers([])
      }
    } catch (err: any) {
      console.error('Error searching numbers:', err)
      alert('Error searching numbers: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCountryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, country: e.target.value })
    // Filters now apply automatically via useEffect
  }

  const handleSmsVoiceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, smsVoice: e.target.value })
    // Filters now apply automatically via useEffect
  }

  const handleInboundOutboundChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, inboundOutbound: e.target.value })
    // Filters now apply automatically via useEffect
  }

  const handleResetFilters = () => {
    setForm({ country: '', smsVoice: '', inboundOutbound: '' })
    setAvailableNumbers(allLoadedNumbers)
    setQuantities({})
    setQuantityWarnings({})
  }

  const handleQuantityChange = (numberId: string, value: string, moq: number) => {
    // Store the raw string value to preserve empty state
    setQuantities({ ...quantities, [numberId]: value })

    // Validate
    if (value === '') {
      setQuantityErrors({ ...quantityErrors, [numberId]: 'Quantity is required' })
      setQuantityWarnings({ ...quantityWarnings, [numberId]: null })
      return
    }

    const qty = parseInt(value)
    if (isNaN(qty) || qty < 0) {
      setQuantityErrors({ ...quantityErrors, [numberId]: 'Invalid quantity' })
      setQuantityWarnings({ ...quantityWarnings, [numberId]: null })
    } else if (qty > 0 && qty < moq) {
      setQuantityErrors({ ...quantityErrors, [numberId]: null })
      setQuantityWarnings({
        ...quantityWarnings,
        [numberId]: `Below MOQ (${moq}) — admin review required before approval`,
      })
    } else {
      setQuantityErrors({ ...quantityErrors, [numberId]: null })
      setQuantityWarnings({ ...quantityWarnings, [numberId]: null })
    }
  }

  const hasQuantityError = (numberId: string): boolean => {
    return !!quantityErrors[numberId]
  }

  const openModal = async (numberId: string, type: string, data: any) => {
    setModals({
      ...modals,
      [numberId]: {
        open: true,
        data,
        type,
      },
    })

    // If requirements modal, fetch requirements using combination of country + number type + direction + sms capability
    if (type === 'requirements' && data.country_id) {
      await fetchRequirements({
        countryId: data.country_id,
        countryName: data.country_name,
        countryCode: data.country_code,
        numberType: data.number_type,
        direction: data.direction,
        smsCapability: data.sms_capability,
      })
    }
  }

  const fetchRequirements = async (params: {
    countryId: string
    countryName: string
    countryCode: string
    numberType: string
    direction: string
    smsCapability: string
  }) => {
    const { countryId, countryName, countryCode, numberType, direction, smsCapability } = params

    // Create a unique cache key based on the combination
    const cacheKey = `${countryId}_${numberType}_${direction}_${smsCapability}`

    // Check if we already have requirements cached for this combination
    if (countryRequirements[cacheKey]) {
      return
    }

    setLoadingRequirements({ ...loadingRequirements, [cacheKey]: true })

    try {
      // Fetch requirements from API - it handles DB caching internally
      const response = await fetch('/api/country-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryName,
          countryCode,
          countryId,
          numberType,
          direction,
          smsCapability,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch requirements')
      }

      const { requirements } = await response.json()

      // Cache the requirements using combination key
      setCountryRequirements({
        ...countryRequirements,
        [cacheKey]: requirements,
      })
    } catch (err: any) {
      console.error('Error fetching requirements:', err)
    } finally {
      setLoadingRequirements({ ...loadingRequirements, [cacheKey]: false })
    }
  }

  const closeModal = (numberId: string) => {
    setModals({
      ...modals,
      [numberId]: {
        open: false,
        data: null,
        type: '',
      },
    })
  }

  const handleSubmitCustomRequest = async () => {
    setCustomRequestError(null)
    setCustomRequestSuccess(null)
    if (!customRequestForm.country_id) {
      setCustomRequestError('Country is required.')
      return
    }
    setSubmittingCustomRequest(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setCustomRequestError('Please sign in to submit a request.')
        setSubmittingCustomRequest(false)
        return
      }
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (customerError || !customer) {
        setCustomRequestError('Customer record not found. Please complete your profile.')
        setSubmittingCustomRequest(false)
        return
      }
      const { error } = await supabase
        .from('custom_number_requests')
        .insert({
          customer_id: customer.id,
          country_id: customRequestForm.country_id,
          number_type: customRequestForm.number_type,
          sms_capability: customRequestForm.sms_capability,
          direction: customRequestForm.direction,
          mrc: 0,
          nrc: 0,
          currency: 'USD',
          moq: 1,
          specification: null,
          bill_pulse: null,
          requirements_text: null,
          other_charges: {},
          features: {},
        })
      if (error) throw error
      setCustomRequestSuccess('Your custom number request has been submitted. We will review it shortly.')
      setShowCustomRequestModal(false)
      setCustomRequestForm({
        country_id: '',
        number_type: 'Geographic',
        sms_capability: 'Both',
        direction: 'Both',
      })
    } catch (err: any) {
      setCustomRequestError(err.message || 'Failed to submit request.')
    } finally {
      setSubmittingCustomRequest(false)
    }
  }

  const proceedToOrder = async (
    number: AvailableNumber,
    quantity: number,
    belowMoq: boolean
  ) => {
    setProcessingOrderId(number.id)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please sign in to place an order')
        router.push('/sign-in')
        return
      }

      const params = new URLSearchParams({
        numberId: number.id,
        quantity: quantity.toString(),
        countryName: number.country_name,
        countryCode: number.country_code,
        countryId: number.country_id,
        numberType: number.number_type,
        smsCapability: number.sms_capability,
        direction: number.direction,
        mrc: number.mrc.toString(),
        nrc: number.nrc.toString(),
        currency: number.currency,
        moq: number.moq.toString(),
      })
      if (belowMoq) {
        params.set('belowMoq', 'true')
      }

      router.push(`/order?${params.toString()}`)
    } catch (err: any) {
      console.error('Error:', err)
      alert('An error occurred. Please try again.')
    } finally {
      setProcessingOrderId(null)
    }
  }

  const handleOrder = async (numberId: string, quantity: number) => {
    const number = availableNumbers.find(n => n.id === numberId)
    if (!number) {
      alert('Number not found')
      return
    }

    const moq = number.moq || 1

    if (quantity < moq) {
      setPendingBelowMoqOrder({ numberId, quantity })
      setMoqWarningMoq(moq)
      setShowMoqWarningModal(true)
      return
    }

    await proceedToOrder(number, quantity, false)
  }

  const handleConfirmBelowMoqOrder = async () => {
    if (!pendingBelowMoqOrder) return
    const number = availableNumbers.find(n => n.id === pendingBelowMoqOrder.numberId)
    if (!number) {
      alert('Number not found')
      return
    }

    setShowMoqWarningModal(false)
    const { quantity } = pendingBelowMoqOrder
    setPendingBelowMoqOrder(null)
    await proceedToOrder(number, quantity, true)
  }

  const renderModal = (numberId: string, modal: { open: boolean; data: any; type: string }) => {
    if (!modal.open) return null

    const ModalIcon = modal.type === 'other_charges' ? Receipt : modal.type === 'requirements' ? ClipboardList : ListChecks
    const flag = getCountryFlagEmoji(modal.data?.country_code)
    // Compact flag+country line shown under the title for other_charges/features.
    // Requirements renders its own richer context strip inside the body instead
    // (see below), so it's skipped here to avoid showing the same info twice.
    const headerSubtitle =
      modal.type !== 'requirements' && modal.data?.country_name ? (
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {flag && <span aria-hidden="true" className="mr-1">{flag}</span>}
          {modal.data.country_name} ({modal.data.country_code}) · {modal.data.number_type}
        </p>
      ) : undefined

    // Every close affordance in this modal (X, backdrop click, footer button) calls
    // this one unchanged handler — none of them do anything else.
    const handleClose = () => closeModal(numberId)

    const footer = (
      <button
        onClick={handleClose}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A]/30"
      >
        Close
      </button>
    )

    let title = ''
    let widthClassName = 'max-w-xl'
    let content: any = null

    switch (modal.type) {
      case 'other_charges': {
        title = 'Other Charges'
        widthClassName = 'max-w-xl'
        const chargeEntries = modal.data.other_charges ? Object.entries(modal.data.other_charges) : []

        content = chargeEntries.length > 0 ? (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <DetailCaption>Pricing breakdown</DetailCaption>
              {modal.data.currency && <DetailPill tone="customer">{modal.data.currency}</DetailPill>}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <RateList>
                {chargeEntries.map(([key, value]: [string, any], idx: number) => {
                  const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                  let unit = ''
                  if (key.includes('call') || key.includes('voice')) unit = 'Per minute'
                  else if (key.includes('sms')) unit = 'Per SMS'
                  else if (key.includes('fee')) unit = 'One-time'

                  return (
                    <RateRow
                      key={`other-charge-${key}-${idx}`}
                      icon={detailIconFor(key)}
                      label={<span className="font-medium text-slate-800">{formattedKey}</span>}
                      sublabel={unit || undefined}
                      value={
                        <span className="whitespace-nowrap text-[15px]">
                          {modal.data.currency} {typeof value === 'number' ? formatDecimal(value) : 0}
                        </span>
                      }
                    />
                  )
                })}
              </RateList>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Receipt className="h-5 w-5" />
            </div>
            <p className="max-w-xs text-sm text-slate-500">No additional charges apply for this number.</p>
          </div>
        )
        break
      }
      case 'requirements': {
        title = 'Requirements'
        widthClassName = 'max-w-3xl'
        // Use combination key for cache lookup
        const reqCacheKey = `${modal.data.country_id}_${modal.data.number_type}_${modal.data.direction}_${modal.data.sms_capability}`
        const isLoading = loadingRequirements[reqCacheKey]
        const requirements = countryRequirements[reqCacheKey]

        const docList = (docs: string[] | undefined) => (
          <ul className="space-y-1.5">
            {docs?.map((doc: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        )

        const sectionHeading = (num: string, label: string) => (
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#215F9A]/10 text-[10px] font-bold text-[#215F9A]">
              {num}
            </span>
            <h4 className="text-sm font-semibold text-slate-900">{label}</h4>
          </div>
        )

        content = (
          <div>
            {/* Compact context strip: the exact combination these requirements apply to */}
            <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-5">
              {modal.data.country_name && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  {flag && <span aria-hidden="true">{flag}</span>}
                  {modal.data.country_name}
                </span>
              )}
              <span className={BADGE_CLASS}>{modal.data.number_type}</span>
              <span className={BADGE_CLASS}>{modal.data.direction}</span>
              <span className={BADGE_CLASS}>{modal.data.sms_capability}</span>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#215F9A]/10">
                  <Loader2 className="h-5 w-5 animate-spin text-[#215F9A]" />
                </div>
                <span className="text-sm font-medium text-slate-600">Loading requirements…</span>
              </div>
            ) : requirements ? (
              <div className="space-y-7">
                <div>
                  {sectionHeading('01', 'Number Allocation')}
                  <div className="ml-3 space-y-5 border-l-2 border-slate-100 pl-5">
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <User className="h-3.5 w-3.5" />
                        Individual documentation
                      </p>
                      {docList(requirements.number_allocation?.end_user_documentation?.individual)}
                    </div>
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Building2 className="h-3.5 w-3.5" />
                        Business documentation
                      </p>
                      {docList(requirements.number_allocation?.end_user_documentation?.business)}
                    </div>
                    {requirements.number_allocation?.address_requirements && (
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Address requirement</p>
                        <p className="text-sm text-slate-600">{requirements.number_allocation.address_requirements}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-7">
                  {sectionHeading('02', 'Sub-Allocation')}
                  <div className="ml-3 space-y-3 border-l-2 border-slate-100 pl-5">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                      <span className="text-sm font-medium text-slate-700">Status</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${requirements.sub_allocation?.allowed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {requirements.sub_allocation?.allowed ? 'Allowed' : 'Not allowed'}
                      </span>
                    </div>
                    {requirements.sub_allocation?.rules && (
                      <p className="text-sm text-slate-600">{requirements.sub_allocation.rules}</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-7">
                  {sectionHeading('03', 'Number Porting')}
                  <div className="ml-3 space-y-5 border-l-2 border-slate-100 pl-5">
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <User className="h-3.5 w-3.5" />
                        Individual documentation
                      </p>
                      {docList(requirements.number_porting?.end_user_documentation?.individual)}
                    </div>
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Building2 className="h-3.5 w-3.5" />
                        Business documentation
                      </p>
                      {docList(requirements.number_porting?.end_user_documentation?.business)}
                    </div>
                    {requirements.number_porting?.process_notes && (
                      <div className="flex gap-2 rounded-lg bg-slate-50 px-3.5 py-3 text-sm text-slate-600">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <p>{requirements.number_porting.process_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-slate-500">Failed to load requirements. Please try again.</p>
            )}
          </div>
        )
        break
      }
      case 'features': {
        title = 'Features'
        // Voice and SMS are represented by the dedicated columns, not features.
        const featureEntries = Object.entries(modal.data.features || {}).filter(
          ([key]) => key !== 'voice' && key !== 'sms'
        )
        widthClassName = featureEntries.length <= 1 ? 'max-w-sm' : featureEntries.length <= 4 ? 'max-w-lg' : 'max-w-2xl'

        content = featureEntries.length > 0 ? (
          <div>
            <div className="mb-3">
              <DetailCaption>Available capabilities</DetailCaption>
            </div>
            <div className={featureEntries.length <= 1 ? 'grid grid-cols-1 gap-2.5' : 'grid grid-cols-1 gap-2.5 sm:grid-cols-2'}>
              {featureEntries.map(([key, value]: [string, any], idx: number) => {
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                const isBoolean = typeof value === 'boolean'
                const supported = isBoolean ? value : true
                const FeatureIcon = detailIconFor(key)
                return (
                  <div
                    key={`feature-${key}-${idx}`}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors ${supported ? 'border-slate-200 bg-white hover:border-[#215F9A]/30 hover:bg-[#215F9A]/[0.03]' : 'border-slate-100 bg-slate-50/60 shadow-none'}`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${supported ? 'bg-[#215F9A]/10 text-[#215F9A] ring-[#215F9A]/15' : 'bg-slate-100 text-slate-400 ring-slate-200/70'}`}>
                      <FeatureIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${supported ? 'text-slate-900' : 'text-slate-500'}`}>{label}</p>
                      {isBoolean ? (
                        <p className={`text-xs font-medium ${value ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {value ? 'Supported' : 'Not supported'}
                        </p>
                      ) : (
                        <p className="break-words text-xs font-semibold text-[#1C4F80]">{value}</p>
                      )}
                    </div>
                    {isBoolean && (
                      value ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-slate-300" />
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Zap className="h-5 w-5" />
            </div>
            <p className="max-w-xs text-sm text-slate-500">Standard features included.</p>
          </div>
        )
        break
      }
    }

    return (
      <ModalShell
        icon={ModalIcon}
        title={title}
        subtitle={headerSubtitle}
        onClose={handleClose}
        widthClassName={widthClassName}
        footer={footer}
      >
        {content}
      </ModalShell>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-6 sm:px-6 lg:px-10 xl:px-12">
      <div className="mx-auto max-w-[1600px]">
        <BackButton href="/" label="Back to Dashboard" />

        {/* Page header */}
        <div className="mb-6 flex flex-col gap-1 sm:mb-7">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F97316]" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#215F9A]">
              Voxco Number Portal
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
            Number Search &amp; Ordering
          </h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Browse available numbers below. Use the filters to narrow down your search.
          </p>
        </div>

        {/* Error Message */}
        {countriesError && (
          <div className="mb-6 max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <p className="text-sm font-semibold">Error loading countries</p>
            <p className="mt-0.5 text-sm">{countriesError}</p>
            <button
              onClick={loadCountries}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Number inventory workspace — filters and results share one continuous surface
            instead of two separate boxes, so it reads as a single tool rather than a
            search form stacked on top of a results panel. */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Utility row: identity + live result count */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-900">Available numbers</h2>
              <span className="inline-flex items-center rounded-full bg-[#215F9A]/10 px-2.5 py-0.5 text-xs font-semibold text-[#215F9A]">
                {availableNumbers.length}
              </span>
            </div>
            {(form.country || form.smsVoice || form.inboundOutbound) && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-[#215F9A]" />
                {[form.country, form.smsVoice, form.inboundOutbound].filter(Boolean).length} filter{[form.country, form.smsVoice, form.inboundOutbound].filter(Boolean).length > 1 ? 's' : ''} applied
              </span>
            )}
          </div>

          {/* Filter row — the three dropdowns fill most of the row; secondary actions
              get a fixed, comfortably-sized column of their own on the right. */}
          <div className="flex flex-col gap-5 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-end lg:gap-8">
            <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-3">
              {/* Country */}
              <div>
                <label htmlFor="filter-country" className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
                  Country
                </label>
                <IconSelect
                  id="filter-country"
                  icon={Globe}
                  value={form.country}
                  onChange={handleCountryChange}
                >
                  <option value="">All countries</option>
                  {countries.map((c) => {
                    const flag = getCountryFlagEmoji(c.country_code)
                    return (
                      <option key={c.id} value={c.id}>
                        {flag ? `${flag} ` : ''}{c.name} ({c.country_code})
                      </option>
                    )
                  })}
                </IconSelect>
              </div>

              {/* SMS/Voice */}
              <div>
                <label htmlFor="filter-smsvoice" className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
                  SMS / Voice
                </label>
                <IconSelect
                  id="filter-smsvoice"
                  icon={MessageSquare}
                  value={form.smsVoice}
                  onChange={handleSmsVoiceChange}
                >
                  <option value="">All types</option>
                  <option>SMS only</option>
                  <option>Voice only</option>
                  <option>Both</option>
                </IconSelect>
              </div>

              {/* Inbound/Outbound */}
              <div>
                <label htmlFor="filter-direction" className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
                  Direction
                </label>
                <IconSelect
                  id="filter-direction"
                  icon={ArrowLeftRight}
                  value={form.inboundOutbound}
                  onChange={handleInboundOutboundChange}
                >
                  <option value="">All directions</option>
                  <option>Inbound only</option>
                  <option>Outbound only</option>
                  <option>Both</option>
                </IconSelect>
              </div>
            </div>

            {/* Secondary actions: a quiet reset chip, and a small contextual tile for the
                custom-number workflow — both stay visually lighter than the blue Order CTAs. */}
            <div className="flex flex-col gap-2.5 lg:w-80 lg:shrink-0">
              <button
                onClick={handleResetFilters}
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 self-start rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-[#215F9A]/30 hover:bg-blue-50/50 hover:text-[#215F9A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustomRequestModal(true)
                  setCustomRequestError(null)
                  setCustomRequestSuccess(null)
                }}
                className="group flex items-center gap-3 rounded-xl border border-[#215F9A]/15 bg-[#215F9A]/[0.04] px-4 py-3 text-left transition-colors hover:border-[#215F9A]/30 hover:bg-[#215F9A]/[0.08]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#215F9A] shadow-sm ring-1 ring-[#215F9A]/10">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-slate-900">
                    Need a custom number?
                    <span aria-hidden="true" className="inline-block h-1 w-1 shrink-0 rounded-full bg-[#F97316]" />
                  </span>
                  <span className="block text-[11px] leading-snug text-slate-500">Can't find it on the list? Click here.</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#215F9A] transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 px-5 py-20 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#215F9A]/10">
                <Loader2 className="h-5 w-5 animate-spin text-[#215F9A]" />
              </div>
              <span className="text-sm font-medium text-slate-600">Searching for available numbers…</span>
            </div>
          ) : availableNumbers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-20 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <SearchX className="h-5 w-5" />
              </div>
              <p className="max-w-sm text-sm text-slate-500">
                No numbers found matching your criteria. Try adjusting or resetting the filters above.
              </p>
              {(form.country || form.smsVoice || form.inboundOutbound) && (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 lg:hidden">
                {availableNumbers.map((num) => {
                  const quantityStr = quantities[num.id]
                  const quantity = quantityStr !== undefined ? (quantityStr === '' ? 0 : parseInt(quantityStr) || 0) : num.moq
                  const displayValue = quantityStr !== undefined ? quantityStr : String(num.moq)
                  const flag = getCountryFlagEmoji(num.country_code)
                  return (
                    <article key={num.id} className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="flex items-center gap-1.5 text-base font-semibold text-slate-900">
                            {flag && <span aria-hidden="true" className="text-lg leading-none">{flag}</span>}
                            {num.country_name}{' '}
                            <span className="font-normal text-slate-400">({num.country_code})</span>
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <span className={BADGE_CLASS}>{num.number_type}</span>
                            <span className={BADGE_CLASS}>{num.sms_capability}</span>
                            <span className={BADGE_CLASS}>{num.direction}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-base font-semibold tabular-nums text-slate-900">
                            {num.currency} {formatDecimal(num.mrc, 2)}
                          </p>
                          <p className="text-xs text-slate-400">MRC</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>NRC: <span className="font-medium text-slate-700">{num.currency} {formatDecimal(num.nrc, 2)}</span></span>
                        <span>MOQ: <span className="font-medium text-slate-700">{num.moq}</span></span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openModal(num.id, 'other_charges', num)}
                          className="flex flex-1 min-w-[5.5rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-[#215F9A]/40 hover:bg-[#215F9A]/5 hover:text-[#215F9A]"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          Charges
                        </button>
                        <button
                          type="button"
                          onClick={() => openModal(num.id, 'requirements', num)}
                          className="flex flex-1 min-w-[5.5rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-[#215F9A]/40 hover:bg-[#215F9A]/5 hover:text-[#215F9A]"
                        >
                          <ClipboardList className="h-3.5 w-3.5" />
                          Requirements
                        </button>
                        <button
                          type="button"
                          onClick={() => openModal(num.id, 'features', num)}
                          className="flex flex-1 min-w-[5.5rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-[#215F9A]/40 hover:bg-[#215F9A]/5 hover:text-[#215F9A]"
                        >
                          <ListChecks className="h-3.5 w-3.5" />
                          Features
                        </button>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                          <label htmlFor={`qty-${num.id}`} className="mb-1 block text-xs font-medium text-slate-500">
                            Quantity
                          </label>
                          <div
                            className={`inline-flex items-center overflow-hidden rounded-lg border bg-white transition-colors focus-within:ring-2 ${quantityErrors[num.id]
                              ? 'border-red-400 focus-within:ring-red-500/20'
                              : quantityWarnings[num.id]
                                ? 'border-amber-400 focus-within:ring-amber-500/20'
                                : 'border-slate-300 focus-within:border-[#215F9A] focus-within:ring-[#215F9A]/20'
                              }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(num.id, String(Math.max(0, quantity - 1)), num.moq)}
                              aria-label={`Decrease quantity for ${num.country_name} ${num.number_type}`}
                              disabled={quantity <= 0}
                              className="flex h-11 w-10 shrink-0 items-center justify-center text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              id={`qty-${num.id}`}
                              type="text"
                              inputMode="numeric"
                              value={displayValue}
                              placeholder={num.moq.toString()}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === '' || /^\d+$/.test(value)) {
                                  handleQuantityChange(num.id, value, num.moq)
                                }
                              }}
                              className="h-11 w-12 shrink-0 border-0 bg-transparent text-center text-base tabular-nums text-slate-900 focus:outline-none focus:ring-0"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(num.id, String(quantity + 1), num.moq)}
                              aria-label={`Increase quantity for ${num.country_name} ${num.number_type}`}
                              className="flex h-11 w-10 shrink-0 items-center justify-center text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          {quantityErrors[num.id] && (
                            <p className="mt-1 text-xs text-red-500">{quantityErrors[num.id]}</p>
                          )}
                          {!quantityErrors[num.id] && quantityWarnings[num.id] && (
                            <p className="mt-1 text-xs text-amber-700">{quantityWarnings[num.id]}</p>
                          )}
                        </div>
                        <div className="flex sm:items-end">
                          <button
                            type="button"
                            onClick={() => handleOrder(num.id, quantity)}
                            disabled={processingOrderId === num.id || quantity === 0}
                            className="inline-flex min-h-[44px] w-full min-w-[7.5rem] items-center justify-center gap-2 rounded-lg bg-[#215F9A] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1b4e80] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 sm:w-auto"
                          >
                            {processingOrderId === num.id ? (
                              <>
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                Order
                                <ArrowRight className="h-4 w-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
              <DualScrollbar className="hidden lg:block -mx-1 px-1">
                <table className="w-full min-w-[1280px] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="bg-blue-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="border-b border-slate-200 px-5 py-3.5">Country</th>
                      <th className="border-b border-slate-200 px-4 py-3.5">Type</th>
                      <th className="border-b border-slate-200 px-4 py-3.5">SMS/Voice</th>
                      <th className="border-b border-slate-200 px-4 py-3.5">Direction</th>
                      <th className="border-b border-slate-200 px-4 py-3.5 text-right">MRC</th>
                      <th className="border-b border-slate-200 px-4 py-3.5 text-right">NRC</th>
                      <th className="border-b border-slate-200 px-4 py-3.5">Currency</th>
                      <th className="border-b border-slate-200 px-3 py-3.5 text-center">MOQ</th>
                      <th className="border-b border-slate-200 px-3 py-3.5 text-center">Other Charges</th>
                      <th className="border-b border-slate-200 px-3 py-3.5 text-center">Requirements</th>
                      <th className="border-b border-slate-200 px-3 py-3.5 text-center">Features</th>
                      <th className="w-48 border-b border-slate-200 px-3 py-3.5 text-center">Quantity</th>
                      <th className="sticky right-0 z-20 w-40 border-b border-l border-slate-200 bg-blue-50/60 px-3 py-3.5 text-center">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {availableNumbers.map((num) => {
                      const quantityStr = quantities[num.id]
                      const quantity = quantityStr !== undefined ? (quantityStr === '' ? 0 : parseInt(quantityStr) || 0) : num.moq
                      const displayValue = quantityStr !== undefined ? quantityStr : String(num.moq)
                      const flag = getCountryFlagEmoji(num.country_code)
                      return (
                        <tr key={num.id} className="group transition-colors hover:bg-blue-50/40">
                          <td className="whitespace-nowrap px-5 py-3.5">
                            {flag && <span aria-hidden="true" className="mr-1.5 text-base leading-none">{flag}</span>}
                            <span className="font-medium text-slate-900">{num.country_name}</span>{' '}
                            <span className="text-slate-400">({num.country_code})</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={BADGE_CLASS}>{num.number_type}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={BADGE_CLASS}>{num.sms_capability}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={BADGE_CLASS}>{num.direction}</span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900">
                            {formatDecimal(num.mrc, 2)}
                          </td>
                          <td className="px-4 py-3.5 text-right tabular-nums text-slate-600">
                            {formatDecimal(num.nrc, 2)}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">{num.currency}</td>
                          <td className="px-3 py-3.5 text-center font-medium text-slate-700">{num.moq}</td>
                          <td className="px-3 py-3.5 text-center">
                            <button
                              onClick={() => openModal(num.id, 'other_charges', num)}
                              aria-label={`View other charges for ${num.country_name} ${num.number_type}`}
                              title="Other charges"
                              className={DETAIL_BUTTON_CLASS}
                            >
                              <Receipt className="h-4 w-4" />
                            </button>
                          </td>
                          <td className="px-3 py-3.5 text-center">
                            <button
                              onClick={() => openModal(num.id, 'requirements', num)}
                              aria-label={`View requirements for ${num.country_name} ${num.number_type}`}
                              title="Requirements"
                              className={DETAIL_BUTTON_CLASS}
                            >
                              <ClipboardList className="h-4 w-4" />
                            </button>
                          </td>
                          <td className="px-3 py-3.5 text-center">
                            <button
                              onClick={() => openModal(num.id, 'features', num)}
                              aria-label={`View features for ${num.country_name} ${num.number_type}`}
                              title="Features"
                              className={DETAIL_BUTTON_CLASS}
                            >
                              <ListChecks className="h-4 w-4" />
                            </button>
                          </td>
                          <td className="w-48 px-3 py-3.5">
                            <div className="flex flex-col items-center">
                              <label htmlFor={`qty-desktop-${num.id}`} className="sr-only">
                                Quantity for {num.country_name} {num.number_type}
                              </label>
                              <div
                                className={`inline-flex items-center overflow-hidden rounded-lg border bg-white transition-colors focus-within:ring-2 ${quantityErrors[num.id]
                                  ? 'border-red-400 focus-within:ring-red-500/20'
                                  : quantityWarnings[num.id]
                                    ? 'border-amber-400 focus-within:ring-amber-500/20'
                                    : 'border-slate-300 focus-within:border-[#215F9A] focus-within:ring-[#215F9A]/20'
                                  }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(num.id, String(Math.max(0, quantity - 1)), num.moq)}
                                  aria-label={`Decrease quantity for ${num.country_name} ${num.number_type}`}
                                  disabled={quantity <= 0}
                                  className="flex h-9 w-7 shrink-0 items-center justify-center text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <input
                                  id={`qty-desktop-${num.id}`}
                                  type="text"
                                  value={displayValue}
                                  placeholder={num.moq.toString()}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    if (value === '' || /^\d+$/.test(value)) {
                                      handleQuantityChange(num.id, value, num.moq)
                                    }
                                  }}
                                  className="h-9 w-10 shrink-0 border-0 bg-transparent text-center tabular-nums text-slate-900 focus:outline-none focus:ring-0"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(num.id, String(quantity + 1), num.moq)}
                                  aria-label={`Increase quantity for ${num.country_name} ${num.number_type}`}
                                  className="flex h-9 w-7 shrink-0 items-center justify-center text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              {quantityErrors[num.id] && (
                                <span className="mt-1 text-center text-xs text-red-500">
                                  {quantityErrors[num.id]}
                                </span>
                              )}
                              {!quantityErrors[num.id] && quantityWarnings[num.id] && (
                                <span className="mt-1 block max-w-[10rem] text-center text-xs text-amber-700">
                                  {quantityWarnings[num.id]}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="sticky right-0 z-10 w-40 border-l border-slate-200 bg-white px-3 py-3.5 text-center group-hover:bg-blue-50/40">
                            <button
                              onClick={() => handleOrder(num.id, quantity)}
                              disabled={processingOrderId === num.id || quantity === 0}
                              className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#215F9A] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1b4e80] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                            >
                              {processingOrderId === num.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Processing
                                </>
                              ) : (
                                <>
                                  Order
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </DualScrollbar>
            </>
          )}
        </section>

        {/* Modals */}
        {Object.entries(modals).map(([numberId, modal]) =>
          modal.open && <div key={numberId}>{renderModal(numberId, modal)}</div>
        )}

        {/* Custom number request modal */}
        {/* MOQ warning modal */}
        {showMoqWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] motion-safe:animate-[fadeIn_150ms_ease-out]">
            <div
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 motion-safe:animate-[scaleIn_150ms_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Below minimum order quantity</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    This order will be <span className="font-semibold text-slate-900">reviewed by an administrator</span> before it is approved. Do you want to continue?
                  </p>
                </div>
              </div>
              <div className="mb-5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
                <span className="text-sm font-medium text-amber-800">Minimum order quantity</span>
                <span className="text-lg font-bold tabular-nums text-amber-900">{moqWarningMoq}</span>
              </div>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={handleConfirmBelowMoqOrder}
                  disabled={processingOrderId !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#215F9A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1b4e80] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processingOrderId ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm and continue'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoqWarningModal(false)
                    setPendingBelowMoqOrder(null)
                  }}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showCustomRequestModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] motion-safe:animate-[fadeIn_150ms_ease-out]"
            onClick={() => setShowCustomRequestModal(false)}
          >
            <div
              className="flex max-h-[min(90vh,100dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 motion-safe:animate-[scaleIn_150ms_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-slate-100 px-4 py-4 sm:px-8 sm:py-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#215F9A]/10 text-[#215F9A]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">Request a custom number</h3>
                      <p className="mt-0.5 text-sm text-slate-500">
                        Need a number that is not in our inventory? Submit your requirements and we will review your request.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomRequestModal(false)}
                    aria-label="Close"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A]/30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomOrderStepsModal(true)}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#215F9A] hover:underline focus:outline-none"
                >
                  <Info className="h-3.5 w-3.5" />
                  How it works — see steps
                </button>
              </div>
              <div className="overflow-y-auto p-4 sm:p-8">
                {/* Mini workflow stepper — decorative context only, mirrors the "how it works" steps */}
                <div className="mb-6 flex items-center gap-2 text-xs font-medium text-slate-400">
                  <span className="flex items-center gap-1.5 text-[#215F9A]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#215F9A] text-[10px] font-bold text-white">1</span>
                    Submit
                  </span>
                  <span className="h-px w-6 bg-slate-200" />
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-400">2</span>
                    Review
                  </span>
                  <span className="h-px w-6 bg-slate-200" />
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-400">3</span>
                    Response
                  </span>
                </div>
                {customRequestError && (
                  <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{customRequestError}</div>
                )}
                {customRequestSuccess && (
                  <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{customRequestSuccess}</div>
                )}
                <section className="mb-6">
                  <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Your requirements</h4>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="custom-country" className="mb-2 block text-sm font-medium text-slate-700">Country *</label>
                      <IconSelect
                        id="custom-country"
                        icon={Globe}
                        value={customRequestForm.country_id}
                        onChange={(e) => setCustomRequestForm({ ...customRequestForm, country_id: e.target.value })}
                        required
                      >
                        <option value="">Select country</option>
                        {countries.map((c) => {
                          const flag = getCountryFlagEmoji(c.country_code)
                          return (
                            <option key={c.id} value={c.id}>{flag ? `${flag} ` : ''}{c.name} ({c.country_code})</option>
                          )
                        })}
                      </IconSelect>
                    </div>
                    <div>
                      <label htmlFor="custom-number-type" className="mb-2 block text-sm font-medium text-slate-700">Number type *</label>
                      <IconSelect
                        id="custom-number-type"
                        icon={Hash}
                        value={customRequestForm.number_type}
                        onChange={(e) => setCustomRequestForm({ ...customRequestForm, number_type: e.target.value as 'Geographic' | 'National' | 'Local' | 'Mobile' | 'Toll-Free' | 'Non-Geographic' | '2WV' })}
                      >
                        <option value="Geographic">Geographic</option>
                        <option value="National">National</option>
                        <option value="Local">Local</option>
                        <option value="Mobile">Mobile</option>
                        <option value="Toll-Free">Toll-Free</option>
                        <option value="Non-Geographic">Non-Geographic</option>
                        <option value="2WV">2WV</option>
                      </IconSelect>
                    </div>
                    <div>
                      <label htmlFor="custom-sms-voice" className="mb-2 block text-sm font-medium text-slate-700">SMS/Voice *</label>
                      <IconSelect
                        id="custom-sms-voice"
                        icon={MessageSquare}
                        value={customRequestForm.sms_capability}
                        onChange={(e) => setCustomRequestForm({ ...customRequestForm, sms_capability: e.target.value as 'SMS only' | 'Voice only' | 'Both' })}
                      >
                        <option value="SMS only">SMS only</option>
                        <option value="Voice only">Voice only</option>
                        <option value="Both">Both</option>
                      </IconSelect>
                    </div>
                    <div>
                      <label htmlFor="custom-direction" className="mb-2 block text-sm font-medium text-slate-700">Direction *</label>
                      <IconSelect
                        id="custom-direction"
                        icon={ArrowLeftRight}
                        value={customRequestForm.direction}
                        onChange={(e) => setCustomRequestForm({ ...customRequestForm, direction: e.target.value as 'Inbound only' | 'Outbound only' | 'Both' })}
                      >
                        <option value="Inbound only">Inbound only</option>
                        <option value="Outbound only">Outbound only</option>
                        <option value="Both">Both</option>
                      </IconSelect>
                    </div>
                  </div>
                </section>
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:gap-4 sm:px-8 sm:py-6">
                <button
                  onClick={handleSubmitCustomRequest}
                  disabled={submittingCustomRequest}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#215F9A] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a4d7a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submittingCustomRequest ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit request'
                  )}
                </button>
                <button
                  onClick={() => setShowCustomRequestModal(false)}
                  className="min-h-[44px] flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom order steps pop-up */}
        {showCustomOrderStepsModal && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] motion-safe:animate-[fadeIn_150ms_ease-out]"
            onClick={() => setShowCustomOrderStepsModal(false)}
          >
            <div
              className="max-h-[min(90vh,100dvh)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-black/5 motion-safe:animate-[scaleIn_150ms_ease-out] sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3 sm:mb-6">
                <h4 className="text-lg font-bold text-slate-900 sm:text-xl">Custom order — how it works</h4>
                <button
                  type="button"
                  onClick={() => setShowCustomOrderStepsModal(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A]/30"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="space-y-5 text-slate-700">
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#215F9A]/10 text-sm font-semibold text-[#215F9A]">1</span>
                  <div>
                    <span className="font-medium text-slate-900">Submit your request</span>
                    <p className="mt-0.5 text-sm text-slate-600">Tell us the country, number type, and capabilities you need.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#215F9A]/10 text-sm font-semibold text-[#215F9A]">2</span>
                  <div>
                    <span className="font-medium text-slate-900">We review</span>
                    <p className="mt-0.5 text-sm text-slate-600">Our team checks availability and will get back to you.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#215F9A]/10 text-sm font-semibold text-[#215F9A]">3</span>
                  <div>
                    <span className="font-medium text-slate-900">Numbers added or we respond</span>
                    <p className="mt-0.5 text-sm text-slate-600">If we can fulfill your request, we add numbers to inventory and notify you. Otherwise we will contact you with next steps.</p>
                  </div>
                </li>
              </ol>
              <button
                onClick={() => setShowCustomOrderStepsModal(false)}
                className="mt-6 w-full rounded-xl bg-[#215F9A] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a4d7a]"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
