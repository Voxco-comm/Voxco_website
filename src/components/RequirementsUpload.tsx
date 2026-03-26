'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'
import BackButton from './BackButton'
import { formatDecimal } from '@/lib/utils/formatNumber'

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
    const draftId = searchParams.get('draftId')
    const orderId = searchParams.get('orderId')

    if (numberId && quantity) {
      setOrderDetails({
        numberId,
        quantity: parseInt(quantity),
        countryName: countryName || '',
        countryCode: countryCode || '',
        countryId: countryId || '',
        numberType: numberType || '',
        smsCapability: smsCapability || '',
        direction: direction || '',
        mrc: parseFloat(mrc || '0'),
        nrc: parseFloat(nrc || '0'),
        currency: currency || 'USD',
        moq: parseInt(moq || '1'),
        draftId: draftId || undefined,
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

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(`File "${file.name}" is too large. Maximum size is 10MB.`)
      return
    }

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
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.')
      return
    }
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
      return (
        <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10.92,12.31C10.68,11.54 10.15,9.08 11.55,9.04C12.95,9 12.03,12.16 12.03,12.16C12.42,13.65 14.05,14.72 14.05,14.72C14.55,14.57 17.4,14.24 17,15.72C16.57,17.2 13.5,15.81 13.5,15.81C11.55,15.95 10.09,16.47 10.09,16.47C8.96,18.58 7.64,19.5 7.1,18.61C6.43,17.5 9.23,16.07 9.23,16.07C10.68,13.72 10.9,12.35 10.92,12.31Z" />
        </svg>
      )
    }
    if (fileType.startsWith('image/')) {
      return (
        <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    }
    return (
      <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }

  const handleSubmitOrder = async () => {
    if (!orderDetails || !user) return

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

      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          customer_id: customerId,
          number_id: orderDetails.numberId,
          quantity: orderDetails.quantity,
          status: 'documentation_review',
          mrc_at_order: orderDetails.mrc,
          nrc_at_order: orderDetails.nrc,
          currency_at_order: orderDetails.currency,
          uploaded_documents: {
            documents: allDocuments,
            customer_type: customerType,
            notes: notes,
            other_documents: otherDocsForOrder,
          },
          admin_notes: notes ? `Customer notes: ${notes}` : null,
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
            },
          }),
        })
      } catch (emailErr) {
        console.warn('Failed to send email notification:', emailErr)
      }

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
            title: 'New Order Received',
            message: `A new order has been placed for ${orderDetails.quantity} ${orderDetails.numberType} number(s) in ${orderDetails.countryName}`,
            metadata: {
              order_id: orderId,
              country: orderDetails.countryName,
              number_type: orderDetails.numberType,
              quantity: orderDetails.quantity,
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
      <main className="bg-gray-50 min-h-screen py-12 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-gray-50 min-h-screen py-12 px-8">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/numbers" label="Back to Numbers" />

        <section className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#215F9A] mb-2">Complete Your Order</h2>
          <p className="text-gray-600">Upload required documents to proceed with your order</p>
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
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-[#215F9A] mb-4">Order Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Country</p>
              <p className="font-medium">{orderDetails.countryName} ({orderDetails.countryCode})</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Number Type</p>
              <p className="font-medium">{orderDetails.numberType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">SMS/Voice</p>
              <p className="font-medium">{orderDetails.smsCapability}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Direction</p>
              <p className="font-medium">{orderDetails.direction}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Quantity</p>
              <p className="font-medium">{orderDetails.quantity}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">MRC</p>
              <p className="font-medium">{orderDetails.currency} {formatDecimal(orderDetails.mrc, 2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">NRC</p>
              <p className="font-medium">{orderDetails.currency} {formatDecimal(orderDetails.nrc, 2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total MRC</p>
              <p className="font-semibold text-[#215F9A]">
                {orderDetails.currency} {formatDecimal(orderDetails.mrc * orderDetails.quantity, 2)}
              </p>
            </div>
          </div>
        </div>

        {/* Customer Type Selection */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-[#215F9A] mb-4">Customer Type</h3>
          <p className="text-sm text-gray-600 mb-4">
            Please select your customer type to see the relevant document requirements.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setCustomerType('individual')
                setUploadedDocuments([]) // Clear uploads when changing type
              }}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${customerType === 'individual'
                ? 'border-[#215F9A] bg-blue-50 text-[#215F9A]'
                : 'border-gray-300 hover:border-gray-400'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">Individual</span>
              </div>
            </button>
            <button
              onClick={() => {
                setCustomerType('business')
                setUploadedDocuments([]) // Clear uploads when changing type
              }}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${customerType === 'business'
                ? 'border-[#215F9A] bg-blue-50 text-[#215F9A]'
                : 'border-gray-300 hover:border-gray-400'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="font-medium">Business</span>
              </div>
            </button>
          </div>
        </div>

        {/* Required Documents */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-[#215F9A] mb-4">
            Required Documents for {orderDetails.countryName}
          </h3>

          {loadingRequirements ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-[#215F9A]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="ml-2 text-gray-600">Loading requirements...</span>
            </div>
          ) : requiredDocuments.length > 0 ? (
            <div className="space-y-4">
              {/* Address Requirements Notice */}
              {requirements?.number_allocation?.address_requirements && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="font-medium text-yellow-800">Address Requirements</p>
                      <p className="text-sm text-yellow-700">{requirements.number_allocation.address_requirements}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Document Upload Slots */}
              <p className="text-sm text-gray-600 mb-4">
                Please upload the following documents. Accepted formats: PDF, JPG, PNG, DOC (max 10MB each).
                {customerDocuments.length > 0 && (
                  <span className="text-blue-600 ml-1">
                    You can also choose from your previously uploaded documents.
                  </span>
                )}
              </p>

              {requiredDocuments.map((requirement) => {
                const uploadedDoc = uploadedDocuments.find(doc => doc.requirementKey === requirement.key)
                const savedDoc = savedDocuments.find(doc => doc.requirement_key === requirement.key)
                const hasDocument = uploadedDoc || savedDoc
                const isUploading = uploadingFile === requirement.key

                return (
                  <div
                    key={requirement.key}
                    className={`border-2 rounded-lg p-4 transition-all ${hasDocument
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {hasDocument ? (
                            <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                          <span className="font-medium text-gray-800 break-words">{requirement.title}</span>
                          {requirement.required && (
                            <span className="text-red-500 text-sm">*</span>
                          )}
                        </div>

                        {uploadedDoc && (
                          <div className="mt-2 flex items-center gap-3 ml-7 min-w-0">
                            {getFileIcon(uploadedDoc.fileType)}
                            <div>
                              <p className="text-sm font-medium text-gray-700 break-all">{uploadedDoc.fileName}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(uploadedDoc.fileSize)}</p>
                            </div>
                          </div>
                        )}

                        {!uploadedDoc && savedDoc && (
                          <div className="mt-2 flex items-center gap-3 ml-7 min-w-0">
                            {getFileIcon(savedDoc.file_type)}
                            <div>
                              <p className="text-sm font-medium text-gray-700 break-all">{savedDoc.file_name}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(savedDoc.file_size)}
                                <span className="text-blue-600 ml-2">(saved from draft)</span>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 relative w-full sm:w-auto">
                        {isUploading ? (
                          <div className="flex items-center gap-2 text-blue-600">
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span className="text-sm">Uploading...</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
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
                                className={`cursor-pointer px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${hasDocument
                                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  : 'bg-[#215F9A] text-white hover:bg-blue-700'
                                  }`}
                              >
                                {hasDocument ? 'Replace' : 'Upload'}
                              </label>

                              {/* Choose from existing button - show if customer has existing docs */}
                              {customerDocuments.length > 0 && (
                                <button
                                  onClick={() => setShowDocPicker(requirement.key)}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${hasDocument
                                    ? 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                    : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                    }`}
                                >
                                  {hasDocument ? 'Use Other' : 'Use Existing'}
                                </button>
                              )}

                              {uploadedDoc && (
                                <button
                                  onClick={() => removeDocument(requirement.key)}
                                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove file"
                                >
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                              {!uploadedDoc && savedDoc && (
                                <>
                                  <button
                                    onClick={() => viewSavedDocument(savedDoc)}
                                    disabled={loadingPreview === savedDoc.requirement_key}
                                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="View file"
                                  >
                                    {loadingPreview === savedDoc.requirement_key ? (
                                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                    ) : (
                                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSavedDocuments(prev => prev.filter(doc => doc.requirement_key !== requirement.key))
                                    }}
                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Remove saved file"
                                  >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Document Picker Dropdown */}
                            {showDocPicker === requirement.key && (
                              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-full sm:w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                                  <span className="font-medium text-gray-700">Select from your documents</span>
                                  <button
                                    onClick={() => setShowDocPicker(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                  {customerDocuments.length === 0 ? (
                                    <p className="p-4 text-sm text-gray-500 text-center">No documents available</p>
                                  ) : (
                                    <div className="p-2">
                                      {customerDocuments.map((doc) => (
                                        <button
                                          key={doc.id}
                                          onClick={() => selectExistingDocument(doc, requirement.key, requirement.title)}
                                          className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3"
                                        >
                                          {getFileIcon(doc.file_type)}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{doc.file_name}</p>
                                            <p className="text-xs text-gray-500">
                                              {doc.title} • {formatFileSize(doc.file_size)}
                                              {doc.is_verified && (
                                                <span className="ml-2 text-green-600">✓ Verified</span>
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

              {/* Upload Progress Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Documents uploaded: {uploadedDocuments.length} / {requiredDocuments.length}
                  </span>
                  {allRequiredUploaded ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      All required documents uploaded
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Missing required documents
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <svg className="h-12 w-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-600">No specific document requirements for {orderDetails.countryName}.</p>
              <p className="text-sm text-gray-500 mt-1">You can proceed with your order.</p>
            </div>
          )}
        </div>

        {/* Other documents (optional, up to 10) */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-[#215F9A] mb-4">Other documents (optional, up to {MAX_OTHER_DOCS})</h3>
          <p className="text-sm text-gray-600 mb-4">Add any additional documents beyond the required list above.</p>
          {otherDocuments.length > 0 && (
            <ul className="space-y-2 mb-4">
              {otherDocuments.map((doc, index) => (
                <li key={index} className="flex items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 min-w-0">
                    {getFileIcon('file_path' in doc ? doc.file_type : (doc as UploadedDocument).fileType)}
                    <span className="text-sm font-medium truncate">
                      {'file_name' in doc ? (doc as SavedDocument).file_name : (doc as UploadedDocument).fileName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatFileSize('file_size' in doc ? (doc as SavedDocument).file_size : (doc as UploadedDocument).fileSize)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOtherDocument(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                    title="Remove"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#215F9A] text-white hover:bg-blue-700 cursor-pointer disabled:opacity-50"
              >
                {uploadingOtherFile ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>Add other document</>
                )}
              </label>
            </div>
          )}
        </div>

        {/* Additional Notes */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-[#215F9A] mb-4">Additional Notes (Optional)</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional information or special requests..."
            className="w-full p-3 border rounded-lg h-24 resize-none focus:border-[#215F9A] focus:outline-none focus:ring-1 focus:ring-[#215F9A]"
          />
        </div>

        {/* Draft Saved Success Message */}
        {draftSaved && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="font-medium text-green-800">Draft saved successfully!</p>
              <p className="text-sm text-green-600">Redirecting to dashboard...</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push('/numbers')}
            disabled={submitting || savingDraft}
            className="sm:flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={submitting || savingDraft || draftSaved}
            className="sm:flex-1 bg-yellow-500 text-white py-3 rounded-lg hover:bg-yellow-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {savingDraft ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save as Draft
              </>
            )}
          </button>
          <button
            onClick={handleSubmitOrder}
            disabled={submitting || savingDraft || draftSaved}
            className="sm:flex-1 bg-[#215F9A] text-white py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {existingOrderId ? 'Uploading...' : 'Submitting Order...'}
              </span>
            ) : (
              existingOrderId ? 'Upload additional documents' : 'Submit Order'
            )}
          </button>
        </div>

        {/* Document Status Info */}
        {requiredDocuments.length > 0 && !allRequiredUploaded && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-blue-800">Documents are optional</p>
                <p className="text-sm text-blue-600 mt-1">
                  You can submit your order without uploading all documents, but your order may take longer to process.
                  Alternatively, save as a draft and upload documents later.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
              onClick={closePreview}
            />

            {/* Preview Content */}
            <div className="relative max-w-5xl w-full h-[90vh]">
              <button
                onClick={closePreview}
                className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors z-10"
              >
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {previewName && (
                <p className="absolute -top-12 left-0 text-white text-sm truncate max-w-[70%]">
                  {previewName}
                </p>
              )}

              {previewType === 'application/pdf' || previewType === 'office' || previewType === 'google' ? (
                <iframe
                  src={previewUrl}
                  title={previewName || 'Document Preview'}
                  className="w-full h-full rounded-lg shadow-2xl bg-white"
                  style={{ minHeight: '80vh' }}
                  allowFullScreen
                />
              ) : previewType?.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={previewName || 'Preview'}
                  className="max-h-[80vh] w-auto mx-auto rounded-lg shadow-2xl"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  title={previewName || 'Document Preview'}
                  className="w-full h-full rounded-lg shadow-2xl bg-white"
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
