import * as THREE from 'three'
import { BRAND } from '../brand'
import { heightAt, QUAY_RADIUS, WATER_LEVEL } from '../world/terrain'
import { PROMENADE } from '../world/plan'
import { pathToWorld, PATH_LENGTH } from '../zone/layout'
import { LANTERNS, lanternPath, toWorld as lanternToWorld } from '../zone/lantern/layout'

// Festival venue layout (only used when the active brand defines an `event`).
export const EVENT = BRAND.event
const deg = (d) => (d * Math.PI) / 180
const polar = (a, r) => {
  const x = Math.cos(a) * r
  const z = Math.sin(a) * r
  return new THREE.Vector3(x, heightAt(x, z), z)
}
// Facing angle (rotation.y) so an object at p looks toward target t.
const face = (p, t) => Math.atan2(t.x - p.x, t.z - p.z)

// Main stage floats on the lake by the south quay, facing the promenade crowd; the Lotus
// Crown rises behind it.
export const MAIN_STAGE = { pos: new THREE.Vector3(0, WATER_LEVEL + 0.9, QUAY_RADIUS - 11), w: 20, d: 10, yaw: 0 }
// Second stage: the clearest spot beside the Lantern Shore path, facing the path.
const lpA = (() => {
  let best = null
  for (let a = 8; a <= 26; a += 1.5) {
    for (const l of [-11, -9, -7, 7, 9, 11]) {
      const p = lanternToWorld(a, l)
      const clear = Math.min(...LANTERNS.map((L) => L.pos.distanceTo(p)), lanternPath.nearest(p.x, p.z).dist - 1.5)
      if (!best || clear > best.clear) best = { p, clear }
    }
  }
  return best.p
})()
const lpB = (() => {
  const n = lanternPath.nearest(lpA.x, lpA.z)
  return lanternPath.toWorld(n.s, 0)
})()
export const SECOND_STAGE = { pos: lpA, r: 4.2, yaw: face(lpA, lpB) }

const centre = new THREE.Vector3(0, 0, 0)
// Stalls sit outside the promenade palm ring (r 56–58) and inside the petal hedges.
// Food trucks in an arc on the lawn between Bloom Terraces and Lantern Shore.
export const TRUCKS = Array.from({ length: 6 }, (_, i) => {
  const p = polar(deg(112 + i * 3.4), 64.5)
  return { pos: p, yaw: face(p, centre), hue: i }
})
// Exhibitor and sponsor booths in an arc between Bloom Terraces and Herbarium Walk.
export const BOOTHS = Array.from({ length: 12 }, (_, i) => {
  const p = polar(deg(47 + i * 2.5), 64.5)
  return { pos: p, yaw: face(p, centre), sponsor: i % 4 === 0 ? Math.floor(i / 4) : -1 }
})
const at = (a, r) => polar(deg(a), r)
export const TOILETS = [at(134.5, 60), at(40.5, 60), at(159, 60.5)].map((pos) => ({ pos, yaw: face(pos, centre) }))
export const FIRST_AID = { pos: at(2, 60.5), yaw: face(at(2, 60.5), centre) }
export const INFO = [at(99.5, 58.5), at(-66, 58.5)].map((pos) => ({ pos, yaw: face(pos, centre) }))

// Main entrance with ticket gates at the outer end of the Bloom Terraces avenue.
const gate = pathToWorld(PATH_LENGTH - 1.5, 0)
export const ENTRANCE = { pos: gate, yaw: face(gate, pathToWorld(PATH_LENGTH - 6, 0)) }
export const PARKING = { pos: polar(Math.atan2(gate.z, gate.x), 205), w: 60, d: 34 }
export { PROMENADE }

// Points of interest for map pins, the Explore filter and "Take me there".
export const CATEGORIES = {
  stage: { label: 'Stages', icon: 'mic', color: '#ff5fb0' },
  food: { label: 'Food & drink', icon: 'food', color: '#ffb347' },
  booth: { label: 'Booths', icon: 'bag', color: '#5fd0ff' },
  wc: { label: 'Toilets', icon: 'wc', color: '#b8c4d6' },
  aid: { label: 'First aid', icon: 'aid', color: '#ff5a5a' },
  info: { label: 'Info & tickets', icon: 'ticket', color: '#ffe08a' },
  parking: { label: 'Parking', icon: 'car', color: '#8fa3ff' },
}

export const POIS = EVENT
  ? [
      { id: 'main', cat: 'stage', name: EVENT.stages.main, sub: 'Main stage on the lake · watch from the promenade', pos: new THREE.Vector3(0, 0, PROMENADE.radius + 1), look: MAIN_STAGE.pos },
      { id: 'second', cat: 'stage', name: EVENT.stages.second, sub: 'Acoustic and DJ sets at Lantern Shore', pos: SECOND_STAGE.pos.clone().add(lpB.clone().sub(SECOND_STAGE.pos).setY(0).normalize().multiplyScalar(SECOND_STAGE.r + 8)), look: SECOND_STAGE.pos.clone().setY(SECOND_STAGE.pos.y + 2) },
      { id: 'food', cat: 'food', name: 'Food Truck Row', sub: '6 trucks · street food, coffee, desserts', pos: at(120.5, 52.8), look: TRUCKS[2].pos.clone().lerp(TRUCKS[3].pos, 0.5) },
      { id: 'booths', cat: 'booth', name: 'Makers & Sponsors Market', sub: '12 booths · crafts, brands, activations', pos: at(66.5, 53.5), look: BOOTHS[5].pos.clone().lerp(BOOTHS[6].pos, 0.5) },
      ...TOILETS.map((t, i) => ({ id: `wc${i}`, cat: 'wc', name: 'Toilets', sub: 'Accessible facilities', pos: t.pos.clone().lerp(centre, 0.06), look: t.pos })),
      { id: 'aid', cat: 'aid', name: 'First Aid', sub: 'Medical team on site all evening', pos: FIRST_AID.pos.clone().lerp(centre, 0.06), look: FIRST_AID.pos },
      ...INFO.map((t, i) => ({ id: `info${i}`, cat: 'info', name: 'Info Point', sub: 'Maps, lost & found, ticket help', pos: t.pos.clone().lerp(centre, 0.05), look: t.pos })),
      { id: 'gate', cat: 'info', name: 'Main Entrance', sub: 'Ticket gates · bag check', pos: pathToWorld(PATH_LENGTH - 5, 0), look: ENTRANCE.pos },
      { id: 'parking', cat: 'parking', name: 'Visitor Parking', sub: 'Shuttle to the main entrance', pos: PARKING.pos, look: PARKING.pos, fly: true },
    ]
  : []

// Colliders for walking (empty when no event is active).
export const EVENT_COLLIDERS = EVENT
  ? [
      ...TRUCKS.map((t) => ({ x: t.pos.x, z: t.pos.z, r: 3.0 })),
      ...BOOTHS.map((b) => ({ x: b.pos.x, z: b.pos.z, r: 1.8 })),
      ...TOILETS.map((t) => ({ x: t.pos.x, z: t.pos.z, r: 1.6 })),
      { x: FIRST_AID.pos.x, z: FIRST_AID.pos.z, r: 2.4 },
      ...INFO.map((t) => ({ x: t.pos.x, z: t.pos.z, r: 1.0 })),
      { x: SECOND_STAGE.pos.x, z: SECOND_STAGE.pos.z, r: SECOND_STAGE.r + 0.3 },
    ]
  : []
