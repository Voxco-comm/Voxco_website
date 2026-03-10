'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
      return (
        <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10.92,12.31C10.68,11.54 10.15,9.08 11.55,9.04C12.95,9 12.03,12.16 12.03,12.16C12.42,13.65 14.05,14.72 14.05,14.72C14.55,14.57 17.4,14.24 17,15.72C16.57,17.2 13.5,15.81 13.5,15.81C11.55,15.95 10.09,16.47 10.09,16.47C8.96,18.58 7.64,19.5 7.1,18.61C6.43,17.5 9.23,16.07 9.23,16.07C10.68,13.72 10.9,12.35 10.92,12.31Z" />
        </svg>
      )
    }
    if (fileType.startsWith('image/')) {
      return (
        <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    }
    return (
      <svg className="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
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

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={onClose}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-[#215F9A] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {isAdmin ? 'Customer Documents' : 'Your Uploaded Documents'}
                </h3>
                {isAdmin && customerName && (
                  <p className="text-sm text-blue-100">Customer: {customerName}</p>
                )}
                <p className="text-xs text-blue-200">Order ID: {orderId.substring(0, 8)}...</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Customer Type Badge */}
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-gray-600">Customer Type:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${uploadedDocuments.customer_type === 'business'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-green-100 text-green-800'
                  }`}>
                  {uploadedDocuments.customer_type === 'business' ? 'Business' : 'Individual'}
                </span>
              </div>

              {/* Documents List */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700 mb-2">
                  Uploaded Files ({uploadedDocuments.documents.length})
                </h4>

                {(uploadedDocuments.documents || []).map((doc) => (
                  <div
                    key={doc.requirement_key}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* File Icon */}
                      <div className="flex-shrink-0">
                        {getFileIcon(doc.file_type)}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{doc.title}</p>
                        <p className="text-sm text-gray-600 truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.uploaded_at)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <button
                          onClick={() => handleViewFile(doc)}
                          disabled={loadingFile === doc.requirement_key}
                          className="p-2 text-[#215F9A] hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="View file"
                        >
                          {loadingFile === doc.requirement_key ? (
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
                          onClick={() => handleDownloadFile(doc)}
                          disabled={loadingFile === doc.requirement_key}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Download file"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Other documents */}
              {uploadedDocuments.other_documents && uploadedDocuments.other_documents.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Other documents ({uploadedDocuments.other_documents.length})
                  </h4>
                  {uploadedDocuments.other_documents.map((doc) => (
                    <div
                      key={doc.requirement_key + doc.file_path}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">{getFileIcon(doc.file_type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{doc.title || doc.file_name}</p>
                          <p className="text-sm text-gray-600 truncate">{doc.file_name}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>{formatDate(doc.uploaded_at)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleViewFile(doc)}
                            disabled={loadingFile === doc.requirement_key}
                            className="p-2 text-[#215F9A] hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                            title="View file"
                          >
                            {loadingFile === doc.requirement_key ? (
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
                            onClick={() => handleDownloadFile(doc)}
                            disabled={loadingFile === doc.requirement_key}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Download file"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Customer Notes */}
              {uploadedDocuments.notes && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    {isAdmin ? 'Customer Notes' : 'Your Notes'}
                  </h4>
                  <p className="text-sm text-yellow-700 whitespace-pre-wrap">{uploadedDocuments.notes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
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
    </>
  )
}
