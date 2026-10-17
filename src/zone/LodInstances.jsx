import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { plantMaterial, plantDepthMaterial } from './materials'

// Draws nothing in the main pass; exists only to cast shadows from cheap geometry.
const shadowOnly = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })

// Instanced plants with two LODs. Items are re-bucketed by camera distance whenever the
// camera has moved more than a metre; each variant/LOD pair is one draw call.
// shadow: 'none' | 'proxy' (all instances cast from the far LOD geometry) | 'lod0'.
// stride > 1 draws only every n-th item (low quality thinning).
export default function LodInstances({ variants, items, near, shadow = 'proxy', stride = 1 }) {
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
      return {
        list,
        pos: list.map((it) => new THREE.Vector3().setFromMatrixPosition(it.matrix)),
        lod0: make(v.geo0, shadow === 'lod0'),
        lod1: make(v.geo1, false),
        proxy,
      }
    })
  }, [variants, items, shadow])

  const last = useRef(new THREE.Vector3(Infinity, 0, 0))
  useEffect(() => {
    last.current.set(Infinity, 0, 0)
  }, [near, groups, stride])

  useLayoutEffect(() => () => groups.forEach((g) => [g.lod0, g.lod1, g.proxy].forEach((m) => m?.dispose())), [groups])

  useFrame(({ camera }) => {
    const c = camera.position
    if (c.distanceToSquared(last.current) < 1) return
    last.current.copy(c)
    const near2 = near * near
    for (const g of groups) {
      let n0 = 0
      let n1 = 0
      const m0 = g.lod0.instanceMatrix.array
      const c0 = g.lod0.instanceColor.array
      const m1 = g.lod1.instanceMatrix.array
      const c1 = g.lod1.instanceColor.array
      for (let i = 0; i < g.list.length; i += stride) {
        const it = g.list[i]
        if (g.pos[i].distanceToSquared(c) < near2) {
          it.matrix.toArray(m0, n0 * 16)
          it.color.toArray(c0, n0 * 3)
          n0++
        } else {
          it.matrix.toArray(m1, n1 * 16)
          it.color.toArray(c1, n1 * 3)
          n1++
        }
      }
      g.lod0.count = n0
      g.lod1.count = n1
      for (const m of [g.lod0, g.lod1]) {
        m.instanceMatrix.needsUpdate = true
        m.instanceColor.needsUpdate = true
      }
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
