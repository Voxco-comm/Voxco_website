'use client'

import React, { useState, useRef } from 'react'
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import mammoth from 'mammoth'
import { parseSpreadsheetFloat, parseSpreadsheetInt } from '@/lib/utils/formatNumber'

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
    supplier_mrc?: number
    supplier_nrc?: number
    supplier_currency?: string
    supplier_other_charges?: {
        inbound_call?: number | null
        outbound_call_fixed?: number | null
        outbound_call_mobile?: number | null
        inbound_sms?: number | null
        outbound_sms?: number | null
        other_fees?: string | number | null
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

    // Normalize header cell for matching (handles newlines, extra spaces like "Out Call\nFixed" in Rates files)
    const normalizeHeader = (h: any): string =>
        String(h || '').replace(/\s+/g, ' ').toLowerCase().trim()

    const validateHeaders = (headers: any[]): { valid: boolean; errors: string[]; columnMap: Record<string, number> } => {
        const errors: string[] = []
        const columnMap: Record<string, number> = {}

        // Only Country/Destination is strictly required (Rates files use "Destination")
        const requiredColumns = [
            { keywords: ['country', 'destination'], name: 'Country' },
        ]

        type OptCol = { keywords: string[]; name: string; rejectIfIncludes?: string[] }

        // Order matters: specific supplier/customer columns before generic ones (Rates-style sheets).
        const optionalColumns: OptCol[] = [
            {
                keywords: ['sms/voice', 'sms voice', 'sms capability', 'sms_capability', 'capability', 'voice only', 'sms only', 'both'],
                name: 'SMS/Voice',
                rejectIfIncludes: ['call', 'inbound', 'outbound', 'fixed', 'mobile', 'fee', '/min', '/msg', 'per min', 'per msg', 'mrc', 'nrc'],
            },
            {
                keywords: ['direction', 'inbound / outbound', 'inbound/outbound', 'traffic'],
                name: 'Direction',
                rejectIfIncludes: ['call', 'sms', 'mrc', 'nrc', 'fee', 'supplier', 'customer', 'fixed', 'mobile', 'incall', 'in call', 'out call'],
            },
            {
                keywords: ['available', 'available_numbers', 'qty', 'quantity'],
                name: 'Available Numbers',
                rejectIfIncludes: ['min order', 'moq'],
            },
            {
                keywords: ['number_type', 'numbertype', 'number type', 'type'],
                name: 'Number Type',
                rejectIfIncludes: ['sms', 'voice', 'mrc', 'nrc', 'call', 'fee', 'order'],
            },
            { keywords: ['specification', 'spec', 'prefix', 'area', 'remarks'], name: 'Specification' },
            { keywords: ['supplier mrc'], name: 'Supplier MRC' },
            { keywords: ['supplier nrc'], name: 'Supplier NRC' },
            { keywords: ['supplier currency', 'supplier curr'], name: 'Supplier Currency' },
            {
                keywords: ['supplier incall', 'supplier in call', 'supplier inbound call'],
                name: 'Supplier Inbound Call',
            },
            {
                keywords: ['supplier call fixed', 'supplier outbound call fixed', 'supplier out call fixed', 'supplier outbound fixed'],
                name: 'Supplier Outbound Call (Fixed)',
            },
            {
                keywords: ['supplier out call mobile', 'supplier outbound call mobile', 'supplier outbound mobile', 'supplier out call mob'],
                name: 'Supplier Outbound Call (Mobile)',
            },
            { keywords: ['supplier in sms', 'supplier inbound sms'], name: 'Supplier Inbound SMS' },
            { keywords: ['supplier out sms', 'supplier outbound sms'], name: 'Supplier Outbound SMS' },
            { keywords: ['supplier other', 'supplier other fees'], name: 'Supplier Other Fees' },
            { keywords: ['customer mrc'], name: 'Customer MRC' },
            { keywords: ['customer nrc'], name: 'Customer NRC' },
            {
                keywords: ['mrc', 'monthly', 'recurring'],
                name: 'MRC',
                rejectIfIncludes: ['supplier', 'customer'],
            },
            {
                keywords: ['nrc', 'non-recurring', 'setup'],
                name: 'NRC',
                rejectIfIncludes: ['supplier', 'customer'],
            },
            { keywords: ['currency', 'curr'], name: 'Currency', rejectIfIncludes: ['supplier'] },
            { keywords: ['moq', 'minimum', 'min_order', 'min order'], name: 'MOQ' },
            {
                keywords: ['supplier', 'provider', 'vendor'],
                name: 'Supplier',
                rejectIfIncludes: [
                    'mrc',
                    'nrc',
                    'currency',
                    'inbound',
                    'outbound',
                    'sms',
                    'call',
                    'fee',
                    'mobile',
                    'fixed',
                    'incall',
                    'national',
                    'geographic',
                    'other',
                ],
            },
            { keywords: ['bill_pulse', 'pulse', 'billing', 'bill pulse'], name: 'Bill Pulse' },
            { keywords: ['requirements', 'req', 'remarks'], name: 'Requirements' },
            { keywords: ['customer incall', 'customer in call'], name: 'Customer Incall' },
            {
                keywords: ['inbound_call', 'inbound call', 'in call', 'incall'],
                name: 'Inbound Call',
                rejectIfIncludes: ['supplier'],
            },
            { keywords: ['customer call fixed'], name: 'Customer Call Fixed' },
            {
                keywords: ['outbound_call_fixed', 'outbound call fixed', 'outbound fixed', 'out call fixed', 'call fixed'],
                name: 'Outbound Call (Fixed)',
                rejectIfIncludes: ['supplier'],
            },
            { keywords: ['customer out call mobile'], name: 'Customer Out Call Mobile' },
            {
                keywords: ['outbound_call_mobile', 'outbound call mobile', 'outbound mobile', 'out call mobile'],
                name: 'Outbound Call (Mobile)',
                rejectIfIncludes: ['supplier'],
            },
            { keywords: ['customer in sms'], name: 'Customer In SMS' },
            {
                keywords: ['inbound_sms', 'inbound sms', 'in sms'],
                name: 'Inbound SMS',
                rejectIfIncludes: ['supplier'],
            },
            { keywords: ['customer out sms'], name: 'Customer Out SMS' },
            {
                keywords: ['outbound_sms', 'outbound sms', 'out sms'],
                name: 'Outbound SMS',
                rejectIfIncludes: ['supplier'],
            },
            { keywords: ['customer other', 'customer other fees'], name: 'Customer Other Fees' },
            {
                keywords: ['other_fees', 'other fees', 'fees'],
                name: 'Other Fees',
                rejectIfIncludes: ['supplier', 'customer', 'mrc', 'nrc', 'inbound', 'outbound', 'sms', 'call'],
            },
            { keywords: ['voice_feature', 'voice feature'], name: 'Voice Feature', rejectIfIncludes: ['sms feature'] },
            { keywords: ['sms_feature', 'sms feature'], name: 'SMS Feature', rejectIfIncludes: ['voice feature'] },
            { keywords: ['reach'], name: 'Reach' },
            { keywords: ['emergency', 'emergency_services', 'emergency services'], name: 'Emergency Services' },
        ]

        // Check required columns exist in headers (use normalized header for matching)
        for (const reqCol of requiredColumns) {
            const foundIndex = headers.findIndex((h: any) =>
                reqCol.keywords.some(keyword => {
                    const norm = normalizeHeader(h)
                    return norm === keyword || norm.includes(keyword)
                })
            )

            if (foundIndex === -1) {
                errors.push(`Required column "${reqCol.name}" not found. Please ensure your file has a column header containing: ${reqCol.keywords.join(', ')}`)
            } else {
                columnMap[reqCol.name.toLowerCase()] = foundIndex
            }
        }

        // Map optional columns (use normalized header for matching)
        for (const optCol of optionalColumns) {
            const foundIndex = headers.findIndex((h: any) => {
                const norm = normalizeHeader(h)
                if (optCol.rejectIfIncludes?.some((ex) => norm.includes(ex))) return false
                return optCol.keywords.some((keyword) => norm === keyword || norm.includes(keyword))
            })

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

        // Try to find header row (look for required column names, including "destination" for Rates-style files)
        let headerRowIndex = -1
        const headerKeywords = ['country', 'destination', 'sms', 'voice', 'direction', 'supplier', 'type', 'mrc', 'nrc']

        for (let i = 0; i < Math.min(5, data.length); i++) {
            const row = data[i]
            if (row && row.some((cell: any) =>
                headerKeywords.some(keyword =>
                    String(cell || '').replace(/\s+/g, ' ').toLowerCase().trim().includes(keyword)
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

            const cellNumericOrNull = (value: unknown): number | null => {
                const n = parseSpreadsheetFloat(value)
                return n === undefined ? null : n
            }

            // Get optional - Available Numbers
            if (columnMap['available numbers'] !== undefined) {
                const value = row[columnMap['available numbers']]
                const parsed = parseSpreadsheetInt(value)
                if (parsed !== undefined && parsed >= 0) {
                    extracted.available_numbers = parsed
                }
            }

            // Get optional - Number Type (Rates / sheet labels → app enum)
            if (columnMap['number type'] !== undefined) {
                const value = row[columnMap['number type']]
                if (value !== undefined && value !== null) {
                    const typeValue = String(value).trim()
                    if (typeValue) {
                        const normalized = typeValue.toLowerCase().replace(/\s+/g, ' ').trim()
                        const compact = normalized.replace(/[\s_-]/g, '')

                        const is2Wv =
                            normalized === '2wv' ||
                            compact === '2wv' ||
                            compact === '2wayvoice' ||
                            compact === 'twowayvoice' ||
                            /^2[-\s]*way[-\s]*voice$/i.test(normalized) ||
                            /^two[-\s]*way[-\s]*voice$/i.test(normalized)

                        // 2-way-voice / 2 way voice → 2WV (before any "mobile" handling)
                        if (is2Wv) {
                            extracted.number_type = '2WV'
                        } else if (
                            (normalized.includes('fixed') && normalized.includes('mobile')) ||
                            compact === 'fixedmobile' ||
                            compact === 'mobilefixed'
                        ) {
                            // "Fixed Mobile" etc. = fixed line, not cellular Mobile type
                            extracted.number_type = 'Geographic'
                        } else if (normalized === 'fixed' || normalized === 'national') {
                            extracted.number_type = 'Geographic'
                        } else if (normalized === 'mobile') {
                            extracted.number_type = 'Mobile'
                        } else if (normalized === 'toll-free' || normalized === 'toll free') {
                            extracted.number_type = 'Toll-Free'
                        } else if (normalized === 'non-geographic' || normalized === 'non geographic') {
                            extracted.number_type = 'Non-Geographic'
                        } else if (normalized === 'geographic') {
                            extracted.number_type = 'Geographic'
                        } else if (
                            ['Geographic', 'Mobile', 'Toll-Free', 'Non-Geographic', '2WV'].includes(typeValue)
                        ) {
                            extracted.number_type = typeValue
                        }
                    }
                }
            }

            // Customer MRC / NRC
            const mrcCol =
                columnMap['customer mrc'] !== undefined ? columnMap['customer mrc'] : columnMap['mrc']
            if (mrcCol !== undefined) {
                const n = parseSpreadsheetFloat(row[mrcCol])
                if (n !== undefined) extracted.mrc = n
            }

            const nrcCol =
                columnMap['customer nrc'] !== undefined ? columnMap['customer nrc'] : columnMap['nrc']
            if (nrcCol !== undefined) {
                const n = parseSpreadsheetFloat(row[nrcCol])
                if (n !== undefined) extracted.nrc = n
            }

            // Supplier MRC / NRC / currency
            if (columnMap['supplier mrc'] !== undefined) {
                const n = parseSpreadsheetFloat(row[columnMap['supplier mrc']])
                if (n !== undefined) extracted.supplier_mrc = n
            }
            if (columnMap['supplier nrc'] !== undefined) {
                const n = parseSpreadsheetFloat(row[columnMap['supplier nrc']])
                if (n !== undefined) extracted.supplier_nrc = n
            }
            if (columnMap['supplier currency'] !== undefined) {
                const value = row[columnMap['supplier currency']]
                if (value !== undefined && value !== null && String(value).trim()) {
                    extracted.supplier_currency = String(value).trim().toUpperCase()
                }
            }

            if (columnMap['currency'] !== undefined) {
                const value = row[columnMap['currency']]
                if (value !== undefined && value !== null && String(value).trim()) {
                    extracted.currency = String(value).trim().toUpperCase()
                }
            }

            if (columnMap['moq'] !== undefined) {
                const parsed = parseSpreadsheetInt(row[columnMap['moq']])
                if (parsed !== undefined && parsed >= 1) extracted.moq = parsed
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

            // Build other_charges (customer) — prefer "Customer X" columns when present
            extracted.other_charges = {}
            const inboundCallCol = columnMap['customer incall'] ?? columnMap['inbound call']
            if (inboundCallCol !== undefined) {
                const v = cellNumericOrNull(row[inboundCallCol])
                extracted.other_charges.inbound_call = v
            }

            const outboundFixedCol = columnMap['customer call fixed'] ?? columnMap['outbound call (fixed)']
            if (outboundFixedCol !== undefined) {
                extracted.other_charges.outbound_call_fixed = cellNumericOrNull(row[outboundFixedCol])
            }

            const outboundMobileCol = columnMap['customer out call mobile'] ?? columnMap['outbound call (mobile)']
            if (outboundMobileCol !== undefined) {
                extracted.other_charges.outbound_call_mobile = cellNumericOrNull(row[outboundMobileCol])
            }

            const inboundSmsCol = columnMap['customer in sms'] ?? columnMap['inbound sms']
            if (inboundSmsCol !== undefined) {
                extracted.other_charges.inbound_sms = cellNumericOrNull(row[inboundSmsCol])
            }

            const outboundSmsCol = columnMap['customer out sms'] ?? columnMap['outbound sms']
            if (outboundSmsCol !== undefined) {
                extracted.other_charges.outbound_sms = cellNumericOrNull(row[outboundSmsCol])
            }

            const otherFeesCol = columnMap['customer other fees'] ?? columnMap['other fees']
            if (otherFeesCol !== undefined) {
                const value = row[otherFeesCol]
                if (value !== undefined && value !== null && String(value).trim()) {
                    const n = parseSpreadsheetFloat(value)
                    if (n !== undefined) extracted.other_charges.other_fees = n
                    else {
                        const s = String(value).trim()
                        extracted.other_charges.other_fees = /^n\/?a$/i.test(s) ? null : s
                    }
                } else {
                    extracted.other_charges.other_fees = null
                }
            }

            // Supplier-side fees (parallel columns)
            extracted.supplier_other_charges = {}
            const supInCol = columnMap['supplier inbound call']
            if (supInCol !== undefined) {
                extracted.supplier_other_charges.inbound_call = cellNumericOrNull(row[supInCol])
            }
            const supFixedCol = columnMap['supplier outbound call (fixed)']
            if (supFixedCol !== undefined) {
                extracted.supplier_other_charges.outbound_call_fixed = cellNumericOrNull(row[supFixedCol])
            }
            const supMobCol = columnMap['supplier outbound call (mobile)']
            if (supMobCol !== undefined) {
                extracted.supplier_other_charges.outbound_call_mobile = cellNumericOrNull(row[supMobCol])
            }
            const supInSmsCol = columnMap['supplier inbound sms']
            if (supInSmsCol !== undefined) {
                extracted.supplier_other_charges.inbound_sms = cellNumericOrNull(row[supInSmsCol])
            }
            const supOutSmsCol = columnMap['supplier outbound sms']
            if (supOutSmsCol !== undefined) {
                extracted.supplier_other_charges.outbound_sms = cellNumericOrNull(row[supOutSmsCol])
            }
            const supOtherCol = columnMap['supplier other fees']
            if (supOtherCol !== undefined) {
                const value = row[supOtherCol]
                if (value !== undefined && value !== null && String(value).trim()) {
                    const n = parseSpreadsheetFloat(value)
                    if (n !== undefined) extracted.supplier_other_charges.other_fees = n
                    else {
                        const s = String(value).trim()
                        extracted.supplier_other_charges.other_fees = /^n\/?a$/i.test(s) ? null : s
                    }
                } else {
                    extracted.supplier_other_charges.other_fees = null
                }
            }
            if (Object.keys(extracted.supplier_other_charges).length === 0) {
                delete extracted.supplier_other_charges
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
                tableData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    defval: '',
                    raw: false,
                }) as any[][]
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
                    Your file should contain a table with at least a <strong>Country</strong> or <strong>Destination</strong> column (e.g. Rates-style sheets). SMS/Voice and Direction default to <strong>&quot;Both&quot;</strong>. <strong>Fixed</strong>/<strong>National</strong> map to Geographic; <strong>Fixed Mobile</strong> (combined label) also maps to Geographic, not Mobile. <strong>2-way-voice</strong> / <strong>2 way voice</strong> map to <strong>2WV</strong>. Standalone <strong>Mobile</strong> maps to Mobile.
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

