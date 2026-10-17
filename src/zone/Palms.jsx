import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Builder } from './botany/builder'
import { uv } from './botany/atlas'
import { mulberry32 } from '../lib/random'
import { pathToWorld } from './layout'
import { plantMaterial, plantDepthMaterial } from './materials'

const V = (x, y, z) => new THREE.Vector3(x, y, z)

// Date palm: tapered, slightly leaning trunk in leaf-base bands, crown of arching fronds.
function palmGeometry(seed, H) {
  const b = new Builder()
  const rand = mulberry32(seed)
  const lean = V(rand() - 0.5, 0, rand() - 0.5).normalize().multiplyScalar(0.06 + rand() * 0.06)
  const centre = (y) => V(lean.x * y * y * 0.4, y, lean.z * y * y * 0.4)
  const radius = (y) => 0.3 - 0.07 * (y / H) + 0.14 * Math.exp(-y * 2.5)
  const SIDES = 12
  const BAND = 0.42
  for (let y0 = 0; y0 < H; y0 += BAND) {
    const y1 = Math.min(H, y0 + BAND)
    b.grid(1, SIDES, (i, j) => {
      const y = i ? y1 : y0
      const a = (j / SIDES) * Math.PI * 2
      const c = centre(y)
      return { p: c.add(V(Math.cos(a) * radius(y), 0, Math.sin(a) * radius(y))), uv: uv('trunk', j / SIDES, 1 - i), c: [0.85, 0.8, 0.75] }
    })
  }
  const crown = centre(H)
  const FRONDS = 28
  for (let f = 0; f < FRONDS; f++) {
    const tier = f / FRONDS
    const e = 1.05 - tier * 1.55 + (rand() - 0.5) * 0.15 // from steeply up to drooping
    const az = f * 2.39996 + rand() * 0.2
    const dirH = V(Math.cos(az), 0, Math.sin(az))
    const side = V(-dirH.z, 0, dirH.x)
    const L = 2.6 + rand() * 0.8
    const droop = 0.35 + tier * 0.5
    const W = 1.0
    const old = e < -0.25
    const c = old ? [0.95, 0.82, 0.55] : [0.95 - tier * 0.1, 1, 0.9]
    b.grid(9, 2, (i, j) => {
      const t = i / 9
      const a = j - 1
      const p = crown
        .clone()
        .addScaledVector(dirH, t * L * Math.cos(e))
        .add(V(0, t * L * Math.sin(e) - droop * t * t * L, 0))
        .addScaledVector(side, a * W * 0.5 * Math.min(1, t * 6))
      p.y -= Math.abs(a) * 0.12 * Math.min(1, t * 4)
      return { p, uv: uv('frond', t, (a + 1) / 2), c }
    })
  }
  return b.toGeometry()
}

export const PALMS = [
  { s: 5.5, d: 9.5, h: 6.4 },
  { s: 13.5, d: -11, h: 7.2 },
  { s: 21, d: 10.5, h: 5.8 },
  { s: 27.5, d: -9.5, h: 6.8 },
  { s: 40.5, d: 9.8, h: 7.4 },
  { s: 45.5, d: -10.2, h: 6.1 },
]

export default function Palms() {
  const geos = useMemo(() => [palmGeometry(3, 6.5), palmGeometry(9, 6.5)], [])
  const refs = [useRef(), useRef()]
  const lists = useMemo(
    () =>
      [0, 1].map((k) =>
        PALMS.filter((_, i) => i % 2 === k).map((p, i) => {
          const pos = pathToWorld(p.s, p.d)
          const s = p.h / 6.5
          return new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), i * 2.1 + k), V(s, s, s))
        }),
      ),
    [],
  )
  useLayoutEffect(() => {
    lists.forEach((list, k) => {
      list.forEach((m, i) => refs[k].current.setMatrixAt(i, m))
      refs[k].current.instanceMatrix.needsUpdate = true
      refs[k].current.computeBoundingSphere()
      refs[k].current.customDepthMaterial = plantDepthMaterial()
    })
  })
  return geos.map((g, k) => <instancedMesh key={k} ref={refs[k]} args={[g, plantMaterial(), lists[k].length]} castShadow receiveShadow />)
}
