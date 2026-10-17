import * as THREE from 'three'

// Saffron Shores Resort: an original beachfront hotel. Sea to the north (-z), beach, pool deck
// embraced by a crescent hotel, arrival court inland (+z). All dimensions in metres.
const V = (x, y, z) => new THREE.Vector3(x, y, z)
const smoothstep = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export const SEA_Y = 0
export const LAND_Y = 0.4
export const shoreZ = (x) => -40 + 3 * Math.sin(x * 0.025) + 2 * Math.sin(x * 0.06 + 1)

// Ground height (no buildings): flat land, a beach sloping into the sea, shelving seabed.
export function terrainH(x, z) {
  const s = shoreZ(x)
  if (z >= s + 18) return LAND_Y
  if (z >= s) return -0.15 + (LAND_Y + 0.15) * smoothstep(s, s + 18, z)
  return -0.15 - 2.6 * smoothstep(s, s - 40, z)
}

// Crescent hotel wings around centre C (on the sea side), plus a straight central tower.
export const CRESCENT = { cx: 0, cz: -30, r0: 72, r1: 88, east: [22, 78], west: [102, 158] }
export const TOWER = { x0: -14, x1: 14, z0: 42, z1: 58, floors: 14 }
export const LOBBY_H = 9 // double-height ground floor
export const FLOOR_H = 3.4
export const floorY = (k) => (k === 0 ? LAND_Y : LAND_Y + LOBBY_H + (k - 1) * FLOOR_H)
export const TOWER_TOP = floorY(TOWER.floors)
// Wings step down from 9 floors beside the tower to 5 at their tips.
export const wingFloors = (deg) => {
  const t = Math.min(Math.abs(deg - 90) - 12, 56) / 56
  return Math.round(9 - 4 * Math.max(0, t))
}
export const arcPoint = (deg, r) => {
  const a = (deg * Math.PI) / 180
  return V(CRESCENT.cx + Math.cos(a) * r, 0, CRESCENT.cz + Math.sin(a) * r)
}

// Signature suite on floor 8 of the tower, west half, with a balcony over the pool.
export const SUITE = { x0: -13.5, x1: -0.3, z0: 42.6, z1: 57.4, floor: 8, balcony: 3 }
export const SUITE_Y = floorY(SUITE.floor)

// Lagoon pool: blob outline; swim-up bar island; kids' splash pool.
export const POOL = { cx: 0, cz: 15, rx: 21, rz: 10 }
export const poolR = (t) => 1 + 0.13 * Math.sin(3 * t + 0.6) + 0.07 * Math.sin(5 * t - 1.1)
export const POOL_OUTLINE = Array.from({ length: 48 }, (_, i) => {
  const t = (i / 48) * Math.PI * 2
  const k = poolR(t)
  return [POOL.cx + Math.cos(t) * POOL.rx * k, POOL.cz + Math.sin(t) * POOL.rz * k]
})
export const BAR = { x: 2, z: 15, r: 3.4 }
export const KIDS_POOL = { x: -34, z: 22, r: 5.5 }

// Pier and overwater restaurant.
export const PIER = { x: 38, half: 2.2, z0: -18, z1: -96, y: 1.3 }
export const RESTAURANT = { x: 38, z: -107, r: 13 }

// Beach villas (west) and spa pavilion (east).
export const VILLAS = [-92, -116, -140].map((x, i) => ({ x, z: -12 - (i % 2) * 3, yaw: 0 }))
export const SPA = { x: 96, z: -4, w: 22, d: 12 }
export const ARRIVAL = { x: 0, z: 70 }

// Which "level" the visitor is on: the ground (incl. pier) or inside the suite.
let level = 'ground'
export const setLevel = (l) => {
  level = l
}
export const getLevel = () => level

const onPier = (x, z) => Math.abs(x - PIER.x) < PIER.half && z < PIER.z0 + 2 && z > PIER.z1
const inRestaurant = (x, z) => (x - RESTAURANT.x) ** 2 + (z - RESTAURANT.z) ** 2 < RESTAURANT.r ** 2

// Walking height, including the pier deck and the suite floor.
export function walkHeight(x, z) {
  if (level === 'suite') return SUITE_Y
  if (onPier(x, z) || inRestaurant(x, z)) return PIER.y
  return terrainH(x, z)
}

const pointInPoly = (x, z, poly) => {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]
    const [xj, zj] = poly[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

// Not walkable: open sea, pools, building interiors other than the lobby.
export function blockedAt(x, z) {
  if (level === 'suite') return false
  if (z < shoreZ(x) + 1 && !onPier(x, z) && !inRestaurant(x, z)) return true
  if (pointInPoly(x, z, POOL_OUTLINE) && (x - BAR.x) ** 2 + (z - BAR.z) ** 2 > BAR.r ** 2) return true
  if ((x - KIDS_POOL.x) ** 2 + (z - KIDS_POOL.z) ** 2 < KIDS_POOL.r ** 2) return true
  return false
}

export function clampWalk(x, z) {
  if (level === 'suite') {
    return [Math.min(SUITE.x1 - 0.4, Math.max(SUITE.x0 + 0.4, x)), Math.min(SUITE.z1 - 0.4, Math.max(SUITE.z0 - SUITE.balcony + 0.4, z))]
  }
  x = Math.min(175, Math.max(-175, x))
  z = Math.min(125, Math.max(-125, z))
  // In the water but not on the pier or restaurant: back to the shore, or onto the pier.
  if (z < shoreZ(x) + 1 && !onPier(x, z) && !inRestaurant(x, z)) {
    if (Math.abs(x - PIER.x) < PIER.half + 1.2 && z > PIER.z1) return [Math.min(PIER.x + PIER.half - 0.3, Math.max(PIER.x - PIER.half + 0.3, x)), z]
    const d = Math.hypot(x - RESTAURANT.x, z - RESTAURANT.z)
    if (d < RESTAURANT.r + 1.5) return [RESTAURANT.x + ((x - RESTAURANT.x) * (RESTAURANT.r - 0.4)) / d, RESTAURANT.z + ((z - RESTAURANT.z) * (RESTAURANT.r - 0.4)) / d]
    return [x, shoreZ(x) + 1]
  }
  return [x, z]
}

// Collision walls: wing facades, tower lobby glass (with doors), pool rims.
export const WALLS = (() => {
  const out = []
  const seg = (a, b) => out.push([a[0], a[1], b[0], b[1]])
  for (const [a0, a1] of [CRESCENT.east, CRESCENT.west]) {
    for (const r of [CRESCENT.r0, CRESCENT.r1]) {
      for (let d = a0; d < a1; d += 2) {
        const p = arcPoint(d, r)
        const q = arcPoint(Math.min(a1, d + 2), r)
        seg([p.x, p.z], [q.x, q.z])
      }
    }
    for (const d of [a0, a1]) {
      const p = arcPoint(d, CRESCENT.r0)
      const q = arcPoint(d, CRESCENT.r1)
      seg([p.x, p.z], [q.x, q.z])
    }
  }
  const { x0, x1, z0, z1 } = TOWER
  for (const z of [z0, z1]) {
    seg([x0, z], [-4, z])
    seg([4, z], [x1, z])
  }
  seg([x0, z0], [x0, z1])
  seg([x1, z0], [x1, z1])
  POOL_OUTLINE.forEach((p, i) => seg(p, POOL_OUTLINE[(i + 1) % POOL_OUTLINE.length]))
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2
    const b = ((i + 1) / 20) * Math.PI * 2
    seg([KIDS_POOL.x + Math.cos(a) * KIDS_POOL.r, KIDS_POOL.z + Math.sin(a) * KIDS_POOL.r], [KIDS_POOL.x + Math.cos(b) * KIDS_POOL.r, KIDS_POOL.z + Math.sin(b) * KIDS_POOL.r])
  }
  // Villa walls and spa.
  for (const v of VILLAS) {
    const c = [[v.x - 5.5, v.z - 2], [v.x + 5.5, v.z - 2], [v.x + 5.5, v.z + 7], [v.x - 5.5, v.z + 7]]
    c.forEach((p, i) => seg(p, c[(i + 1) % 4]))
  }
  const s = [[SPA.x - SPA.w / 2, SPA.z - SPA.d / 2], [SPA.x + SPA.w / 2, SPA.z - SPA.d / 2], [SPA.x + SPA.w / 2, SPA.z + SPA.d / 2], [SPA.x - SPA.w / 2, SPA.z + SPA.d / 2]]
  s.forEach((p, i) => seg(p, s[(i + 1) % 4]))
  return out
})()

// Palms around the deck, beach and arrival.
export const PALM_SPOTS = (() => {
  const out = []
  for (let i = 0; i < 9; i++) {
    const d = 28 + i * 15.5
    if (d > 76 && d < 104) continue
    const p = arcPoint(d, 64)
    out.push({ pos: V(p.x, LAND_Y, p.z), h: 7 + (i % 3) * 0.8 })
  }
  for (let x = -160; x <= 160; x += 16) {
    if (Math.abs(x - PIER.x) < 6) continue
    const z = shoreZ(x) + 21 + (Math.abs(x) % 3)
    out.push({ pos: V(x, terrainH(x, z), z), h: 6.5 + ((x / 16) % 3 + 3) % 3 * 0.7 })
  }
  for (const x of [-20, -10, 10, 20]) out.push({ pos: V(x, LAND_Y, ARRIVAL.z + 8), h: 8 })
  return out
})()

export const HOTEL_CATEGORIES = {
  info: { label: 'Arrival', icon: 'ticket', color: '#ffe08a' },
  stay: { label: 'Rooms & villas', icon: 'home', color: '#ffd27a' },
  pool: { label: 'Pools', icon: 'pool', color: '#4fd8ff' },
  beach: { label: 'Beach', icon: 'sun', color: '#ffc46b' },
  dine: { label: 'Dining', icon: 'food', color: '#ff9a4a' },
  well: { label: 'Spa', icon: 'spa', color: '#c99bff' },
  family: { label: 'Family', icon: 'family', color: '#7fe08a' },
}

const shoreAt = (x, off) => V(x, terrainH(x, shoreZ(x) + off), shoreZ(x) + off)
export const HOTEL_POIS = [
  { id: 'arrival', cat: 'info', name: 'Arrival Court', sub: 'Porte-cochère, valet and concierge', pos: V(0, LAND_Y, ARRIVAL.z + 22), look: V(0, 6, 62), cta: 'Check availability' },
  { id: 'lobby', cat: 'info', name: 'Grand Lobby', sub: 'Double-height lobby with a crystal chandelier', pos: V(0, LAND_Y, 55.5), look: V(0, 3.5, 45), cta: 'Check availability' },
  { id: 'suite', cat: 'stay', level: 'suite', name: 'Signature Suite', sub: 'Floor 8 · king bed, lounge, balcony over the sea', pos: V(-3, SUITE_Y, 55.5), look: V(-9, SUITE_Y + 1.2, 40), cta: 'Book this suite' },
  { id: 'pool', cat: 'pool', name: 'Lagoon Pool', sub: '42 m lagoon with a swim-up bar', pos: V(-12, LAND_Y, 34), look: V(2, 1, 12), cta: 'Book a cabana' },
  { id: 'kids', cat: 'family', name: 'Splash Zone', sub: 'Kids pool and club, daily 9am–6pm', pos: V(-34, LAND_Y, 34), look: V(-34, 0.5, 22), cta: 'Book kids club' },
  { id: 'beach', cat: 'beach', name: 'Private Beach', sub: 'Loungers, umbrellas and beach service', pos: shoreAt(-8, 21), look: shoreAt(-8, 6), cta: 'Reserve loungers' },
  { id: 'pier', cat: 'dine', name: 'Pier & Sunset Deck', sub: 'A 90 m boardwalk over the water', pos: V(PIER.x, PIER.y, -24), look: V(PIER.x, 2, -80) },
  { id: 'restaurant', cat: 'dine', name: 'Overwater Restaurant', sub: 'Seafood dinners above the sea', pos: V(PIER.x, PIER.y, -88), look: V(RESTAURANT.x, 2.5, RESTAURANT.z), cta: 'Reserve a table' },
  { id: 'villas', cat: 'stay', name: 'Beach Villas', sub: 'Three villas with private plunge pools', pos: V(-116, LAND_Y, 12), look: V(-116, 2, -12), cta: 'Check availability' },
  { id: 'spa', cat: 'well', name: 'Saffron Spa', sub: 'Treatment pavilion and hammam', pos: V(SPA.x, LAND_Y, 18), look: V(SPA.x, 2.5, SPA.z), cta: 'Book a treatment' },
]
export { V }
