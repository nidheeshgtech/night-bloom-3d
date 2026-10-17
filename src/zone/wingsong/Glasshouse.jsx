import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { heightAt } from '../../world/terrain'
import { A_END, GH, halfWidth, shellHeight, toWorld } from './layout'
import { bulbMat, metalMat } from '../materials'

// Point on the glass shell at axial a and normalised lateral v.
const shellPoint = (a, v, lift = 0) => {
  const p = toWorld(a, v * halfWidth(a))
  p.y += shellHeight(a, v) + lift
  return p
}

function shellNormal(a, v) {
  const e = 0.01
  const da = shellPoint(a + e, v).sub(shellPoint(a - e, v))
  const dv = shellPoint(a, Math.min(0.999, v + e)).sub(shellPoint(a, Math.max(-0.999, v - e)))
  const n = new THREE.Vector3().crossVectors(dv, da).normalize()
  return n.y < 0 ? n.negate() : n
}

function glassGeometry() {
  const ROWS = 44
  const COLS = 36
  const pos = []
  const uv = []
  const idx = []
  for (let i = 0; i <= ROWS; i++) {
    const a = GH.a0 + ((A_END - GH.a0) * i) / ROWS
    for (let j = 0; j <= COLS; j++) {
      const v = -1 + (2 * j) / COLS
      const p = shellPoint(a, v)
      pos.push(p.x, p.y, p.z)
      uv.push(a / GH.L, (v + 1) / 2)
    }
  }
  const w = COLS + 1
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      const k = i * w + j
      idx.push(k, k + w, k + 1, k + 1, k + w, k + w + 1)
    }
  }
  // Glazed end wall at the entrance, with the door left open.
  const base = pos.length / 3
  const EC = 24
  const ER = 10
  const w0 = halfWidth(GH.a0)
  for (let i = 0; i <= ER; i++) {
    for (let j = 0; j <= EC; j++) {
      const v = -1 + (2 * j) / EC
      const g = toWorld(GH.a0, v * w0)
      const y = g.y + (shellHeight(GH.a0, v) * i) / ER
      pos.push(g.x, y, g.z)
      uv.push(j / EC, (y - heightAt(g.x, g.z)) / 12)
    }
  }
  for (let i = 0; i < ER; i++) {
    for (let j = 0; j < EC; j++) {
      const lMid = (-1 + (2 * (j + 0.5)) / EC) * w0
      const yMid = ((i + 0.5) / ER) * shellHeight(GH.a0, lMid / w0)
      if (Math.abs(lMid) < GH.door.half && yMid < GH.door.height) continue
      const k = base + i * (EC + 1) + j
      idx.push(k, k + 1, k + EC + 1, k + 1, k + EC + 2, k + EC + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

// Flat bar swept along points; across = in-surface direction, n = surface normal.
function sweepBar(points, normals, width, depth) {
  const pos = []
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...b, ...d, ...c)
  const corners = points.map((p, i) => {
    const t = points[Math.min(i + 1, points.length - 1)].clone().sub(points[Math.max(i - 1, 0)]).normalize()
    const n = normals[i]
    const across = new THREE.Vector3().crossVectors(n, t).normalize()
    return [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ].map(([x, y]) => p.clone().addScaledVector(across, (x * width) / 2).addScaledVector(n, (y * depth) / 2).toArray())
  })
  for (let i = 0; i < points.length - 1; i++) {
    for (let f = 0; f < 4; f++) quad(corners[i][f], corners[i][(f + 1) % 4], corners[i + 1][f], corners[i + 1][(f + 1) % 4])
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

function ribGeometry() {
  const parts = []
  const along = (fn, n) => Array.from({ length: n + 1 }, (_, i) => fn(i / n))
  // Midrib ridge beam.
  const mid = along((t) => GH.a0 + (A_END - GH.a0) * t, 60)
  parts.push(sweepBar(mid.map((a) => shellPoint(a, 0, 0.06)), mid.map((a) => shellNormal(a, 0)), 0.22, 0.14))
  // Lateral ribs sweeping forward and down like leaf veins.
  for (let a0 = GH.a0 + 1.6; a0 < GH.L - 5; a0 += 3.2) {
    for (const side of [-1, 1]) {
      const ts = along((t) => t, 18)
      const av = ts.map((t) => [Math.min(A_END - 0.5, a0 + t * 3.4), side * Math.min(0.995, t)])
      parts.push(sweepBar(av.map(([a, v]) => shellPoint(a, v, 0.05)), av.map(([a, v]) => shellNormal(a, Math.max(-0.98, Math.min(0.98, v)))), 0.075, 0.08))
    }
  }
  // Ground beam around the perimeter.
  for (const side of [-1, 1]) {
    const as = along((t) => GH.a0 + (A_END - GH.a0) * t, 50)
    parts.push(sweepBar(as.map((a) => toWorld(a, side * halfWidth(a), 0.12)), as.map(() => new THREE.Vector3(0, 1, 0)), 0.3, 0.24))
  }
  // Portal arch and door frame on the end wall.
  const vs = along((t) => -0.999 + t * 1.998, 30)
  const axis = new THREE.Vector3(toWorld(1, 0).x - toWorld(0, 0).x, 0, toWorld(1, 0).z - toWorld(0, 0).z).normalize()
  parts.push(sweepBar(vs.map((v) => shellPoint(GH.a0, v, 0.05)), vs.map(() => axis.clone().negate()), 0.3, 0.22))
  const d = GH.door
  const frame = [toWorld(GH.a0, -d.half), toWorld(GH.a0, -d.half, d.height), toWorld(GH.a0, d.half, d.height), toWorld(GH.a0, d.half)]
  frame[2].y = frame[1].y
  parts.push(sweepBar(frame, frame.map(() => axis.clone().negate()), 0.16, 0.18))
  return mergeGeometries(parts)
}

let glassMat = null
function glassMaterial() {
  if (glassMat) return glassMat
  glassMat = new THREE.MeshStandardMaterial({
    color: '#cfe8dc',
    roughness: 0.02,
    metalness: 0,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 1.6,
  })
  glassMat.defines = { USE_UV: '' }
  // Fresnel: nearly clear face-on, reflective at grazing angles; plus a fine mullion grid.
  glassMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_begin>',
      `float fres = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);
      vec2 cell = abs(fract(vUv * vec2(46.0, 26.0)) - 0.5);
      float mullion = 1.0 - smoothstep(0.0, 0.018, min(cell.x, cell.y));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.3, 0.26), mullion);
      diffuseColor.a = max(mix(0.035, 0.42, fres), mullion * 0.45);
      #include <lights_fragment_begin>`,
    )
  }
  return glassMat
}

export default function Glasshouse() {
  const glass = useMemo(glassGeometry, [])
  const ribs = useMemo(ribGeometry, [])
  const bulbs = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), bulbMat, 80)
    let k = 0
    for (let i = 0; i < 40; i++) {
      const a = GH.a0 + 1 + ((A_END - GH.a0 - 2) * i) / 39
      for (const v of [-0.12, 0.12]) m.setMatrixAt(k++, new THREE.Matrix4().makeTranslation(...shellPoint(a, v, -0.25).toArray()))
    }
    m.computeBoundingSphere()
    return m
  }, [])
  return (
    <>
      <mesh geometry={ribs} material={metalMat} castShadow receiveShadow />
      <mesh geometry={glass} material={glassMaterial()} renderOrder={2} />
      <primitive object={bulbs} />
    </>
  )
}
