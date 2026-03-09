'use client'

import React, { useState, ChangeEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BackButton from './BackButton'
import { formatDecimal } from '@/lib/utils/formatNumber'

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
    number_type: 'Geographic' as 'Geographic' | 'Mobile' | 'Toll-Free' | 'Non-Geographic' | '2WV',
    sms_capability: 'Both' as 'SMS only' | 'Voice only' | 'Both',
    direction: 'Both' as 'Inbound only' | 'Outbound only' | 'Both',
  })
  const [customRequestError, setCustomRequestError] = useState<string | null>(null)
  const [customRequestSuccess, setCustomRequestSuccess] = useState<string | null>(null)
  const [submittingCustomRequest, setSubmittingCustomRequest] = useState(false)
  const [showMoqWarningModal, setShowMoqWarningModal] = useState(false)
  const [moqWarningMoq, setMoqWarningMoq] = useState<number>(1)
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
  }

  const handleQuantityChange = (numberId: string, value: string, moq: number) => {
    // Store the raw string value to preserve empty state
    setQuantities({ ...quantities, [numberId]: value })

    // Validate
    if (value === '') {
      setQuantityErrors({ ...quantityErrors, [numberId]: 'Quantity is required' })
      return
    }

    const qty = parseInt(value)
    if (isNaN(qty) || qty < 0) {
      setQuantityErrors({ ...quantityErrors, [numberId]: 'Invalid quantity' })
    } else if (qty < moq) {
      setQuantityErrors({ ...quantityErrors, [numberId]: `Minimum order quantity is ${moq}` })
    } else {
      setQuantityErrors({ ...quantityErrors, [numberId]: null })
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

  const handleOrder = async (numberId: string, quantity: number) => {
    // Find the number to get its details
    const number = availableNumbers.find(n => n.id === numberId)
    if (!number) {
      alert('Number not found')
      return
    }

    const moq = number.moq || 1

    // Strictly prevent ordering below MOQ - show warning modal
    if (quantity < moq) {
      setMoqWarningMoq(moq)
      setShowMoqWarningModal(true)
      return
    }

    setProcessingOrderId(numberId)

    try {
      // Check if user is signed in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please sign in to place an order')
        router.push('/sign-in')
        return
      }

      // Build URL params for requirements upload page
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

      // Redirect to requirements upload page
      router.push(`/order?${params.toString()}`)
    } catch (err: any) {
      console.error('Error:', err)
      alert('An error occurred. Please try again.')
    } finally {
      setProcessingOrderId(null)
    }
  }

  const renderModal = (numberId: string, modal: { open: boolean; data: any; type: string }) => {
    if (!modal.open) return null

    let title = ''
    let content: any = null

    switch (modal.type) {
      case 'other_charges':
        title = 'Other Charges'
        content = (
          <div>
            {modal.data.other_charges && Object.keys(modal.data.other_charges).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#215F9A] text-white text-sm">
                      <th className="p-3 text-left">Charge Type</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-left">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(modal.data.other_charges).map(([key, value]: [string, any], idx: number) => {
                      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                      let unit = ''
                      if (key.includes('call') || key.includes('voice')) unit = '/min'
                      else if (key.includes('sms')) unit = '/msg'
                      else if (key.includes('fee')) unit = 'one-time'

                      return (
                        <tr key={`other-charge-${key}-${idx}`} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm">{formattedKey}</td>
                          <td className="p-3 text-right text-sm font-medium">
                            {modal.data.currency} {typeof value === 'number' ? formatDecimal(value) : value}
                          </td>
                          <td className="p-3 text-sm text-gray-600">{unit}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600">No additional charges apply.</p>
            )}
          </div>
        )
        break
      case 'requirements':
        title = `Requirements - ${modal.data.country_name}`
        // Use combination key for cache lookup
        const reqCacheKey = `${modal.data.country_id}_${modal.data.number_type}_${modal.data.direction}_${modal.data.sms_capability}`
        const isLoading = loadingRequirements[reqCacheKey]
        const requirements = countryRequirements[reqCacheKey]

        content = (
          <div>
            {/* Show the specific combination these requirements apply to */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
              <p className="text-gray-700">
                <strong>Number Type:</strong> {modal.data.number_type} |
                <strong> Direction:</strong> {modal.data.direction} |
                <strong> SMS/Voice:</strong> {modal.data.sms_capability}
              </p>
            </div>
            {isLoading ? (
              <div className="text-center py-4">
                <div className="text-gray-600">Loading requirements...</div>
              </div>
            ) : requirements ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div>
                  <h4 className="font-semibold mb-2">Number Allocation</h4>
                  <div className="ml-4 space-y-2">
                    <div>
                      <p className="font-medium text-sm">Individual Documentation:</p>
                      <ul className="list-disc list-inside ml-2 text-sm text-gray-600">
                        {requirements.number_allocation?.end_user_documentation?.individual?.map((doc: string, idx: number) => (
                          <li key={idx}>{doc}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Business Documentation:</p>
                      <ul className="list-disc list-inside ml-2 text-sm text-gray-600">
                        {requirements.number_allocation?.end_user_documentation?.business?.map((doc: string, idx: number) => (
                          <li key={idx}>{doc}</li>
                        ))}
                      </ul>
                    </div>
                    {requirements.number_allocation?.address_requirements && (
                      <p className="text-sm text-gray-600">
                        <strong>Address Requirements:</strong> {requirements.number_allocation.address_requirements}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Sub-Allocation</h4>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">
                      <strong>Allowed:</strong> {requirements.sub_allocation?.allowed ? 'Yes' : 'No'}
                    </p>
                    {requirements.sub_allocation?.rules && (
                      <p className="text-sm text-gray-600 mt-1">{requirements.sub_allocation.rules}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Number Porting</h4>
                  <div className="ml-4 space-y-2">
                    <div>
                      <p className="font-medium text-sm">Individual Documentation:</p>
                      <ul className="list-disc list-inside ml-2 text-sm text-gray-600">
                        {requirements.number_porting?.end_user_documentation?.individual?.map((doc: string, idx: number) => (
                          <li key={`porting-individual-${idx}-${doc.substring(0, 10)}`}>{doc}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Business Documentation:</p>
                      <ul className="list-disc list-inside ml-2 text-sm text-gray-600">
                        {requirements.number_porting?.end_user_documentation?.business?.map((doc: string, idx: number) => (
                          <li key={`porting-business-${idx}-${doc.substring(0, 10)}`}>{doc}</li>
                        ))}
                      </ul>
                    </div>
                    {requirements.number_porting?.process_notes && (
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Process Notes:</strong> {requirements.number_porting.process_notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600">Failed to load requirements. Please try again.</p>
              </div>
            )}
          </div>
        )
        break
      case 'features':
        title = 'Features'
        content = (
          <div>
            {modal.data.features && Object.keys(modal.data.features).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#215F9A] text-white text-sm">
                      <th className="p-3 text-left">Feature</th>
                      <th className="p-3 text-center">Status/Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(modal.data.features).map(([key, value]: [string, any], idx: number) => (
                      <tr key={`feature-${key}-${idx}`} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                        <td className="p-3 text-center">
                          {typeof value === 'boolean' ? (
                            <span className={`px-2 py-1 rounded text-xs ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {value ? 'Yes' : 'No'}
                            </span>
                          ) : (
                            <span className="text-sm">{value}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600">Standard features included.</p>
            )}
          </div>
        )
        break
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => closeModal(numberId)}>
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-[#215F9A]">{title}</h3>
            <button
              onClick={() => closeModal(numberId)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          <div className="text-gray-700">
            {content}
          </div>
          <div className="mt-6 text-right">
            <button
              onClick={() => closeModal(numberId)}
              className="bg-[#215F9A] text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="bg-gray-50 min-h-screen px-4 sm:px-6 md:px-8 py-8 md:py-10">
      <div className="max-w-7xl mx-auto">
        <BackButton href="/" label="Back to Dashboard" />
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#215F9A] text-center mb-2">
          Number Search & Ordering
        </h1>

        <p className="text-center text-gray-600 mb-8 text-base sm:text-lg">
          Browse available numbers below. Use the filters to narrow down your search.
        </p>

        {/* Error Message */}
        {countriesError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-2xl mx-auto">
            <p className="font-semibold">Error loading countries:</p>
            <p className="text-sm">{countriesError}</p>
            <button
              onClick={loadCountries}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Search Form */}
        <section className="bg-white rounded-3xl shadow-lg p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Country */}
            <div>
              <label className="block text-sm font-medium mb-2">Filter by Country</label>
              <select
                className="w-full p-2 border rounded-lg text-sm sm:text-base"
                value={form.country}
                onChange={handleCountryChange}
              >
                <option value="">All Countries</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.country_code})
                  </option>
                ))}
              </select>
            </div>

            {/* SMS/Voice */}
            <div>
              <label className="block text-sm font-medium mb-2">Filter by SMS/Voice</label>
              <select
                className="w-full p-2 border rounded-lg text-sm sm:text-base"
                value={form.smsVoice}
                onChange={handleSmsVoiceChange}
              >
                <option value="">All Types</option>
                <option>SMS only</option>
                <option>Voice only</option>
                <option>Both</option>
              </select>
            </div>

            {/* Inbound/Outbound */}
            <div>
              <label className="block text-sm font-medium mb-2">Filter by Inbound/Outbound</label>
              <select
                className="w-full p-2 border rounded-lg text-sm sm:text-base"
                value={form.inboundOutbound}
                onChange={handleInboundOutboundChange}
              >
                <option value="">All Directions</option>
                <option>Inbound only</option>
                <option>Outbound only</option>
                <option>Both</option>
              </select>
            </div>

            {/* Reset Filters button */}
            <div className="flex items-end">
              <button
                onClick={handleResetFilters}
                disabled={loading}
                className="w-full bg-gray-500 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-gray-600 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
              >
                Reset Filters
              </button>
            </div>

            {/* Request a custom number */}
            <div className="md:col-span-4 flex flex-col items-end justify-end pt-2 gap-1">
              <p className="text-sm text-gray-600">
                Can&apos;t find it on the list?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomRequestModal(true)
                    setCustomRequestError(null)
                    setCustomRequestSuccess(null)
                  }}
                  className="text-[#215F9A] font-semibold hover:underline"
                >
                  Click here.
                </button>
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowCustomRequestModal(true)
                  setCustomRequestError(null)
                  setCustomRequestSuccess(null)
                }}
                className="bg-[#215F9A] text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 text-xs sm:text-sm"
              >
                Request a custom number
              </button>
            </div>
          </div>
        </section>

        {/* Results Table */}
        <section className="bg-white rounded-3xl shadow-lg p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#215F9A]">
              Available Numbers ({availableNumbers.length})
            </h2>
            {(form.country || form.smsVoice || form.inboundOutbound) && (
              <span className="text-sm text-gray-500">
                Filters active: {[form.country, form.smsVoice, form.inboundOutbound].filter(Boolean).length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-3">
                <svg className="animate-spin h-6 w-6 text-[#215F9A]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-600 font-medium">Searching for available numbers...</span>
              </div>
            </div>
          ) : availableNumbers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-600">
                No numbers found matching your criteria. Please try different search parameters.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#215F9A] text-white text-xs sm:text-sm">
                    <th className="p-3 text-left">Country</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">SMS/Voice</th>
                    <th className="p-3 text-left">Inbound/Outbound</th>
                    <th className="p-3 text-right">MRC</th>
                    <th className="p-3 text-right">NRC</th>
                    <th className="p-3 text-left">Currency</th>
                    <th className="p-3 text-center">MOQ</th>
                    <th className="p-3 text-center">Other Charge</th>
                    <th className="p-3 text-center">Requirements</th>
                    <th className="p-3 text-center">Features</th>
                    <th className="p-3 text-center">Quantity</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {availableNumbers.map((num) => {
                    // Get quantity - use stored value if exists, otherwise default to MOQ
                    const quantityStr = quantities[num.id]
                    const quantity = quantityStr !== undefined ? (quantityStr === '' ? 0 : parseInt(quantityStr) || 0) : num.moq
                    const displayValue = quantityStr !== undefined ? quantityStr : String(num.moq)
                    return (
                      <tr key={num.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          {num.country_name} ({num.country_code})
                        </td>
                        <td className="p-3">{num.number_type}</td>
                        <td className="p-3">{num.sms_capability}</td>
                        <td className="p-3">{num.direction}</td>
                        <td className="p-3 text-right">
                          {num.currency} {formatDecimal(num.mrc, 2)}
                        </td>
                        <td className="p-3 text-right">
                          {num.currency} {formatDecimal(num.nrc, 2)}
                        </td>
                        <td className="p-3">{num.currency}</td>
                        <td className="p-3 text-center">{num.moq}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => openModal(num.id, 'other_charges', num)}
                            className="bg-[#215F9A] text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-xs"
                          >
                            details
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => openModal(num.id, 'requirements', num)}
                            className="bg-[#215F9A] text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-xs"
                          >
                            details
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => openModal(num.id, 'features', num)}
                            className="bg-[#215F9A] text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-xs"
                          >
                            details
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col items-center">
                            <input
                              type="text"
                              value={displayValue}
                              placeholder={num.moq.toString()}
                              onChange={(e) => {
                                const value = e.target.value
                                // Allow empty string or only digits
                                if (value === '' || /^\d+$/.test(value)) {
                                  handleQuantityChange(num.id, value, num.moq)
                                }
                              }}
                              className={`w-20 p-2 border rounded-lg text-center ${quantityErrors[num.id] ? 'border-red-500' : ''
                                }`}
                            />
                            {quantityErrors[num.id] && (
                              <span className="text-red-500 text-xs mt-1 text-center">
                                {quantityErrors[num.id]}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleOrder(num.id, quantity)}
                            disabled={processingOrderId === num.id || quantity === 0}
                            className="bg-[#215F9A] text-white px-4 py-1 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center min-w-[100px]"
                          >
                            {processingOrderId === num.id ? (
                              <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                              </>
                            ) : (
                              'Order'
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modals */}
        {Object.entries(modals).map(([numberId, modal]) =>
          modal.open && <div key={numberId}>{renderModal(numberId, modal)}</div>
        )}

        {/* Custom number request modal */}
        {/* MOQ warning modal */}
        {showMoqWarningModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-semibold text-[#215F9A] mb-3">Minimum order quantity</h3>
              <p className="text-gray-700 mb-4">
                Your order is below the minimum order quantity (MOQ) of <strong>{moqWarningMoq}</strong>. Please enter a quantity of at least {moqWarningMoq} to proceed, or request a custom number instead.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoqWarningModal(false)
                    setShowCustomRequestModal(true)
                    setCustomRequestError(null)
                    setCustomRequestSuccess(null)
                  }}
                  className="flex-1 bg-[#215F9A] text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Request a custom number instead
                </button>
                <button
                  type="button"
                  onClick={() => setShowMoqWarningModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {showCustomRequestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowCustomRequestModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-[#215F9A] text-white px-8 py-6 rounded-t-2xl">
                <h3 className="text-2xl font-bold mb-2">Request a custom number</h3>
                <p className="text-blue-100 text-base">
                  Need a number that is not in our inventory? Submit your requirements and we will review your request.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCustomOrderStepsModal(true)}
                  className="mt-3 text-sm font-medium text-white underline hover:no-underline focus:outline-none"
                >
                  How it works — see steps
                </button>
              </div>
              <div className="p-8">
                {customRequestError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{customRequestError}</div>
                )}
                {customRequestSuccess && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{customRequestSuccess}</div>
                )}
                <section className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Your requirements</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                      <select
                        value={customRequestForm.country_id}
                        onChange={(e) => setCustomRequestForm({ ...customRequestForm, country_id: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#215F9A] focus:border-[#215F9A]"
                        required
                      >
                        <option value="">Select country</option>
                        {countries.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} ({c.country_code})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Number type *</label>
                      <select
                        value={customRequestForm.number_type}
                        onChange={(e) => setCustomRequestForm({ ...customRequestForm, number_type: e.target.value as 'Geographic' | 'Mobile' | 'Toll-Free' | 'Non-Geographic' | '2WV' })}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#215F9A] focus:border-[#215F9A]"
                      >
                        <option value="Geographic">Geographic</option>
                        <option value="Mobile">Mobile</option>
                        <option value="Toll-Free">Toll-Free</option>
                        <option value="Non-Geographic">Non-Geographic</option>
                        <option value="2WV">2WV</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">SMS/Voice *</label>
                      <select
                        value={customRequestForm.sms_capability}
                        onChange={(e) => setCustomRequestForm({ ...customRequestForm, sms_capability: e.target.value as 'SMS only' | 'Voice only' | 'Both' })}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#215F9A] focus:border-[#215F9A]"
                      >
                        <option value="SMS only">SMS only</option>
                        <option value="Voice only">Voice only</option>
                        <option value="Both">Both</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Direction *</label>
                      <select
                        value={customRequestForm.direction}
                        onChange={(e) => setCustomRequestForm({ ...customRequestForm, direction: e.target.value as 'Inbound only' | 'Outbound only' | 'Both' })}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#215F9A] focus:border-[#215F9A]"
                      >
                        <option value="Inbound only">Inbound only</option>
                        <option value="Outbound only">Outbound only</option>
                        <option value="Both">Both</option>
                      </select>
                    </div>
                  </div>
                </section>
                <div className="flex gap-4 mt-8">
                  <button
                    onClick={handleSubmitCustomRequest}
                    disabled={submittingCustomRequest}
                    className="flex-1 bg-[#215F9A] text-white py-3 px-4 rounded-xl font-medium hover:bg-[#1a4d7a] disabled:opacity-50 transition-colors"
                  >
                    {submittingCustomRequest ? 'Submitting...' : 'Submit request'}
                  </button>
                  <button
                    onClick={() => setShowCustomRequestModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom order steps pop-up */}
        {showCustomOrderStepsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={() => setShowCustomOrderStepsModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
              <h4 className="text-xl font-bold text-[#215F9A] mb-6">Custom order — how it works</h4>
              <ol className="space-y-5 text-gray-700">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#215F9A] text-white flex items-center justify-center font-semibold text-sm">1</span>
                  <div>
                    <span className="font-medium">Submit your request</span>
                    <p className="text-sm text-gray-600 mt-0.5">Tell us the country, number type, and capabilities you need.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#215F9A] text-white flex items-center justify-center font-semibold text-sm">2</span>
                  <div>
                    <span className="font-medium">We review</span>
                    <p className="text-sm text-gray-600 mt-0.5">Our team checks availability and will get back to you.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#215F9A] text-white flex items-center justify-center font-semibold text-sm">3</span>
                  <div>
                    <span className="font-medium">Numbers added or we respond</span>
                    <p className="text-sm text-gray-600 mt-0.5">If we can fulfill your request, we add numbers to inventory and notify you. Otherwise we will contact you with next steps.</p>
                  </div>
                </li>
              </ol>
              <button
                onClick={() => setShowCustomOrderStepsModal(false)}
                className="mt-6 w-full bg-[#215F9A] text-white py-2.5 rounded-xl font-medium hover:bg-[#1a4d7a]"
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
