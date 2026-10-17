import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import LodInstances from './LodInstances'
import { Builder, along } from './botany/builder'
import { leafCard } from './botany/plants'
import { getLibrary } from './library'
import { arches, archPoint, baskets, potPlants } from './planting'
import { bulbMat, concreteMat, metalMat, plantMaterial, plantDepthMaterial } from './materials'
import { mulberry32 } from '../lib/random'
import { useGarden } from '../lib/store'

const STEPS = 56
const BAR_W = 0.1 // flat bar width in the arch plane
const BAR_T = 0.024 // thickness along the path
const MEMBER_GAP = 0.13 // two ribbons either side of the arch centre plane

// Flat-bar ribbon swept along the arch: four separate faces for crisp metal edges.
function ribbonMember(arch, along_) {
  const pts = Array.from({ length: STEPS + 1 }, (_, i) => archPoint(arch, -1 + (2 * i) / STEPS, along_))
  const A = new THREE.Vector3(arch.f.tx, 0, arch.f.tz)
  const pos = []
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...b, ...d, ...c)
  for (let i = 0; i < STEPS; i++) {
    const corners = [i, i + 1].map((k) => {
      const p = pts[k]
      const t = pts[Math.min(k + 1, STEPS)].clone().sub(pts[Math.max(k - 1, 0)]).normalize()
      const R = new THREE.Vector3().crossVectors(t, A).normalize()
      return [
        [1, 1],
        [1, -1],
        [-1, -1],
        [-1, 1],
      ].map(([r, a]) => p.clone().addScaledVector(R, (r * BAR_W) / 2).addScaledVector(A, (a * BAR_T) / 2).toArray())
    })
    for (let f = 0; f < 4; f++) quad(corners[0][f], corners[0][(f + 1) % 4], corners[1][f], corners[1][(f + 1) % 4])
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

const plain = (g) => {
  const n = g.index ? g.toNonIndexed() : g
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k)
  return n
}

function frameGeometry() {
  const parts = []
  for (const arch of arches) {
    parts.push(ribbonMember(arch, -MEMBER_GAP), ribbonMember(arch, MEMBER_GAP))
    // Tie rods between the two ribbons.
    for (let i = 2; i < STEPS - 1; i += 5) {
      const u = -1 + (2 * i) / STEPS
      const a = archPoint(arch, u, -MEMBER_GAP)
      const b = archPoint(arch, u, MEMBER_GAP)
      const rod = new THREE.CylinderGeometry(0.012, 0.012, a.distanceTo(b), 6)
      rod.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()))
      rod.translate(...a.clone().lerp(b, 0.5).toArray())
      parts.push(plain(rod))
    }
  }
  // Basket rims and hanger wires.
  for (const bk of baskets) {
    const p = new THREE.Vector3().setFromMatrixPosition(bk.matrix)
    const rim = new THREE.TorusGeometry(0.18, 0.006, 5, 24)
    rim.rotateX(Math.PI / 2)
    rim.translate(p.x, p.y - 0.01, p.z)
    parts.push(plain(rim))
    const drop = bk.anchor.y - p.y
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2
      const r = new THREE.Vector3(p.x + Math.cos(a) * 0.17, p.y - 0.01, p.z + Math.sin(a) * 0.17)
      const top = drop > 0.05 ? bk.anchor : new THREE.Vector3(p.x, p.y - 0.18, p.z)
      const wire = new THREE.CylinderGeometry(0.004, 0.004, r.distanceTo(top), 4)
      wire.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(r).normalize()))
      wire.translate(...r.clone().lerp(top, 0.5).toArray())
      parts.push(plain(wire))
    }
  }
  return mergeGeometries(parts)
}

// Ivy-like leaves climbing the ribbons so flowers sit in greenery, not on bare steel.
function vineGeometry() {
  const b = new Builder()
  const rand = mulberry32(77)
  for (const arch of arches) {
    for (const side of [-MEMBER_GAP, MEMBER_GAP]) {
      for (let i = 0; i < 70; i++) {
        const u = -1 + 2 * rand()
        const p = archPoint(arch, u, side)
        for (let k = 0; k < 3; k++) {
          const dir = new THREE.Vector3(rand() - 0.5, rand() - 0.3, rand() - 0.5).normalize()
          const v = 0.8 + rand() * 0.25
          leafCard(b, along(p.clone().addScaledVector(dir, 0.03), dir, rand() * 3), { len: 0.08 + rand() * 0.04, wid: 0.06, c: [v * 0.9, v, v * 0.85] })
        }
      }
    }
  }
  return b.toGeometry()
}

function Instanced({ geometry, material, matrices, castShadow = true, depth }) {
  const ref = useRef()
  useLayoutEffect(() => {
    matrices.forEach((m, i) => ref.current.setMatrixAt(i, m))
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
    if (depth) ref.current.customDepthMaterial = depth
  }, [matrices, depth])
  return <instancedMesh ref={ref} args={[geometry, material, matrices.length]} castShadow={castShadow} receiveShadow />
}

export default function Arcade() {
  const high = useGarden((s) => s.quality === 'high')
  const near = high ? 10 : 6
  const far = high ? 110 : 60
  const lib = getLibrary()
  const frame = useMemo(frameGeometry, [])
  const vines = useMemo(vineGeometry, [])
  const bowls = useMemo(() => baskets.map((b) => b.matrix), [])
  const footings = useMemo(
    () =>
      arches.flatMap((a) =>
        [-1, 1].map((u) => {
          const p = archPoint(a, u)
          return new THREE.Matrix4().compose(p.setY(p.y + 0.02), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-a.f.tz, a.f.tx)), new THREE.Vector3(0.36, 0.12, 0.4))
        }),
      ),
    [],
  )
  const bulbs = useMemo(() => {
    const out = []
    for (const a of arches) {
      for (let u = -0.85; u <= 0.85; u += 0.085) {
        for (const side of [-1, 1]) {
          const p = archPoint(a, u, side * (MEMBER_GAP + 0.03))
          out.push(new THREE.Matrix4().compose(p.add(new THREE.Vector3(0, -0.06, 0)), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)))
        }
      }
    }
    return out
  }, [])
  const bulbGeo = useMemo(() => new THREE.SphereGeometry(0.011, 6, 4), [])
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])

  return (
    <>
      <mesh geometry={frame} material={metalMat} castShadow receiveShadow />
      <mesh geometry={vines} material={plantMaterial()} castShadow receiveShadow customDepthMaterial={plantDepthMaterial()} />
      <Instanced geometry={lib.bowl} material={plantMaterial()} matrices={bowls} depth={plantDepthMaterial()} />
      <Instanced geometry={boxGeo} material={concreteMat} matrices={footings} />
      <Instanced geometry={bulbGeo} material={bulbMat} matrices={bulbs} castShadow={false} />
      <LodInstances variants={lib.basket} items={baskets} near={near} far={far} shadow="proxy" />
      <LodInstances variants={lib.pot} items={potPlants} near={near} far={far} shadow="proxy" />
    </>
  )
}
