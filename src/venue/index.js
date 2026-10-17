import { BRAND } from '../brand'
import { CATEGORIES as F_CATS, EVENT, EVENT_COLLIDERS, POIS as F_POIS } from '../event/layout'
import { RESORT, RESORT_CATEGORIES, RESORT_COLLIDERS, RESORT_POIS, resortWalls } from '../resort/layout'
import { HOTEL_CATEGORIES, HOTEL_POIS } from '../hotel/layout'

const HOTEL = BRAND.venue === 'hotel' ? BRAND.event : null

// One facade over the optional venue layers (festival, resort): map pins, place cards,
// schedule and colliders read from here so the UI is shared.
export const VENUE = EVENT ? 'festival' : RESORT ? 'resort' : HOTEL ? 'hotel' : null
export const VENUE_DATA = EVENT || RESORT || HOTEL // dates, schedule, sponsors, clock
export const POIS = EVENT ? F_POIS : RESORT ? RESORT_POIS : HOTEL ? HOTEL_POIS : []
export const CATEGORIES = EVENT ? F_CATS : RESORT ? RESORT_CATEGORIES : HOTEL ? HOTEL_CATEGORIES : {}
export const VENUE_COLLIDERS = EVENT ? EVENT_COLLIDERS : RESORT ? RESORT_COLLIDERS : []
export const VENUE_WALLS = RESORT ? resortWalls() : []
export const SCHEDULE_TITLE = (VENUE_DATA && VENUE_DATA.scheduleTitle) || 'Tonight'
// Default call to action on a place card (festival stages and info points sell tickets).
export const ctaLabelFor = (poi) => poi.cta || (VENUE === 'festival' && (poi.cat === 'info' || poi.cat === 'stage') ? BRAND.cta.label : null)
