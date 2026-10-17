import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mulberry32 } from '../lib/random'
import { EDGE_W, PATH, PATH_HALF, PATH_LENGTH, heightAt } from './layout'
import { pbrSet } from './materials'
import { BENCH, BENCH_GAP } from './planting'

const TILE = 1.6 // herringbone repeat in metres (~16 cm bricks)
const LIFT = 0.035

// Paved ribbon following the path curve, UVs in metres so the pattern never stretches.
function ribbon(samples, d0, d1, across = 4) {
  const pos = []
  const uv = []
  const idx = []
  samples.forEach((p, i) => {
    for (let j = 0; j <= across; j++) {
      const d = d0 + ((d1 - d0) * j) / across
      const x = p.x + p.nx * d
      const z = p.z + p.nz * d
      pos.push(x, heightAt(x, z) + LIFT, z)
      uv.push(d / TILE, p.s / TILE)
    }
    if (i > 0) {
      const w = across + 1
      for (let j = 0; j < across; j++) {
        const a = (i - 1) * w + j
        idx.push(a, a + 1, a + w, a + 1, a + w + 1, a + w)
      }
    }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

export default function Path() {
  const material = useMemo(() => {
    const t = pbrSet('herringbone_pavement', 1)
    return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.arm, aoMap: t.arm, roughness: 1 })
  }, [])

  const geometry = useMemo(() => {
    const parts = [ribbon(PATH.filter((_, i) => i % 2 === 0), -PATH_HALF, PATH_HALF, 6)]
    // Bench bay off the right-hand side.
    const bay = PATH.filter((p, i) => i % 2 === 0 && p.s > BENCH_GAP[0] + 0.4 && p.s < BENCH_GAP[1] - 0.4)
    parts.push(ribbon(bay, BENCH.d - 1.2, -PATH_HALF - EDGE_W, 3))
    return parts
  }, [])

  return (
    <>
      {geometry.map((g, i) => (
        <mesh key={i} geometry={g} material={material} receiveShadow />
      ))}
      <Edging />
    </>
  )
}

// Sandstone kerb blocks along both edges, slightly irregular like hand-laid stone.
function Edging() {
  const ref = useRef()
  const material = useMemo(() => {
    const t = pbrSet('white_sandstone_bricks', 1)
    return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.arm, roughness: 1, color: '#e8dccb' })
  }, [])

  const matrices = useMemo(() => {
    const rand = mulberry32(9)
    const out = []
    const len = 0.5
    for (const side of [-1, 1]) {
      for (let s = len / 2; s < PATH_LENGTH; s += len + 0.01) {
        if (side === -1 && s > BENCH_GAP[0] + 0.4 && s < BENCH_GAP[1] - 0.4) continue
        const i = Math.round((s / PATH_LENGTH) * (PATH.length - 1))
        const p = PATH[i]
        const d = side * (PATH_HALF + EDGE_W / 2)
        const x = p.x + p.nx * d
        const z = p.z + p.nz * d
        const yaw = Math.atan2(-p.tz, p.tx) + (rand() - 0.5) * 0.03
        const h = 0.16 + rand() * 0.02
        out.push(
          new THREE.Matrix4().compose(
            new THREE.Vector3(x, heightAt(x, z) + LIFT + h / 2 - 0.08, z),
            new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * 0.02, yaw, (rand() - 0.5) * 0.02)),
            new THREE.Vector3(len, h, EDGE_W),
          ),
        )
      }
    }
    return out
  }, [])

  useLayoutEffect(() => {
    matrices.forEach((m, i) => ref.current.setMatrixAt(i, m))
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [matrices])

  return (
    <instancedMesh ref={ref} args={[null, material, matrices.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  )
}
