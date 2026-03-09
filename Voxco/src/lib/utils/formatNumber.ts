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
