import * as THREE from 'three'
import { heightAt } from './terrain'

// Arc-length lookup for a path through [x, z] points: each entry has point, tangent and
// left normal. Paths are addressed as (s along, d sideways; +d = left of travel).
export function makePath(points, { closed = false, step = 0.1 } = {}) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    closed,
    'centripetal',
  )
  const length = curve.getLength()
  const n = Math.ceil(length / step)
  const lut = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const p = curve.getPointAt(t)
    const tan = curve.getTangentAt(t).setY(0).normalize()
    return { s: t * length, x: p.x, z: p.z, tx: tan.x, tz: tan.z, nx: -tan.z, nz: tan.x }
  })
  const frameAt = (s) => lut[Math.max(0, Math.min(n, Math.round((s / length) * n)))]
  const toWorld = (s, d) => {
    const f = frameAt(s)
    const x = f.x + f.nx * d
    const z = f.z + f.nz * d
    return new THREE.Vector3(x, heightAt(x, z), z)
  }
  const nearest = (x, z) => {
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < lut.length; i += 2) {
      const p = lut[i]
      const d = (x - p.x) ** 2 + (z - p.z) ** 2
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    const p = lut[best]
    return { s: p.s, d: (x - p.x) * p.nx + (z - p.z) * p.nz, dist: Math.sqrt(bestD), frame: p }
  }
  return { length, lut, frameAt, toWorld, nearest, closed }
}
