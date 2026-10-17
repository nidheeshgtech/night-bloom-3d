import * as THREE from 'three'
import { Builder, facing, along } from './builder'
import { uv } from './atlas'
import { mulberry32 } from '../../lib/random'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const GREEN_STEM = [0.045, 0.11, 0.03] // linear
const SUN = V(0.704, 0.486, 0.517)

// ---------- Flower heads (local: centre at origin, facing +Y, metres) ----------

// Petunia: five notched lobes forming a flared trumpet ~7 cm across.
export function petuniaBloom(b, m, { detail, rand }) {
  const R = 0.036
  const D = 0.03
  const seg = detail ? 4 : 1
  const rings = detail ? 4 : 1
  const r0 = 0.08
  const phase = rand() * 10
  for (let k = 0; k < 5; k++) {
    b.grid(rings, seg, (i, j) => {
      const r = r0 + ((1 - r0) * i) / rings
      const a = j / seg
      const th = ((k + a) * Math.PI * 2) / 5
      const notch = 1 - 0.1 * Math.pow(1 - Math.abs(Math.sin(Math.PI * a)), 5)
      const rr = r * notch
      let y = -D * Math.pow(1 - r, 2.4) + 0.006 * r * r * r
      if (detail) y += 0.0045 * r ** 3 * Math.sin(a * Math.PI * 3 + k * 1.7 + phase)
      return { p: V(Math.cos(th) * rr * R, y, Math.sin(th) * rr * R), uv: uv('petunia', a, 1 - r), tint: 1 }
    }, m)
  }
  if (!detail) return
  // Stamens deep in the throat.
  b.tube([V(0, -D * 0.95, 0), V(0, -D * 0.7, 0)], [0.0025, 0.0018], 4, [0.85, 0.85, 0.55], m)
  // Five narrow sepals under the trumpet.
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.6
    const dir = V(Math.cos(a), -0.9, Math.sin(a))
    leafShape(b, m.clone().multiply(along(V(0, -D, 0), dir, 0, 1)), { len: 0.02, wid: 0.005, segL: 2, curl: 0.1, c: [0.9, 1, 0.9] })
  }
}

// French marigold: four rings of cupped petals, outer rings flatter, ~4.5 cm pompom.
export function marigoldBloom(b, m, { detail, rand }) {
  const rings = detail
    ? [
        { n: 9, r: 0.008, tilt: 1.35, len: 0.018 },
        { n: 9, r: 0.006, tilt: 1.05, len: 0.016 },
        { n: 8, r: 0.0045, tilt: 0.7, len: 0.013 },
        { n: 7, r: 0.003, tilt: 0.35, len: 0.01 },
      ]
    : [{ n: 7, r: 0.006, tilt: 1.1, len: 0.02 }]
  const seg = detail ? 2 : 1
  rings.forEach((ring, ri) => {
    for (let k = 0; k < ring.n; k++) {
      const a = ((k + ri * 0.5) / ring.n) * Math.PI * 2 + rand() * 0.2
      const radial = V(Math.cos(a), 0, Math.sin(a))
      const tangent = V(-Math.sin(a), 0, Math.cos(a))
      const dir = radial.clone().multiplyScalar(Math.sin(ring.tilt)).add(V(0, Math.cos(ring.tilt), 0))
      const nrm = new THREE.Vector3().crossVectors(tangent, dir).normalize().negate()
      const base = radial.clone().multiplyScalar(ring.r).add(V(0, ri * 0.002, 0))
      const width = ring.len * 0.95
      b.grid(seg, seg, (i, j) => {
        const t = i / seg
        const s = j / seg - 0.5
        const p = base
          .clone()
          .addScaledVector(dir, t * ring.len)
          .addScaledVector(tangent, s * width)
          .addScaledVector(nrm, (0.25 - s * s) * ring.len * 0.5 * t)
        return { p, uv: uv('marigold', j / seg, 1 - t), tint: 1 }
      }, m)
    }
  })
  if (detail) {
    // Green receptacle under the head.
    b.tube([V(0, -0.006, 0), V(0, 0.0, 0)], [0.004, 0.009], 6, GREEN_STEM, m)
  }
}

// African daisy: fourteen spoon-shaped rays around a domed blue-violet disc, ~6 cm.
export function daisyBloom(b, m, { detail, rand }) {
  const n = detail ? 14 : 10
  const len = 0.027
  const segL = detail ? 3 : 1
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rand() * 0.1
    const radial = V(Math.cos(a), 0, Math.sin(a))
    const tangent = V(-Math.sin(a), 0, Math.cos(a))
    const width = 0.012
    b.grid(segL, 1, (i, j) => {
      const t = i / segL
      const s = j - 0.5
      const p = radial
        .clone()
        .multiplyScalar(0.005 + t * len)
        .add(V(0, 0.006 * t - 0.007 * t * t, 0))
        .addScaledVector(tangent, s * width)
      return { p, uv: uv('daisy', j, 1 - t), tint: 1 }
    }, m)
  }
  // Disc: navy centre, pollen-gold rim.
  const discSeg = detail ? 10 : 5
  const discRings = detail ? 3 : 1
  b.grid(discRings, discSeg, (i, j) => {
    const r = (i / discRings) * 0.0075
    const a = (j / discSeg) * Math.PI * 2
    const c = i < discRings * 0.67 ? [0.1, 0.09, 0.32] : [0.75, 0.62, 0.2]
    return { p: V(Math.cos(a) * r, 0.0045 * (1 - (i / discRings) ** 2), Math.sin(a) * r), c }
  }, m)
}

// ---------- Leaves (local: base at origin, growing along +X, upper face +Y) ----------

export function leafShape(b, m, { len, wid, segL = 3, segW = 2, fold = 0.25, curl = 0.25, c = [1, 1, 1], region = 'leaf' }) {
  b.grid(segL, segW, (i, j) => {
    const t = i / segL
    const a = (j / segW) * 2 - 1
    const w = Math.sin(Math.PI * Math.pow(t, 0.75)) * (t < 0.98 ? 1 : 0.15)
    const z = a * w * wid * 0.5
    const y = Math.abs(a) * w * wid * fold - curl * t * t * len
    return { p: V(t * len, y, z), uv: uv(region, t, (a + 1) / 2), c }
  }, m)
}

// Flat card using an alpha-outlined texture (low-detail leaves, pinnate marigold foliage).
export function leafCard(b, m, { len, wid, region = 'leafAlpha', bend = 0.15, c = [1, 1, 1] }) {
  b.grid(2, 1, (i, j) => {
    const t = i / 2
    return { p: V(t * len, -bend * t * t * len, (j - 0.5) * wid), uv: uv(region, t, j), c }
  }, m)
}

// ---------- Whole plants (local: origin on the soil, +Y up) ----------

const leafTone = (rand) => {
  const v = 0.82 + rand() * 0.22
  return [v * (0.95 + rand() * 0.1), v, v * (0.9 + rand() * 0.1)]
}

function stem(b, from, to, rand, r = 0.0025, sides = 4) {
  const mid = from.clone().lerp(to, 0.5).add(V((rand() - 0.5) * 0.02, 0.01, (rand() - 0.5) * 0.02))
  b.tube([from, mid, to], [r * 1.2, r, r * 0.8], sides, GREEN_STEM)
}

function bloomsOnMound(rand, count, radius, height, lift) {
  const out = []
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2
    const e = 0.35 + rand() * 0.9 // elevation
    const dir = V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e))
    const p = V(dir.x * radius, lift + dir.y * height, dir.z * radius)
    out.push({ p, face: dir.clone().add(V(0, 0.7, 0)).normalize(), roll: rand() * 6.28 })
  }
  return out
}

export function petuniaPlant(seed) {
  const out = { lod0: new Builder(), lod1: new Builder(), heads: [] }
  const rand = mulberry32(seed)
  const leaves = []
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 * 3 + rand() * 0.5
    const r = rand() * 0.1
    const lift = 0.01 + (1 - r / 0.1) * 0.08 + rand() * 0.03
    const dir = V(Math.cos(a), 0.15 + rand() * 0.6, Math.sin(a))
    leaves.push({ p: V(Math.cos(a) * r, lift, Math.sin(a) * r), dir, len: 0.055 + rand() * 0.03, tone: leafTone(rand), roll: (rand() - 0.5) * 0.6 })
  }
  const blooms = bloomsOnMound(rand, 7, 0.11, 0.08, 0.075)
  for (const [lod, b] of [
    [0, out.lod0],
    [1, out.lod1],
  ]) {
    const r2 = mulberry32(seed + 7)
    leaves.forEach((l, i) => {
      if (lod === 1 && i % 2) return
      const m = along(l.p, l.dir, l.roll)
      if (lod === 0) leafShape(b, m, { len: l.len, wid: l.len * 0.6, c: l.tone })
      else leafCard(b, m, { len: l.len * 1.1, wid: l.len * 0.75, c: l.tone })
    })
    for (const bl of blooms) {
      const m = facing(bl.p, bl.face, bl.roll, 0.9 + r2() * 0.25)
      petuniaBloom(b, m, { detail: lod === 0, rand: r2 })
      if (lod === 0) stem(b, V(bl.p.x * 0.5, bl.p.y * 0.5, bl.p.z * 0.5), bl.p.clone().addScaledVector(bl.face, -0.03), r2, 0.002)
    }
  }
  out.heads = blooms.map((bl) => bl.p)
  return out
}

export function marigoldPlant(seed) {
  const out = { lod0: new Builder(), lod1: new Builder(), heads: [] }
  const rand = mulberry32(seed)
  const fronds = []
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 * 3 + rand() * 0.5
    const r = rand() * 0.04
    fronds.push({
      p: V(Math.cos(a) * r, 0.01 + rand() * 0.1, Math.sin(a) * r),
      dir: V(Math.cos(a), 0.2 + rand() * 0.8, Math.sin(a)),
      len: 0.05 + rand() * 0.025,
      tone: leafTone(rand),
    })
  }
  const blooms = []
  for (let i = 0; i < 5; i++) {
    const a = rand() * Math.PI * 2
    const r = 0.015 + rand() * 0.05
    blooms.push({ p: V(Math.cos(a) * r, 0.12 + rand() * 0.04, Math.sin(a) * r), face: V((rand() - 0.5) * 0.5, 1, (rand() - 0.5) * 0.5), roll: rand() * 6 })
  }
  for (const [lod, b] of [
    [0, out.lod0],
    [1, out.lod1],
  ]) {
    const r2 = mulberry32(seed + 3)
    fronds.forEach((f, i) => {
      if (lod === 1 && i % 2) return
      leafCard(b, along(f.p, f.dir, (r2() - 0.5) * 0.8), { len: f.len, wid: f.len * 0.6, region: 'pinnate', c: f.tone })
    })
    for (const bl of blooms) {
      marigoldBloom(b, facing(bl.p, bl.face, bl.roll, 0.95 + r2() * 0.2), { detail: lod === 0, rand: r2 })
      if (lod === 0) stem(b, V(bl.p.x * 0.5, 0.06, bl.p.z * 0.5), bl.p.clone().add(V(0, -0.006, 0)), r2, 0.002)
    }
  }
  out.heads = blooms.map((bl) => bl.p)
  return out
}

export function daisyPlant(seed) {
  const out = { lod0: new Builder(), lod1: new Builder(), heads: [] }
  const rand = mulberry32(seed)
  const leaves = []
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + rand() * 0.4
    leaves.push({ p: V(0, 0.01 + rand() * 0.03, 0), dir: V(Math.cos(a), 0.4 + rand() * 0.5, Math.sin(a)), len: 0.08 + rand() * 0.04, tone: leafTone(rand) })
  }
  const sunXZ = V(SUN.x, 0, SUN.z).normalize()
  const blooms = []
  for (let i = 0; i < 7; i++) {
    const a = rand() * Math.PI * 2
    const r = 0.03 + rand() * 0.09
    const face = V(0, 1, 0).addScaledVector(sunXZ, 0.45).add(V((rand() - 0.5) * 0.4, 0, (rand() - 0.5) * 0.4))
    blooms.push({ p: V(Math.cos(a) * r, 0.17 + rand() * 0.08, Math.sin(a) * r), face, roll: rand() * 6 })
  }
  for (const [lod, b] of [
    [0, out.lod0],
    [1, out.lod1],
  ]) {
    const r2 = mulberry32(seed + 5)
    leaves.forEach((l, i) => {
      if (lod === 1 && i % 2) return
      const m = along(l.p, l.dir, (r2() - 0.5) * 0.5)
      if (lod === 0) leafShape(b, m, { len: l.len, wid: l.len * 0.3, curl: 0.35, c: l.tone })
      else leafCard(b, m, { len: l.len, wid: l.len * 0.4, c: l.tone })
    })
    for (const bl of blooms) {
      daisyBloom(b, facing(bl.p, bl.face, bl.roll, 1.2 + r2() * 0.25), { detail: lod === 0, rand: r2 })
      stem(b, V(bl.p.x * 0.3, 0.0, bl.p.z * 0.3), bl.p.clone().add(V(0, -0.002, 0)), r2, 0.002, lod === 0 ? 4 : 3)
    }
  }
  out.heads = blooms.map((bl) => bl.p)
  return out
}

// Trailing petunias for hanging baskets: a dome of blooms plus stems cascading over the rim.
export function basketPlant(seed, { trailers = 7 } = {}) {
  const out = { lod0: new Builder(), lod1: new Builder(), heads: [] }
  const rand = mulberry32(seed)
  const blooms = []
  const leaves = []
  for (let i = 0; i < 30; i++) {
    const a = rand() * Math.PI * 2
    const e = -0.75 + rand() * 1.95
    const dir = V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e))
    blooms.push({ p: dir.clone().multiplyScalar(0.25 + rand() * 0.05).add(V(0, 0.02, 0)), face: dir.clone().add(V(0, 0.25, 0)).normalize(), roll: rand() * 6 })
  }
  for (let i = 0; i < 44; i++) {
    const a = rand() * Math.PI * 2
    const e = -0.8 + rand() * 2.1
    const dir = V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e))
    leaves.push({ p: dir.clone().multiplyScalar(0.15 + rand() * 0.09), dir: dir.clone().add(V(0, 0.2, 0)), len: 0.05 + rand() * 0.02, tone: leafTone(rand) })
  }
  // Skirt of foliage and blooms spilling over the rim so the bowl hides behind growth.
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rand() * 0.2
    const out_ = V(Math.cos(a), 0, Math.sin(a))
    const p = out_.clone().multiplyScalar(0.2).add(V(0, -0.02 - rand() * 0.1, 0))
    leaves.push({ p, dir: out_.clone().add(V(0, -0.5 - rand() * 0.6, 0)), len: 0.06 + rand() * 0.02, tone: leafTone(rand) })
    if (i % 2 === 0) blooms.push({ p: p.clone().addScaledVector(out_, 0.04).add(V(0, -0.03, 0)), face: out_.clone().add(V(0, -0.2, 0)), roll: rand() * 6 })
  }
  const trails = []
  for (let i = 0; i < trailers; i++) {
    const a = (i / trailers) * Math.PI * 2 + rand() * 0.5
    const out_ = V(Math.cos(a), 0, Math.sin(a))
    const drop = 0.16 + rand() * 0.22
    const pts = [0, 0.25, 0.5, 0.75, 1].map((t) =>
      out_.clone().multiplyScalar(0.22 + 0.12 * Math.sin(t * Math.PI * 0.6)).add(V(0, -drop * t * t - 0.02, 0)),
    )
    trails.push({ pts, out: out_ })
    pts.slice(1).forEach((p, k) => {
      for (let q = 0; q < 2; q++) {
        leaves.push({ p, dir: out_.clone().add(V((rand() - 0.5) * 1.2, -0.2 + rand() * 0.6, (rand() - 0.5) * 1.2)), len: 0.045, tone: leafTone(rand) })
      }
      if (k % 2 === 1 || rand() < 0.4) blooms.push({ p: p.clone().addScaledVector(out_, 0.03), face: out_.clone().add(V(0, -0.15, 0)), roll: rand() * 6 })
    })
  }
  for (const [lod, b] of [
    [0, out.lod0],
    [1, out.lod1],
  ]) {
    const r2 = mulberry32(seed + 11)
    leaves.forEach((l, i) => {
      if (lod === 1 && i % 2) return
      const m = along(l.p, l.dir, (r2() - 0.5) * 0.6)
      if (lod === 0) leafShape(b, m, { len: l.len, wid: l.len * 0.6, c: l.tone })
      else leafCard(b, m, { len: l.len * 1.1, wid: l.len * 0.75, c: l.tone })
    })
    if (lod === 0) trails.forEach((t) => b.tube(t.pts, [0.003, 0.003, 0.0025, 0.002, 0.0018], 3, GREEN_STEM))
    for (const bl of blooms) petuniaBloom(b, facing(bl.p, bl.face, bl.roll, 0.9 + r2() * 0.2), { detail: lod === 0, rand: r2 })
  }
  out.heads = blooms.map((bl) => bl.p)
  return out
}

// Coir-lined hanging basket bowl, open at the top. Local origin = soil surface centre.
export function basketBowl() {
  const b = new Builder()
  const R = 0.18
  b.grid(6, 18, (i, j) => {
    const e = (i / 6) * (Math.PI / 2)
    const a = (j / 18) * Math.PI * 2
    const r = R * Math.cos(e)
    return { p: V(Math.cos(a) * r, -Math.sin(e) * R * 0.85 - 0.02, Math.sin(a) * r), uv: uv('coir', j / 18, i / 6) }
  })
  return b.toGeometry()
}

// Chinese hibiscus: five broad overlapping petals around a long staminal column, ~12 cm.
export function hibiscusBloom(b, m, { rand, color = [1, 1, 1] }) {
  const len = 0.065
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + rand() * 0.15
    const radial = V(Math.cos(a), 0, Math.sin(a))
    const tangent = V(-Math.sin(a), 0, Math.cos(a))
    const width = 0.07
    b.grid(3, 2, (i, j) => {
      const t = i / 3
      const s = j / 2 - 0.5
      const p = radial
        .clone()
        .multiplyScalar(0.004 + t * len)
        .add(V(0, 0.022 * t - 0.012 * t * t + (0.25 - s * s) * 0.012 * t, 0))
        .addScaledVector(tangent, s * width * (0.3 + t * 0.7) + 0.006 * t)
      return { p, uv: uv('hibiscus', j / 2, 1 - t), c: color, tint: 0 }
    }, m)
  }
  b.tube([V(0, 0, 0), V(0.004, 0.04, 0), V(0.008, 0.075, 0.002)], [0.002, 0.0018, 0.0015], 4, [0.85, 0.75, 0.3], m)
  b.tube([V(0.008, 0.073, 0.002), V(0.009, 0.08, 0.002)], [0.004, 0.003], 4, [0.95, 0.85, 0.2], m)
}

// Alocasia-style clump: a few huge arrow-shaped leaves on long upright stalks.
export function alocasiaPlant(seed) {
  const b = new Builder()
  const rand = mulberry32(seed)
  const n = 5 + Math.floor(rand() * 3)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.6
    const h = 0.7 + rand() * 0.6
    const top = V(Math.cos(a) * 0.25, h, Math.sin(a) * 0.25)
    b.tube([V(0, 0, 0), V(Math.cos(a) * 0.1, h * 0.6, Math.sin(a) * 0.1), top], [0.03, 0.022, 0.016], 5, [0.08, 0.16, 0.05])
    const dir = V(Math.cos(a), 0.35 + rand() * 0.4, Math.sin(a))
    const len = 0.6 + rand() * 0.35
    leafShape(b, along(top, dir, (rand() - 0.5) * 0.4), { len, wid: len * 0.7, segL: 5, segW: 2, fold: 0.18, curl: 0.25, c: leafTone(rand) })
  }
  return b.toGeometry()
}

// Fern clump: arching fronds from a central crown.
export function fernPlant(seed) {
  const b = new Builder()
  const rand = mulberry32(seed)
  const n = 9 + Math.floor(rand() * 4)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.5
    const dir = V(Math.cos(a), 0.6 + rand() * 0.6, Math.sin(a))
    const len = 0.45 + rand() * 0.3
    leafCard(b, along(V(0, 0.03, 0), dir, (rand() - 0.5) * 0.5), { len, wid: len * 0.42, region: 'fern', bend: 0.55, c: leafTone(rand) })
  }
  return b.toGeometry()
}
