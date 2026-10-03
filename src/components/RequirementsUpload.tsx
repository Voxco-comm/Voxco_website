'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'
import BackButton from './BackButton'
import { formatDecimal } from '@/lib/utils/formatNumber'
import { getCountryFlagEmoji } from '@/lib/utils/countryFlag'
import {
  Upload,
  Trash2,
  Eye,
  FileText,
  FileImage,
  Loader2,
  AlertTriangle,
  Info,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  FolderOpen,
  Building2,
  User,
  Hash,
  X,
  ArrowRight,
} from 'lucide-react'

// Purely presentational card wrapper shared by every section of the order
// workflow below — holds no state, forwards nothing but the children/props
// it is given.
function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#215F9A]/10 text-[#215F9A]">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

interface OrderDetails {
  numberId: string
  quantity: number
  countryName: string
  countryCode: string
  countryId: string
  numberType: string
  smsCapability: string
  direction: string
  mrc: number
  nrc: number
  currency: string
  moq: number
  draftId?: string
  belowMoq?: boolean
}

interface RequirementDocument {
  key: string
  title: string
  description?: string
  required: boolean
}

interface UploadedDocument {
  requirementKey: string
  title: string
  fileName: string
  filePath: string
  fileSize: number
  fileType: string
  file: File
  uploadedAt: string
}

// For documents saved in draft (no File object available)
interface SavedDocument {
  requirement_key: string
  title: string
  file_path: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_at: string
}

// For documents saved in customer profile (from previous orders)
interface CustomerDocument {
  id: string
  document_type: string
  title: string
  file_path: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_at: string
  is_verified: boolean
}

interface Requirements {
  number_allocation?: {
    end_user_documentation?: {
      individual?: string[]
      business?: string[]
    }
    address_requirements?: string
  }
  sub_allocation?: {
    allowed?: boolean
    rules?: string
  }
  number_porting?: {
    end_user_documentation?: {
      individual?: string[]
      business?: string[]
    }
    process_notes?: string
  }
}

export default function RequirementsUpload() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const supabase = createClient()

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null)
  const [requirements, setRequirements] = useState<Requirements | null>(null)
  const [loadingRequirements, setLoadingRequirements] = useState(true)
  const [customerType, setCustomerType] = useState<'individual' | 'business'>('individual')
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([])
  const [savedDocuments, setSavedDocuments] = useState<SavedDocument[]>([])
  const [otherDocuments, setOtherDocuments] = useState<Array<UploadedDocument | SavedDocument>>([])
  const [customerDocuments, setCustomerDocuments] = useState<CustomerDocument[]>([])
  const [loadingCustomerDocs, setLoadingCustomerDocs] = useState(false)
  const [showDocPicker, setShowDocPicker] = useState<string | null>(null) // requirement key for which picker is open
  const [notes, setNotes] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState<string | null>(null)
  const [draftSaved, setDraftSaved] = useState(false)
  const [showReviewNote, setShowReviewNote] = useState(false)

  // Helper function to split combined document requirements
  const splitDocumentRequirements = (docString: string): string[] => {
    if (!docString || typeof docString !== 'string') return []

    // Split by comma, but be careful not to split inside parentheses
    const parts: string[] = []
    let currentPart = ''
    let parenDepth = 0

    for (let i = 0; i < docString.length; i++) {
      const char = docString[i]

      if (char === '(') {
        parenDepth++
        currentPart += char
      } else if (char === ')') {
        parenDepth--
        currentPart += char
      } else if (char === ',' && parenDepth === 0) {
        // Only split on comma if we're not inside parentheses
        const trimmed = currentPart.trim()
        if (trimmed) {
          parts.push(trimmed)
        }
        currentPart = ''
      } else {
        currentPart += char
      }
    }

    // Add the last part
    const trimmed = currentPart.trim()
    if (trimmed) {
      parts.push(trimmed)
    }

    return parts.filter(p => p.length > 0)
  }

  // Extract required documents from requirements
  const requiredDocuments: RequirementDocument[] = React.useMemo(() => {
    if (!requirements?.number_allocation?.end_user_documentation) {
      return []
    }

    const docs = customerType === 'individual'
      ? requirements.number_allocation.end_user_documentation.individual
      : requirements.number_allocation.end_user_documentation.business

    if (!docs || !Array.isArray(docs)) return []

    // Split combined documents and flatten into individual requirements
    const allDocs: string[] = []
    docs.forEach(doc => {
      const splitDocs = splitDocumentRequirements(doc)
      if (splitDocs.length > 0) {
        allDocs.push(...splitDocs)
      } else {
        // If splitting didn't work, use the original
        allDocs.push(doc)
      }
    })

    // Create requirement entries for each document
    return allDocs.map((doc, index) => {
      const cleanedTitle = doc.trim()
      return {
        key: `doc_${index}_${cleanedTitle.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)}`,
        title: cleanedTitle,
        required: true,
      }
    })
  }, [requirements, customerType])

  // Check if all required documents are uploaded (including saved from draft)
  const allRequiredUploaded = React.useMemo(() => {
    if (requiredDocuments.length === 0) return true
    return requiredDocuments.every(req =>
      uploadedDocuments.some(doc => doc.requirementKey === req.key) ||
      savedDocuments.some(doc => doc.requirement_key === req.key)
    )
  }, [requiredDocuments, uploadedDocuments, savedDocuments])

  // Check if there are any documents uploaded (for draft save)
  const hasAnyDocuments = uploadedDocuments.length > 0 || savedDocuments.length > 0

  useEffect(() => {
    // Parse order details from URL
    const numberId = searchParams.get('numberId')
    const quantity = searchParams.get('quantity')
    const countryName = searchParams.get('countryName')
    const countryCode = searchParams.get('countryCode')
    const countryId = searchParams.get('countryId')
    const numberType = searchParams.get('numberType')
    const smsCapability = searchParams.get('smsCapability')
    const direction = searchParams.get('direction')
    const mrc = searchParams.get('mrc')
    const nrc = searchParams.get('nrc')
    const currency = searchParams.get('currency')
    const moq = searchParams.get('moq')
    const belowMoqParam = searchParams.get('belowMoq')
    const draftId = searchParams.get('draftId')
    const orderId = searchParams.get('orderId')

    if (numberId && quantity) {
      const parsedQuantity = parseInt(quantity)
      const parsedMoq = parseInt(moq || '1')
      const belowMoq =
        belowMoqParam === 'true' || (parsedQuantity > 0 && parsedQuantity < parsedMoq)

      setOrderDetails({
        numberId,
        quantity: parsedQuantity,
        countryName: countryName || '',
        countryCode: countryCode || '',
        countryId: countryId || '',
        numberType: numberType || '',
        smsCapability: smsCapability || '',
        direction: direction || '',
        mrc: parseFloat(mrc || '0'),
        nrc: parseFloat(nrc || '0'),
        currency: currency || 'USD',
        moq: parsedMoq,
        draftId: draftId || undefined,
        belowMoq,
      })
      setExistingOrderId(orderId || null)

      // Load draft data if resuming
      if (draftId) {
        loadDraftData(draftId)
      }

      // Load existing order documents if editing/resubmitting (orderId in URL)
      if (orderId) {
        loadExistingOrderDocuments(orderId)
      }

      // Load existing customer documents from previous orders
      loadCustomerDocuments()

      // Load country requirements: use URL params if present; otherwise fetch from number when we have numberId (e.g. edit order from CustomerOrders which only passes numberId, quantity, orderId)
      if (countryId) {
        loadRequirements(countryId, {
          countryName: countryName || '',
          countryCode: countryCode || '',
          numberType: numberType || '',
          direction: direction || '',
          smsCapability: smsCapability || '',
        })
      } else if (numberId) {
        loadRequirementsFromNumberId(numberId)
      } else {
        setLoadingRequirements(false)
      }
    } else {
      // No order details, redirect back
      router.push('/numbers')
    }
  }, [searchParams, user])

  const loadRequirementsFromNumberId = async (numberId: string) => {
    setLoadingRequirements(true)
    try {
      const { data, error } = await supabase
        .from('numbers')
        .select('country_id, number_type, direction, sms_capability, countries!inner(name, country_code)')
        .eq('id', numberId)
        .single()

      if (error || !data) {
        setLoadingRequirements(false)
        setRequirements(null)
        return
      }

      const countryId = data.country_id
      const countriesRow = Array.isArray(data.countries) ? data.countries[0] : data.countries
      const countryName = (countriesRow as { name?: string })?.name ?? ''
      const countryCode = (countriesRow as { country_code?: string })?.country_code ?? ''
      const numberType = data.number_type || ''
      const direction = data.direction || ''
      const smsCapability = data.sms_capability || ''

      setOrderDetails((prev) => prev ? {
        ...prev,
        countryId: countryId || prev.countryId,
        countryName: countryName || prev.countryName,
        countryCode: countryCode || prev.countryCode,
        numberType: numberType || prev.numberType,
        direction: direction || prev.direction,
        smsCapability: smsCapability || prev.smsCapability,
      } : null)

      await loadRequirements(countryId, {
        countryName,
        countryCode,
        numberType,
        direction,
        smsCapability,
      })
    } catch (err) {
      console.error('Error loading requirements from number:', err)
      setRequirements(null)
    } finally {
      setLoadingRequirements(false)
    }
  }

  const loadExistingOrderDocuments = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('uploaded_documents')
        .eq('id', orderId)
        .single()

      if (error) {
        return
      }

      if (!data?.uploaded_documents) {
        return
      }

      const ud = data.uploaded_documents as { documents?: SavedDocument[]; customer_type?: 'individual' | 'business'; notes?: string; other_documents?: SavedDocument[] }
      if (ud.documents && Array.isArray(ud.documents)) {
        setSavedDocuments(ud.documents)
        if (ud.customer_type) setCustomerType(ud.customer_type)
        if (ud.notes) setNotes(ud.notes)
      }
      if (ud.other_documents && Array.isArray(ud.other_documents)) {
        setOtherDocuments(ud.other_documents)
      }
    } catch (err) {
      // Error loading documents - continue without them
    }
  }

  const loadDraftData = async (draftId: string) => {
    try {
      const { data: draftData, error: draftError } = await supabase
        .from('draft_orders')
        .select('*')
        .eq('id', draftId)
        .single()

      if (draftError || !draftData) {
        console.error('Error loading draft:', draftError)
        return
      }

      // Restore draft data
      if (draftData.customer_type) {
        setCustomerType(draftData.customer_type)
      }
      if (draftData.notes) {
        setNotes(draftData.notes)
      }

      // Restore uploaded files info (files are already in storage)
      if (draftData.uploaded_files && Array.isArray(draftData.uploaded_files)) {
        const all = draftData.uploaded_files as SavedDocument[]
        const required = all.filter(d => !d.requirement_key.startsWith('other_'))
        const other = all.filter(d => d.requirement_key.startsWith('other_'))
        setSavedDocuments(required)
        setOtherDocuments(other)
        console.log('Restored draft documents:', required.length, 'required,', other.length, 'other')
      }
    } catch (err) {
      console.error('Error loading draft data:', err)
    }
  }

  // Load existing documents from customer profile (from previous orders)
  const loadCustomerDocuments = async () => {
    if (!user) {
      return
    }
    setLoadingCustomerDocs(true)
    try {
      // Get customer ID first
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (customerError || !customerData) {
        return
      }

      // Get all documents for this customer
      const { data: docsData, error: docsError } = await supabase
        .from('customer_documents')
        .select('id, document_type, title, file_path, file_name, file_size, file_type, uploaded_at, is_verified')
        .eq('customer_id', customerData.id)
        .order('uploaded_at', { ascending: false })

      if (docsError) {
        return
      }

      if (docsData) {
        setCustomerDocuments(docsData as CustomerDocument[])
      }
    } catch (err) {
    } finally {
      setLoadingCustomerDocs(false)
    }
  }

  // Select an existing document for a requirement
  const selectExistingDocument = (doc: CustomerDocument, requirementKey: string, requirementTitle: string) => {
    // Create a saved document entry from the customer document
    const savedDoc: SavedDocument = {
      requirement_key: requirementKey,
      title: requirementTitle,
      file_path: doc.file_path,
      file_name: doc.file_name,
      file_size: doc.file_size,
      file_type: doc.file_type,
      uploaded_at: doc.uploaded_at,
    }

    // Remove any existing uploaded or saved doc for this requirement
    setUploadedDocuments(prev => prev.filter(d => d.requirementKey !== requirementKey))
    setSavedDocuments(prev => {
      const filtered = prev.filter(d => d.requirement_key !== requirementKey)
      return [...filtered, savedDoc]
    })

    // Close the picker
    setShowDocPicker(null)
  }

  const loadRequirements = async (countryId: string, params?: {
    countryName: string
    countryCode: string
    numberType: string
    direction: string
    smsCapability: string
  }) => {
    setLoadingRequirements(true)
    try {
      // Use passed params or fall back to orderDetails (for cases where state is already set)
      const countryName = params?.countryName || orderDetails?.countryName || ''
      const countryCode = params?.countryCode || orderDetails?.countryCode || ''
      const numberType = params?.numberType || orderDetails?.numberType || ''
      const direction = params?.direction || orderDetails?.direction || ''
      const smsCapability = params?.smsCapability || orderDetails?.smsCapability || ''

      // First try to get requirements from the combination-based table via API
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

      if (response.ok) {
        const data = await response.json()
        if (data.requirements) {
          setRequirements(data.requirements)
          return
        }
      }

      // Fallback: Get from countries table if API fails
      const { data, error } = await supabase
        .from('countries')
        .select('requirements')
        .eq('id', countryId)
        .single()

      if (error) throw error
      setRequirements(data?.requirements || null)
    } catch (err: any) {
      console.error('Error loading requirements:', err)
    } finally {
      setLoadingRequirements(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, requirement: RequirementDocument) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      setError(`File type not allowed. Please upload PDF, JPG, PNG, or DOC files.`)
      return
    }

    setUploadingFile(requirement.key)
    setError(null)

    try {
      // Remove existing file for this requirement if any
      const existingDoc = uploadedDocuments.find(doc => doc.requirementKey === requirement.key)

      // Also remove any saved document for this requirement when uploading new one
      setSavedDocuments(prev => prev.filter(doc => doc.requirement_key !== requirement.key))

      const newDocument: UploadedDocument = {
        requirementKey: requirement.key,
        title: requirement.title,
        fileName: file.name,
        filePath: '', // Will be set during order submission
        fileSize: file.size,
        fileType: file.type,
        file: file,
        uploadedAt: new Date().toISOString(),
      }

      if (existingDoc) {
        // Replace existing document
        setUploadedDocuments(prev =>
          prev.map(doc => doc.requirementKey === requirement.key ? newDocument : doc)
        )
      } else {
        // Add new document
        setUploadedDocuments(prev => [...prev, newDocument])
      }
    } catch (err: any) {
      console.error('Error handling file:', err)
      setError('Failed to process file. Please try again.')
    } finally {
      setUploadingFile(null)
      // Reset input
      e.target.value = ''
    }
  }

  const removeDocument = (requirementKey: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.requirementKey !== requirementKey))
  }

  const MAX_OTHER_DOCS = 10
  const [uploadingOtherFile, setUploadingOtherFile] = useState<string | null>(null)

  const handleOtherFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length || otherDocuments.length >= MAX_OTHER_DOCS) return
    const file = files[0]
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type)) {
      setError('Please upload PDF, JPG, PNG, or DOC files.')
      return
    }
    setUploadingOtherFile('other')
    setError(null)
    const key = `other_${otherDocuments.length}`
    const newDoc: UploadedDocument = {
      requirementKey: key,
      title: file.name,
      fileName: file.name,
      filePath: '',
      fileSize: file.size,
      fileType: file.type,
      file,
      uploadedAt: new Date().toISOString(),
    }
    setOtherDocuments(prev => [...prev, newDoc])
    setUploadingOtherFile(null)
    e.target.value = ''
  }

  const removeOtherDocument = (index: number) => {
    setOtherDocuments(prev => prev.filter((_, i) => i !== index))
  }

  const viewSavedDocument = async (doc: SavedDocument) => {
    setLoadingPreview(doc.requirement_key)
    try {
      const { data, error } = await supabase.storage
        .from('requirements')
        .createSignedUrl(doc.file_path, 3600) // 1 hour expiry

      if (error) {
        console.error('Error getting signed URL:', error)
        setError('Failed to load document preview. Please try again.')
        return
      }

      if (data?.signedUrl) {
        // Determine preview type
        const isImage = doc.file_type.startsWith('image/')
        const isPdf = doc.file_type === 'application/pdf'
        const isWord = doc.file_type === 'application/msword' ||
          doc.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          doc.file_name.endsWith('.doc') ||
          doc.file_name.endsWith('.docx')
        const isExcel = doc.file_type === 'application/vnd.ms-excel' ||
          doc.file_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          doc.file_name.endsWith('.xls') ||
          doc.file_name.endsWith('.xlsx')
        const isPowerPoint = doc.file_type === 'application/vnd.ms-powerpoint' ||
          doc.file_type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
          doc.file_name.endsWith('.ppt') ||
          doc.file_name.endsWith('.pptx')

        if (isImage || isPdf) {
          // Show images and PDFs directly
          setPreviewUrl(data.signedUrl)
          setPreviewType(doc.file_type)
          setPreviewName(doc.file_name)
        } else if (isWord || isExcel || isPowerPoint) {
          // Use Microsoft Office Online viewer for Office documents
          const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(data.signedUrl)}`
          setPreviewUrl(officeViewerUrl)
          setPreviewType('office')
          setPreviewName(doc.file_name)
        } else {
          // For other files, use Google Docs viewer as fallback
          const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(data.signedUrl)}&embedded=true`
          setPreviewUrl(googleViewerUrl)
          setPreviewType('google')
          setPreviewName(doc.file_name)
        }
      }
    } catch (err) {
      console.error('Error viewing document:', err)
      setError('Failed to load document preview.')
    } finally {
      setLoadingPreview(null)
    }
  }

  const closePreview = () => {
    setPreviewUrl(null)
    setPreviewType(null)
    setPreviewName(null)
  }

  const handleSaveDraft = async () => {
    if (!orderDetails || !user) return

    setSavingDraft(true)
    setError(null)

    try {
      // Get or create customer
      let customerId: string

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (customerError || !customerData) {
        // Create customer
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            user_id: user.id,
            email: user.email || '',
            name: (user.user_metadata as { name?: string })?.name || user.email?.split('@')[0] || 'Customer',
          })
          .select()
          .single()

        if (createError || !newCustomer) {
          throw new Error('Failed to create customer record')
        }
        customerId = newCustomer.id
      } else {
        customerId = customerData.id
      }

      // Generate draft ID if creating new one
      const draftId = orderDetails.draftId || crypto.randomUUID()

      // Upload files to storage if any are selected
      const uploadedFilesInfo: Array<{
        requirement_key: string
        title: string
        file_path: string
        file_name: string
        file_size: number
        file_type: string
        uploaded_at: string
      }> = []

      for (const doc of uploadedDocuments) {
        try {
          const sanitizedFileName = doc.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
          const filePath = `drafts/${draftId}/${doc.requirementKey}/${Date.now()}_${sanitizedFileName}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('requirements')
            .upload(filePath, doc.file)

          if (uploadError) {
            console.error('File upload error:', uploadError)
            continue
          }

          if (uploadData) {
            uploadedFilesInfo.push({
              requirement_key: doc.requirementKey,
              title: doc.title,
              file_path: uploadData.path,
              file_name: doc.fileName,
              file_size: doc.fileSize,
              file_type: doc.fileType,
              uploaded_at: doc.uploadedAt,
            })
          }
        } catch (uploadErr) {
          console.warn('File upload failed:', uploadErr)
        }
      }

      // Upload "other" documents that have a file
      const otherUploaded: SavedDocument[] = []
      for (let i = 0; i < otherDocuments.length; i++) {
        const doc = otherDocuments[i]
        const hasFile = 'file' in doc && doc.file
        if (hasFile && doc.file) {
          try {
            const sanitized = (doc as UploadedDocument).fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
            const filePath = `drafts/${draftId}/other_${i}/${Date.now()}_${sanitized}`
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('requirements')
              .upload(filePath, (doc as UploadedDocument).file)
            if (!uploadError && uploadData) {
              otherUploaded.push({
                requirement_key: `other_${i}`,
                title: (doc as UploadedDocument).title || (doc as UploadedDocument).fileName,
                file_path: uploadData.path,
                file_name: (doc as UploadedDocument).fileName,
                file_size: (doc as UploadedDocument).fileSize,
                file_type: (doc as UploadedDocument).fileType,
                uploaded_at: (doc as UploadedDocument).uploadedAt,
              })
            }
          } catch (_) { /* ignore */ }
        } else if ('file_path' in doc && doc.file_path) {
          otherUploaded.push({ ...doc, requirement_key: doc.requirement_key || `other_${i}` })
        }
      }

      // Combine newly uploaded files with previously saved files from draft
      const uploadedRequirementKeys = uploadedFilesInfo.map(f => f.requirement_key)
      const preservedSavedDocs = savedDocuments.filter(
        doc => !uploadedRequirementKeys.includes(doc.requirement_key)
      )

      // Merge all files: preserved saved docs + newly uploaded docs + other docs
      const allDraftFiles = [...preservedSavedDocs, ...uploadedFilesInfo, ...otherUploaded]

      // Check if we're updating an existing draft or creating new one
      if (orderDetails.draftId) {
        // Update existing draft
        const { error: updateError } = await supabase
          .from('draft_orders')
          .update({
            quantity: orderDetails.quantity,
            customer_type: customerType,
            notes: notes,
            uploaded_files: allDraftFiles,
            updated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Reset expiry
          })
          .eq('id', orderDetails.draftId)

        if (updateError) throw updateError
      } else {
        // Create new draft
        const { error: insertError } = await supabase
          .from('draft_orders')
          .insert({
            id: draftId,
            customer_id: customerId,
            number_id: orderDetails.numberId,
            quantity: orderDetails.quantity,
            customer_type: customerType,
            notes: notes,
            uploaded_files: allDraftFiles,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })

        if (insertError) throw insertError
      }

      setDraftSaved(true)

      // Show success and redirect after brief delay
      setTimeout(() => {
        router.push('/?draft_saved=true')
      }, 1500)
    } catch (err: any) {
      console.error('Error saving draft:', err)
      setError(err.message || 'Failed to save draft. Please try again.')
    } finally {
      setSavingDraft(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5 shrink-0 text-red-500" />
    }
    if (fileType.startsWith('image/')) {
      return <FileImage className="h-5 w-5 shrink-0 text-blue-500" />
    }
    return <FileText className="h-5 w-5 shrink-0 text-slate-400" />
  }

  // Gate submission: for a new order with no/missing documents, first show a
  // pop-up note letting the customer know the order will still be reviewed.
  const handleSubmitClick = () => {
    if (!existingOrderId && (!hasAnyDocuments || !allRequiredUploaded)) {
      setShowReviewNote(true)
      return
    }
    handleSubmitOrder()
  }

  const handleSubmitOrder = async () => {
    if (!orderDetails || !user) return

    setShowReviewNote(false)
    setSubmitting(true)
    setError(null)

    try {
      const isUpdateExistingOrder = !!existingOrderId
      const orderId = existingOrderId || crypto.randomUUID()

      // Upload new files to Supabase Storage
      const uploadedDocs: Array<{
        requirement_key: string
        title: string
        file_path: string
        file_name: string
        file_size: number
        file_type: string
        uploaded_at: string
      }> = []

      for (const doc of uploadedDocuments) {
        try {
          const sanitizedFileName = doc.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
          const filePath = `orders/${orderId}/${doc.requirementKey}/${Date.now()}_${sanitizedFileName}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('requirements')
            .upload(filePath, doc.file)

          if (uploadError) {
            console.error('File upload error:', uploadError)
            continue
          }

          if (uploadData) {
            uploadedDocs.push({
              requirement_key: doc.requirementKey,
              title: doc.title,
              file_path: uploadData.path,
              file_name: doc.fileName,
              file_size: doc.fileSize,
              file_type: doc.fileType,
              uploaded_at: doc.uploadedAt,
            })
          }
        } catch (uploadErr) {
          console.warn('File upload not configured or failed:', uploadErr)
        }
      }

      if (isUpdateExistingOrder) {
        // ALWAYS fetch current order documents from database right before updating
        // This ensures we have the absolute latest documents, including from previous edits
        console.log(`Fetching current documents for order ${orderId} before update`)
        const { data: currentOrderData, error: fetchError } = await supabase
          .from('orders')
          .select('uploaded_documents')
          .eq('id', orderId)
          .single()

        if (fetchError) {
          console.error('Error fetching current order documents:', fetchError)
          throw new Error(`Failed to fetch current order documents: ${fetchError.message}`)
        }

        // Get ALL existing documents from the order (this is the source of truth)
        let existingDocsFromOrder: SavedDocument[] = []
        let existingOtherFromOrder: SavedDocument[] = []
        if (currentOrderData?.uploaded_documents) {
          const ud = currentOrderData.uploaded_documents as { documents?: SavedDocument[]; other_documents?: SavedDocument[] }
          if (ud.other_documents && Array.isArray(ud.other_documents)) {
            existingOtherFromOrder = ud.other_documents
          }
          if (ud.documents && Array.isArray(ud.documents)) {
            // Filter out any null/undefined documents and ensure they have required fields
            existingDocsFromOrder = ud.documents.filter((doc): doc is SavedDocument => {
              return doc !== null &&
                doc !== undefined &&
                typeof doc === 'object' &&
                doc.file_path !== undefined &&
                doc.file_path !== null
            })
            console.log(`Found ${existingDocsFromOrder.length} existing documents in order database (filtered from ${ud.documents.length} total)`)
            // Log each document for debugging
            existingDocsFromOrder.forEach((doc, idx) => {
              console.log(`  [${idx}] ${doc.title || doc.file_name || 'Untitled'} (${doc.requirement_key || 'no key'}) - ${doc.file_path}`)
            })
          } else {
            console.log('No documents array in uploaded_documents, starting fresh')
            console.log('uploaded_documents structure:', JSON.stringify(currentOrderData.uploaded_documents, null, 2))
          }
        } else {
          console.log('No uploaded_documents field in order, starting fresh')
          console.log('Order data structure:', Object.keys(currentOrderData || {}))
        }

        // Merge new uploads with ALL existing documents
        // We keep ALL documents - both old and new
        // Use file_path as unique identifier to avoid true duplicates (same file uploaded twice)
        const existingDocsMap = new Map<string, SavedDocument>()

        // Add all existing documents from the order (source of truth)
        existingDocsFromOrder.forEach(doc => {
          if (doc && doc.file_path) {
            existingDocsMap.set(doc.file_path, doc)
          }
        })

        // Add documents selected from customer documents (savedDocuments state)
        // These are documents the user selected from their previous orders
        savedDocuments.forEach((doc) => {
          if (!doc || !doc.file_path) {
            return
          }
          // Only add if not already present (by file_path)
          if (!existingDocsMap.has(doc.file_path)) {
            existingDocsMap.set(doc.file_path, doc)
          }
        })

        // Add new uploads (they will have different file_paths, so they'll be added)
        uploadedDocs.forEach(newDoc => {
          if (newDoc.file_path && !existingDocsMap.has(newDoc.file_path)) {
            existingDocsMap.set(newDoc.file_path, newDoc)
          }
        })

        const allDocuments = Array.from(existingDocsMap.values())

        // Ensure all documents have the correct structure
        const validatedDocuments: SavedDocument[] = allDocuments
          .filter(doc => doc && doc.file_path)
          .map(doc => ({
            requirement_key: doc.requirement_key || '',
            title: doc.title || doc.file_name || 'Untitled Document',
            file_path: doc.file_path,
            file_name: doc.file_name || doc.file_path.split('/').pop() || 'unknown',
            file_size: doc.file_size || 0,
            file_type: doc.file_type || 'application/octet-stream',
            uploaded_at: doc.uploaded_at || new Date().toISOString(),
          }))

        // Update existing order: merge new uploads with existing documents
        // Ensure the documents array matches the exact database structure
        // Structure: title, file_name, file_path, file_size, file_type, uploaded_at, requirement_key
        const documentsArray = validatedDocuments.map(doc => ({
          title: doc.title || doc.file_name || 'Untitled Document',
          file_name: doc.file_name || doc.file_path.split('/').pop() || 'unknown',
          file_path: doc.file_path,
          file_size: doc.file_size || 0,
          file_type: doc.file_type || 'application/octet-stream',
          uploaded_at: doc.uploaded_at || new Date().toISOString(),
          requirement_key: doc.requirement_key || '',
        }))


        // Validate each document has all required fields
        const validatedDocsArray = documentsArray.filter((doc) => {
          return doc.title &&
            doc.file_name &&
            doc.file_path &&
            doc.file_size !== undefined &&
            doc.file_type &&
            doc.uploaded_at &&
            doc.requirement_key
        })

        if (validatedDocsArray.length !== documentsArray.length) {
          throw new Error(`Validation failed: ${documentsArray.length - validatedDocsArray.length} documents missing required fields`)
        }

        // Create the exact JSONB structure matching database
        // CRITICAL: Ensure the documents array is a proper JSON array
        // Sometimes Supabase has issues with nested arrays, so we'll be very explicit
        const documentsArrayForJsonb = validatedDocsArray.map(doc => {
          // Create each document object with exact field order matching database
          return {
            title: String(doc.title || ''),
            file_name: String(doc.file_name || ''),
            file_path: String(doc.file_path || ''),
            file_size: Number(doc.file_size || 0),
            file_type: String(doc.file_type || ''),
            uploaded_at: String(doc.uploaded_at || new Date().toISOString()),
            requirement_key: String(doc.requirement_key || ''),
          }
        })

        // Build other_documents for update: upload new ones + keep existing
        const otherDocsForUpdate: typeof documentsArrayForJsonb = []
        for (let i = 0; i < otherDocuments.length; i++) {
          const doc = otherDocuments[i]
          if ('file' in doc && doc.file) {
            try {
              const sanitized = (doc as UploadedDocument).fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
              const filePath = `orders/${orderId}/other_${i}/${Date.now()}_${sanitized}`
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('requirements')
                .upload(filePath, (doc as UploadedDocument).file)
              if (!uploadError && uploadData) {
                otherDocsForUpdate.push({
                  title: (doc as UploadedDocument).title || (doc as UploadedDocument).fileName,
                  file_name: (doc as UploadedDocument).fileName,
                  file_path: uploadData.path,
                  file_size: (doc as UploadedDocument).fileSize,
                  file_type: (doc as UploadedDocument).fileType,
                  uploaded_at: (doc as UploadedDocument).uploadedAt,
                  requirement_key: `other_${i}`,
                })
              }
            } catch (_) { /* ignore */ }
          } else if ('file_path' in doc && doc.file_path) {
            otherDocsForUpdate.push({
              title: (doc as SavedDocument).title || (doc as SavedDocument).file_name,
              file_name: (doc as SavedDocument).file_name,
              file_path: (doc as SavedDocument).file_path,
              file_size: (doc as SavedDocument).file_size,
              file_type: (doc as SavedDocument).file_type,
              uploaded_at: (doc as SavedDocument).uploaded_at,
              requirement_key: (doc as SavedDocument).requirement_key || `other_${i}`,
            })
          }
        }
        // Keep existing other_documents that are not in state (e.g. from a previous submit)
        existingOtherFromOrder.forEach((doc) => {
          if (doc && doc.file_path && !otherDocsForUpdate.some((d) => d.file_path === doc.file_path)) {
            otherDocsForUpdate.push({
              title: doc.title || doc.file_name,
              file_name: doc.file_name,
              file_path: doc.file_path,
              file_size: doc.file_size || 0,
              file_type: doc.file_type || 'application/octet-stream',
              uploaded_at: doc.uploaded_at || new Date().toISOString(),
              requirement_key: doc.requirement_key || '',
            })
          }
        })

        const jsonbPayload = {
          documents: documentsArrayForJsonb,
          customer_type: String(customerType),
          notes: String(notes || ''),
          other_documents: otherDocsForUpdate.map((d) => ({
            title: String(d.title || ''),
            file_name: String(d.file_name || ''),
            file_path: String(d.file_path || ''),
            file_size: Number(d.file_size || 0),
            file_type: String(d.file_type || ''),
            uploaded_at: String(d.uploaded_at || new Date().toISOString()),
            requirement_key: String(d.requirement_key || ''),
          })),
        }

        // Try using database function first (if available) - this is more reliable for JSONB
        let updateError: any = null
        let updateData: any = null

        // Try using database function first (if available) - this is more reliable for JSONB
        try {
          const rpcResult = await supabase.rpc('update_order_documents', {
            p_order_id: orderId,
            p_uploaded_documents: jsonbPayload
          })

          if (!rpcResult.error && rpcResult.data) {
            const rpcDocs = (rpcResult.data as { documents?: any[] })?.documents || []
            if (rpcDocs.length === documentsArrayForJsonb.length) {
              // Fetch the full order to get proper structure
              const fetchResult = await supabase
                .from('orders')
                .select('uploaded_documents')
                .eq('id', orderId)
                .single()
              if (fetchResult.data) {
                updateData = [fetchResult.data]
                updateError = null
              }
            }
          }
        } catch (rpcErr: any) {
          // RPC function doesn't exist - that's okay, we'll use standard update
        }

        // Fallback to standard update if RPC didn't work
        if (!updateData) {
          const updateResult = await supabase
            .from('orders')
            .update({
              uploaded_documents: jsonbPayload,
              admin_request_changes: null,
              admin_request_changes_at: null,
            })
            .eq('id', orderId)
            .select('uploaded_documents')

          updateError = updateResult.error
          updateData = updateResult.data

          // If update succeeded but no data returned, fetch it separately
          if (!updateError && (!updateData || updateData.length === 0)) {
            const fetchResult = await supabase
              .from('orders')
              .select('uploaded_documents')
              .eq('id', orderId)
              .single()

            if (!fetchResult.error && fetchResult.data) {
              updateData = [fetchResult.data]
            }
          }

          // If the update succeeded but returned wrong document count, try alternative method
          if (!updateError && updateData && updateData.length > 0) {
            const returnedDocs = (updateData[0]?.uploaded_documents as { documents?: any[] })?.documents || []
            if (returnedDocs.length !== documentsArrayForJsonb.length) {
              // Alternative: Update with explicit type casting
              const altPayload = {
                documents: documentsArrayForJsonb.map(d => ({
                  title: String(d.title),
                  file_name: String(d.file_name),
                  file_path: String(d.file_path),
                  file_size: Number(d.file_size),
                  file_type: String(d.file_type),
                  uploaded_at: String(d.uploaded_at),
                  requirement_key: String(d.requirement_key),
                })),
                customer_type: String(customerType),
                notes: String(notes || ''),
              }

              const altResult = await supabase
                .from('orders')
                .update({
                  uploaded_documents: altPayload,
                  admin_request_changes: null,
                  admin_request_changes_at: null,
                })
                .eq('id', orderId)
                .select('uploaded_documents')

              if (!altResult.error && altResult.data && altResult.data.length > 0) {
                const altDocs = (altResult.data[0]?.uploaded_documents as { documents?: any[] })?.documents || []
                if (altDocs.length === documentsArrayForJsonb.length) {
                  updateData = altResult.data
                }
              }
            }
          }
        }

        if (updateError) {
          throw updateError
        }

        // If still no data, try to fetch it
        if (!updateData || updateData.length === 0) {
          const verifyFetch = await supabase
            .from('orders')
            .select('uploaded_documents, id')
            .eq('id', orderId)
            .single()

          if (verifyFetch.data) {
            updateData = [verifyFetch.data]
          } else {
            throw new Error(`Update operation failed: No data returned and order fetch also failed. Error: ${verifyFetch.error?.message || 'Unknown'}`)
          }
        }

        const returnedUd = updateData[0]?.uploaded_documents as { documents?: any[] } | null
        const returnedDocsRaw = returnedUd?.documents || []

        const returnedDocs = returnedDocsRaw.filter((doc: any): doc is SavedDocument => {
          return doc !== null &&
            doc !== undefined &&
            typeof doc === 'object' &&
            doc.file_path !== undefined &&
            doc.file_path !== null
        })

        if (returnedDocs.length !== documentsArrayForJsonb.length) {
          // Try using database function as last resort
          const alternativePayload = {
            documents: documentsArrayForJsonb,
            customer_type: String(customerType),
            notes: String(notes || ''),
          }

          const rpcResult = await supabase.rpc('update_order_documents', {
            p_order_id: orderId,
            p_uploaded_documents: alternativePayload
          })

          if (rpcResult.error) {
            // Fall back to one more standard update attempt
            const finalResult = await supabase
              .from('orders')
              .update({
                uploaded_documents: alternativePayload,
                admin_request_changes: null,
                admin_request_changes_at: null,
              })
              .eq('id', orderId)
              .select('uploaded_documents')

            if (finalResult.data && finalResult.data.length > 0) {
              const finalDocs = (finalResult.data[0]?.uploaded_documents as { documents?: any[] })?.documents || []
              if (finalDocs.length === documentsArrayForJsonb.length) {
                updateData = finalResult.data
              } else {
                throw new Error(`CRITICAL: All update methods failed. Only ${finalDocs.length} of ${documentsArrayForJsonb.length} documents were saved.`)
              }
            } else {
              throw new Error(`CRITICAL: All update methods failed. Expected ${documentsArrayForJsonb.length} documents but update returned no data.`)
            }
          } else {
            // RPC function succeeded - verify the result
            const rpcDocs = (rpcResult.data as { documents?: any[] })?.documents || []
            if (rpcDocs.length === documentsArrayForJsonb.length) {
              // Fetch the full order to get proper structure
              const fetchResult = await supabase
                .from('orders')
                .select('uploaded_documents')
                .eq('id', orderId)
                .single()
              if (fetchResult.data) {
                updateData = [fetchResult.data]
              }
            } else {
              throw new Error(`RPC function also failed: Expected ${documentsArrayForJsonb.length}, got ${rpcDocs.length}`)
            }
          }
        }

        // Verify the update was successful by fetching the order again
        await new Promise(resolve => setTimeout(resolve, 500))

        const { data: verifyData, error: verifyError } = await supabase
          .from('orders')
          .select('uploaded_documents')
          .eq('id', orderId)
          .single()

        if (!verifyError && verifyData) {
          const verifyUd = verifyData?.uploaded_documents as { documents?: SavedDocument[] } | null
          const verifyDocs = (verifyUd?.documents && Array.isArray(verifyUd.documents))
            ? verifyUd.documents.filter((doc): doc is SavedDocument => {
              return doc !== null &&
                doc !== undefined &&
                typeof doc === 'object' &&
                doc.file_path !== undefined &&
                doc.file_path !== null
            })
            : []

          if (verifyDocs.length !== validatedDocuments.length) {
            throw new Error(`Document count mismatch after update: Expected ${validatedDocuments.length}, got ${verifyDocs.length}`)
          }
        }
        setSuccess('Additional documents uploaded successfully.')
        setTimeout(() => router.push('/orders?updated=true'), 1500)
        return
      }

      // For new orders, use savedDocuments from state
      const existingDocs = savedDocuments.map(doc => ({
        requirement_key: doc.requirement_key,
        title: doc.title,
        file_path: doc.file_path,
        file_name: doc.file_name,
        file_size: doc.file_size,
        file_type: doc.file_type,
        uploaded_at: doc.uploaded_at,
      }))
      const allDocuments = [...uploadedDocs, ...existingDocs]

      // Upload and collect "other" documents (max 10)
      const otherDocsForOrder: Array<{ requirement_key: string; title: string; file_path: string; file_name: string; file_size: number; file_type: string; uploaded_at: string }> = []
      for (let i = 0; i < otherDocuments.length; i++) {
        const doc = otherDocuments[i]
        if ('file' in doc && doc.file) {
          try {
            const sanitized = (doc as UploadedDocument).fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
            const filePath = `orders/${orderId}/other_${i}/${Date.now()}_${sanitized}`
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('requirements')
              .upload(filePath, (doc as UploadedDocument).file)
            if (!uploadError && uploadData) {
              otherDocsForOrder.push({
                requirement_key: `other_${i}`,
                title: (doc as UploadedDocument).title || (doc as UploadedDocument).fileName,
                file_path: uploadData.path,
                file_name: (doc as UploadedDocument).fileName,
                file_size: (doc as UploadedDocument).fileSize,
                file_type: (doc as UploadedDocument).fileType,
                uploaded_at: (doc as UploadedDocument).uploadedAt,
              })
            }
          } catch (_) { /* ignore */ }
        } else if ('file_path' in doc && doc.file_path) {
          otherDocsForOrder.push({
            requirement_key: (doc as SavedDocument).requirement_key || `other_${i}`,
            title: (doc as SavedDocument).title,
            file_path: (doc as SavedDocument).file_path,
            file_name: (doc as SavedDocument).file_name,
            file_size: (doc as SavedDocument).file_size,
            file_type: (doc as SavedDocument).file_type,
            uploaded_at: (doc as SavedDocument).uploaded_at,
          })
        }
      }

      // New order flow: get or create customer
      let customerId: string
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (customerError || !customerData) {
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            user_id: user.id,
            email: user.email || '',
            name: (user.user_metadata as { name?: string })?.name || user.email?.split('@')[0] || 'Customer',
          })
          .select()
          .single()

        if (createError || !newCustomer) {
          throw new Error('Failed to create customer record')
        }
        customerId = newCustomer.id
      } else {
        customerId = customerData.id
      }

      const belowMoqAtOrder = !!orderDetails.belowMoq
      const adminNotesParts: string[] = []
      if (belowMoqAtOrder) {
        adminNotesParts.push('[Below MOQ — requires admin approval]')
      }
      if (notes.trim()) {
        adminNotesParts.push(`Customer notes: ${notes.trim()}`)
      }
      const adminNotesValue = adminNotesParts.length > 0 ? adminNotesParts.join(' ') : null

      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          customer_id: customerId,
          number_id: orderDetails.numberId,
          quantity: orderDetails.quantity,
          status: 'documentation_review',
          below_moq_at_order: belowMoqAtOrder,
          mrc_at_order: orderDetails.mrc,
          nrc_at_order: orderDetails.nrc,
          currency_at_order: orderDetails.currency,
          uploaded_documents: {
            documents: allDocuments,
            customer_type: customerType,
            notes: notes,
            other_documents: otherDocsForOrder,
          },
          admin_notes: adminNotesValue,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Fetch company_name for notification email
      let companyName: string | undefined
      try {
        const { data: cust } = await supabase
          .from('customers')
          .select('company_name')
          .eq('id', customerId)
          .single()
        companyName = cust?.company_name?.trim() || undefined
      } catch {
        // ignore; company name is optional
      }

      // Send email notification to admin
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_order',
            data: {
              customerName: (user.user_metadata as { name?: string })?.name || user.email,
              customerEmail: user.email,
              companyName,
              country: orderDetails.countryName,
              numberType: orderDetails.numberType,
              quantity: orderDetails.quantity,
              mrc: orderDetails.mrc,
              nrc: orderDetails.nrc,
              currency: orderDetails.currency,
              documentsUploaded: allDocuments.length,
              customerType: customerType,
              belowMoq: belowMoqAtOrder,
            },
          }),
        })
      } catch (emailErr) {
        console.warn('Failed to send email notification:', emailErr)
      }

      const moqReviewSuffix = belowMoqAtOrder
        ? ` (quantity ${orderDetails.quantity} is below MOQ ${orderDetails.moq} — requires MOQ approval)`
        : ''

      // Send in-app notification to all admins
      try {
        const { data: adminUsers } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('is_active', true)

        if (adminUsers && adminUsers.length > 0) {
          const notifications = adminUsers.map((admin) => ({
            user_id: admin.user_id,
            type: 'new_order',
            title: belowMoqAtOrder ? 'New Order (Below MOQ)' : 'New Order Received',
            message: `A new order has been placed for ${orderDetails.quantity} ${orderDetails.numberType} number(s) in ${orderDetails.countryName}${moqReviewSuffix}`,
            metadata: {
              order_id: orderId,
              country: orderDetails.countryName,
              number_type: orderDetails.numberType,
              quantity: orderDetails.quantity,
              below_moq: belowMoqAtOrder,
            },
          }))

          await supabase.from('notifications').insert(notifications)
        }
      } catch (notificationErr) {
        console.warn('Failed to send in-app notifications:', notificationErr)
      }

      // Delete draft if this was a draft order
      if (orderDetails.draftId) {
        try {
          await supabase
            .from('draft_orders')
            .delete()
            .eq('id', orderDetails.draftId)
        } catch (deleteErr) {
          console.warn('Failed to delete draft:', deleteErr)
        }
      }

      // Redirect to orders page with success message
      router.push('/orders?success=true')
    } catch (err: any) {
      console.error('Order submission error:', err)
      setError(err.message || 'Failed to submit order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!orderDetails) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#215F9A]/10">
            <Loader2 className="h-5 w-5 animate-spin text-[#215F9A]" />
          </div>
          <p className="text-sm font-medium text-slate-600">Loading order details…</p>
        </div>
      </main>
    )
  }

  const flag = getCountryFlagEmoji(orderDetails.countryCode)

  // Shared primary/secondary/tertiary action set — rendered once for the desktop
  // sticky sidebar and once for the mobile sticky bar. Both call the exact same
  // unmodified handlers; only sizing/labels differ slightly for the smaller bar.
  const renderActions = (compact: boolean) => (
    <div className={compact ? 'flex items-center gap-2' : 'space-y-2.5'}>
      {compact && (
        <button
          onClick={() => router.push('/numbers')}
          disabled={submitting || savingDraft}
          className="shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      )}
      <button
        onClick={handleSaveDraft}
        disabled={submitting || savingDraft || draftSaved}
        className={`flex items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${compact ? 'flex-1 px-4 py-2.5' : 'w-full px-4 py-3'}`}
      >
        {savingDraft ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          'Save as draft'
        )}
      </button>
      <button
        onClick={handleSubmitClick}
        disabled={submitting || savingDraft || draftSaved}
        className={`flex items-center justify-center gap-2 rounded-lg bg-[#215F9A] text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1b4e80] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${compact ? 'flex-[1.4] px-4 py-2.5' : 'w-full px-4 py-3'}`}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {existingOrderId ? 'Uploading…' : 'Submitting…'}
          </>
        ) : (
          <>
            {existingOrderId ? 'Upload additional documents' : 'Submit order'}
            {!existingOrderId && !compact && <ArrowRight className="h-4 w-4" />}
          </>
        )}
      </button>
      {!compact && (
        <button
          onClick={() => router.push('/numbers')}
          disabled={submitting || savingDraft}
          className="flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      )}
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-28 pt-6 lg:pb-12">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <BackButton href="/numbers" label="Back to Numbers" />

        <div className="mb-6 sm:mb-8">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F97316]" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#215F9A]">
              Voxco Number Portal
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Complete Your Order</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Upload required documents to proceed with your order.
          </p>
        </div>

        {(error || success || draftSaved) && (
          <div className="mb-6 space-y-3">
            {error && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{error}</span>
                <button onClick={() => setError(null)} aria-label="Dismiss" className="shrink-0 text-red-400 transition-colors hover:text-red-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}
            {draftSaved && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">Draft saved successfully!</p>
                  <p className="text-xs text-emerald-600">Redirecting to dashboard…</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          {/* Main workflow column */}
          <div className="space-y-6">
            {/* Customer Type Selection */}
            <SectionCard
              icon={User}
              title="Customer type"
              description="Select your customer type to see the relevant document requirements."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={() => {
                    setCustomerType('individual')
                    setUploadedDocuments([]) // Clear uploads when changing type
                  }}
                  aria-pressed={customerType === 'individual'}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A]/30 ${customerType === 'individual'
                    ? 'border-[#215F9A] bg-[#215F9A]/5'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${customerType === 'individual' ? 'bg-[#215F9A] text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <User className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-semibold ${customerType === 'individual' ? 'text-[#215F9A]' : 'text-slate-700'}`}>Individual</span>
                    <span className="block text-xs text-slate-500">Personal documentation</span>
                  </span>
                  {customerType === 'individual' && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#215F9A]" />}
                </button>
                <button
                  onClick={() => {
                    setCustomerType('business')
                    setUploadedDocuments([]) // Clear uploads when changing type
                  }}
                  aria-pressed={customerType === 'business'}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A]/30 ${customerType === 'business'
                    ? 'border-[#215F9A] bg-[#215F9A]/5'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${customerType === 'business' ? 'bg-[#215F9A] text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Building2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-semibold ${customerType === 'business' ? 'text-[#215F9A]' : 'text-slate-700'}`}>Business</span>
                    <span className="block text-xs text-slate-500">Company documentation</span>
                  </span>
                  {customerType === 'business' && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#215F9A]" />}
                </button>
              </div>
            </SectionCard>

            {/* Required Documents */}
            <SectionCard icon={ClipboardCheck} title={`Required documents for ${orderDetails.countryName}`}>
              {loadingRequirements ? (
                <div className="flex items-center justify-center gap-3 py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-[#215F9A]" />
                  <span className="text-sm font-medium text-slate-600">Loading requirements…</span>
                </div>
              ) : requiredDocuments.length > 0 ? (
                <div>
                  {/* Address Requirements Notice */}
                  {requirements?.number_allocation?.address_requirements && (
                    <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-100 bg-amber-50/60 px-3.5 py-3">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Address requirements</p>
                        <p className="mt-0.5 text-sm text-amber-700">{requirements.number_allocation.address_requirements}</p>
                      </div>
                    </div>
                  )}

                  {/* Document Upload Slots */}
                  <p className="mb-4 text-sm text-slate-500">
                    Please upload the following documents. Accepted formats: PDF, JPG, PNG, DOC.
                    {customerDocuments.length > 0 && (
                      <span className="ml-1 text-[#215F9A]">
                        You can also choose from your previously uploaded documents.
                      </span>
                    )}
                  </p>

                  <div className="space-y-3">
                    {requiredDocuments.map((requirement) => {
                      const uploadedDoc = uploadedDocuments.find(doc => doc.requirementKey === requirement.key)
                      const savedDoc = savedDocuments.find(doc => doc.requirement_key === requirement.key)
                      const hasDocument = uploadedDoc || savedDoc
                      const isUploading = uploadingFile === requirement.key

                      return (
                        <div
                          key={requirement.key}
                          className={`rounded-xl border p-4 transition-colors ${hasDocument
                            ? 'border-emerald-200 bg-emerald-50/30'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 flex-1 gap-2.5">
                              {hasDocument ? (
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                              ) : (
                                <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
                              )}
                              <div className="min-w-0">
                                <span className="font-medium text-slate-800 break-words">{requirement.title}</span>

                                {uploadedDoc && (
                                  <div className="mt-2 flex items-center gap-2.5 min-w-0">
                                    {getFileIcon(uploadedDoc.fileType)}
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-700 break-all">{uploadedDoc.fileName}</p>
                                      <p className="text-xs text-slate-500">{formatFileSize(uploadedDoc.fileSize)}</p>
                                    </div>
                                  </div>
                                )}

                                {!uploadedDoc && savedDoc && (
                                  <div className="mt-2 flex items-center gap-2.5 min-w-0">
                                    {getFileIcon(savedDoc.file_type)}
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-700 break-all">{savedDoc.file_name}</p>
                                      <p className="text-xs text-slate-500">
                                        {formatFileSize(savedDoc.file_size)}
                                        <span className="ml-2 text-[#215F9A]">(saved from draft)</span>
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {!hasDocument && (
                                  <p className="mt-1 text-xs font-medium text-amber-600">Missing</p>
                                )}
                              </div>
                            </div>

                            <div className="relative flex w-full items-center gap-2 sm:w-auto">
                              {isUploading ? (
                                <div className="flex items-center gap-2 text-[#215F9A]">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="text-sm">Uploading…</span>
                                </div>
                              ) : (
                                <>
                                  <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
                                    {/* Upload new file button */}
                                    <input
                                      type="file"
                                      id={`file-${requirement.key}`}
                                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                      onChange={(e) => handleFileUpload(e, requirement)}
                                      className="hidden"
                                    />
                                    <label
                                      htmlFor={`file-${requirement.key}`}
                                      className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${hasDocument
                                        ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                        : 'bg-[#215F9A] text-white hover:bg-[#1b4e80]'
                                        }`}
                                    >
                                      <Upload className="h-3.5 w-3.5" />
                                      {hasDocument ? 'Replace' : 'Upload'}
                                    </label>

                                    {/* Choose from existing button - show if customer has existing docs */}
                                    {customerDocuments.length > 0 && (
                                      <button
                                        onClick={() => setShowDocPicker(requirement.key)}
                                        className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${hasDocument
                                          ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                          : 'border border-[#215F9A]/30 bg-[#215F9A]/5 text-[#215F9A] hover:bg-[#215F9A]/10'
                                          }`}
                                      >
                                        {hasDocument ? 'Use Other' : 'Use Existing'}
                                      </button>
                                    )}

                                    {uploadedDoc && (
                                      <button
                                        onClick={() => removeDocument(requirement.key)}
                                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                        title="Remove file"
                                        aria-label="Remove file"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                    {!uploadedDoc && savedDoc && (
                                      <>
                                        <button
                                          onClick={() => viewSavedDocument(savedDoc)}
                                          disabled={loadingPreview === savedDoc.requirement_key}
                                          className="rounded-lg p-2 text-[#215F9A] transition-colors hover:bg-blue-50 disabled:opacity-50"
                                          title="View file"
                                          aria-label="View file"
                                        >
                                          {loadingPreview === savedDoc.requirement_key ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Eye className="h-4 w-4" />
                                          )}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSavedDocuments(prev => prev.filter(doc => doc.requirement_key !== requirement.key))
                                          }}
                                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                          title="Remove saved file"
                                          aria-label="Remove saved file"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  {/* Document Picker Dropdown */}
                                  {showDocPicker === requirement.key && (
                                    <div className="absolute left-0 top-full z-10 mt-2 w-full max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-lg sm:left-auto sm:right-0 sm:w-80">
                                      <div className="flex items-center justify-between border-b border-slate-100 p-3">
                                        <span className="text-sm font-medium text-slate-700">Select from your documents</span>
                                        <button
                                          onClick={() => setShowDocPicker(null)}
                                          className="text-slate-400 hover:text-slate-600"
                                          aria-label="Close"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                      <div className="max-h-64 overflow-y-auto">
                                        {customerDocuments.length === 0 ? (
                                          <p className="p-4 text-center text-sm text-slate-500">No documents available</p>
                                        ) : (
                                          <div className="p-2">
                                            {customerDocuments.map((doc) => (
                                              <button
                                                key={doc.id}
                                                onClick={() => selectExistingDocument(doc, requirement.key, requirement.title)}
                                                className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-slate-50"
                                              >
                                                {getFileIcon(doc.file_type)}
                                                <div className="min-w-0 flex-1">
                                                  <p className="truncate text-sm font-medium text-slate-800">{doc.file_name}</p>
                                                  <p className="text-xs text-slate-500">
                                                    {doc.title} • {formatFileSize(doc.file_size)}
                                                    {doc.is_verified && (
                                                      <span className="ml-2 text-emerald-600">✓ Verified</span>
                                                    )}
                                                  </p>
                                                </div>
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Document Status Info */}
                  {requiredDocuments.length > 0 && !allRequiredUploaded && (
                    <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>
                        Documents are optional — you can submit your order without uploading all documents, but your order may take longer to process. Alternatively, save as a draft and upload documents later.
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-slate-600">No specific document requirements for {orderDetails.countryName}.</p>
                  <p className="text-xs text-slate-500">You can proceed with your order.</p>
                </div>
              )}

              {/* Other documents (optional, up to 10) — integrated as a continuation of the same workflow */}
              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="mb-1 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-slate-400" />
                  <h4 className="text-sm font-semibold text-slate-700">
                    Other documents <span className="font-normal text-slate-400">(optional, up to {MAX_OTHER_DOCS})</span>
                  </h4>
                </div>
                <p className="mb-4 text-sm text-slate-500">Add any additional documents beyond the required list above.</p>
                {otherDocuments.length > 0 && (
                  <ul className="mb-4 space-y-2">
                    {otherDocuments.map((doc, index) => (
                      <li key={index} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {getFileIcon('file_path' in doc ? doc.file_type : (doc as UploadedDocument).fileType)}
                          <span className="truncate text-sm font-medium text-slate-700">
                            {'file_name' in doc ? (doc as SavedDocument).file_name : (doc as UploadedDocument).fileName}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatFileSize('file_size' in doc ? (doc as SavedDocument).file_size : (doc as UploadedDocument).fileSize)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeOtherDocument(index)}
                          className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Remove"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {otherDocuments.length < MAX_OTHER_DOCS && (
                  <div>
                    <input
                      type="file"
                      id="other-doc-upload"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleOtherFileUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="other-doc-upload"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      {uploadingOtherFile ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5" />
                          Add other document
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Additional Notes */}
            <SectionCard icon={FileText} title="Additional notes" description="Optional — add any special requests or context for our team.">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional information or special requests..."
                className="h-28 w-full resize-none rounded-lg border border-slate-300 p-3 text-sm text-slate-900 transition-colors focus:border-[#215F9A] focus:outline-none focus:ring-2 focus:ring-[#215F9A]/20"
              />
            </SectionCard>
          </div>

          {/* Sticky sidebar: order summary, progress, actions */}
          <div className="space-y-5 lg:sticky lg:top-6">
            <SectionCard icon={Hash} title="Order summary">
              <div className="space-y-5">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Number</p>
                  <p className="text-sm font-semibold text-slate-900">{orderDetails.numberType}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{orderDetails.smsCapability} · {orderDetails.direction}</p>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Location</p>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    {flag && <span aria-hidden="true">{flag}</span>}
                    {orderDetails.countryName} <span className="font-normal text-slate-400">({orderDetails.countryCode})</span>
                  </p>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Quantity</p>
                  <p className="text-sm font-semibold tabular-nums text-slate-900">{orderDetails.quantity}</p>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pricing</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">MRC</span>
                      <span className="tabular-nums font-medium text-slate-700">{orderDetails.currency} {formatDecimal(orderDetails.mrc, 2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">NRC</span>
                      <span className="tabular-nums font-medium text-slate-700">{orderDetails.currency} {formatDecimal(orderDetails.nrc, 2)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm font-medium text-slate-700">Total recurring</span>
                    <span className="text-base font-bold tabular-nums text-[#215F9A]">
                      {orderDetails.currency} {formatDecimal(orderDetails.mrc * orderDetails.quantity, 2)}
                    </span>
                  </div>
                </div>
              </div>
            </SectionCard>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              {!loadingRequirements && requiredDocuments.length > 0 && (
                <div className="mb-5">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">Requirements</span>
                    <span className="font-semibold text-slate-900">{uploadedDocuments.length} of {requiredDocuments.length} completed</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${allRequiredUploaded ? 'bg-emerald-500' : 'bg-[#215F9A]'}`}
                      style={{ width: `${requiredDocuments.length > 0 ? Math.min(100, (uploadedDocuments.length / requiredDocuments.length) * 100) : 100}%` }}
                    />
                  </div>
                  <p className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${allRequiredUploaded ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {allRequiredUploaded ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {allRequiredUploaded ? 'All required documents uploaded' : 'Missing required documents'}
                  </p>
                </div>
              )}
              <div className="hidden lg:block">{renderActions(false)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] lg:hidden">
        {renderActions(true)}
      </div>

      {/* Missing documents review note */}
      {showReviewNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px]" onClick={() => setShowReviewNote(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Some documents are missing</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Your order will be reviewed, subject to submission of any necessary documents.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                onClick={handleSubmitOrder}
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#215F9A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1b4e80] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Proceed with order'
                )}
              </button>
              <button
                onClick={() => setShowReviewNote(false)}
                disabled={submitting}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Upload documents
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/75 transition-opacity"
              onClick={closePreview}
            />

            {/* Preview Content */}
            <div className="relative h-[90vh] w-full max-w-5xl">
              <button
                onClick={closePreview}
                aria-label="Close preview"
                className="absolute -top-12 right-0 z-10 rounded-lg p-2 text-white transition-colors hover:text-slate-300"
              >
                <X className="h-6 w-6" />
              </button>

              {previewName && (
                <p className="absolute -top-12 left-0 max-w-[70%] truncate text-sm text-white">
                  {previewName}
                </p>
              )}

              {previewType === 'application/pdf' || previewType === 'office' || previewType === 'google' ? (
                <iframe
                  src={previewUrl}
                  title={previewName || 'Document Preview'}
                  className="h-full w-full rounded-lg bg-white shadow-2xl"
                  style={{ minHeight: '80vh' }}
                  allowFullScreen
                />
              ) : previewType?.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={previewName || 'Preview'}
                  className="mx-auto max-h-[80vh] w-auto rounded-lg shadow-2xl"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  title={previewName || 'Document Preview'}
                  className="h-full w-full rounded-lg bg-white shadow-2xl"
                  style={{ minHeight: '80vh' }}
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
