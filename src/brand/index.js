import { PRESETS } from './presets'
import { ZONES } from '../world/plan'
import { ROUTE } from '../route'

const key = ROUTE.brand
const base = PRESETS.nightbloom
const pick = PRESETS[key] || base

export const BRAND = { ...base, ...pick, cta: { ...base.cta, ...pick.cta }, zones: pick.zones || {}, event: pick.event || null, venue: pick.venue || (pick.event ? 'festival' : null) }

// Call action for a zone (falls back to the brand-wide one).
export const ctaFor = (zoneId) => ({ ...BRAND.cta, ...(BRAND.zones[zoneId]?.cta || {}) })

// Apply the brand once at startup: page title, accent colours, zone names.
export function applyBrand() {
  document.title = BRAND.name
  const root = document.documentElement.style
  root.setProperty('--accent', BRAND.accent)
  root.setProperty('--accent-ink', BRAND.accentInk)
  root.setProperty('--mark', `conic-gradient(${[...BRAND.mark, BRAND.mark[0]].join(', ')})`)
  for (const z of ZONES) {
    const o = BRAND.zones[z.id]
    if (o?.name) z.name = o.name
    if (o?.tagline) z.tagline = o.tagline
  }
}

// Opens a booking link, or (in demos without one) explains where it would go.
export function openCta(zoneId) {
  const cta = ctaFor(zoneId)
  if (cta.url) {
    window.open(cta.url, '_blank', 'noopener,noreferrer')
    return null
  }
  return cta
}
