import * as THREE from 'three'

// Ribbon Arcade test zone: one curved path with planted borders and an arcade over its middle.
export const PATH_HALF = 1.6 // paved width 3.2 m
export const EDGE_W = 0.2 // sandstone edging
export const BED_IN = PATH_HALF + EDGE_W + 0.05
export const BED_OUT = 4.3
export const HEDGE_IN = BED_OUT + 0.1
export const HEDGE_OUT = BED_OUT + 0.75
export const WALK_LIMIT = 14 // max distance from the path centreline when walking
export const MASK_EXTENT = 40 // mask covers [-40, 40] on x and z

export const ARCADE = { from: 12.5, to: 32.5, count: 9, legOffset: 2.05, height: 3.7 }

export function heightAt(x, z) {
  return 0.22 * Math.sin(x * 0.08) * Math.cos(z * 0.07) + 0.12 * Math.sin((x + z) * 0.13)
}

const CONTROL = [
  [-24, 7],
  [-13, 2.5],
  [-2.5, -1.5],
  [8, -1.2],
  [17, 3.5],
  [25, 9.5],
]

const curve = new THREE.CatmullRomCurve3(
  CONTROL.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  false,
  'centripetal',
)

export const PATH_LENGTH = curve.getLength()

// Arc-length lookup table: point, tangent and left normal every ~10 cm.
const SAMPLES = Math.ceil(PATH_LENGTH / 0.1)
export const PATH = Array.from({ length: SAMPLES + 1 }, (_, i) => {
  const t = i / SAMPLES
  const p = curve.getPointAt(t)
  const tan = curve.getTangentAt(t).setY(0).normalize()
  return { s: t * PATH_LENGTH, x: p.x, z: p.z, tx: tan.x, tz: tan.z, nx: -tan.z, nz: tan.x }
})

// Frame at arc length s (clamped).
export function frameAt(s) {
  const i = Math.max(0, Math.min(SAMPLES, Math.round((s / PATH_LENGTH) * SAMPLES)))
  return PATH[i]
}

// World position at path coordinate (s along, d sideways; +d = left of travel).
export function pathToWorld(s, d) {
  const f = frameAt(s)
  const x = f.x + f.nx * d
  const z = f.z + f.nz * d
  return new THREE.Vector3(x, heightAt(x, z), z)
}

// Closest path coordinate for a world point (brute force over the LUT; fine at this size).
export function worldToPath(x, z) {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < PATH.length; i += 2) {
    const p = PATH[i]
    const d = (x - p.x) ** 2 + (z - p.z) ** 2
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  const p = PATH[best]
  const side = (x - p.x) * p.nx + (z - p.z) * p.nz
  return { s: p.s, d: side, dist: Math.sqrt(bestD), frame: p }
}
