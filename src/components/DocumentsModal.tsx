'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Files,
  FileText,
  FileImage,
  Eye,
  Download,
  Loader2,
  StickyNote,
  X,
} from 'lucide-react'

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

interface DocumentsModalProps {
  isOpen: boolean
  onClose: () => void
  uploadedDocuments: UploadedDocuments
  orderId: string
  customerName?: string
  isAdmin?: boolean
}

export default function DocumentsModal({
  isOpen,
  onClose,
  uploadedDocuments,
  orderId,
  customerName,
  isAdmin = false,
}: DocumentsModalProps) {
  const supabase = createClient()
  const [loadingFile, setLoadingFile] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState<string | null>(null)

  if (!isOpen) return null

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf') {
      return <FileText className="h-6 w-6 shrink-0 text-red-500" />
    }
    if (fileType.startsWith('image/')) {
      return <FileImage className="h-6 w-6 shrink-0 text-blue-500" />
    }
    return <FileText className="h-6 w-6 shrink-0 text-slate-400" />
  }

  const handleViewFile = async (doc: UploadedDocumentInfo) => {
    setLoadingFile(doc.requirement_key)
    try {
      const { data, error } = await supabase.storage
        .from('requirements')
        .createSignedUrl(doc.file_path, 3600) // 1 hour expiry

      if (error) {
        console.error('Error getting signed URL:', error)
        alert('Failed to load file. Please try again.')
        return
      }

      if (data?.signedUrl) {
        // Determine preview type and show in modal
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
      console.error('Error viewing file:', err)
      alert('Failed to load file. Please try again.')
    } finally {
      setLoadingFile(null)
    }
  }

  const handleDownloadFile = async (doc: UploadedDocumentInfo) => {
    setLoadingFile(doc.requirement_key)
    try {
      const { data, error } = await supabase.storage
        .from('requirements')
        .download(doc.file_path)

      if (error) {
        console.error('Error downloading file:', error)
        alert('Failed to download file. Please try again.')
        return
      }

      if (data) {
        // Create download link
        const url = URL.createObjectURL(data)
        const a = document.createElement('a')
        a.href = url
        a.download = doc.file_name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Error downloading file:', err)
      alert('Failed to download file. Please try again.')
    } finally {
      setLoadingFile(null)
    }
  }

  const closePreview = () => {
    setPreviewUrl(null)
    setPreviewType(null)
    setPreviewName(null)
  }

  const totalCount = uploadedDocuments.documents.length + (uploadedDocuments.other_documents?.length ?? 0)

  const fileRow = (doc: UploadedDocumentInfo, label: string) => (
    <div
      key={doc.requirement_key + doc.file_path}
      className="flex items-start gap-3.5 rounded-xl border border-slate-200 p-3.5 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        {getFileIcon(doc.file_type)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{label}</p>
        <p className="truncate text-xs text-slate-500">{doc.file_name}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
          <span>{formatFileSize(doc.file_size)}</span>
          <span>·</span>
          <span>{formatDate(doc.uploaded_at)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => handleViewFile(doc)}
          disabled={loadingFile === doc.requirement_key}
          className="rounded-lg p-2 text-[#215F9A] transition-colors hover:bg-blue-50 disabled:opacity-50"
          title="View file"
          aria-label="View file"
        >
          {loadingFile === doc.requirement_key ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={() => handleDownloadFile(doc)}
          disabled={loadingFile === doc.requirement_key}
          className="rounded-lg p-2 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50"
          title="Download file"
          aria-label="Download file"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] transition-opacity motion-safe:animate-[fadeIn_150ms_ease-out]"
            onClick={onClose}
          />

          {/* Modal Content */}
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 motion-safe:animate-[scaleIn_150ms_ease-out]">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#215F9A]/10 text-[#215F9A]">
                  <Files className="h-[19px] w-[19px]" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-slate-900 sm:text-[17px]">
                    {isAdmin ? 'Customer Documents' : 'Your Uploaded Documents'}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {isAdmin && customerName && <span className="mr-2">{customerName} ·</span>}
                    Order {orderId.substring(0, 8)}…
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              {/* Customer Type + count */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {uploadedDocuments.customer_type === 'business' ? 'Business customer' : 'Individual customer'}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#215F9A]/10 px-2.5 py-1 text-xs font-semibold text-[#215F9A]">
                  <Files className="h-3.5 w-3.5" />
                  {totalCount} file{totalCount !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Documents List */}
              <div>
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Uploaded files ({uploadedDocuments.documents.length})
                </p>
                <div className="space-y-2.5">
                  {(uploadedDocuments.documents || []).map((doc) => fileRow(doc, doc.title))}
                </div>
              </div>

              {/* Other documents */}
              {uploadedDocuments.other_documents && uploadedDocuments.other_documents.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Other documents ({uploadedDocuments.other_documents.length})
                  </p>
                  <div className="space-y-2.5">
                    {uploadedDocuments.other_documents.map((doc) => fileRow(doc, doc.title || doc.file_name))}
                  </div>
                </div>
              )}

              {/* Customer Notes */}
              {uploadedDocuments.notes && (
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <StickyNote className="h-4 w-4 text-slate-400" />
                    {isAdmin ? 'Customer Notes' : 'Your Notes'}
                  </h4>
                  <p className="whitespace-pre-wrap text-sm text-slate-600">{uploadedDocuments.notes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-slate-100 px-5 py-3 sm:px-6">
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A]/30"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview Modal (Images and PDFs) */}
      {previewUrl && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
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
    </>
  )
}
