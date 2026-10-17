import * as THREE from 'three'
import { mulberry32 } from '../../lib/random'
import { GH, POND, PATH_HALF_IN, SPRING, halfWidth, innerPath, stream, toLocal, toWorld } from './layout'

const rand = mulberry32(919)
const UP = new THREE.Vector3(0, 1, 0)
const q = new THREE.Quaternion()
const color = new THREE.Color()

const distToStream = (x, z) => stream.nearest(x, z).dist
const insideFloor = (x, z, margin) => {
  const [a, l] = toLocal(x, z)
  return a > GH.a0 + margin && a < GH.L - 3 && Math.abs(l) < halfWidth(a) - margin
}
const pond = toWorld(POND.a, POND.l)
const clearOfWater = (x, z, gap) => distToStream(x, z) > 0.55 + gap && Math.hypot(x - pond.x, z - pond.z) > POND.r + gap

// Nectar beds along both sides of the inner path.
const BED = { d0: PATH_HALF_IN + 0.35, d1: PATH_HALF_IN + 2.1, step: 0.33 }
export const conservatoryBeds = { petunia: [], daisy: [] }
const PETUNIA = ['#ff4f9a', '#b45ce0', '#ffffff', '#ff86bf']
for (const side of [-1, 1]) {
  for (let s = 9; s < innerPath.length - 2; s += BED.step) {
    for (let d = BED.d0 + BED.step / 2; d < BED.d1; d += BED.step) {
      const p = innerPath.toWorld(s + (rand() - 0.5) * 0.2, side * (d + (rand() - 0.5) * 0.15))
      if (!insideFloor(p.x, p.z, 1.2) || !clearOfWater(p.x, p.z, 0.9)) continue
      if (innerPath.nearest(p.x, p.z).dist < PATH_HALF_IN + 0.3) continue
      const species = d > BED.d0 + 1.1 ? 'daisy' : 'petunia'
      const scale = (species === 'daisy' ? 1.3 : 1.35) * (0.88 + rand() * 0.24)
      q.setFromAxisAngle(UP, rand() * Math.PI * 2)
      color.set(species === 'daisy' ? (rand() < 0.5 ? '#ffffff' : '#a678e0') : PETUNIA[Math.floor((s / 6) % PETUNIA.length)])
      conservatoryBeds[species].push({
        matrix: new THREE.Matrix4().compose(p, q.clone(), new THREE.Vector3(scale, scale, scale)),
        color: color.clone(),
        variant: Math.floor(rand() * 3),
      })
    }
  }
}

// Shrubs, big-leaf clumps and palms placed on free floor space between path and glass.
function scatter(count, minGap, test) {
  const out = []
  let guard = 0
  while (out.length < count && guard++ < count * 300) {
    const a = GH.a0 + 2 + rand() * (GH.L - GH.a0 - 6)
    const l = (rand() * 2 - 1) * (halfWidth(a) - 1.4)
    const p = toWorld(a, l)
    if (innerPath.nearest(p.x, p.z).dist < PATH_HALF_IN + 2.4) continue
    if (!clearOfWater(p.x, p.z, 1.2)) continue
    if (out.some((o) => o.distanceTo(p) < minGap)) continue
    if (test && !test(a, l)) continue
    out.push(p)
  }
  return out
}

const taken = []
const place = (count, gap, test) => {
  const list = scatter(count, gap, (a, l) => {
    const p = toWorld(a, l)
    return taken.every((t) => t.distanceTo(p) > gap) && (!test || test(a, l))
  })
  taken.push(...list)
  return list
}

export const PALMS_IN = place(2, 6, (a, l) => a > 16 && a < 30 && Math.abs(l) < halfWidth(a) - 5)
export const HIBISCUS = place(10, 2.4)
export const LANTANA = place(12, 2)
export const BOUGAINVILLEA = place(4, 2.6)
export const ALOCASIA = place(12, 1.8)

// Ferns along the stream banks and around the spring.
export const FERNS = []
for (let s = 0.6; s < stream.length; s += 0.9) {
  for (const side of [-1, 1]) {
    const p = stream.toWorld(s, side * (0.95 + rand() * 0.5))
    if (innerPath.nearest(p.x, p.z).dist > PATH_HALF_IN + 0.5) FERNS.push(p)
  }
}

// Rocks: stream banks, pond rim and a grotto pile at the spring.
export const ROCKS = []
for (let s = 0; s < stream.length; s += 0.7) {
  for (const side of [-1, 1]) {
    ROCKS.push({ p: stream.toWorld(s, side * (0.62 + rand() * 0.15)), s: 0.14 + rand() * 0.18 })
  }
}
for (let i = 0; i < 18; i++) {
  const a = (i / 18) * Math.PI * 2
  const c = toWorld(POND.a, POND.l)
  const x = c.x + Math.cos(a) * (POND.r + 0.1)
  const z = c.z + Math.sin(a) * (POND.r + 0.1)
  ROCKS.push({ p: new THREE.Vector3(x, c.y, z), s: 0.18 + rand() * 0.2 })
}
for (let i = 0; i < 9; i++) {
  ROCKS.push({ p: toWorld(SPRING[0] + 0.6 + rand() * 1.8, SPRING[1] + (rand() - 0.5) * 3), s: 0.5 + rand() * 0.8, big: true })
}
