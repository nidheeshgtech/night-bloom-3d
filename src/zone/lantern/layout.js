import * as THREE from 'three'
import { mulberry32 } from '../../lib/random'
import { heightAt } from '../../world/terrain'
import { makePath } from '../../world/pathlib'

// Lantern Shore: a light garden in the south-west petal, plus floating lights on the lake.
// Local frame: a = distance out from the zone gate (r = 64), l = lateral offset.
const ANG = (150 * Math.PI) / 180
const AXIS = new THREE.Vector2(Math.cos(ANG), Math.sin(ANG))
const LAT = new THREE.Vector2(-AXIS.y, AXIS.x)
const GATE_R = 64

export function toWorld(a, l, lift = 0) {
  const x = AXIS.x * (GATE_R + a) + LAT.x * l
  const z = AXIS.y * (GATE_R + a) + LAT.y * l
  return new THREE.Vector3(x, heightAt(x, z) + lift, z)
}

export const LANTERN_PATH_HALF = 1.5
const pts = (list) => list.map(([a, l]) => {
  const p = toWorld(a, l)
  return [p.x, p.z]
})
export const lanternPath = makePath(
  pts([
    [0, 0],
    [9, -1.8],
    [19, 2.4],
    [29, -2.2],
    [39, 2.8],
    [49, -1],
    [57, 0.5],
  ]),
  { step: 0.2 },
)
export const PLAZA = { a: 61.5, l: 0.5, r: 5 }
export const plazaCenter = () => toWorld(PLAZA.a, PLAZA.l)

const rand = mulberry32(1505)
const clearOfPath = (p, gap) => lanternPath.nearest(p.x, p.z).dist > LANTERN_PATH_HALF + gap

// Seed Lanterns: groves either side of the path plus a ring around the end plaza.
export const LANTERNS = (() => {
  const out = []
  const palette = ['#ffd9a0', '#ffb070', '#c9a0ff', '#9fd8ff', '#ff9fd0']
  let guard = 0
  while (out.length < 30 && guard++ < 4000) {
    const a = 6 + rand() * 50
    const l = (rand() < 0.5 ? -1 : 1) * (3 + rand() * 12)
    const p = toWorld(a, l)
    if (!clearOfPath(p, 1.5) || out.some((o) => o.pos.distanceTo(p) < 2.6)) continue
    out.push({ pos: p, h: 1.8 + rand() * 2.6, color: palette[Math.floor(rand() * palette.length)], phase: rand() * 6.28 })
  }
  const c = plazaCenter()
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2
    const p = new THREE.Vector3(c.x + Math.cos(ang) * (PLAZA.r + 1.4), 0, c.z + Math.sin(ang) * (PLAZA.r + 1.4))
    p.y = heightAt(p.x, p.z)
    out.push({ pos: p, h: 2.6 + (i % 3) * 0.7, color: palette[i % palette.length], phase: i })
  }
  out.push({ pos: c, h: 5.5, color: '#fff0d0', phase: 0, hero: true })
  return out
})()

// Light Reeds: drifts of glowing-tipped reeds filling the meadow around the path.
export function reedPositions(count) {
  const r = mulberry32(77)
  const out = []
  let guard = 0
  while (out.length < count && guard++ < count * 20) {
    const a = 2 + r() * 58
    const l = (r() * 2 - 1) * 20
    // Drifts: keep reeds where a slow noise field is positive.
    if (Math.sin(a * 0.21 + l * 0.17) + Math.sin(a * 0.07 - l * 0.23) < -0.2) continue
    const p = toWorld(a, l)
    if (!clearOfPath(p, 0.8)) continue
    if (LANTERNS.some((L) => (L.pos.x - p.x) ** 2 + (L.pos.z - p.z) ** 2 < 1.2)) continue
    const c = plazaCenter()
    if ((c.x - p.x) ** 2 + (c.z - p.z) ** 2 < (PLAZA.r + 0.6) ** 2) continue
    out.push({ pos: p, h: 1.1 + r() * 1.2, hue: r() })
  }
  return out
}

// Moon Lilies: floating flowers on the lake, off the Lantern Shore side.
export const LILIES = (() => {
  const r = mulberry32(31)
  const out = []
  let guard = 0
  while (out.length < 46 && guard++ < 5000) {
    const ang = ANG + (r() * 2 - 1) * 0.5
    const rad = 14 + r() * 30
    const p = new THREE.Vector3(Math.cos(ang) * rad, 0, Math.sin(ang) * rad)
    if (out.some((o) => o.pos.distanceTo(p) < 2.2)) continue
    out.push({ pos: p, s: 0.8 + r() * 0.6, color: r() < 0.6 ? '#a0f0ff' : '#ffb8e8', phase: r() * 6.28 })
  }
  return out
})()
