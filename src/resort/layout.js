import * as THREE from 'three'
import { BRAND } from '../brand'
import { heightAt } from '../world/terrain'
import { pathToWorld, PATH_LENGTH } from '../zone/layout'
import { zoneById } from '../world/plan'

// Resort venue layout (only when the active brand has venue: 'resort'). Facilities sit in
// the wedges between garden petals; trees there are cleared (see RESORT_CLEAR).
export const RESORT = BRAND.venue === 'resort' ? BRAND.event : null
const deg = (d) => (d * Math.PI) / 180
const polar = (a, r) => {
  const x = Math.cos(a) * r
  const z = Math.sin(a) * r
  return new THREE.Vector3(x, heightAt(x, z), z)
}
const at = (a, r) => polar(deg(a), r)
const face = (p, t) => Math.atan2(t.x - p.x, t.z - p.z)
const centre = new THREE.Vector3()

// Infinity pool on the 120° wedge, long side along the circle, facing the lake.
const poolC = at(120, 75)
export const POOL = { pos: poolC, yaw: face(poolC, centre), w: 22, d: 9 }
// Six villas staggered across the 60° wedge.
export const VILLAS = [
  [55.5, 74], [64.5, 76], [51, 86], [60, 89], [69, 87], [60, 101],
].map(([a, r]) => {
  const p = at(a, r)
  return { pos: p, yaw: face(p, centre) }
})
// Lake-view dining terrace on the 180° wedge.
const dineC = at(180, 73)
export const DINING = { pos: dineC, yaw: face(dineC, centre), w: 18, d: 12 }
// Yoga lawn on the 0° wedge.
const yogaC = at(0, 71)
export const YOGA = { pos: yogaC, yaw: face(yogaC, centre) }
// Arrival court at the outer end of the main avenue.
const gate = pathToWorld(PATH_LENGTH - 1.5, 0)
export const ARRIVAL = { pos: gate, yaw: face(gate, pathToWorld(PATH_LENGTH - 6, 0)) }

// Trees are removed inside these circles so facilities have room.
export const RESORT_CLEAR = RESORT
  ? [
      { x: poolC.x, z: poolC.z, r: 19 },
      ...VILLAS.map((v) => ({ x: v.pos.x, z: v.pos.z, r: 8.5 })),
      { x: dineC.x, z: dineC.z, r: 15 },
      { x: yogaC.x, z: yogaC.z, r: 10 },
    ]
  : []

export const RESORT_CATEGORIES = {
  stay: { label: 'Villas', icon: 'home', color: '#ffd27a' },
  pool: { label: 'Pool', icon: 'pool', color: '#4fd8ff' },
  dine: { label: 'Dining', icon: 'food', color: '#ff9a4a' },
  well: { label: 'Spa & wellness', icon: 'spa', color: '#c99bff' },
  family: { label: 'Family', icon: 'family', color: '#7fe08a' },
  info: { label: 'Arrival', icon: 'ticket', color: '#ffe08a' },
}

const view = (target, a, r, h = 0) => ({ pos: at(a, r), look: target.clone().setY(target.y + h) })
export const RESORT_POIS = RESORT
  ? [
      { id: 'arrival', cat: 'info', name: 'Arrival Court', sub: 'Check-in, concierge and valet', ...{ pos: pathToWorld(PATH_LENGTH - 16, 0), look: ARRIVAL.pos.clone().setY(ARRIVAL.pos.y + 3) }, cta: 'Check availability' },
      { id: 'pool', cat: 'pool', name: 'Infinity Pool', sub: '22 m lake-edge pool · loungers, cabanas, pool bar', ...view(poolC, 120, 58.5, 0.5), cta: 'Book a cabana' },
      { id: 'villas', cat: 'stay', name: 'Garden Villas', sub: '6 private villas with plunge pools', ...view(VILLAS[1].pos, 60, 60, 1.5), cta: 'Check availability' },
      { id: 'dining', cat: 'dine', name: 'Lakeview Terrace', sub: 'All-day dining under the pergola', ...view(dineC, 180, 59, 1), cta: 'Reserve a table' },
      { id: 'yoga', cat: 'well', name: 'Sunrise Lawn', sub: 'Yoga and meditation sessions', ...view(yogaC, 0, 59.5, 0.3), cta: 'Join a class' },
      { id: 'spa', cat: 'well', name: zoneById('herbarium').name, sub: 'Courtyard spa with treatment pavilion', ...view(at(30, 100), 30, 72, 1.5), cta: 'Book a treatment' },
      { id: 'kids', cat: 'family', name: zoneById('wingsong').name, sub: 'Kids club in the butterfly glasshouse', ...view(at(-30, 85), -30, 62, 2), cta: 'Book family tickets' },
    ]
  : []

export const RESORT_COLLIDERS = RESORT
  ? [...VILLAS.map((v) => ({ x: v.pos.x, z: v.pos.z, r: 4.6 })), { x: dineC.x, z: dineC.z, r: 1.2 }]
  : []
// The pool is walled for walking (rectangle around the water).
export function resortWalls() {
  if (!RESORT) return []
  const { pos, yaw, w, d } = POOL
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  const pt = (x, z) => [pos.x + x * c + z * s, pos.z - x * s + z * c]
  const k = [pt(-w / 2, -d / 2), pt(w / 2, -d / 2), pt(w / 2, d / 2), pt(-w / 2, d / 2)]
  return k.map((p, i) => [...p, ...k[(i + 1) % 4]])
}
