'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'
import BackButton from './BackButton'
import DocumentsModal from './DocumentsModal'
import { formatDecimal } from '@/lib/utils/formatNumber'
import { Pencil } from 'lucide-react'

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
  number_type: string
  sms_capability: string
  direction: string
  moq: number
  requirements_text: string | null
  uploaded_documents: UploadedDocuments | null
  admin_request_changes: string | null
}

interface CustomNumberRequest {
  id: string
  country_name: string
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
          mrc_at_order,
          nrc_at_order,
          currency_at_order,
          created_at,
          granted_at,
          rejected_at,
          rejected_reason,
          uploaded_documents,
          admin_request_changes,
          numbers!inner(number, number_type, sms_capability, direction, moq, requirements_text, countries!inner(name))
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
        mrc_at_order: order.mrc_at_order,
        nrc_at_order: order.nrc_at_order,
        currency_at_order: order.currency_at_order,
        created_at: order.created_at,
        granted_at: order.granted_at,
        rejected_at: order.rejected_at,
        rejected_reason: order.rejected_reason,
        phone_number: order.numbers.number,
        country_name: order.numbers.countries.name,
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
          countries!inner(name)
        `)
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false })
      if (reqError) throw reqError
      setCustomRequests((data || []).map((r: any) => ({
        id: r.id,
        country_name: r.countries?.name ?? '—',
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
    <main className="bg-gray-50 min-h-screen py-12 px-8">
      <div className="max-w-7xl mx-auto">
        <BackButton href="/" label="Back to Dashboard" />
        <section className="text-center mb-8">
          <h2 className="text-4xl font-bold text-[#215F9A] mb-4">My Orders</h2>
          <p className="text-xl text-gray-600">
            Welcome, {(user?.user_metadata as { name?: string })?.name || user?.email}
          </p>
        </section>

        {/* Tabs: My Orders | Custom number requests */}
        <div className="flex gap-2 mb-4 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setOrdersTab('orders')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${ordersTab === 'orders' ? 'bg-[#215F9A] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            My Orders
            {orders.length > 0 && (
              <span className="ml-2 text-xs opacity-90">({orders.length})</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setOrdersTab('custom_requests')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${ordersTab === 'custom_requests' ? 'bg-[#215F9A] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Custom number requests
            {customRequests.length > 0 && (
              <span className="ml-2 text-xs opacity-90">({customRequests.length})</span>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {ordersTab === 'orders' && (
          <>
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-600">Loading your orders...</div>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
                <p className="text-gray-600 text-lg mb-4">You haven't placed any orders yet.</p>
                <p className="text-gray-500">Start by searching and ordering numbers!</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-[#215F9A] mb-4">
                  Order History ({orders.length})
                </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#215F9A] text-white text-xs">
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Country</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">SMS/Voice</th>
                    <th className="p-2 text-left">Inbound/Outbound</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-center">MOQ</th>
                    <th className="p-2 text-right">MRC</th>
                    <th className="p-2 text-right">NRC</th>
                    <th className="p-2 text-center">Documents</th>
                    <th className="p-2 text-center">Status</th>
                    <th className="p-2 text-left">Notes</th>
                    <th className="p-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-xs">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-2 text-xs">{order.country_name}</td>
                      <td className="p-2 text-xs">{order.number_type}</td>
                      <td className="p-2 text-xs">{order.sms_capability}</td>
                      <td className="p-2 text-xs">{order.direction}</td>
                      <td className="p-2 text-center text-xs">{order.quantity}</td>
                      <td className="p-2 text-center text-xs">{order.moq}</td>
                      <td className="p-2 text-right text-xs">
                        {order.currency_at_order} {formatDecimal(order.mrc_at_order, 2) || '0'}
                      </td>
                      <td className="p-2 text-right text-xs">
                        {order.currency_at_order} {formatDecimal(order.nrc_at_order, 2) || '0'}
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
                                <button
                                  onClick={() => setSelectedOrder(order)}
                                  className="text-[#215F9A] hover:text-blue-700 text-xs underline"
                                >
                                  View
                                </button>
                              </div>
                            )
                          }
                          if (order.uploaded_documents?.documents_deleted) {
                            return <span className="text-gray-400 text-xs italic">Processed</span>
                          }
                          return <span className="text-gray-400 text-xs">None</span>
                        })()}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="p-2 text-xs text-gray-600">
                        {order.admin_request_changes && (
                          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800">
                            <strong>Admin request:</strong> {order.admin_request_changes}
                            <button
                              onClick={() => handleResubmitDocuments(order)}
                              className="block mt-1 text-[#215F9A] font-medium hover:underline"
                            >
                              Upload / Update documents
                            </button>
                          </div>
                        )}
                        {order.rejected_reason && (
                          <span className="text-red-600">Rejected: {order.rejected_reason}</span>
                        )}
                        {order.status === 'granted' && order.granted_at && (
                          <span className="text-green-600">
                            Approved on {new Date(order.granted_at).toLocaleDateString()}
                          </span>
                        )}
                        {order.status === 'documentation_review' && (
                          <span className="text-blue-600">Under documentation review</span>
                        )}
                        {order.status === 'pending' && (
                          <span className="text-yellow-600">Awaiting approval</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {canEditOrder(order.status) && (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleEditClick(order)}
                              className="p-1 text-[#215F9A] hover:bg-blue-50 rounded transition-colors"
                              title="Edit quantity"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleResubmitDocuments(order)}
                              className="text-xs text-[#215F9A] hover:text-blue-700 underline"
                              title="Update documents"
                            >
                              Docs
                            </button>
                          </div>
                        )}
                        {order.status === 'rejected' && (
                          <button
                            onClick={() => handleResubmitDocuments(order)}
                            className="text-xs bg-[#215F9A] text-white px-2 py-1 rounded hover:bg-blue-700"
                          >
                            Resubmit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
            )}
          </>
        )}

        {ordersTab === 'custom_requests' && (
          <>
            {loadingCustomRequests ? (
              <div className="text-center py-8">
                <div className="text-gray-600">Loading custom number requests...</div>
              </div>
            ) : customRequests.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
                <p className="text-gray-600 text-lg mb-4">You have no custom number requests.</p>
                <p className="text-gray-500">Request a custom number from the Numbers page when the quantity is below MOQ or the number is not in inventory.</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-[#215F9A] mb-4">
                  Custom number requests ({customRequests.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#215F9A] text-white text-xs">
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Country</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-left">SMS/Voice</th>
                        <th className="p-2 text-left">Direction</th>
                        <th className="p-2 text-center">MOQ</th>
                        <th className="p-2 text-right">MRC</th>
                        <th className="p-2 text-right">NRC</th>
                        <th className="p-2 text-center">Status</th>
                        <th className="p-2 text-left">Admin notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customRequests.map((req) => (
                        <tr key={req.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-xs">
                            {new Date(req.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-2 text-xs">{req.country_name}</td>
                          <td className="p-2 text-xs">{req.number_type}</td>
                          <td className="p-2 text-xs">{req.sms_capability}</td>
                          <td className="p-2 text-xs">{req.direction}</td>
                          <td className="p-2 text-center text-xs">{req.moq}</td>
                          <td className="p-2 text-right text-xs">{req.currency} {formatDecimal(req.mrc, 2)}</td>
                          <td className="p-2 text-right text-xs">{req.currency} {formatDecimal(req.nrc, 2)}</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              req.status === 'approved' ? 'bg-green-100 text-green-800' :
                              req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {req.status === 'approved' ? 'Approved' : req.status === 'rejected' ? 'Rejected' : 'Pending'}
                            </span>
                          </td>
                          <td className="p-2 text-xs text-gray-600">{req.admin_notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  When a request is approved, the number is added to inventory and a new order is created for you—you will see it under <strong>My Orders</strong>.
                </p>
              </div>
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

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-[#215F9A] mb-4">Edit Order</h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Country:</strong> {editingOrder.country_name}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Type:</strong> {editingOrder.number_type} - {editingOrder.sms_capability}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <strong>MOQ:</strong> {editingOrder.moq}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="text"
                value={editQuantity}
                onChange={(e) => handleEditQuantityChange(e.target.value)}
                className={`w-full p-2 border rounded-lg ${editError ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Enter quantity"
              />
              {editError && (
                <p className="text-red-500 text-xs mt-1">{editError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveEdit}
                disabled={!!editError || saving || !editQuantity}
                className="flex-1 bg-[#215F9A] text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingOrder(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
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

