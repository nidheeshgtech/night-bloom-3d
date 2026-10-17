import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mulberry32 } from '../lib/random'
import { BRAND } from '../brand'
import { heightAt } from '../world/terrain'
import { rippleTexture } from '../world/Lake'
import { bulbMat, zoneUniforms } from '../zone/materials'
import { withNightLight } from '../zone/nightlight'
import Palms from '../zone/Palms'
import { banner, box, glowMaterial, part, place } from '../event/EventVenue'
import { ARRIVAL, DINING, POOL, VILLAS, YOGA } from './layout'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const local = (anchor, x, z) => {
  const c = Math.cos(anchor.yaw)
  const s = Math.sin(anchor.yaw)
  const p = V(anchor.pos.x + x * c + z * s, 0, anchor.pos.z - x * s + z * c)
  p.y = heightAt(p.x, p.z)
  return p
}

function resortGeometry() {
  const parts = []
  const rand = mulberry32(31)
  const deck = (anchor) => place(V(anchor.pos.x, anchor.pos.y, anchor.pos.z), anchor.yaw)
  // --- Infinity pool: stone deck, water inset, loungers + umbrellas on the lake side, bar.
  const P = POOL
  const pm = deck(P)
  parts.push(part(box(P.w + 8, 0.35, P.d + 8, 0, 0.1, 0), '#e6dccb', pm))
  parts.push(part(box(P.w + 0.6, 0.12, P.d + 0.6, 0, 0.3, 0), '#f4efe6', pm))
  for (let i = 0; i < 8; i++) {
    const x = -P.w / 2 + 1.6 + i * ((P.w - 3.2) / 7)
    for (const side of [1]) {
      const z = side * (P.d / 2 + 2.2)
      const m = pm.clone().multiply(place(V(x, 0.28, z), 0))
      parts.push(part(box(0.75, 0.25, 1.9, 0, 0.25, 0), '#ffffff', m))
      parts.push(part(box(0.75, 0.08, 0.7, 0, 0.55, -0.75).rotateX(-0.6), '#ffffff', m))
      if (i % 2 === 0) {
        parts.push(part(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6).translate(0.9, 1.2, 0), '#d8d0c0', m))
        parts.push(part(new THREE.ConeGeometry(1.5, 0.55, 10).translate(0.9, 2.5, 0), i % 4 ? '#f4efe6' : BRAND.accent, m))
      }
    }
  }
  // Cabanas at the ends and a thatched pool bar.
  for (const x of [-(P.w / 2 + 2.6), P.w / 2 + 2.6]) {
    const m = pm.clone().multiply(place(V(x, 0.28, 0), 0))
    for (const a of [-1, 1]) for (const b of [-1, 1]) parts.push(part(box(0.1, 2.5, 0.1, a * 1.2, 1.25, b * 1.2), '#c9b593', m))
    parts.push(part(box(2.8, 0.15, 2.8, 0, 2.55, 0), '#f4efe6', m))
    parts.push(part(box(2.2, 0.4, 2.2, 0, 0.45, 0), '#ffffff', m))
  }
  {
    const m = pm.clone().multiply(place(V(0, 0.28, -(P.d / 2 + 2.6)), 0))
    parts.push(part(box(6, 1.1, 1, 0, 0.55, 0), '#8a5a36', m))
    parts.push(part(new THREE.ConeGeometry(4.6, 1.6, 4).rotateY(Math.PI / 4).scale(1, 1, 0.55).translate(0, 3.2, 0), '#c9a86b', m))
    for (const x of [-2.6, 2.6]) parts.push(part(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 6).translate(x, 1.25, 0.2), '#8a5a36', m))
  }
  // --- Villas: white cubes with a timber screen, terrace, plunge pool, outdoor shower wall.
  for (const v of VILLAS) {
    const m = deck(v)
    parts.push(part(box(9, 0.3, 8.5, 0, 0.1, 0.4), '#e6dccb', m))
    parts.push(part(box(6.4, 3.2, 4.6, 0, 1.75, -1.4), '#f6f1e8', m))
    parts.push(part(box(7.4, 0.25, 5.6, 0, 3.45, -1.2), '#ece3d4', m))
    parts.push(part(box(4.2, 2.4, 0.08, 0, 1.55, 0.92), '#2a3a44', m))
    for (let k = 0; k < 9; k++) parts.push(part(box(0.08, 2.6, 0.08, -2 + k * 0.5, 1.6, 1.05), '#8a5a36', m))
    parts.push(part(box(3.6, 0.1, 2.2, 1.4, 0.3, 3.1), '#f4efe6', m))
    for (const x of [-2.6, -1.6]) {
      const lm = m.clone().multiply(place(V(x, 0.25, 2.8), 0))
      parts.push(part(box(0.7, 0.22, 1.8, 0, 0.25, 0), '#ffffff', lm))
    }
  }
  // --- Dining terrace: timber deck, pergola, tables for four.
  const D = DINING
  const dm = deck(D)
  parts.push(part(box(D.w, 0.3, D.d, 0, 0.1, 0), '#9a6a44', dm))
  for (let i = 0; i < 4; i++) for (const z of [-D.d / 2 + 0.6, D.d / 2 - 0.6]) parts.push(part(box(0.3, 3.2, 0.3, -D.w / 2 + 0.8 + i * ((D.w - 1.6) / 3), 1.8, z), '#6b4a30', dm))
  for (let k = 0; k < 14; k++) parts.push(part(box(0.12, 0.25, D.d, -D.w / 2 + 0.6 + k * ((D.w - 1.2) / 13), 3.4, 0), '#6b4a30', dm))
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      const m = dm.clone().multiply(place(V(-D.w / 2 + 2.6 + i * 4.3, 0.25, -2.4 + j * 4.8), rand() * 0.3))
      parts.push(part(box(1.4, 0.06, 1.4, 0, 0.78, 0), '#f4efe6', m))
      parts.push(part(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 6).translate(0, 0.38, 0), '#333', m))
      for (const [x, z] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) parts.push(part(box(0.5, 0.45, 0.5, x * 1, 0.23, z * 1), '#e9dcc8', m))
    }
  }
  // --- Yoga lawn: two rows of mats facing an instructor platform.
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      const p = local(YOGA, -4.5 + i * 3, -1 + j * 2.6)
      parts.push(part(box(0.7, 0.03, 1.8, 0, 0.02, 0), ['#c99bff', '#7fe08a', '#4fd8ff', '#ffb347'][(i + j) % 4], place(p, YOGA.yaw)))
    }
  }
  parts.push(part(box(3, 0.25, 2, 0, 0.12, 0), '#9a6a44', place(local(YOGA, 0, -4.6), YOGA.yaw)))
  // --- Arrival court: porte-cochère canopy on four columns.
  const am = deck(ARRIVAL)
  for (const x of [-4.4, 4.4]) for (const z of [-2.5, 2.5]) parts.push(part(box(0.55, 4.2, 0.55, x, 2.1, z), '#f6f1e8', am))
  parts.push(part(box(10.4, 0.5, 6.6, 0, 4.4, 0), '#f6f1e8', am))
  parts.push(part(box(10.6, 0.15, 6.8, 0, 4.72, 0), '#c9a35a', am))
  const g = mergeGeometries(parts)
  g.computeBoundingSphere()
  return g
}

function PoolWater() {
  const { mat, tex } = useMemo(() => {
    const tex = rippleTexture()
    tex.repeat.set(4, 2)
    const mat = new THREE.MeshStandardMaterial({ color: '#39b8d8', emissive: '#2fc8ff', emissiveIntensity: 0, roughness: 0.05, metalness: 0.1, normalMap: tex, normalScale: new THREE.Vector2(0.25, 0.25), envMapIntensity: 1.3 })
    return { mat, tex }
  }, [])
  useFrame((_, dt) => {
    tex.offset.x += dt * 0.02
    mat.emissiveIntensity = 0.1 + zoneUniforms.uNight.value * 0.9
  })
  const pools = useMemo(() => {
    const list = [{ pos: V(POOL.pos.x, POOL.pos.y + 0.37, POOL.pos.z), yaw: POOL.yaw, w: POOL.w, d: POOL.d }]
    for (const v of VILLAS) {
      const p = local(v, 1.4, 3.1)
      list.push({ pos: V(p.x, v.pos.y + 0.37, p.z), yaw: v.yaw, w: 3.2, d: 1.8 })
    }
    return list
  }, [])
  return pools.map((p, i) => (
    <mesh key={i} material={mat} position={p.pos} rotation={[-Math.PI / 2, 0, p.yaw]} receiveShadow>
      <planeGeometry args={[p.w, p.d]} />
    </mesh>
  ))
}

// Warm festoon bulbs along the pergola beams.
function TerraceLights() {
  const mesh = useMemo(() => {
    const pts = []
    for (let k = 0; k < 5; k++) {
      for (let i = 0; i <= 16; i++) {
        const x = -DINING.w / 2 + 0.6 + (i / 16) * (DINING.w - 1.2)
        const z = -DINING.d / 2 + 1.2 + k * ((DINING.d - 2.4) / 4)
        const p = local(DINING, x, z)
        pts.push(V(p.x, DINING.pos.y + 3.15 - Math.sin((i / 16) * Math.PI) * 0.4, p.z))
      }
    }
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), bulbMat, pts.length)
    pts.forEach((p, i) => m.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)))
    m.computeBoundingSphere()
    return m
  }, [])
  return <primitive object={mesh} />
}

export default function ResortVenue() {
  const geometry = useMemo(resortGeometry, [])
  const material = useMemo(() => withNightLight(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide })), [])
  const sign = useMemo(() => {
    const mat = glowMaterial(banner([[BRAND.name.toUpperCase(), 0.3], ['Welcome', 0.13, BRAND.accent]], { w: 1400, h: 300, bg: '#f6f1e8', fg: '#2a2620' }), 0.2, 0.9)
    const list = []
    for (const flip of [0, Math.PI]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2), mat)
      const dir = V(Math.sin(ARRIVAL.yaw + flip), 0, Math.cos(ARRIVAL.yaw + flip))
      m.position.copy(ARRIVAL.pos).add(V(0, 4.45, 0)).addScaledVector(dir, 3.32)
      m.rotation.y = ARRIVAL.yaw + flip
      list.push(m)
    }
    return { list, mat }
  }, [])
  useFrame(() => {
    sign.mat.emissiveIntensity = THREE.MathUtils.lerp(0.2, 0.9, zoneUniforms.uNight.value)
  })
  const palms = useMemo(
    () => [
      ...[-1, 1].flatMap((s) => [-1, 1].map((e) => ({ pos: local(POOL, e * (POOL.w / 2 + 5.5), s * 5.5), h: 7 }))),
      ...VILLAS.map((v, i) => ({ pos: local(v, 4.6, -3.2), h: 6 + (i % 3) * 0.6 })),
      ...[-1, 1].map((e) => ({ pos: local(DINING, e * (DINING.w / 2 + 2.2), 0), h: 7.2 })),
    ],
    [],
  )
  return (
    <>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      <PoolWater />
      <TerraceLights />
      <Palms items={palms} />
      {sign.list.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  )
}
