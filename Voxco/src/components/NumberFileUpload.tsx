'use client'

import React, { useState, useRef } from 'react'
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import mammoth from 'mammoth'

// Levenshtein distance for fuzzy matching country names
function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = []
    
    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i]
    }
    
    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j
    }
    
    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1]
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                )
            }
        }
    }
    
    return matrix[b.length][a.length]
}

// Find closest country match using fuzzy matching
function findClosestCountry(
    input: string, 
    countries: Array<{ id: string; name: string; country_code: string }>
): { country: typeof countries[0] | null; similarity: number; suggestion: string | null } {
    const normalizedInput = input.toLowerCase().trim()
    
    // First try exact match
    const exactMatch = countries.find(
        c => c.name.toLowerCase() === normalizedInput ||
            c.country_code.toLowerCase() === normalizedInput
    )
    if (exactMatch) {
        return { country: exactMatch, similarity: 1, suggestion: null }
    }
    
    // Try fuzzy matching on country names
    let bestMatch: typeof countries[0] | null = null
    let bestScore = Infinity
    
    for (const country of countries) {
        const nameDistance = levenshteinDistance(normalizedInput, country.name.toLowerCase())
        const codeDistance = levenshteinDistance(normalizedInput, country.country_code.toLowerCase())
        const minDistance = Math.min(nameDistance, codeDistance)
        
        if (minDistance < bestScore) {
            bestScore = minDistance
            bestMatch = country
        }
    }
    
    // Calculate similarity (0-1)
    const maxLen = Math.max(normalizedInput.length, bestMatch?.name.length || 0)
    const similarity = maxLen > 0 ? 1 - (bestScore / maxLen) : 0
    
    // Only suggest if similarity is > 70% (to avoid false positives)
    if (similarity >= 0.7 && bestMatch) {
        return { country: null, similarity, suggestion: bestMatch.name }
    }
    
    return { country: null, similarity: 0, suggestion: null }
}

interface ExtractedNumber {
    country_id: string
    sms_capability?: string
    direction?: string
    available_numbers?: number
    number_type?: string
    mrc?: number
    nrc?: number
    currency?: string
    moq?: number
    supplier?: string
    specification?: string
    bill_pulse?: string
    requirements_text?: string
    other_charges?: {
        inbound_call?: number | null
        outbound_call_fixed?: number | null
        outbound_call_mobile?: number | null
        inbound_sms?: number | null
        outbound_sms?: number | null
        other_fees?: string | number | null
    }
    features?: {
        voice?: string | null
        sms?: string | null
        reach?: string | null
        emergency_services?: string | null
    }
    row?: number
}

interface NumberFileUploadProps {
    countries: Array<{ id: string; name: string; country_code: string }>
    onNumbersExtracted: (numbers: ExtractedNumber[]) => void
    onError: (error: string) => void
    onSuccess: (message: string) => void
}

export default function NumberFileUpload({
    countries,
    onNumbersExtracted,
    onError,
    onSuccess,
}: NumberFileUploadProps) {
    const [file, setFile] = useState<File | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [extractedNumbers, setExtractedNumbers] = useState<ExtractedNumber[]>([])
    const [validationErrors, setValidationErrors] = useState<string[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    const validateFile = (file: File): string | null => {
        const validExtensions = ['csv', 'xls', 'xlsx', 'doc', 'docx', 'pdf']
        const fileExtension = file.name.split('.').pop()?.toLowerCase()

        if (!fileExtension || !validExtensions.includes(fileExtension)) {
            return 'Invalid file type. Please upload CSV, Excel (.xls, .xlsx), Word (.doc, .docx), or PDF files.'
        }

        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            return 'File size exceeds 10MB limit.'
        }

        return null
    }

    const validateHeaders = (headers: any[]): { valid: boolean; errors: string[]; columnMap: Record<string, number> } => {
        const errors: string[] = []
        const columnMap: Record<string, number> = {}

        // Only Country is strictly required
        const requiredColumns = [
            { keywords: ['country'], name: 'Country' },
        ]

        // Optional columns (with their possible header variations)
        // SMS/Voice and Direction are optional - will default to "Both"
        const optionalColumns = [
            { keywords: ['sms', 'voice', 'sms_capability', 'sms/voice', 'sms capability', 'capability'], name: 'SMS/Voice' },
            { keywords: ['direction', 'inbound', 'outbound'], name: 'Direction' },
            { keywords: ['available', 'available_numbers', 'qty', 'quantity'], name: 'Available Numbers' },
            { keywords: ['number_type', 'type', 'numbertype'], name: 'Number Type' },
            { keywords: ['specification', 'spec', 'prefix', 'area'], name: 'Specification' },
            { keywords: ['mrc', 'monthly', 'recurring'], name: 'MRC' },
            { keywords: ['nrc', 'non-recurring', 'setup'], name: 'NRC' },
            { keywords: ['currency', 'curr'], name: 'Currency' },
            { keywords: ['moq', 'minimum', 'min_order'], name: 'MOQ' },
            { keywords: ['supplier', 'provider', 'vendor'], name: 'Supplier' },
            { keywords: ['bill_pulse', 'pulse', 'billing'], name: 'Bill Pulse' },
            { keywords: ['requirements', 'req'], name: 'Requirements' },
            { keywords: ['inbound_call', 'inbound call'], name: 'Inbound Call' },
            { keywords: ['outbound_call_fixed', 'outbound call fixed', 'outbound fixed'], name: 'Outbound Call (Fixed)' },
            { keywords: ['outbound_call_mobile', 'outbound call mobile', 'outbound mobile'], name: 'Outbound Call (Mobile)' },
            { keywords: ['inbound_sms', 'inbound sms'], name: 'Inbound SMS' },
            { keywords: ['outbound_sms', 'outbound sms'], name: 'Outbound SMS' },
            { keywords: ['other_fees', 'other fees', 'fees'], name: 'Other Fees' },
            { keywords: ['voice_feature', 'voice feature'], name: 'Voice Feature' },
            { keywords: ['sms_feature', 'sms feature'], name: 'SMS Feature' },
            { keywords: ['reach'], name: 'Reach' },
            { keywords: ['emergency', 'emergency_services'], name: 'Emergency Services' },
        ]

        // Check required columns exist in headers
        for (const reqCol of requiredColumns) {
            const foundIndex = headers.findIndex((h: any) =>
                reqCol.keywords.some(keyword =>
                    String(h || '').toLowerCase().trim() === keyword ||
                    String(h || '').toLowerCase().includes(keyword)
                )
            )

            if (foundIndex === -1) {
                errors.push(`Required column "${reqCol.name}" not found. Please ensure your file has a column header containing: ${reqCol.keywords.join(', ')}`)
            } else {
                columnMap[reqCol.name.toLowerCase()] = foundIndex
            }
        }

        // Map optional columns
        for (const optCol of optionalColumns) {
            const foundIndex = headers.findIndex((h: any) =>
                optCol.keywords.some(keyword => {
                    const headerLower = String(h || '').toLowerCase().trim()
                    return headerLower === keyword || headerLower.includes(keyword)
                })
            )

            if (foundIndex !== -1) {
                const normalizedKey = optCol.name.toLowerCase().replace(/\s+/g, ' ').trim()
                columnMap[normalizedKey] = foundIndex
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            columnMap
        }
    }

    const extractNumbersFromTable = (data: any[][]): ExtractedNumber[] => {
        const numbers: ExtractedNumber[] = []
        const errors: string[] = []

        if (!data || data.length === 0) {
            errors.push('No data found in file')
            setValidationErrors(errors)
            return []
        }

        // Try to find header row (look for required column names)
        let headerRowIndex = -1
        const headerKeywords = ['country', 'sms', 'voice', 'direction']

        for (let i = 0; i < Math.min(5, data.length); i++) {
            const row = data[i]
            if (row && row.some((cell: any) =>
                headerKeywords.some(keyword =>
                    String(cell || '').toLowerCase().trim().includes(keyword)
                )
            )) {
                headerRowIndex = i
                break
            }
        }

        // If no header found, assume first row is header
        if (headerRowIndex === -1) {
            headerRowIndex = 0
        }

        const headers = data[headerRowIndex] || []

        // Validate headers and get column mapping
        const validation = validateHeaders(headers)
        if (!validation.valid) {
            setValidationErrors(validation.errors)
            return []
        }

        const columnMap = validation.columnMap

        // Extract data from rows
        for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i]
            if (!row || row.length === 0) continue

            // Skip completely empty rows
            if (row.every((cell: any) => cell === undefined || cell === null || String(cell).trim() === '')) {
                continue
            }

            // Get required columns - Country (with fuzzy matching for typo detection)
            let countryId = ''
            if (columnMap['country'] !== undefined) {
                const value = row[columnMap['country']]
                if (value !== undefined && value !== null && String(value).trim()) {
                    const countryInput = String(value).trim()
                    const { country, similarity, suggestion } = findClosestCountry(countryInput, countries)
                    
                    if (country) {
                        // Exact match found
                        countryId = country.id
                    } else if (suggestion) {
                        // Typo detected - suggest the correct spelling
                        errors.push(`Row ${i + 1}: Country "${countryInput}" not found. Did you mean "${suggestion}"? (${Math.round(similarity * 100)}% match)`)
                        continue
                    } else {
                        // No match and no good suggestion
                        errors.push(`Row ${i + 1}: Country "${countryInput}" not found in system. Please check the spelling.`)
                        continue
                    }
                } else {
                    errors.push(`Row ${i + 1}: Country is required`)
                    continue
                }
            }

            // Get optional SMS/Voice - defaults to "Both" if not provided
            let smsCapability: string | undefined = undefined
            if (columnMap['sms/voice'] !== undefined) {
                const value = row[columnMap['sms/voice']]
                if (value !== undefined && value !== null && String(value).trim()) {
                    const capValue = String(value).trim()
                    if (['SMS only', 'Voice only', 'Both'].includes(capValue)) {
                        smsCapability = capValue
                    } else if (capValue.toLowerCase().includes('sms') && capValue.toLowerCase().includes('voice')) {
                        smsCapability = 'Both'
                    } else if (capValue.toLowerCase().includes('sms')) {
                        smsCapability = 'SMS only'
                    } else if (capValue.toLowerCase().includes('voice')) {
                        smsCapability = 'Voice only'
                    }
                    // If value doesn't match any, leave undefined (will default to "Both")
                }
            }

            // Get optional Direction - defaults to "Both" if not provided
            let direction: string | undefined = undefined
            if (columnMap['direction'] !== undefined) {
                const value = row[columnMap['direction']]
                if (value !== undefined && value !== null && String(value).trim()) {
                    const dirValue = String(value).trim()
                    if (['Inbound only', 'Outbound only', 'Both'].includes(dirValue)) {
                        direction = dirValue
                    } else if (dirValue.toLowerCase().includes('inbound') && dirValue.toLowerCase().includes('outbound')) {
                        direction = 'Both'
                    } else if (dirValue.toLowerCase().includes('inbound')) {
                        direction = 'Inbound only'
                    } else if (dirValue.toLowerCase().includes('outbound')) {
                        direction = 'Outbound only'
                    }
                    // If value doesn't match any, leave undefined (will default to "Both")
                }
            }

            // Create extracted entry - sms_capability and direction will default to "Both" during insert
            const extracted: ExtractedNumber = {
                country_id: countryId,
                sms_capability: smsCapability,
                direction: direction,
                row: i + 1,
            }

            // Get optional - Available Numbers
            if (columnMap['available numbers'] !== undefined) {
                const value = row[columnMap['available numbers']]
                if (value !== undefined && value !== null && String(value).trim()) {
                    const parsed = parseInt(String(value))
                    extracted.available_numbers = isNaN(parsed) ? 1 : parsed
                }
            }

            // Get optional - Number Type
            if (columnMap['number type'] !== undefined) {
                const value = row[columnMap['number type']]
                if (value !== undefined && value !== null) {
                    const typeValue = String(value).trim()
                    if (typeValue && ['Geographic', 'Mobile', 'Toll-Free'].includes(typeValue)) {
                        extracted.number_type = typeValue
                    }
                }
            }

            if (columnMap['mrc'] !== undefined) {
                const value = row[columnMap['mrc']]
                if (value !== undefined && value !== null && String(value).trim()) {
                    const parsed = parseFloat(String(value))
                    extracted.mrc = isNaN(parsed) ? undefined : parsed
                }
            }

            if (columnMap['nrc'] !== undefined) {
                const value = row[columnMap['nrc']]
                if (value !== undefined && value !== null && String(value).trim()) {
                    const parsed = parseFloat(String(value))
                    extracted.nrc = isNaN(parsed) ? undefined : parsed
                }
            }

            if (columnMap['currency'] !== undefined) {
                const value = row[columnMap['currency']]
                if (value !== undefined && value !== null && String(value).trim()) {
                    extracted.currency = String(value).trim().toUpperCase()
                }
            }

            if (columnMap['moq'] !== undefined) {
                const value = row[columnMap['moq']]
                if (value !== undefined && value !== null && String(value).trim()) {
                    const parsed = parseInt(String(value))
                    extracted.moq = isNaN(parsed) ? undefined : parsed
                }
            }

            // Extract supplier
            if (columnMap['supplier'] !== undefined) {
                const value = row[columnMap['supplier']]
                extracted.supplier = value !== undefined && value !== null && String(value).trim()
                    ? String(value).trim()
                    : undefined
            }

            // Extract specification
            if (columnMap['specification'] !== undefined) {
                const value = row[columnMap['specification']]
                extracted.specification = value !== undefined && value !== null && String(value).trim()
                    ? String(value).trim()
                    : undefined
            }

            // Extract bill_pulse
            if (columnMap['bill pulse'] !== undefined) {
                const value = row[columnMap['bill pulse']]
                extracted.bill_pulse = value !== undefined && value !== null && String(value).trim()
                    ? String(value).trim()
                    : undefined
            }

            // Extract requirements_text
            if (columnMap['requirements'] !== undefined) {
                const value = row[columnMap['requirements']]
                extracted.requirements_text = value !== undefined && value !== null && String(value).trim()
                    ? String(value).trim()
                    : undefined
            }

            // Build other_charges object - check all possible key variations
            extracted.other_charges = {}
            const inboundCallKeys = ['inbound call', 'inbound_call']
            for (const key of inboundCallKeys) {
                if (columnMap[key] !== undefined) {
                    const value = row[columnMap[key]]
                    if (value !== undefined && value !== null && String(value).trim() && String(value).toLowerCase() !== 'n/a') {
                        const parsed = parseFloat(String(value))
                        extracted.other_charges.inbound_call = isNaN(parsed) ? null : parsed
                    } else {
                        extracted.other_charges.inbound_call = null
                    }
                    break
                }
            }

            const outboundFixedKeys = ['outbound call (fixed)', 'outbound call fixed', 'outbound_call_fixed']
            for (const key of outboundFixedKeys) {
                if (columnMap[key] !== undefined) {
                    const value = row[columnMap[key]]
                    if (value !== undefined && value !== null && String(value).trim() && String(value).toLowerCase() !== 'n/a') {
                        const parsed = parseFloat(String(value))
                        extracted.other_charges.outbound_call_fixed = isNaN(parsed) ? null : parsed
                    } else {
                        extracted.other_charges.outbound_call_fixed = null
                    }
                    break
                }
            }

            const outboundMobileKeys = ['outbound call (mobile)', 'outbound call mobile', 'outbound_call_mobile']
            for (const key of outboundMobileKeys) {
                if (columnMap[key] !== undefined) {
                    const value = row[columnMap[key]]
                    if (value !== undefined && value !== null && String(value).trim() && String(value).toLowerCase() !== 'n/a') {
                        const parsed = parseFloat(String(value))
                        extracted.other_charges.outbound_call_mobile = isNaN(parsed) ? null : parsed
                    } else {
                        extracted.other_charges.outbound_call_mobile = null
                    }
                    break
                }
            }

            const inboundSmsKeys = ['inbound sms', 'inbound_sms']
            for (const key of inboundSmsKeys) {
                if (columnMap[key] !== undefined) {
                    const value = row[columnMap[key]]
                    if (value !== undefined && value !== null && String(value).trim() && String(value).toLowerCase() !== 'n/a') {
                        const parsed = parseFloat(String(value))
                        extracted.other_charges.inbound_sms = isNaN(parsed) ? null : parsed
                    } else {
                        extracted.other_charges.inbound_sms = null
                    }
                    break
                }
            }

            const outboundSmsKeys = ['outbound sms', 'outbound_sms']
            for (const key of outboundSmsKeys) {
                if (columnMap[key] !== undefined) {
                    const value = row[columnMap[key]]
                    if (value !== undefined && value !== null && String(value).trim() && String(value).toLowerCase() !== 'n/a') {
                        const parsed = parseFloat(String(value))
                        extracted.other_charges.outbound_sms = isNaN(parsed) ? null : parsed
                    } else {
                        extracted.other_charges.outbound_sms = null
                    }
                    break
                }
            }

            const otherFeesKeys = ['other fees', 'other_fees']
            for (const key of otherFeesKeys) {
                if (columnMap[key] !== undefined) {
                    const value = row[columnMap[key]]
                    if (value !== undefined && value !== null && String(value).trim() && String(value).toLowerCase() !== 'n/a') {
                        extracted.other_charges.other_fees = String(value).trim()
                    } else {
                        extracted.other_charges.other_fees = null
                    }
                    break
                }
            }

            // Build features object
            extracted.features = {}
            const voiceFeatureKeys = ['voice feature', 'voice_feature', 'voice']
            for (const key of voiceFeatureKeys) {
                if (columnMap[key] !== undefined) {
                    const value = row[columnMap[key]]
                    extracted.features.voice = value !== undefined && value !== null && String(value).trim() && String(value).toLowerCase() !== 'n/a'
                        ? String(value).trim()
                        : null
                    break
                }
            }

            const smsFeatureKeys = ['sms feature', 'sms_feature', 'sms']
            for (const key of smsFeatureKeys) {
                if (columnMap[key] !== undefined && !key.includes('inbound') && !key.includes('outbound')) {
                    const value = row[columnMap[key]]
                    extracted.features.sms = value !== undefined && value !== null && String(value).trim() && String(value).toLowerCase() !== 'n/a'
                        ? String(value).trim()
                        : null
                    break
                }
            }

            if (columnMap['reach'] !== undefined) {
                const value = row[columnMap['reach']]
                extracted.features.reach = value !== undefined && value !== null && String(value).trim() && String(value).toLowerCase() !== 'n/a'
                    ? String(value).trim()
                    : null
            }

            const emergencyKeys = ['emergency services', 'emergency_services', 'emergency']
            for (const key of emergencyKeys) {
                if (columnMap[key] !== undefined) {
                    const value = row[columnMap[key]]
                    extracted.features.emergency_services = value !== undefined && value !== null && String(value).trim() && String(value).toLowerCase() !== 'n/a'
                        ? String(value).trim()
                        : null
                    break
                }
            }

            numbers.push(extracted)
        }

        if (errors.length > 0) {
            setValidationErrors(errors)
        }

        return numbers
    }

    const processFile = async (file: File) => {
        setIsProcessing(true)
        setValidationErrors([])
        setExtractedNumbers([])

        try {
            const fileExtension = file.name.split('.').pop()?.toLowerCase()
            let tableData: any[][] = []

            if (fileExtension === 'csv') {
                const text = await file.text()
                const result = Papa.parse(text, { header: false })
                tableData = result.data as any[][]
            } else if (fileExtension === 'xls' || fileExtension === 'xlsx') {
                const arrayBuffer = await file.arrayBuffer()
                const workbook = XLSX.read(arrayBuffer, { type: 'array' })
                const firstSheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[firstSheetName]
                tableData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]
            } else if (fileExtension === 'doc' || fileExtension === 'docx') {
                const arrayBuffer = await file.arrayBuffer()
                const result = await mammoth.extractRawText({ arrayBuffer })
                // For Word files, try to parse as table-like structure
                const lines = result.value.split('\n').filter((l: string) => l.trim())
                // Simple parsing - look for tab-separated or space-separated values
                tableData = lines.map((line: string) => {
                    // Try tab first, then multiple spaces
                    if (line.includes('\t')) {
                        return line.split('\t')
                    }
                    return line.split(/\s{2,}/)
                })
            } else if (fileExtension === 'pdf') {
                // For PDF files, send to server for processing
                const formData = new FormData()
                formData.append('file', file)

                const response = await fetch('/api/process-pdf', {
                    method: 'POST',
                    body: formData,
                })

                if (!response.ok) {
                    throw new Error('Failed to process PDF file')
                }

                const result = await response.json()
                tableData = result.data || []

                if (tableData.length === 0) {
                    throw new Error('Could not extract table data from PDF. Please ensure the PDF contains a table with phone numbers.')
                }
            }

            if (tableData.length === 0) {
                throw new Error('Could not extract data from file. Please ensure the file contains a table with phone numbers.')
            }

            const numbers = extractNumbersFromTable(tableData)

            if (numbers.length === 0) {
                throw new Error('No valid phone numbers found in the file.')
            }

            setExtractedNumbers(numbers)
            onSuccess(`Successfully extracted ${numbers.length} number(s) from file. Please review and confirm.`)
        } catch (error: any) {
            console.error('File processing error:', error)
            onError(error.message || 'Failed to process file')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        const validationError = validateFile(selectedFile)
        if (validationError) {
            onError(validationError)
            return
        }

        setFile(selectedFile)
        await processFile(selectedFile)
    }

    const handleRemoveFile = () => {
        setFile(null)
        setExtractedNumbers([])
        setValidationErrors([])
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleConfirm = () => {
        if (extractedNumbers.length > 0) {
            onNumbersExtracted(extractedNumbers)
            handleRemoveFile()
        }
    }

    return (
        <div className="space-y-4">
            {/* Format Guide Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-[#215F9A] mb-3">Expected File Format</h4>
                <p className="text-sm text-gray-700 mb-3">
                    Your file should contain a table with at least a <strong>Country</strong> column. SMS/Voice and Direction will default to <strong>"Both"</strong> if not specified.
                </p>

                {/* Sample Data Table */}
                <div className="bg-white rounded-lg p-3 border border-blue-100 mb-4 overflow-x-auto">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Sample Data Format:</p>
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-[#215F9A] text-white">
                                <th className="p-2 text-left border">Country</th>
                                <th className="p-2 text-left border">SMS/Voice</th>
                                <th className="p-2 text-left border">Direction</th>
                                <th className="p-2 text-left border">Available Numbers</th>
                                <th className="p-2 text-left border">Number Type</th>
                                <th className="p-2 text-left border">Specification</th>
                                <th className="p-2 text-left border">MRC</th>
                                <th className="p-2 text-left border">NRC</th>
                                <th className="p-2 text-left border">Currency</th>
                                <th className="p-2 text-left border">MOQ</th>
                                <th className="p-2 text-left border">Supplier</th>
                                <th className="p-2 text-left border">Bill Pulse</th>
                                <th className="p-2 text-left border">Inbound Call</th>
                                <th className="p-2 text-left border">Outbound Call Fixed</th>
                                <th className="p-2 text-left border">Outbound Call Mobile</th>
                                <th className="p-2 text-left border">Inbound SMS</th>
                                <th className="p-2 text-left border">Outbound SMS</th>
                                <th className="p-2 text-left border">Other Fees</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-gray-50">
                                <td className="p-2 border">Canada</td>
                                <td className="p-2 border">Both</td>
                                <td className="p-2 border">Both</td>
                                <td className="p-2 border">100</td>
                                <td className="p-2 border">Geographic</td>
                                <td className="p-2 border">Landline</td>
                                <td className="p-2 border">1.25</td>
                                <td className="p-2 border">10</td>
                                <td className="p-2 border">USD</td>
                                <td className="p-2 border">1</td>
                                <td className="p-2 border">Globe Teleservices</td>
                                <td className="p-2 border">60/60</td>
                                <td className="p-2 border">0.0050</td>
                                <td className="p-2 border">0.0080</td>
                                <td className="p-2 border">0.0120</td>
                                <td className="p-2 border">0.0030</td>
                                <td className="p-2 border">0.0040</td>
                                <td className="p-2 border">N/A</td>
                            </tr>
                            <tr>
                                <td className="p-2 border">United States</td>
                                <td className="p-2 border">Voice only</td>
                                <td className="p-2 border">Inbound only</td>
                                <td className="p-2 border">50</td>
                                <td className="p-2 border">Toll-Free</td>
                                <td className="p-2 border">800 Prefix</td>
                                <td className="p-2 border">2.50</td>
                                <td className="p-2 border">15</td>
                                <td className="p-2 border">USD</td>
                                <td className="p-2 border">5</td>
                                <td className="p-2 border">BICS</td>
                                <td className="p-2 border">1/6</td>
                                <td className="p-2 border">0.0100</td>
                                <td className="p-2 border">N/A</td>
                                <td className="p-2 border">N/A</td>
                                <td className="p-2 border">N/A</td>
                                <td className="p-2 border">N/A</td>
                                <td className="p-2 border">$5 setup</td>
                            </tr>
                            <tr className="bg-gray-50">
                                <td className="p-2 border">France</td>
                                <td className="p-2 border">SMS only</td>
                                <td className="p-2 border">Both</td>
                                <td className="p-2 border">200</td>
                                <td className="p-2 border">Mobile</td>
                                <td className="p-2 border">France (07)</td>
                                <td className="p-2 border">1.80</td>
                                <td className="p-2 border">12</td>
                                <td className="p-2 border">EUR</td>
                                <td className="p-2 border">10</td>
                                <td className="p-2 border">Orange</td>
                                <td className="p-2 border">20/20</td>
                                <td className="p-2 border">N/A</td>
                                <td className="p-2 border">N/A</td>
                                <td className="p-2 border">N/A</td>
                                <td className="p-2 border">0.0025</td>
                                <td className="p-2 border">0.0035</td>
                                <td className="p-2 border">N/A</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Column Reference */}
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Column Reference:</p>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="p-2 text-left font-semibold">Column Name</th>
                                <th className="p-2 text-left font-semibold">Required</th>
                                <th className="p-2 text-left font-semibold">Accepted Values</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b bg-red-50">
                                <td className="p-2 font-medium">Country</td>
                                <td className="p-2"><span className="text-red-600 font-semibold">Required</span></td>
                                <td className="p-2">Country name or code (e.g., Canada, CA, United States, US)</td>
                            </tr>
                            <tr className="border-b">
                                <td className="p-2">SMS/Voice</td>
                                <td className="p-2 text-gray-500">Optional (default: Both)</td>
                                <td className="p-2">SMS only, Voice only, Both</td>
                            </tr>
                            <tr className="border-b">
                                <td className="p-2">Direction</td>
                                <td className="p-2 text-gray-500">Optional (default: Both)</td>
                                <td className="p-2">Inbound only, Outbound only, Both</td>
                            </tr>
                            <tr className="border-b">
                                <td className="p-2">Available Numbers</td>
                                <td className="p-2 text-gray-500">Optional</td>
                                <td className="p-2">Number of available units (default: 1)</td>
                            </tr>
                            <tr className="border-b">
                                <td className="p-2">Number Type</td>
                                <td className="p-2 text-gray-500">Optional</td>
                                <td className="p-2">Geographic, Mobile, Toll-Free</td>
                            </tr>
                            <tr className="border-b">
                                <td className="p-2">MRC</td>
                                <td className="p-2 text-gray-500">Optional</td>
                                <td className="p-2">Monthly recurring charge (e.g., 1.25, 2.50)</td>
                            </tr>
                            <tr className="border-b">
                                <td className="p-2">NRC</td>
                                <td className="p-2 text-gray-500">Optional</td>
                                <td className="p-2">Non-recurring charge (e.g., 10, 15)</td>
                            </tr>
                            <tr className="border-b">
                                <td className="p-2">Currency</td>
                                <td className="p-2 text-gray-500">Optional</td>
                                <td className="p-2">USD, EUR, GBP, CAD (default: USD)</td>
                            </tr>
                            <tr className="border-b">
                                <td className="p-2">MOQ</td>
                                <td className="p-2 text-gray-500">Optional</td>
                                <td className="p-2">Minimum order quantity (default: 1)</td>
                            </tr>
                            <tr className="border-b">
                                <td className="p-2">Supplier</td>
                                <td className="p-2 text-gray-500">Optional</td>
                                <td className="p-2">Supplier name (e.g., Globe Teleservices)</td>
                            </tr>
                            <tr className="border-b">
                                <td className="p-2">Specification</td>
                                <td className="p-2 text-gray-500">Optional</td>
                                <td className="p-2">Prefix/Area (e.g., Landline, France (07))</td>
                            </tr>
                            <tr>
                                <td className="p-2">Requirements</td>
                                <td className="p-2 text-gray-500">Optional</td>
                                <td className="p-2">Documentation requirements text</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                    <strong>Note:</strong> Only Country is required. SMS/Voice defaults to "Both", Direction defaults to "Both", Number Type defaults to "Geographic".
                </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xls,.xlsx,.doc,.docx,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="number-file-upload"
                    disabled={isProcessing}
                />
                <label
                    htmlFor="number-file-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                >
                    <Upload className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="text-sm text-gray-600 mb-2">
                        Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                        CSV, Excel (.xls, .xlsx), Word (.doc, .docx), or PDF files (max 10MB)
                    </p>
                </label>
            </div>

            {isProcessing && (
                <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Processing file...</span>
                </div>
            )}

            {file && !isProcessing && (
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <File className="w-5 h-5 text-gray-600" />
                            <span className="text-sm font-medium">{file.name}</span>
                        </div>
                        <button
                            onClick={handleRemoveFile}
                            className="text-red-600 hover:text-red-800"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-800 mb-1">Validation Errors:</p>
                            <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                                {validationErrors.map((error, idx) => (
                                    <li key={idx}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {extractedNumbers.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-green-800">
                                Found {extractedNumbers.length} row(s) to add
                            </p>
                        </div>
                    </div>
                    <div className="max-h-60 overflow-x-auto overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-gray-100">
                                    <th className="text-left p-2">Country</th>
                                    <th className="text-left p-2">SMS/Voice</th>
                                    <th className="text-left p-2">Direction</th>
                                    <th className="text-left p-2">Available</th>
                                    <th className="text-left p-2">Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {extractedNumbers.slice(0, 10).map((num, idx) => (
                                    <tr key={idx} className="border-b">
                                        <td className="p-2">
                                            {countries.find(c => c.id === num.country_id)?.name || 'N/A'}
                                        </td>
                                        <td className="p-2">{num.sms_capability || 'Both'}</td>
                                        <td className="p-2">{num.direction || 'Both'}</td>
                                        <td className="p-2">{num.available_numbers || 1}</td>
                                        <td className="p-2">{num.number_type || 'Geographic'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {extractedNumbers.length > 10 && (
                            <p className="text-xs text-gray-600 mt-2">
                                ... and {extractedNumbers.length - 10} more
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleConfirm}
                        className="mt-4 w-full bg-[#215F9A] text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Confirm and Add {extractedNumbers.length} Row(s) to Inventory
                    </button>
                </div>
            )}
        </div>
    )
}

