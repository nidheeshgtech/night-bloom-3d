import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { metalMat, pbrSet } from '../zone/materials'
import { ZONES, spokes } from './plan'

const SPAN = 2.9 // half-span
const HEIGHT = 4.4
const BAR_W = 0.12
const BAR_T = 0.03

// Paired flat-bar ribbon arch, same language as the Ribbon Arcade, across the spoke end.
function gateArch(frame, base) {
  const across = new THREE.Vector3(frame.nx, 0, frame.nz)
  const along = new THREE.Vector3(frame.tx, 0, frame.tz)
  const parts = []
  for (const off of [-0.16, 0.16]) {
    const pts = []
    for (let i = 0; i <= 48; i++) {
      const u = -1 + (2 * i) / 48
      const y = HEIGHT * Math.pow(Math.max(0, 1 - Math.abs(u) ** 2.4), 1 / 2.4)
      pts.push(base.clone().addScaledVector(across, u * SPAN).addScaledVector(along, off).add(new THREE.Vector3(0, y, 0)))
    }
    const pos = []
    for (let i = 0; i < 48; i++) {
      const quads = [i, i + 1].map((k) => {
        const t = pts[Math.min(k + 1, 48)].clone().sub(pts[Math.max(k - 1, 0)]).normalize()
        const R = new THREE.Vector3().crossVectors(t, along).normalize()
        return [
          [1, 1],
          [1, -1],
          [-1, -1],
          [-1, 1],
        ].map(([r, a]) => pts[k].clone().addScaledVector(R, (r * BAR_W) / 2).addScaledVector(along, (a * BAR_T) / 2).toArray())
      })
      for (let f = 0; f < 4; f++) {
        const [a, b, c, d] = [quads[0][f], quads[0][(f + 1) % 4], quads[1][f], quads[1][(f + 1) % 4]]
        pos.push(...a, ...b, ...c, ...b, ...d, ...c)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.computeVertexNormals()
    parts.push(g)
  }
  return parts
}

export default function Gates() {
  const { arches, plinths, plates } = useMemo(() => {
    const arches = []
    const plinths = []
    const plates = []
    ZONES.forEach((z, i) => {
      if (z.id === 'bloom') return // the Ribbon Arcade is this zone's gate
      const path = spokes[i]
      const f = path.frameAt(path.length - 1.5)
      const base = path.toWorld(path.length - 1.5, 0)
      arches.push(...gateArch(f, base))
      // Information plinth beside the gate.
      const p = path.toWorld(path.length - 3, 3.4)
      const yaw = Math.atan2(f.tx, f.tz) + Math.PI
      plinths.push(new THREE.Matrix4().compose(p.clone().add(new THREE.Vector3(0, 0.8, 0)), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(0.6, 1.6, 0.24)))
      const face = new THREE.Vector3(-f.tx, 0, -f.tz).multiplyScalar(0.13)
      plates.push(new THREE.Matrix4().compose(p.clone().add(face).add(new THREE.Vector3(0, 1.15, 0)), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(0.46, 0.56, 0.02)))
    })
    return { arches: mergeGeometries(arches), plinths, plates }
  }, [])
  const stone = useMemo(() => {
    const t = pbrSet('white_sandstone_bricks', 1)
    return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.arm, roughness: 1, color: '#e8dccb' })
  }, [])
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  return (
    <>
      <mesh geometry={arches} material={metalMat} castShadow receiveShadow />
      <InstancedBoxes geometry={box} material={stone} matrices={plinths} />
      <InstancedBoxes geometry={box} material={metalMat} matrices={plates} />
    </>
  )
}

function InstancedBoxes({ geometry, material, matrices }) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geometry, material, matrices.length)
    matrices.forEach((mat, i) => m.setMatrixAt(i, mat))
    m.castShadow = m.receiveShadow = true
    m.computeBoundingSphere()
    return m
  }, [geometry, material, matrices])
  return <primitive object={mesh} />
}
