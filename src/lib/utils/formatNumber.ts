/**
 * Format a decimal number removing trailing zeros
 * @param value - The number to format
 * @param minDecimals - Minimum decimal places (default: 0)
 * @param maxDecimals - Maximum decimal places (default: 4)
 * @returns Formatted string without trailing zeros
 */
export function formatDecimal(
  value: number | string | null | undefined,
  minDecimals: number = 0,
  maxDecimals: number = 4
): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) {
    return ''
  }

  // Format with max decimals then remove trailing zeros
  let formatted = num.toFixed(maxDecimals)
  
  // Remove trailing zeros after decimal point
  if (formatted.includes('.')) {
    formatted = formatted.replace(/\.?0+$/, '')
  }

  // Ensure minimum decimal places
  if (minDecimals > 0) {
    const parts = formatted.split('.')
    if (parts.length === 1) {
      formatted += '.' + '0'.repeat(minDecimals)
    } else if (parts[1].length < minDecimals) {
      formatted += '0'.repeat(minDecimals - parts[1].length)
    }
  }

  return formatted
}

/**
 * Format currency value with proper decimal display
 * @param value - The number to format
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = 'USD'
): string {
  if (value === null || value === undefined || value === '') {
    return `${currency} 0`
  }

  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) {
    return `${currency} 0`
  }

  // Use formatDecimal with 2 min decimals for currency
  return `${currency} ${formatDecimal(num, 2, 4)}`
}

/**
 * Format a price per unit (per min, per msg, etc.)
 * @param value - The number to format
 * @param currency - Currency code
 * @param unit - Unit string (e.g., '/min', '/msg')
 * @returns Formatted price string or 'N/A' if no value
 */
export function formatPricePerUnit(
  value: number | string | null | undefined,
  currency: string,
  unit: string
): string {
  if (value === null || value === undefined || value === '') {
    return 'N/A'
  }

  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) {
    return 'N/A'
  }

  return `${currency} ${formatDecimal(num, 0, 4)}${unit}`
}

const NA_LIKE = /^(n\/?a|—|-|–|\.\.\.)$/i

/**
 * Parse a cell value from CSV/Excel into a float (MRC, per-minute rates, etc.).
 * Handles currency symbols, thousands separators, and EU vs US decimal conventions.
 */
export function parseSpreadsheetFloat(raw: unknown): number | undefined {
  if (raw === null || raw === undefined) return undefined
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return undefined
    return raw
  }
  let s = String(raw).trim()
  if (!s || NA_LIKE.test(s)) return undefined
  s = s.replace(/[$€£¥₹]/g, '').replace(/\s/g, '')
  if (!s || NA_LIKE.test(s)) return undefined
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else {
    s = s.replace(/,/g, '')
  }
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Parse a cell into a whole number (MOQ, available quantity). Uses float then Math.round for values like "1.0".
 */
export function parseSpreadsheetInt(raw: unknown): number | undefined {
  const f = parseSpreadsheetFloat(raw)
  if (f === undefined) return undefined
  return Math.round(f)
}
