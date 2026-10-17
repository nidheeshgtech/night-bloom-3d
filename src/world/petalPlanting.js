import * as THREE from 'three'
import { mulberry32 } from '../lib/random'
import { ZONES } from './plan'
import { drift } from '../zone/planting'

// Flower borders lining the inside of every petal hedge, in each zone's colour theme.
// These make the flower plan legible from the air and frame every zone at ground level.
export const BORDER = { d0: 0.9, d1: 2.9, step: 0.36 }
const UP = new THREE.Vector3(0, 1, 0)
const SIZE = { petunia: 1.35, marigold: 1.2, daisy: 1.3 }

export const petalBeds = { petunia: [], marigold: [], daisy: [] }
// Per side: colour function for painting the far-distance flower carpet.
export const petalBands = []

const rand = mulberry32(606)
const q = new THREE.Quaternion()
const color = new THREE.Color()

for (const z of ZONES) {
  const { species, colors } = z.border
  for (const { path, inward } of z.sides) {
    const colorAt = (s) => drift(colors, s, 5, inward)
    petalBands.push({ path, d0: inward * BORDER.d0, d1: inward * BORDER.d1, colorAt })
    for (let s = 4; s < path.length - 3; s += BORDER.step) {
      for (let d = BORDER.d0 + BORDER.step / 2; d < BORDER.d1; d += BORDER.step) {
        const js = s + (rand() - 0.5) * BORDER.step * 0.7
        const jd = d + (rand() - 0.5) * BORDER.step * 0.6
        const p = path.toWorld(js, inward * jd)
        const scale = SIZE[species] * (0.88 + rand() * 0.24)
        q.setFromAxisAngle(UP, rand() * Math.PI * 2)
        color.set(colorAt(js)).offsetHSL((rand() - 0.5) * 0.02, 0, (rand() - 0.5) * 0.06)
        petalBeds[species].push({
          matrix: new THREE.Matrix4().compose(p, q, new THREE.Vector3(scale, scale * (0.9 + rand() * 0.2), scale)),
          color: color.clone(),
          variant: Math.floor(rand() * 3),
        })
      }
    }
  }
}
