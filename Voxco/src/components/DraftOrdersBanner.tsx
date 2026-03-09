'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'

interface DraftOrder {
  id: string
  number_id: string
  quantity: number
  customer_type: 'individual' | 'business' | null
  expires_at: string
  created_at: string
  updated_at: string
  number?: {
    id: string
    number_type: string
    sms_capability: string
    direction: string
    mrc: number
    nrc: number
    currency: string
    moq: number
    countries: {
      name: string
      country_code: string
      id: string
    }
  }
}

export default function DraftOrdersBanner() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [drafts, setDrafts] = useState<DraftOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadDrafts()
    }
  }, [user])

  const loadDrafts = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get customer ID
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (customerError || !customerData) {
        setDrafts([])
        return
      }

      // Get draft orders that haven't expired
      const { data: draftsData, error: draftsError } = await supabase
        .from('draft_orders')
        .select(`
          id,
          number_id,
          quantity,
          customer_type,
          expires_at,
          created_at,
          updated_at,
          numbers:number_id (
            id,
            number_type,
            sms_capability,
            direction,
            mrc,
            nrc,
            currency,
            moq,
            countries:country_id (
              name,
              country_code,
              id
            )
          )
        `)
        .eq('customer_id', customerData.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (draftsError) {
        console.error('Error loading drafts:', draftsError)
        setDrafts([])
        return
      }

      // Format the data
      const formatted = (draftsData || []).map((draft: any) => ({
        ...draft,
        number: draft.numbers,
      }))

      setDrafts(formatted)
    } catch (err) {
      console.error('Error loading drafts:', err)
      setDrafts([])
    } finally {
      setLoading(false)
    }
  }

  const handleResumeDraft = (draft: DraftOrder) => {
    if (!draft.number) return

    const params = new URLSearchParams({
      draftId: draft.id,
      numberId: draft.number_id,
      quantity: draft.quantity.toString(),
      countryName: draft.number.countries?.name || '',
      countryCode: draft.number.countries?.country_code || '',
      countryId: draft.number.countries?.id || '',
      numberType: draft.number.number_type,
      smsCapability: draft.number.sms_capability,
      direction: draft.number.direction,
      mrc: draft.number.mrc.toString(),
      nrc: draft.number.nrc.toString(),
      currency: draft.number.currency,
      moq: draft.number.moq.toString(),
    })

    router.push(`/order?${params.toString()}`)
  }

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const { error } = await supabase
        .from('draft_orders')
        .delete()
        .eq('id', draftId)

      if (error) throw error

      setDrafts((prev) => prev.filter((d) => d.id !== draftId))
    } catch (err) {
      console.error('Error deleting draft:', err)
    }
  }

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = expires.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  if (loading || drafts.length === 0) return null

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-800 mb-1">
            You have {drafts.length} draft order{drafts.length !== 1 ? 's' : ''}
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            Continue where you left off before your drafts expire.
          </p>

          <div className="space-y-2">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="bg-white rounded-xl p-3 flex items-center justify-between border border-yellow-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {draft.number?.countries?.name || 'Unknown Country'} - {draft.number?.number_type || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Quantity: {draft.quantity} • Expires in {getDaysRemaining(draft.expires_at)} day{getDaysRemaining(draft.expires_at) !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResumeDraft(draft)}
                    className="px-3 py-1.5 bg-[#215F9A] text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => handleDeleteDraft(draft.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete draft"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


