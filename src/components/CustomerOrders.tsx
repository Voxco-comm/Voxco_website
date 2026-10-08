'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'
import BackButton from './BackButton'
import DocumentsModal from './DocumentsModal'
import { formatDecimal } from '@/lib/utils/formatNumber'
import { getCountryFlagEmoji } from '@/lib/utils/countryFlag'
import {
  Pencil,
  Upload,
  Ban,
  RefreshCw,
  Files,
  Loader2,
  SquarePen,
  CircleCheckBig,
  CircleX,
  FileCheck,
  Hourglass,
  Clock,
  Inbox,
  X,
  MessageSquare,
  Phone,
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
} from 'lucide-react'

const BADGE_CLASS =
  'inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600'

// Presentational-only status classification: derives an icon + color tone
// from the same status strings the app already produces (orders and custom
// requests share the visual language, but not every value below is used by
// both). It intentionally does not introduce any new status values — the
// displayed label always comes from the existing getStatusLabel()/req.status
// text, this only decides the icon and color.
function getStatusMeta(status: string): { icon: React.ComponentType<{ className?: string }>; className: string } {
  switch (status) {
    case 'granted':
    case 'approved':
      return { icon: CircleCheckBig, className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
    case 'rejected':
      return { icon: CircleX, className: 'border-red-200 bg-red-50 text-red-700' }
    case 'cancelled':
      return { icon: Ban, className: 'border-slate-200 bg-slate-100 text-slate-500' }
    case 'documentation_review':
      return { icon: FileCheck, className: 'border-blue-200 bg-blue-50 text-blue-700' }
    case 'pending':
      return { icon: Hourglass, className: 'border-amber-200 bg-amber-50 text-amber-700' }
    default:
      return { icon: Clock, className: 'border-slate-200 bg-slate-100 text-slate-600' }
  }
}

// Presentational-only: picks an appropriate icon for the existing SMS/Voice
// and Direction text values without altering or interpreting them beyond
// simple keyword matching — the displayed text is always the exact original
// value.
function SmsVoiceIndicator({ value }: { value: string }) {
  const hasSms = /sms/i.test(value)
  const hasVoice = /voice/i.test(value)
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-600">
      {hasSms && !hasVoice ? (
        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      ) : hasVoice && !hasSms ? (
        <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      ) : (
        <span className="flex shrink-0 items-center -space-x-1 text-slate-400">
          <MessageSquare className="h-3.5 w-3.5" />
          <Phone className="h-3.5 w-3.5" />
        </span>
      )}
      {value}
    </span>
  )
}

function DirectionIndicator({ value }: { value: string }) {
  const hasInbound = /inbound/i.test(value)
  const hasOutbound = /outbound/i.test(value)
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-600">
      {hasInbound && !hasOutbound ? (
        <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      ) : hasOutbound && !hasInbound ? (
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      ) : (
        <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      )}
      {value}
    </span>
  )
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
  number_id: string
  quantity: number
  status: string
  mrc_at_order: number
  nrc_at_order: number
  currency_at_order: string
  created_at: string
  granted_at: string | null
  rejected_at: string | null
  rejected_reason: string | null
  phone_number: string
  country_name: string
  country_code: string
  number_type: string
  sms_capability: string
  direction: string
  moq: number
  below_moq_at_order?: boolean
  requirements_text: string | null
  uploaded_documents: UploadedDocuments | null
  admin_request_changes: string | null
}

interface CustomNumberRequest {
  id: string
  country_name: string
  country_code: string
  number_type: string
  sms_capability: string
  direction: string
  moq: number
  mrc: number
  nrc: number
  currency: string
  status: string
  admin_notes: string | null
  created_at: string
}

export default function CustomerOrders() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [customRequests, setCustomRequests] = useState<CustomNumberRequest[]>([])
  const [ordersTab, setOrdersTab] = useState<'orders' | 'custom_requests'>('orders')
  const [loading, setLoading] = useState(true)
  const [loadingCustomRequests, setLoadingCustomRequests] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [editQuantity, setEditQuantity] = useState<string>('')
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<{ type: 'order' | 'request'; id: string } | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    loadOrders()
    loadCustomRequests()
  }, [user])

  // Refresh orders and custom requests when returning from document update
  useEffect(() => {
    const updated = searchParams.get('updated')
    if (updated === 'true') {
      setTimeout(() => {
        loadOrders()
        loadCustomRequests()
        router.replace('/orders')
      }, 500)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const loadOrders = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Get customer ID
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (customerError || !customerData) {
        setOrders([])
        return
      }

      // Get orders with number details
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          number_id,
          quantity,
          status,
          below_moq_at_order,
          mrc_at_order,
          nrc_at_order,
          currency_at_order,
          created_at,
          granted_at,
          rejected_at,
          rejected_reason,
          uploaded_documents,
          admin_request_changes,
          numbers!inner(number, number_type, sms_capability, direction, moq, requirements_text, countries!inner(name, country_code))
        `)
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Format the data
      const formatted = (ordersData || []).map((order: any) => ({
        id: order.id,
        number_id: order.number_id,
        quantity: order.quantity,
        status: order.status,
        below_moq_at_order: order.below_moq_at_order ?? false,
        mrc_at_order: order.mrc_at_order,
        nrc_at_order: order.nrc_at_order,
        currency_at_order: order.currency_at_order,
        created_at: order.created_at,
        granted_at: order.granted_at,
        rejected_at: order.rejected_at,
        rejected_reason: order.rejected_reason,
        phone_number: order.numbers.number,
        country_name: order.numbers.countries.name,
        country_code: order.numbers.countries.country_code,
        number_type: order.numbers.number_type,
        sms_capability: order.numbers.sms_capability,
        direction: order.numbers.direction,
        moq: order.numbers.moq,
        requirements_text: order.numbers.requirements_text,
        uploaded_documents: order.uploaded_documents || null,
        admin_request_changes: order.admin_request_changes ?? null,
      }))

      setOrders(formatted)
    } catch (err: any) {
      setError(err.message || 'Failed to load orders')
      console.error('Error loading orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCustomRequests = async () => {
    if (!user) return
    setLoadingCustomRequests(true)
    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (customerError || !customerData) {
        setCustomRequests([])
        return
      }
      const { data, error: reqError } = await supabase
        .from('custom_number_requests')
        .select(`
          id,
          number_type,
          sms_capability,
          direction,
          mrc,
          nrc,
          currency,
          moq,
          status,
          admin_notes,
          created_at,
          countries!inner(name, country_code)
        `)
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false })
      if (reqError) throw reqError
      setCustomRequests((data || []).map((r: any) => ({
        id: r.id,
        country_name: r.countries?.name ?? '—',
        country_code: r.countries?.country_code ?? '',
        number_type: r.number_type,
        sms_capability: r.sms_capability,
        direction: r.direction,
        moq: r.moq,
        mrc: r.mrc,
        nrc: r.nrc,
        currency: r.currency,
        status: r.status,
        admin_notes: r.admin_notes ?? null,
        created_at: r.created_at,
      })))
    } catch (err: any) {
      setCustomRequests([])
    } finally {
      setLoadingCustomRequests(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'granted':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-200 text-gray-700'
      case 'documentation_review':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'documentation_review':
        return 'Documentation Review'
      case 'granted':
        return 'Approved'
      case 'rejected':
        return 'Rejected'
      case 'cancelled':
        return 'Cancelled'
      case 'pending':
        return 'Pending'
      default:
        return status
    }
  }

  const canEditOrder = (status: string) => {
    // Only allow editing for pending or documentation_review orders
    return status === 'pending' || status === 'documentation_review'
  }

  // Orders / requests can be cancelled by the customer while they are still open
  // (not yet granted/approved, rejected, or already cancelled).
  const canCancelOrder = (status: string) =>
    status === 'pending' || status === 'documentation_review'
  const canCancelRequest = (status: string) => status === 'pending'

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    setError(null)
    try {
      if (cancelTarget.type === 'order') {
        const { error: cancelError } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', cancelTarget.id)
        if (cancelError) throw cancelError
        setOrders((prev) => prev.map((o) => (o.id === cancelTarget.id ? { ...o, status: 'cancelled' } : o)))
      } else {
        const { error: cancelError } = await supabase
          .from('custom_number_requests')
          .update({ status: 'cancelled' })
          .eq('id', cancelTarget.id)
        if (cancelError) throw cancelError
        setCustomRequests((prev) => prev.map((r) => (r.id === cancelTarget.id ? { ...r, status: 'cancelled' } : r)))
      }
      setCancelTarget(null)
    } catch (err: any) {
      setError(err.message || 'Failed to cancel. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  const handleEditClick = (order: Order) => {
    setEditingOrder(order)
    setEditQuantity(String(order.quantity))
    setEditError(null)
  }

  const handleEditQuantityChange = (value: string) => {
    setEditQuantity(value)

    // Validate
    if (value === '') {
      setEditError('Quantity is required')
    } else if (!/^\d+$/.test(value)) {
      setEditError('Please enter a valid number')
    } else if (editingOrder && parseInt(value) < editingOrder.moq) {
      setEditError(`Minimum order quantity is ${editingOrder.moq}`)
    } else {
      setEditError(null)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingOrder || editError || !editQuantity) return

    const newQuantity = parseInt(editQuantity)
    if (newQuantity === editingOrder.quantity) {
      setEditingOrder(null)
      return
    }

    setSaving(true)
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ quantity: newQuantity })
        .eq('id', editingOrder.id)

      if (updateError) throw updateError

      // Update local state
      setOrders(orders.map(o =>
        o.id === editingOrder.id ? { ...o, quantity: newQuantity } : o
      ))
      setEditingOrder(null)
    } catch (err: any) {
      setEditError(err.message || 'Failed to update order')
    } finally {
      setSaving(false)
    }
  }

  const handleResubmitDocuments = (order: Order) => {
    // Navigate to order page with the order details to resubmit documents
    const params = new URLSearchParams({
      numberId: order.number_id,
      quantity: String(order.quantity),
      orderId: order.id,
      resubmit: 'true'
    })
    router.push(`/order?${params.toString()}`)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-6 sm:px-6 lg:px-10 xl:px-12">
      <div className="mx-auto max-w-[1600px]">
        <BackButton href="/" label="Back to Dashboard" />

        <div className="mb-6 sm:mb-8">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F97316]" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#215F9A]">
              Voxco Number Portal
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">My Orders</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Welcome, {(user?.user_metadata as { name?: string })?.name || user?.email}
          </p>
        </div>

        {error && (
          <div className="mb-6 max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tabs: My Orders | Custom number requests */}
        <div className="mb-6 flex items-center gap-6 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setOrdersTab('orders')}
            className={`relative pb-3 text-sm font-semibold transition-colors ${ordersTab === 'orders' ? 'text-[#215F9A]' : 'text-slate-500 hover:text-slate-700'}`}
          >
            My Orders
            {orders.length > 0 && (
              <span className="ml-1.5 text-xs font-medium text-slate-400">({orders.length})</span>
            )}
            {ordersTab === 'orders' && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#215F9A]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setOrdersTab('custom_requests')}
            className={`relative pb-3 text-sm font-semibold transition-colors ${ordersTab === 'custom_requests' ? 'text-[#215F9A]' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Custom number requests
            {customRequests.length > 0 && (
              <span className="ml-1.5 text-xs font-medium text-slate-400">({customRequests.length})</span>
            )}
            {ordersTab === 'custom_requests' && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#215F9A]" />
            )}
          </button>
        </div>

        {ordersTab === 'orders' && (
          <>
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#215F9A]/10">
                  <Loader2 className="h-5 w-5 animate-spin text-[#215F9A]" />
                </div>
                <span className="text-sm font-medium text-slate-600">Loading your orders…</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Inbox className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-700">You haven&apos;t placed any orders yet.</p>
                <p className="text-sm text-slate-500">Start by searching and ordering numbers!</p>
              </div>
            ) : (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-slate-900">Order history</h2>
                    <span className="inline-flex items-center rounded-full bg-[#215F9A]/10 px-2.5 py-0.5 text-xs font-semibold text-[#215F9A]">
                      {orders.length}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1360px] border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="bg-blue-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="border-b border-slate-200 px-4 py-3">Date</th>
                        <th className="border-b border-slate-200 px-4 py-3">Country</th>
                        <th className="border-b border-slate-200 px-3 py-3">Type</th>
                        <th className="border-b border-slate-200 px-3 py-3">SMS/Voice</th>
                        <th className="border-b border-slate-200 px-3 py-3">Inbound/Outbound</th>
                        <th className="border-b border-slate-200 px-3 py-3 text-center">Qty</th>
                        <th className="border-b border-slate-200 px-3 py-3 text-right">MRC</th>
                        <th className="border-b border-slate-200 px-3 py-3 text-right">NRC</th>
                        <th className="border-b border-slate-200 px-3 py-3 text-center">Documents</th>
                        <th className="border-b border-slate-200 px-3 py-3">Status</th>
                        <th className="border-b border-slate-200 px-4 py-3">Notes</th>
                        <th className="border-b border-slate-200 px-3 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map((order) => {
                        const meta = getStatusMeta(order.status)
                        const StatusIcon = meta.icon
                        const flag = getCountryFlagEmoji(order.country_code)
                        return (
                          <tr key={order.id} className="transition-colors hover:bg-blue-50/40">
                            <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-900">
                              {flag && <span aria-hidden="true" className="mr-1.5 align-middle text-base leading-none">{flag}</span>}
                              {order.country_name}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5">
                              <span className={BADGE_CLASS}>{order.number_type}</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-sm">
                              <SmsVoiceIndicator value={order.sms_capability} />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-sm">
                              <DirectionIndicator value={order.direction} />
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className="font-medium tabular-nums text-slate-900">{order.quantity}</span>
                              {order.below_moq_at_order && (
                                <p className="mt-0.5 whitespace-nowrap text-[10px] font-medium text-amber-600">Below MOQ ({order.moq})</p>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-right">
                              <span className="font-semibold tabular-nums text-slate-900">{formatDecimal(order.mrc_at_order, 2) || '0'}</span>
                              <span className="ml-1 text-xs text-slate-400">{order.currency_at_order}</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-right">
                              <span className="tabular-nums text-slate-600">{formatDecimal(order.nrc_at_order, 2) || '0'}</span>
                              <span className="ml-1 text-xs text-slate-400">{order.currency_at_order}</span>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              {(() => {
                                const docs = order.uploaded_documents?.documents ?? []
                                const otherDocs = order.uploaded_documents?.other_documents ?? []
                                const hasDocs = docs.length > 0 || otherDocs.length > 0
                                if (hasDocs) {
                                  return (
                                    <button
                                      onClick={() => setSelectedOrder(order)}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-[#215F9A]/30 hover:bg-blue-50/50 hover:text-[#215F9A]"
                                    >
                                      <Files className="h-3.5 w-3.5" />
                                      {docs.length + otherDocs.length}
                                    </button>
                                  )
                                }
                                if (order.uploaded_documents?.documents_deleted) {
                                  return <span className="text-xs italic text-slate-400">Processed</span>
                                }
                                return <span className="text-xs text-slate-300">—</span>
                              })()}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${meta.className}`}>
                                <StatusIcon className="h-3.5 w-3.5" />
                                {getStatusLabel(order.status)}
                              </span>
                            </td>
                            <td className="max-w-[240px] px-4 py-3.5">
                              <div className="space-y-1.5">
                                {order.admin_request_changes && (
                                  <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-2.5 py-2 text-xs text-blue-800">
                                    <p className="font-semibold">Action needed</p>
                                    <p className="mt-0.5 line-clamp-2" title={order.admin_request_changes}>
                                      {order.admin_request_changes}
                                    </p>
                                    <button
                                      onClick={() => handleResubmitDocuments(order)}
                                      className="mt-1 font-medium text-[#215F9A] hover:underline"
                                    >
                                      Upload / Update documents
                                    </button>
                                  </div>
                                )}
                                {order.rejected_reason && (
                                  <p className="line-clamp-2 text-xs text-red-600" title={`Rejected: ${order.rejected_reason}`}>
                                    Rejected: {order.rejected_reason}
                                  </p>
                                )}
                                {order.status === 'granted' && order.granted_at && (
                                  <p className="text-xs text-emerald-600">
                                    Approved on {new Date(order.granted_at).toLocaleDateString()}
                                  </p>
                                )}
                                {order.below_moq_at_order &&
                                  (order.status === 'pending' || order.status === 'documentation_review') && (
                                  <p className="text-xs text-amber-600">
                                    Pending admin approval (quantity below MOQ).
                                  </p>
                                )}
                                {order.status === 'documentation_review' && (
                                  <p className="text-xs text-blue-600">Under documentation review</p>
                                )}
                                {order.status === 'pending' && (
                                  <p className="text-xs text-amber-600">Awaiting approval</p>
                                )}
                                {!order.admin_request_changes &&
                                  !order.rejected_reason &&
                                  !(order.status === 'granted' && order.granted_at) &&
                                  !(order.below_moq_at_order && (order.status === 'pending' || order.status === 'documentation_review')) &&
                                  order.status !== 'documentation_review' &&
                                  order.status !== 'pending' && (
                                  <span className="text-xs text-slate-300">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              {canEditOrder(order.status) && (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleEditClick(order)}
                                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#215F9A]"
                                    title="Edit quantity"
                                    aria-label="Edit quantity"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleResubmitDocuments(order)}
                                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#215F9A]"
                                    title="Update documents"
                                    aria-label="Update documents"
                                  >
                                    <Upload className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setCancelTarget({ type: 'order', id: order.id })}
                                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                    title="Cancel this order"
                                    aria-label="Cancel this order"
                                  >
                                    <Ban className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                              {order.status === 'rejected' && (
                                <button
                                  onClick={() => handleResubmitDocuments(order)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#215F9A] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1b4e80]"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  Resubmit
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {ordersTab === 'custom_requests' && (
          <>
            {loadingCustomRequests ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#215F9A]/10">
                  <Loader2 className="h-5 w-5 animate-spin text-[#215F9A]" />
                </div>
                <span className="text-sm font-medium text-slate-600">Loading custom number requests…</span>
              </div>
            ) : customRequests.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Inbox className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-700">You have no custom number requests.</p>
                <p className="max-w-sm text-sm text-slate-500">
                  Request a custom number from the Numbers page when the quantity is below MOQ or the number is not in inventory.
                </p>
              </div>
            ) : (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-slate-900">Custom number requests</h2>
                    <span className="inline-flex items-center rounded-full bg-[#215F9A]/10 px-2.5 py-0.5 text-xs font-semibold text-[#215F9A]">
                      {customRequests.length}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1140px] border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="bg-blue-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="border-b border-slate-200 px-4 py-3">Date</th>
                        <th className="border-b border-slate-200 px-4 py-3">Country</th>
                        <th className="border-b border-slate-200 px-3 py-3">Type</th>
                        <th className="border-b border-slate-200 px-3 py-3">SMS/Voice</th>
                        <th className="border-b border-slate-200 px-3 py-3">Direction</th>
                        <th className="border-b border-slate-200 px-3 py-3 text-right">MRC</th>
                        <th className="border-b border-slate-200 px-3 py-3 text-right">NRC</th>
                        <th className="border-b border-slate-200 px-3 py-3">Status</th>
                        <th className="border-b border-slate-200 px-4 py-3">Admin notes</th>
                        <th className="border-b border-slate-200 px-3 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customRequests.map((req) => {
                        const meta = getStatusMeta(req.status)
                        const StatusIcon = meta.icon
                        const label = req.status === 'approved' ? 'Approved' : req.status === 'rejected' ? 'Rejected' : req.status === 'cancelled' ? 'Cancelled' : 'Pending'
                        const flag = getCountryFlagEmoji(req.country_code)
                        return (
                          <tr key={req.id} className="transition-colors hover:bg-blue-50/40">
                            <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                              {new Date(req.created_at).toLocaleDateString()}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-900">
                              {flag && <span aria-hidden="true" className="mr-1.5 align-middle text-base leading-none">{flag}</span>}
                              {req.country_name}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5">
                              <span className={BADGE_CLASS}>{req.number_type}</span>
                              <p className="mt-1 text-xs text-slate-400">MOQ {req.moq}</p>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-sm">
                              <SmsVoiceIndicator value={req.sms_capability} />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-sm">
                              <DirectionIndicator value={req.direction} />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-right">
                              <span className="font-semibold tabular-nums text-slate-900">{formatDecimal(req.mrc, 2)}</span>
                              <span className="ml-1 text-xs text-slate-400">{req.currency}</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-right">
                              <span className="tabular-nums text-slate-600">{formatDecimal(req.nrc, 2)}</span>
                              <span className="ml-1 text-xs text-slate-400">{req.currency}</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${meta.className}`}>
                                <StatusIcon className="h-3.5 w-3.5" />
                                {label}
                              </span>
                            </td>
                            <td className="max-w-[240px] px-4 py-3.5">
                              {req.admin_notes ? (
                                <p className="line-clamp-2 text-xs text-slate-500" title={req.admin_notes}>
                                  {req.admin_notes}
                                </p>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              {canCancelRequest(req.status) ? (
                                <button
                                  onClick={() => setCancelTarget({ type: 'request', id: req.id })}
                                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                  title="Cancel this request"
                                  aria-label="Cancel this request"
                                >
                                  <Ban className="h-4 w-4" />
                                </button>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                  When a request is approved, the number is added to inventory and a new order is created for you—you will see it under <strong className="font-medium text-slate-700">My Orders</strong>.
                </p>
              </section>
            )}
          </>
        )}
      </div>

      {/* Documents Modal */}
      {selectedOrder && selectedOrder.uploaded_documents && (
        <DocumentsModal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          uploadedDocuments={selectedOrder.uploaded_documents}
          orderId={selectedOrder.id}
          isAdmin={false}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px] motion-safe:animate-[fadeIn_150ms_ease-out]"
          onClick={() => !cancelling && setCancelTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5 motion-safe:animate-[scaleIn_150ms_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Cancel {cancelTarget.type === 'order' ? 'order' : 'request'}?
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Are you sure you want to cancel this {cancelTarget.type === 'order' ? 'order' : 'custom number request'}?
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cancelling…
                  </>
                ) : (
                  `Yes, cancel ${cancelTarget.type === 'order' ? 'order' : 'request'}`
                )}
              </button>
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Keep it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px] motion-safe:animate-[fadeIn_150ms_ease-out]"
          onClick={() => !saving && setEditingOrder(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5 motion-safe:animate-[scaleIn_150ms_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#215F9A]/10 text-[#215F9A]">
                  <SquarePen className="h-[18px] w-[18px]" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Edit order</h3>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 space-y-1.5 rounded-lg bg-slate-50 p-3 text-sm">
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">Country:</span> {editingOrder.country_name}
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">Type:</span> {editingOrder.number_type} - {editingOrder.sms_capability}
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">MOQ:</span> {editingOrder.moq}
              </p>
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Quantity
              </label>
              <input
                type="text"
                value={editQuantity}
                onChange={(e) => handleEditQuantityChange(e.target.value)}
                className={`w-full rounded-lg border p-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${editError ? 'border-red-400 focus:ring-red-500/20' : 'border-slate-300 focus:border-[#215F9A] focus:ring-[#215F9A]/20'}`}
                placeholder="Enter quantity"
              />
              {editError && (
                <p className="mt-1 text-xs text-red-500">{editError}</p>
              )}
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={handleSaveEdit}
                disabled={!!editError || saving || !editQuantity}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#215F9A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1b4e80] disabled:cursor-not-allowed disabled:opacity-50"
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
              <button
                onClick={() => setEditingOrder(null)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

