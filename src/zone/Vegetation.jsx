import { useMemo } from 'react'
import * as THREE from 'three'
import Instances from './Instances'
import { Builder } from './botany/builder'
import { hedgeAlong, shrubGeometry } from './foliage'
import { mulberry32 } from '../lib/random'
import { HEDGE_IN, HEDGE_OUT, PATH_LENGTH, avenue, pathToWorld } from './layout'
import { BENCH_GAP } from './planting'
import { plantMaterial, plantDepthMaterial } from './materials'

const V = (x, y, z) => new THREE.Vector3(x, y, z)

// Clipped box hedge behind each avenue border.
function hedgeGeometry() {
  const b = new Builder()
  for (const side of [-1, 1]) {
    const runs = side === -1 ? [[1.2, BENCH_GAP[0]], [BENCH_GAP[1], PATH_LENGTH - 1.2]] : [[1.2, PATH_LENGTH - 1.2]]
    hedgeAlong(b, avenue, { d0: side * HEDGE_IN, d1: side * HEDGE_OUT, H: 0.72, runs, seed: 5 + side })
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
  const byKind = useMemo(() => {
    const rand = mulberry32(8)
    return [0, 1, 2].map((k) =>
      SHRUBS.filter((s) => s.k === k).map((s) =>
        new THREE.Matrix4().compose(pathToWorld(s.s, s.d), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), rand() * 6), V(s.sc, s.sc * (0.85 + rand() * 0.3), s.sc)),
      ),
    )
  }, [])
  return geos.map((g, k) => <Instances key={k} geometry={g} matrices={byKind[k]} />)
}

export default function Vegetation() {
  const hedge = useMemo(hedgeGeometry, [])
  return (
    <>
      <mesh geometry={hedge} material={plantMaterial()} castShadow receiveShadow customDepthMaterial={plantDepthMaterial()} />
      <Shrubs />
    </>
  )
}
