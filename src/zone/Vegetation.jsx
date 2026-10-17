import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Builder } from './botany/builder'
import { uv } from './botany/atlas'
import { mulberry32 } from '../lib/random'
import { HEDGE_IN, HEDGE_OUT, PATH_LENGTH, pathToWorld } from './layout'
import { BENCH_GAP } from './planting'
import { plantMaterial, plantDepthMaterial } from './materials'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const CORE = [0.025, 0.05, 0.018] // dark interior so hedges never look hollow

// Square leaf-cluster card centred on p, facing n.
function card(b, p, n, size, region, tone, rand) {
  const roll = rand() * Math.PI * 2
  const ref = Math.abs(n.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0)
  const x = new THREE.Vector3().crossVectors(ref, n).normalize().applyAxisAngle(n, roll)
  const y = new THREE.Vector3().crossVectors(n, x)
  b.grid(1, 1, (i, j) => ({
    p: p.clone().addScaledVector(x, (j - 0.5) * size).addScaledVector(y, (i - 0.5) * size),
    uv: uv(region, j, 1 - i),
    c: tone,
  }))
}

const tone = (rand) => {
  const v = 0.8 + rand() * 0.3
  return [v, v, v * (0.9 + rand() * 0.15)]
}

// Clipped box hedge behind each border, following the path curve.
function hedgeGeometry() {
  const b = new Builder()
  const rand = mulberry32(5)
  const H = 0.72
  for (const side of [-1, 1]) {
    const runs = side === -1 ? [[1.2, BENCH_GAP[0]], [BENCH_GAP[1], PATH_LENGTH - 1.2]] : [[1.2, PATH_LENGTH - 1.2]]
    for (const [s0, s1] of runs) {
      const steps = Math.ceil((s1 - s0) / 0.25)
      // Core: inner face, top, outer face.
      const face = (d0, y0, d1, y1) =>
        b.grid(steps, 1, (i, j) => {
          const s = s0 + ((s1 - s0) * i) / steps
          const d = j ? d1 : d0
          const p = pathToWorld(s, side * d)
          p.y += j ? y1 : y0
          return { p, c: CORE }
        })
      face(HEDGE_IN, 0, HEDGE_IN, H)
      face(HEDGE_IN, H, HEDGE_OUT, H)
      face(HEDGE_OUT, H, HEDGE_OUT, 0)
      for (let s = s0; s < s1; s += 0.22) {
        const base = pathToWorld(s, side * HEDGE_IN)
        const out = pathToWorld(s, side * HEDGE_OUT)
        const inward = base.clone().sub(out).setY(0).normalize()
        for (let k = 0; k < 3; k++) {
          const d = HEDGE_IN + (HEDGE_OUT - HEDGE_IN) * (0.2 + 0.6 * rand())
          const top = pathToWorld(s + rand() * 0.2, side * d)
          top.y += H + 0.02
          card(b, top, V(rand() - 0.5, 2.2, rand() - 0.5).normalize(), 0.42, 'foliage', tone(rand), rand)
        }
        for (const [n, d] of [
          [inward, HEDGE_IN - 0.03],
          [inward.clone().negate(), HEDGE_OUT + 0.03],
        ]) {
          for (let k = 0; k < 2; k++) {
            const p = pathToWorld(s + rand() * 0.2, side * d)
            p.y += 0.15 + rand() * (H - 0.2)
            card(b, p, n.clone().add(V((rand() - 0.5) * 0.7, (rand() - 0.3) * 0.5, (rand() - 0.5) * 0.7)).normalize(), 0.4, 'foliage', tone(rand), rand)
          }
        }
      }
    }
  }
  return b.toGeometry()
}

// Free-form shrub: leaf cards on an ellipsoid shell around a dark core.
function shrubGeometry(seed, region) {
  const b = new Builder()
  const rand = mulberry32(seed)
  b.grid(6, 10, (i, j) => {
    const e = (i / 6) * Math.PI - Math.PI / 2
    const a = (j / 10) * Math.PI * 2
    return { p: V(Math.cos(e) * Math.cos(a) * 0.75, 0.9 + Math.sin(e) * 0.75, Math.cos(e) * Math.sin(a) * 0.75), c: CORE }
  })
  for (let i = 0; i < 150; i++) {
    const e = Math.asin(rand() * 2 - 1) * 0.9
    const a = rand() * Math.PI * 2
    const n = V(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a))
    const p = n.clone().multiplyScalar(0.78 + rand() * 0.18).add(V(0, 0.9, 0))
    card(b, p, n.clone().add(V((rand() - 0.5) * 0.6, 0.2, (rand() - 0.5) * 0.6)).normalize(), 0.55, region, tone(rand), rand)
  }
  return b.toGeometry()
}

export const SHRUBS = [
  { s: 3, d: 6.5, k: 0, sc: 1.1 },
  { s: 8.5, d: -6.2, k: 2, sc: 1.3 },
  { s: 15, d: 7.2, k: 1, sc: 0.9 },
  { s: 23, d: -6.8, k: 0, sc: 1.2 },
  { s: 30, d: 6.4, k: 2, sc: 1.1 },
  { s: 36, d: -7.4, k: 1, sc: 1.4 },
  { s: 42, d: 7, k: 0, sc: 1 },
  { s: 47, d: -6.4, k: 2, sc: 1.2 },
  { s: 19, d: 9.5, k: 1, sc: 1.6 },
  { s: 33, d: -10, k: 0, sc: 1.5 },
]

function Shrubs() {
  const geos = useMemo(() => [shrubGeometry(1, 'foliage'), shrubGeometry(2, 'foliage'), shrubGeometry(3, 'bougainvillea')], [])
  const refs = [useRef(), useRef(), useRef()]
  const byKind = useMemo(() => {
    const rand = mulberry32(8)
    return [0, 1, 2].map((k) =>
      SHRUBS.filter((s) => s.k === k).map((s) => {
        const p = pathToWorld(s.s, s.d)
        return new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), rand() * 6), V(s.sc, s.sc * (0.85 + rand() * 0.3), s.sc))
      }),
    )
  }, [])
  useLayoutEffect(() => {
    byKind.forEach((list, k) => {
      list.forEach((m, i) => refs[k].current.setMatrixAt(i, m))
      refs[k].current.instanceMatrix.needsUpdate = true
      refs[k].current.computeBoundingSphere()
      refs[k].current.customDepthMaterial = plantDepthMaterial()
    })
  })
  return geos.map((g, k) => <instancedMesh key={k} ref={refs[k]} args={[g, plantMaterial(), byKind[k].length]} castShadow receiveShadow />)
}

export default function Vegetation() {
  const hedge = useMemo(hedgeGeometry, [])
  return (
    <>
      <mesh geometry={hedge} material={plantMaterial()} castShadow receiveShadow customDepthMaterial={plantDepthMaterial()} />
      <Shrubs />
      <TreeRing />
    </>
  )
}

// Ring of broadleaf trees enclosing the garden so the lawn never meets a bare horizon.
function treeGeometry(seed) {
  const b = new Builder()
  const rand = mulberry32(seed)
  const top = V((rand() - 0.5) * 0.5, 2.1, (rand() - 0.5) * 0.5)
  b.tube([V(0, 0, 0), V(0.06, 1.1, 0.03), top], [0.28, 0.22, 0.17], 8, [0.14, 0.11, 0.08])
  // Wide, irregular canopy: several lobes on branches, flattened like a shade tree.
  const lobes = 7 + Math.floor(rand() * 4)
  for (let l = 0; l < lobes; l++) {
    const a = rand() * Math.PI * 2
    const reach = 0.8 + rand() * 2.2
    const c = top.clone().add(V(Math.cos(a) * reach, 0.5 + rand() * 1.1 - reach * 0.15, Math.sin(a) * reach))
    b.tube([top, top.clone().lerp(c, 0.5).add(V(0, 0.3, 0)), c], [0.12, 0.08, 0.05], 5, [0.14, 0.11, 0.08])
    const r = 1.0 + rand() * 0.7
    for (let i = 0; i < 40; i++) {
      const e = Math.asin(rand() * 2 - 1)
      const az = rand() * Math.PI * 2
      const n = V(Math.cos(e) * Math.cos(az), Math.sin(e) * 0.7, Math.cos(e) * Math.sin(az)).normalize()
      card(b, c.clone().addScaledVector(n, r * (0.75 + rand() * 0.25)), n.clone().add(V(0, 0.35, 0)).normalize(), 0.9, 'foliage', tone(rand), rand)
    }
  }
  return b.toGeometry()
}

export function TreeRing() {
  const geos = useMemo(() => [treeGeometry(21), treeGeometry(22), treeGeometry(23)], [])
  const refs = [useRef(), useRef(), useRef()]
  const lists = useMemo(() => {
    const rand = mulberry32(31)
    const out = [[], [], []]
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2 + rand() * 0.06
      const r = 50 + rand() * 16
      const x = Math.cos(a) * r
      const z = 1 + Math.sin(a) * r * 0.82
      const s = 1.0 + rand() * 0.8
      out[i % 3].push(new THREE.Matrix4().compose(V(x, -0.1, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), rand() * 6), V(s, s * (0.9 + rand() * 0.3), s)))
    }
    return out
  }, [])
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
