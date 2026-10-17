import * as THREE from 'three'
import { Builder } from './botany/builder'
import { uv } from './botany/atlas'
import { mulberry32 } from '../lib/random'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
export const CORE = [0.025, 0.05, 0.018] // dark interior so foliage never looks hollow

// Square leaf-cluster card centred on p, facing n.
export function card(b, p, n, size, region, tone, rand) {
  const roll = rand() * Math.PI * 2
  const ref = Math.abs(n.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0)
  const x = new THREE.Vector3().crossVectors(ref, n).normalize().applyAxisAngle(n, roll)
  const y = new THREE.Vector3().crossVectors(n, x)
  b.grid(1, 1, (i, j) => ({
    p: p.clone().addScaledVector(x, (j - 0.5) * size).addScaledVector(y, (i - 0.5) * size),
    uv: uv(region, j, 1 - i),
    c: tone,
  }))
}

export const tone = (rand) => {
  const v = 0.8 + rand() * 0.3
  return [v, v, v * (0.9 + rand() * 0.15)]
}

// Clipped hedge along a path between signed offsets d0 (inner face) and d1 (outer face),
// over arc-length runs [[s0, s1], ...]. Dark core faces plus leaf cards on every side.
export function hedgeAlong(b, path, { d0, d1, H, runs, seed = 5, step = 0.22 }) {
  const rand = mulberry32(seed)
  for (const [s0, s1] of runs) {
    const steps = Math.max(1, Math.ceil((s1 - s0) / 0.25))
    const face = (da, ya, db, yb) =>
      b.grid(steps, 1, (i, j) => {
        const s = s0 + ((s1 - s0) * i) / steps
        const p = path.toWorld(s, j ? db : da)
        p.y += j ? yb : ya
        return { p, c: CORE }
      })
    face(d0, 0, d0, H)
    face(d0, H, d1, H)
    face(d1, H, d1, 0)
    for (let s = s0; s < s1; s += step) {
      const a = path.toWorld(s, d0)
      const c = path.toWorld(s, d1)
      const toInner = a.clone().sub(c).setY(0).normalize()
      for (let k = 0; k < 3; k++) {
        const top = path.toWorld(Math.min(s1, s + rand() * step), d0 + (d1 - d0) * (0.2 + 0.6 * rand()))
        top.y += H + 0.02
        card(b, top, V(rand() - 0.5, 2.2, rand() - 0.5).normalize(), 0.42, 'foliage', tone(rand), rand)
      }
      for (const [n, d] of [
        [toInner, d0 + Math.sign(d0 - d1) * 0.03],
        [toInner.clone().negate(), d1 + Math.sign(d1 - d0) * 0.03],
      ]) {
        for (let k = 0; k < 2; k++) {
          const p = path.toWorld(Math.min(s1, s + rand() * step), d)
          p.y += 0.15 + rand() * (H - 0.2)
          card(b, p, n.clone().add(V((rand() - 0.5) * 0.7, (rand() - 0.3) * 0.5, (rand() - 0.5) * 0.7)).normalize(), 0.4, 'foliage', tone(rand), rand)
        }
      }
    }
  }
}

// Free-form shrub: leaf cards on an ellipsoid shell around a dark core.
export function shrubGeometry(seed, region) {
  const b = new Builder()
  const rand = mulberry32(seed)
  b.grid(6, 10, (i, j) => {
    const e = (i / 6) * Math.PI - Math.PI / 2
    const a = (j / 10) * Math.PI * 2
    return { p: V(Math.cos(e) * Math.cos(a) * 0.75, 0.9 + Math.sin(e) * 0.75, Math.cos(e) * Math.sin(a) * 0.75), c: CORE }
  })
  for (let i = 0; i < 150; i++) {
    const e = Math.asin(rand() * 2 - 1) * 0.9
    const a = rand() * Math.PI * 2
    const n = V(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a))
    const p = n.clone().multiplyScalar(0.78 + rand() * 0.18).add(V(0, 0.9, 0))
    card(b, p, n.clone().add(V((rand() - 0.5) * 0.6, 0.2, (rand() - 0.5) * 0.6)).normalize(), 0.55, region, tone(rand), rand)
  }
  return b.toGeometry()
}

// Broad shade tree: short trunk, branches to several flattened canopy lobes.
export function treeGeometry(seed) {
  const b = new Builder()
  const rand = mulberry32(seed)
  const top = V((rand() - 0.5) * 0.5, 2.1, (rand() - 0.5) * 0.5)
  b.tube([V(0, 0, 0), V(0.06, 1.1, 0.03), top], [0.28, 0.22, 0.17], 8, [0.14, 0.11, 0.08])
  const lobes = 7 + Math.floor(rand() * 4)
  for (let l = 0; l < lobes; l++) {
    const a = rand() * Math.PI * 2
    const reach = 0.8 + rand() * 2.2
    const c = top.clone().add(V(Math.cos(a) * reach, 0.5 + rand() * 1.1 - reach * 0.15, Math.sin(a) * reach))
    b.tube([top, top.clone().lerp(c, 0.5).add(V(0, 0.3, 0)), c], [0.12, 0.08, 0.05], 5, [0.14, 0.11, 0.08])
    const r = 1.0 + rand() * 0.7
    for (let i = 0; i < 40; i++) {
      const e = Math.asin(rand() * 2 - 1)
      const az = rand() * Math.PI * 2
      const n = V(Math.cos(e) * Math.cos(az), Math.sin(e) * 0.7, Math.cos(e) * Math.sin(az)).normalize()
      card(b, c.clone().addScaledVector(n, r * (0.75 + rand() * 0.25)), n.clone().add(V(0, 0.35, 0)).normalize(), 0.9, 'foliage', tone(rand), rand)
    }
  }
  return b.toGeometry()
}

// Hibiscus shrub: leafy shell with open flowers dotted over it. Returns geometry + heads.
// Linear-space flower colours: red, coral, pink, golden yellow.
const HIBISCUS_COLORS = [[0.85, 0.04, 0.06], [0.95, 0.25, 0.12], [0.95, 0.2, 0.45], [0.98, 0.7, 0.08]]

export function hibiscusShrub(seed, hibiscusBloom, facing) {
  const b = new Builder()
  const rand = mulberry32(seed)
  b.grid(6, 10, (i, j) => {
    const e = (i / 6) * Math.PI - Math.PI / 2
    const a = (j / 10) * Math.PI * 2
    return { p: V(Math.cos(e) * Math.cos(a) * 0.7, 0.85 + Math.sin(e) * 0.7, Math.cos(e) * Math.sin(a) * 0.7), c: CORE }
  })
  const heads = []
  for (let i = 0; i < 130; i++) {
    const e = Math.asin(rand() * 2 - 1) * 0.9
    const a = rand() * Math.PI * 2
    const n = V(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a))
    card(b, n.clone().multiplyScalar(0.74 + rand() * 0.18).add(V(0, 0.85, 0)), n.clone().add(V(0, 0.2, 0)).normalize(), 0.5, 'foliage', tone(rand), rand)
  }
  const color = HIBISCUS_COLORS[seed % HIBISCUS_COLORS.length]
  for (let i = 0; i < 22; i++) {
    const e = 0.1 + rand() * 1.1
    const a = rand() * Math.PI * 2
    const n = V(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a))
    const p = n.clone().multiplyScalar(0.88).add(V(0, 0.85, 0))
    hibiscusBloom(b, facing(p, n.clone().add(V(0, 0.3, 0)), rand() * 6, 1.5), { rand, color })
    heads.push(p)
  }
  return { geometry: b.toGeometry(), heads }
}

// Lantana shrub: cards painted with flower umbels; heads are card centres on the upper half.
export function lantanaShrub(seed) {
  const b = new Builder()
  const rand = mulberry32(seed)
  b.grid(5, 9, (i, j) => {
    const e = (i / 5) * Math.PI - Math.PI / 2
    const a = (j / 9) * Math.PI * 2
    return { p: V(Math.cos(e) * Math.cos(a) * 0.55, 0.55 + Math.sin(e) * 0.45, Math.cos(e) * Math.sin(a) * 0.55), c: CORE }
  })
  const heads = []
  for (let i = 0; i < 110; i++) {
    const e = Math.asin(rand() * 2 - 1) * 0.85
    const a = rand() * Math.PI * 2
    const n = V(Math.cos(e) * Math.cos(a), Math.sin(e) * 0.8, Math.cos(e) * Math.sin(a)).normalize()
    const p = V(n.x * 0.6, 0.55 + n.y * 0.5, n.z * 0.6)
    card(b, p, n.clone().add(V(0, 0.4, 0)).normalize(), 0.42, 'lantana', tone(rand), rand)
    if (n.y > 0.25 && heads.length < 14) heads.push(p)
  }
  return { geometry: b.toGeometry(), heads }
}

// Boulder: noise-displaced icosphere with box-projected UVs.
export function rockGeometry(seed) {
  const rand = mulberry32(seed)
  const g = new THREE.IcosahedronGeometry(1, 3)
  const pos = g.attributes.position
  const k = [rand() * 6, rand() * 6, rand() * 6]
  const uvs = []
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i)
    const n =
      0.18 * Math.sin(v.x * 2.1 + k[0]) * Math.cos(v.y * 1.7 + k[1]) +
      0.1 * Math.sin(v.z * 3.3 + k[2]) +
      0.06 * Math.sin((v.x + v.y + v.z) * 5.1)
    v.multiplyScalar(1 + n)
    v.y *= 0.62
    pos.setXYZ(i, v.x, v.y, v.z)
    uvs.push(v.x * 0.5 + v.z * 0.5, v.y * 0.5 + v.z * 0.3)
  }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.computeVertexNormals()
  return g
}
