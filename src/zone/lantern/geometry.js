import * as THREE from 'three'
import { Builder } from '../botany/builder'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const OPAL = [0.92, 0.9, 0.95]
const STEEL = [0.06, 0.055, 0.05]

// Seed Lantern: slim stem rising into a teardrop pod. Unit height; scaled per instance.
export function lanternGeometry() {
  const b = new Builder()
  b.tube([V(0, 0, 0), V(0, 0.44, 0)], [0.022, 0.016], 6, STEEL)
  const RINGS = 16
  const SEG = 22
  b.grid(RINGS, SEG, (i, j) => {
    const t = i / RINGS
    const r = 0.33 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.9) + 0.004
    const a = (j / SEG) * Math.PI * 2
    return { p: V(Math.cos(a) * r, 0.42 + t * 0.58, Math.sin(a) * r), c: OPAL, tint: 1 }
  })
  return b.toGeometry()
}

// Light Reed: thin stalk with a glowing bud. Unit height; scaled (1, h, 1) per instance.
export function reedGeometry() {
  const b = new Builder()
  b.tube([V(0, 0, 0), V(0.01, 0.5, 0), V(0, 0.97, 0)], [0.009, 0.007, 0.005], 3, [0.05, 0.07, 0.04])
  b.tube([V(0, 0.95, 0), V(0, 0.985, 0), V(0, 1.03, 0)], [0.012, 0.022, 0.004], 5, [0.95, 0.95, 0.95])
  const g = b.toGeometry()
  // Mark the bud as glowing.
  const tint = g.attributes.aTint
  for (let i = 0; i < tint.count; i++) tint.setX(i, g.attributes.position.getY(i) > 0.94 ? 1 : 0)
  return g
}

// Moon Lily: notched pad with a cupped two-ring bloom.
export function lilyGeometry() {
  const b = new Builder()
  const PAD = 0.62
  b.grid(3, 20, (i, j) => {
    const a = 0.25 + (j / 20) * (Math.PI * 2 - 0.5)
    const r = (i / 3) * PAD
    return { p: V(Math.cos(a) * r, 0.01, Math.sin(a) * r), c: [0.08, 0.2, 0.06] }
  })
  for (const [n, len, tilt, off] of [
    [8, 0.3, 0.9, 0],
    [8, 0.22, 0.45, 0.4],
  ]) {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + off
      const radial = V(Math.cos(a), 0, Math.sin(a))
      const tangent = V(-Math.sin(a), 0, Math.cos(a))
      const dir = radial.clone().multiplyScalar(Math.sin(tilt)).add(V(0, Math.cos(tilt), 0))
      b.grid(2, 1, (i, j) => {
        const t = i / 2
        const s = j - 0.5
        const w = 0.13 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.1))
        return { p: radial.clone().multiplyScalar(0.04).addScaledVector(dir, t * len).addScaledVector(tangent, s * w).add(V(0, 0.03, 0)), c: [0.96, 0.95, 0.98], tint: 1 }
      })
    }
  }
  return b.toGeometry()
}
