import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { brassMat, fanousGlassMat, metalMat } from './materials'

// Fanous lamp post: slender post, hexagonal brass lantern with star-pierced panels,
// onion dome and finial. Lantern centre sits at `height`; geometry built once and instanced.
const R = 0.17
const H = 0.46
const SIDES = 6

function plain(g) {
  const n = g.index ? g.toNonIndexed() : g
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k)
  return n
}

function lanternParts(height) {
  const frame = []
  const post = new THREE.CylinderGeometry(0.035, 0.055, height - H / 2, 10)
  post.translate(0, (height - H / 2) / 2, 0)
  frame.push(plain(post))
  const base = new THREE.CylinderGeometry(0.12, 0.15, 0.28, 12)
  base.translate(0, 0.14, 0)
  frame.push(plain(base))
  const y0 = height - H / 2
  for (let i = 0; i < SIDES; i++) {
    const a = (i / SIDES) * Math.PI * 2
    const bar = new THREE.BoxGeometry(0.018, H, 0.018)
    bar.translate(Math.cos(a) * R, y0 + H / 2, Math.sin(a) * R)
    frame.push(plain(bar))
  }
  for (const y of [y0, y0 + H]) {
    const ring = new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.035, SIDES)
    ring.translate(0, y, 0)
    frame.push(plain(ring))
  }
  const dome = new THREE.LatheGeometry(
    [
      [R + 0.02, 0],
      [R + 0.05, 0.05],
      [R * 0.9, 0.14],
      [R * 0.45, 0.24],
      [0.03, 0.3],
      [0.012, 0.42],
      [0, 0.44],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    SIDES * 2,
  )
  dome.translate(0, y0 + H, 0)
  frame.push(plain(dome))
  const bottom = new THREE.ConeGeometry(R + 0.02, 0.12, SIDES)
  bottom.rotateX(Math.PI)
  bottom.translate(0, y0 - 0.06, 0)
  frame.push(plain(bottom))

  // Glass panels with UVs so the lattice repeats twice up each panel.
  const pos = []
  const uv = []
  for (let i = 0; i < SIDES; i++) {
    const a0 = (i / SIDES) * Math.PI * 2
    const a1 = ((i + 1) / SIDES) * Math.PI * 2
    const r = R * 0.97
    const A = [Math.cos(a0) * r, y0, Math.sin(a0) * r]
    const B = [Math.cos(a1) * r, y0, Math.sin(a1) * r]
    const C = [Math.cos(a1) * r, y0 + H, Math.sin(a1) * r]
    const D = [Math.cos(a0) * r, y0 + H, Math.sin(a0) * r]
    pos.push(...A, ...B, ...C, ...A, ...C, ...D)
    uv.push(0, 0, 1, 0, 1, 2.6, 0, 0, 1, 2.6, 0, 2.6)
  }
  const glass = new THREE.BufferGeometry()
  glass.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  glass.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  glass.computeVertexNormals()
  const merged = mergeGeometries(frame)
  merged.computeVertexNormals()
  return { frame: merged, glass }
}

const cache = new Map()
const partsFor = (height) => {
  if (!cache.has(height)) cache.set(height, lanternParts(height))
  return cache.get(height)
}

// positions: Vector3 ground points.
export default function Fanous({ positions, height = 3.1 }) {
  const meshes = useMemo(() => {
    const { frame, glass } = partsFor(height)
    const make = (geo, mat, shadow) => {
      const m = new THREE.InstancedMesh(geo, mat, positions.length)
      positions.forEach((p, i) => m.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)))
      m.castShadow = shadow
      m.receiveShadow = true
      m.computeBoundingSphere()
      return m
    }
    return [make(frame, brassMat, true), make(glass, fanousGlassMat, false)]
  }, [positions, height])
  return meshes.map((m, i) => <primitive key={i} object={m} />)
}

export const FANOUS_LIGHT_Y = 3.1
export { metalMat }
