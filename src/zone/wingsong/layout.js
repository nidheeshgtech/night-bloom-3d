import * as THREE from 'three'
import { heightAt } from '../../world/terrain'
import { makePath } from '../../world/pathlib'

// Wingsong Conservatory: a leaf-shaped glasshouse in the north-east petal. Local frame:
// a = distance along the leaf axis (outward from the lake), l = lateral offset.
const ANG = -Math.PI / 6
export const AXIS = new THREE.Vector2(Math.cos(ANG), Math.sin(ANG))
export const LAT = new THREE.Vector2(-AXIS.y, AXIS.x)
const ORIGIN_R = 70 // leaf base sits 70 m from the lake centre

export const GH = { L: 46, W: 14, H: 11, a0: 5.5, door: { half: 2.2, height: 3.4 } }
export const A_END = GH.L * 0.985

export function toWorld(a, l, lift = 0) {
  const x = AXIS.x * (ORIGIN_R + a) + LAT.x * l
  const z = AXIS.y * (ORIGIN_R + a) + LAT.y * l
  return new THREE.Vector3(x, heightAt(x, z) + lift, z)
}

export function toLocal(x, z) {
  return [x * AXIS.x + z * AXIS.y - ORIGIN_R, x * LAT.x + z * LAT.y]
}

const sinA = (a) => Math.sin(Math.PI * Math.min(Math.max(a / GH.L, 0), 1))
// Leaf outline: widest a little before the middle, tapering to a point.
export const halfWidth = (a) => GH.W * Math.pow(sinA(a), 0.75) * (1.1 - (0.3 * a) / GH.L)
export const ridge = (a) => GH.H * Math.pow(sinA(a), 0.6)
// Shell height above ground at axial a and normalised lateral v in [-1, 1].
export const shellHeight = (a, v) => ridge(a) * Math.sqrt(Math.max(0, 1 - v * v))

export function inside(p, margin = 0.4) {
  const [a, l] = toLocal(p.x, p.z)
  if (a < GH.a0 + margin || a > GH.L - 1.5) return false
  const w = halfWidth(a)
  if (Math.abs(l) > w - margin) return false
  const g = heightAt(p.x, p.z)
  return p.y > g + 0.05 && p.y < g + shellHeight(a, l / w) * 0.85 - margin
}

// Collision walls: the glass perimeter plus the end wall either side of the door.
export const WALLS = (() => {
  const out = []
  const seg = (p, q) => out.push([p.x, p.z, q.x, q.z])
  for (const side of [-1, 1]) {
    let prev = toWorld(GH.a0, side * halfWidth(GH.a0))
    for (let a = GH.a0 + 1; a <= A_END + 0.01; a += 1) {
      const p = toWorld(a, side * halfWidth(a))
      seg(prev, p)
      prev = p
    }
    seg(toWorld(GH.a0, side * halfWidth(GH.a0)), toWorld(GH.a0, side * GH.door.half))
  }
  return out
})()

const pts = (list) => list.map(([a, l]) => {
  const p = toWorld(a, l)
  return [p.x, p.z]
})

// Visitor path: from the zone gate, through the door, around the stream and back.
export const PATH_HALF_IN = 1.3
export const innerPath = makePath(
  pts([
    [-6, 0],
    [GH.a0 + 1, 0],
    [11, -5.8],
    [20, -7.5],
    [29, -5.5],
    [36, -1.5],
    [33, 4.5],
    [24, 7.5],
    [15, 6.5],
    [9, 3.6],
    [GH.a0 + 1.5, 0.6],
  ]),
  { step: 0.2 },
)

// Spring at the far end feeding a meandering stream into a pond near the door.
export const SPRING = [36.5, 0.5]
export const POND = { a: 13, l: -0.3, r: 2.2 }
export const stream = makePath(
  pts([
    [35, 0.6],
    [30, -1.4],
    [24.5, 1],
    [19, -0.9],
    [14.8, 0.2],
  ]),
  { step: 0.2 },
)
export const STREAM_HALF = 0.55

export const pondCenter = () => toWorld(POND.a, POND.l)
export const glassCenter = () => toWorld(GH.L * 0.45, 0, GH.H * 0.55)
