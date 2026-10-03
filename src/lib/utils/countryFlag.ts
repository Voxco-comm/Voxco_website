/**
 * Presentation-only country flag helper shared by every page that displays a
 * country name/code (Numbers, My Orders, Complete Your Order). It never
 * interprets, stores, mutates, or filters country data — it only decides
 * what (if any) flag emoji to render next to an already-displayed name/code.
 *
 * A small number of real country_code values in this app's data are not
 * valid ISO 3166-1 alpha-2 codes (e.g. "UK" instead of "GB", or Anguilla
 * seeded as "ANG" instead of "AI"). This maps those known exceptions to the
 * correct ISO code for flag rendering only — it never touches the
 * underlying country_code value used for filtering/orders/display.
 */
const ISO_CODE_OVERRIDES: Record<string, string> = {
  UK: 'GB',
  ANG: 'AI', // Anguilla
}

/**
 * Returns a flag emoji for a given country code, or null if none can be
 * safely derived (e.g. the code isn't a recognizable 2-letter ISO code and
 * has no known override). Callers should always keep showing the original
 * country name/code text regardless of whether a flag is returned.
 */
export function getCountryFlagEmoji(code?: string | null): string | null {
  if (!code) return null
  const normalized = code.trim().toUpperCase()
  const iso = ISO_CODE_OVERRIDES[normalized] || normalized
  if (!/^[A-Z]{2}$/.test(iso)) return null
  const codePoints = Array.from(iso).map((ch) => 127397 + ch.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}
