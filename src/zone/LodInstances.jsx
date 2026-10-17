import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { plantMaterial, plantDepthMaterial, shadows } from './materials'

// Plants beyond this distance aren't drawn; the ground's flower carpet takes over.
export const PLANT_FAR = { high: 45, low: 28 }

const CELL = 8 // metres; spatial grid for culling by distance
const MIN_MOVE = 1.5 // metres before re-bucketing
const MIN_INTERVAL = 0.12 // seconds between re-buckets

// Draws nothing in the main pass; exists only to cast shadows from cheap geometry.
const shadowOnly = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })

// Instanced plants with two LODs. Items are binned into a spatial grid; on camera moves
// only nearby cells are visited and only the used part of each buffer is uploaded.
// shadow: 'none' | 'proxy' (all instances cast from the far LOD geometry) | 'lod0'.
// stride > 1 draws only every n-th item (low quality thinning).
export default function LodInstances({ variants, items, near, far = Infinity, shadow = 'proxy', stride = 1 }) {
  const groups = useMemo(() => {
    return variants.map((v, vi) => {
      const list = items.filter((it) => it.variant === vi)
      const make = (geo, castShadow) => {
        const m = new THREE.InstancedMesh(geo, plantMaterial(), Math.max(1, list.length))
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
        m.setColorAt(0, new THREE.Color(1, 1, 1))
        m.count = 0
        m.castShadow = castShadow
        m.receiveShadow = true
        m.customDepthMaterial = plantDepthMaterial()
        m.frustumCulled = false
        return m
      }
      let proxy = null
      if (shadow === 'proxy' && list.length) {
        proxy = new THREE.InstancedMesh(v.geo1, shadowOnly, list.length)
        proxy.castShadow = true
        proxy.customDepthMaterial = plantDepthMaterial()
        list.forEach((it, i) => proxy.setMatrixAt(i, it.matrix))
        proxy.computeBoundingSphere()
      }
      const pos = list.map((it) => new THREE.Vector3().setFromMatrixPosition(it.matrix))
      const cells = new Map()
      pos.forEach((p, i) => {
        const k = `${Math.floor(p.x / CELL)},${Math.floor(p.z / CELL)}`
        if (!cells.has(k)) cells.set(k, [])
        cells.get(k).push(i)
      })
      const cellList = [...cells.entries()].map(([k, idx]) => {
        const [cx, cz] = k.split(',').map(Number)
        return { x: (cx + 0.5) * CELL, z: (cz + 0.5) * CELL, idx: idx.filter((i) => i % stride === 0) }
      })
      return { list, pos, cellList, lod0: make(v.geo0, shadow === 'lod0'), lod1: make(v.geo1, false), proxy }
    })
  }, [variants, items, shadow, stride])

  const last = useRef({ p: new THREE.Vector3(Infinity, 0, 0), t: -1 })
  useEffect(() => {
    last.current.p.set(Infinity, 0, 0)
    shadows.dirty = true
  }, [near, far, groups])

  useLayoutEffect(() => () => groups.forEach((g) => [g.lod0, g.lod1, g.proxy].forEach((m) => m?.dispose())), [groups])

  useFrame(({ camera, clock }) => {
    const c = camera.position
    const L = last.current
    if (c.distanceToSquared(L.p) < MIN_MOVE * MIN_MOVE || clock.elapsedTime - L.t < MIN_INTERVAL) return
    L.p.copy(c)
    L.t = clock.elapsedTime
    const near2 = near * near
    const far2 = far * far
    const reach = far + CELL
    const reach2 = reach * reach
    // Height above the beds: if everything is out of range, skip the scan entirely.
    const outOfRange = c.y > far
    for (const g of groups) {
      let n0 = 0
      let n1 = 0
      if (!outOfRange) {
        const m0 = g.lod0.instanceMatrix.array
        const c0 = g.lod0.instanceColor.array
        const m1 = g.lod1.instanceMatrix.array
        const c1 = g.lod1.instanceColor.array
        for (const cell of g.cellList) {
          if ((cell.x - c.x) ** 2 + (cell.z - c.z) ** 2 > reach2) continue
          for (const i of cell.idx) {
            const d2 = g.pos[i].distanceToSquared(c)
            if (d2 > far2) continue
            const it = g.list[i]
            if (d2 < near2) {
              it.matrix.toArray(m0, n0 * 16)
              it.color.toArray(c0, n0 * 3)
              n0++
            } else {
              it.matrix.toArray(m1, n1 * 16)
              it.color.toArray(c1, n1 * 3)
              n1++
            }
          }
        }
      }
      const upload = (m, n) => {
        if (n === 0 && m.count === 0) return
        m.count = n
        if (!n) return
        m.instanceMatrix.clearUpdateRanges()
        m.instanceMatrix.addUpdateRange(0, n * 16)
        m.instanceMatrix.needsUpdate = true
        m.instanceColor.clearUpdateRanges()
        m.instanceColor.addUpdateRange(0, n * 3)
        m.instanceColor.needsUpdate = true
      }
      upload(g.lod0, n0)
      upload(g.lod1, n1)
    }
  })

  return groups.map((g, i) => (
    <group key={i}>
      <primitive object={g.lod0} />
      <primitive object={g.lod1} />
      {g.proxy && <primitive object={g.proxy} />}
    </group>
  ))
}
