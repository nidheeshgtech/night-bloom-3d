import { useMemo } from 'react'
import * as THREE from 'three'
import Instances from '../zone/Instances'
import Palms from '../zone/Palms'
import { treeGeometry } from '../zone/foliage'
import { mulberry32 } from '../lib/random'
import { useGarden } from '../lib/store'
import { heightAt } from './terrain'
import { GAP_ANGLES, PETAL, PROMENADE, ZONES, petalWidth } from './plan'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const at = (a, r) => V(Math.cos(a) * r, heightAt(Math.cos(a) * r, Math.sin(a) * r), Math.sin(a) * r)

// Trees fill the wedges between petals and ring the world, so every zone is separated by
// woodland and the lawn never meets a bare horizon.
export const TREES = (() => {
  const rand = mulberry32(77)
  const out = []
  for (const g of GAP_ANGLES) {
    for (let r = 70; r < 152; r += 7) {
      const t = (r - PETAL.r0) / (PETAL.tip - PETAL.r0)
      const halfGap = r * (Math.PI / 6 - petalWidth(Math.min(0.999, t)))
      const room = halfGap - 3.5
      if (room <= 0) continue
      const n = room > 6 ? 2 : 1
      for (let k = 0; k < n; k++) {
        const lateral = (rand() * 2 - 1) * room
        out.push({ pos: at(g + lateral / r, r + (rand() - 0.5) * 4), s: 0.9 + rand() * 0.7, k: out.length % 3 })
      }
    }
  }
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + rand() * 0.05
    out.push({ pos: at(a, 160 + rand() * 18), s: 1.1 + rand() * 0.8, k: i % 3 })
  }
  return out
})()

// Date palms along the outer edge of the promenade, flanking each spoke and in each gap.
export const PROMENADE_PALMS = (() => {
  const rand = mulberry32(5)
  const r = PROMENADE.radius + PROMENADE.half + 3
  const out = []
  for (const z of ZONES) for (const off of [-0.11, 0.11]) out.push({ pos: at(z.a + off, r), h: 6 + rand() * 1.6 })
  for (const g of GAP_ANGLES) out.push({ pos: at(g, r + 1), h: 6.5 + rand() * 1.5 })
  return out
})()

export default function TreeBelts() {
  // Background trees only cast shadows on high quality.
  const high = useGarden((s) => s.quality === 'high')
  const geos = useMemo(() => [treeGeometry(21), treeGeometry(22), treeGeometry(23)], [])
  const lists = useMemo(() => {
    const rand = mulberry32(31)
    return [0, 1, 2].map((k) =>
      TREES.filter((t) => t.k === k).map((t) =>
        new THREE.Matrix4().compose(V(t.pos.x, t.pos.y - 0.1, t.pos.z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), rand() * 6), V(t.s, t.s * (0.9 + rand() * 0.3), t.s)),
      ),
    )
  }, [])
  return (
    <>
      {geos.map((g, k) => (
        <Instances key={k} geometry={g} matrices={lists[k]} castShadow={high} />
      ))}
      <Palms items={PROMENADE_PALMS} />
    </>
  )
}
