import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mulberry32 } from '../lib/random'
import { heightAt } from '../world/terrain'
import { pbrSet } from './materials'

const TILE = 1.6 // herringbone repeat in metres (~16 cm bricks)
const LIFT = 0.035
const KERB_W = 0.2

// Paved ribbon between offsets d0..d1, UVs in metres so the pattern never stretches.
function ribbon(samples, d0, d1, across) {
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

let paving = null
const pavingMaterial = () => {
  if (paving) return paving
  const t = pbrSet('herringbone_pavement', 1)
  paving = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.arm, aoMap: t.arm, roughness: 1 })
  return paving
}

let kerb = null
const kerbMaterial = () => {
  if (kerb) return kerb
  const t = pbrSet('white_sandstone_bricks', 1)
  kerb = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.arm, roughness: 1, color: '#e8dccb' })
  return kerb
}

// Sandstone kerb blocks along both edges, slightly irregular like hand-laid stone.
// skip(side, s) leaves gaps (junctions, bays).
function kerbMatrices(path, half, skip, seed) {
  const rand = mulberry32(seed)
  const out = []
  const len = 0.5
  for (const side of [-1, 1]) {
    for (let s = len / 2; s < path.length; s += len + 0.01) {
      if (skip && skip(side, s)) continue
      const p = path.frameAt(s)
      const d = side * (half + KERB_W / 2)
      const x = p.x + p.nx * d
      const z = p.z + p.nz * d
      const yaw = Math.atan2(-p.tz, p.tx) + (rand() - 0.5) * 0.03
      const h = 0.16 + rand() * 0.02
      out.push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(x, heightAt(x, z) + LIFT + h / 2 - 0.08, z),
          new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * 0.02, yaw, (rand() - 0.5) * 0.02)),
          new THREE.Vector3(len, h, KERB_W),
        ),
      )
    }
  }
  return out
}

function Kerbs({ matrices }) {
  const ref = useRef()
  useLayoutEffect(() => {
    matrices.forEach((m, i) => ref.current.setMatrixAt(i, m))
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [matrices])
  return (
    <instancedMesh ref={ref} args={[null, kerbMaterial(), matrices.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  )
}

// A herringbone path with sandstone kerbs. extra: [[d0, d1, fromS, toS]] paved bays.
export default function PavedPath({ path, half, skipKerb, extra = [], seed = 9 }) {
  const geometries = useMemo(() => {
    const every = Math.max(1, Math.round(0.2 / (path.length / (path.lut.length - 1))))
    const samples = path.lut.filter((_, i) => i % every === 0 || i === path.lut.length - 1)
    const parts = [ribbon(samples, -half, half, 6)]
    for (const [d0, d1, s0, s1] of extra) parts.push(ribbon(samples.filter((p) => p.s > s0 && p.s < s1), d0, d1, 3))
    return parts
  }, [path, half, extra])
  const kerbs = useMemo(() => kerbMatrices(path, half, skipKerb, seed), [path, half, skipKerb, seed])
  return (
    <>
      {geometries.map((g, i) => (
        <mesh key={i} geometry={g} material={pavingMaterial()} receiveShadow />
      ))}
      <Kerbs matrices={kerbs} />
    </>
  )
}
