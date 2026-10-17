import * as THREE from 'three'
import { heightAt } from '../../world/terrain'

// Herbarium Walk: a chahar bagh (four-part garden) in the east petal, on levelled ground.
// Local frame: R = distance from the lake centre along the petal axis, l = lateral offset.
const ANG = Math.PI / 6
export const AX = new THREE.Vector2(Math.cos(ANG), Math.sin(ANG))
export const LT = new THREE.Vector2(-AX.y, AX.x)

export const C = 100 // garden centre
export const HALF = 20 // half size of the square
export const WALK = 2.4 // perimeter walk width
export const AXW = 2.2 // half width of the axial walks
export const PLAZA_R = 5.2
export const FOUNTAIN_R = 3.6
export const CH = { half: 0.45, end: 17.4 } // water channels
export const POOL = { r0: 67, r1: 78, half: 1.2 } // entrance reflecting pool
export const PAV = { r: 128, radius: 4.2 } // pavilion
export const WATER_Y = 0.22 // raised water surface above ground

export function toWorld(R, l, lift = 0) {
  const x = AX.x * R + LT.x * l
  const z = AX.y * R + LT.y * l
  return new THREE.Vector3(x, heightAt(x, z) + lift, z)
}

export function toLocal(x, z) {
  return [x * AX.x + z * AX.y, x * LT.x + z * LT.y]
}

export const I = C - HALF
export const O = C + HALF
const IN = I + WALK
const ON = O - WALK
const E = HALF - WALK

// Paving rectangles [R0, R1, l0, l1], laid edge to edge (no overlaps).
export const PAVING = [
  [I, IN, -HALF, HALF],
  [ON, O, -HALF, HALF],
  [IN, ON, -HALF, -E],
  [IN, ON, E, HALF],
  [IN, C - 4.6, -AXW, AXW],
  [C + 4.6, ON, -AXW, AXW],
  [C - AXW, C + AXW, -E, -4.6],
  [C - AXW, C + AXW, 4.6, E],
  [64.5, I, -3.6, 3.6],
  [O, PAV.r - 5, -AXW, AXW],
]

// The four quarters [R0, R1, l0, l1].
export const QUARTERS = [
  [IN, C - AXW, -E, -AXW],
  [IN, C - AXW, AXW, E],
  [C + AXW, ON, -E, -AXW],
  [C + AXW, ON, AXW, E],
]
export const quarterCentre = (q) => [(q[0] + q[1]) / 2, (q[2] + q[3]) / 2]

const ring = (R, l, r, n = 24) => Array.from({ length: n }, (_, i) => [R + Math.cos((i / n) * Math.PI * 2) * r, l + Math.sin((i / n) * Math.PI * 2) * r])
const rect = ([R0, R1, l0, l1]) => [[R0, l0], [R1, l0], [R1, l1], [R0, l1]]
const toXZ = (pts) => pts.map(([R, l]) => [AX.x * R + LT.x * l, AX.y * R + LT.y * l])

// Ground mask shapes in world x/z: red = no grass, yellow = soil (no grass).
export function herbMaskPolys() {
  return [
    ...PAVING.map((r) => ({ pts: toXZ(rect(r)), fill: '#f00' })),
    { pts: toXZ(ring(C, 0, PLAZA_R + 0.2)), fill: '#f00' },
    { pts: toXZ(ring(PAV.r, 0, 5.8)), fill: '#f00' },
    ...QUARTERS.map((q) => ({ pts: toXZ(rect(q)), fill: '#ff0' })),
  ]
}

// Walls around the raised reflecting pool.
export const HERB_WALLS = (() => {
  const h = POOL.half + 0.15
  const c = [[POOL.r0 - 0.15, -h], [POOL.r1 + 0.15, -h], [POOL.r1 + 0.15, h], [POOL.r0 - 0.15, h]].map(([R, l]) => toWorld(R, l))
  return c.map((p, i) => [p.x, p.z, c[(i + 1) % 4].x, c[(i + 1) % 4].z])
})()

// Pavilion corner piers (octagon vertices) in world space.
export const PAV_FACE = ANG + Math.PI // world xz angle of the side facing the garden
export const PAV_CORNERS = Array.from({ length: 8 }, (_, k) => {
  const a = PAV_FACE + (k * Math.PI) / 4 + Math.PI / 8
  const c = toWorld(PAV.r, 0)
  return new THREE.Vector3(c.x + Math.cos(a) * PAV.radius, c.y, c.z + Math.sin(a) * PAV.radius)
})
