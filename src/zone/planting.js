import * as THREE from 'three'
import { mulberry32 } from '../lib/random'
import { ARCADE, BED_IN, BED_OUT, PATH_HALF, PATH_LENGTH, frameAt, heightAt, pathToWorld } from './layout'
import { getLibrary } from './library'

const rand = mulberry32(2024)
const V = (x, y, z) => new THREE.Vector3(x, y, z)
const UP = V(0, 1, 0)

export const SPECIES_INDEX = { petunia: 0, marigold: 1, daisy: 6 }

// ---------- Fixed structures (also used as planting exclusions and colliders) ----------

export const BENCH = { s: 38.4, d: -2.55 } // on the right, in a gap in the border
export const BENCH_GAP = [36.6, 40.4]

export const arches = Array.from({ length: ARCADE.count }, (_, i) => {
  const s = ARCADE.from + ((ARCADE.to - ARCADE.from) * i) / (ARCADE.count - 1)
  const f = frameAt(s)
  return { i, s, f, center: V(f.x, heightAt(f.x, f.z), f.z) }
})

// Superellipse arch profile: near-vertical legs, broad rounded crown.
export function archPoint(arch, u, along = 0) {
  const p = 2.4
  const y = ARCADE.height * Math.pow(Math.max(0, 1 - Math.abs(u) ** p), 1 / p)
  const { f, center } = arch
  return V(center.x + f.nx * u * ARCADE.legOffset + f.tx * along, center.y + y, center.z + f.nz * u * ARCADE.legOffset + f.tz * along)
}

export const legs = arches.flatMap((a) => [-1, 1].map((u) => archPoint(a, u)))
export const lamps = [4, 11, 34, 44].map((s, i) => ({ s, d: (i % 2 ? -1 : 1) * (BED_IN + 0.3) }))
export const pots = [10.6, 34.4].flatMap((s) => [-1, 1].map((side) => ({ s, d: side * (BED_IN + 0.45) })))

const exclusions = [
  ...legs.map((p) => ({ x: p.x, z: p.z, r: 0.32 })),
  ...lamps.map((l) => ({ ...xz(pathToWorld(l.s, l.d)), r: 0.25 })),
  ...pots.map((p) => ({ ...xz(pathToWorld(p.s, p.d)), r: 0.45 })),
]
function xz(v) {
  return { x: v.x, z: v.z }
}

// ---------- Bed planting: rows parallel to the path, drifts of colour along it ----------

export const PETUNIA_DRIFTS = ['#ff4f9a', '#ffffff', '#b45ce0', '#ff86bf', '#e2306e', '#f2f2ff', '#9b4fd6']
export const MARIGOLD_DRIFTS = ['#ffb000', '#ff6a00', '#ffcc1a']
export const DAISY_DRIFTS = ['#ffffff', '#e4d8ff', '#a678e0']

export function drift(list, s, len, side) {
  const k = Math.floor((s + 2.5 * Math.sin(s * 0.23 + side)) / len)
  return list[((k % list.length) + list.length) % list.length]
}

const color = new THREE.Color()
const tmp = new THREE.Matrix4()
const q = new THREE.Quaternion()

export const beds = { petunia: [], marigold: [], daisy: [] }

for (const side of [-1, 1]) {
  for (const band of [
    { species: 'marigold', from: 0, to: 0.55, step: 0.24, drifts: MARIGOLD_DRIFTS, len: 3, size: 1.2 },
    { species: 'petunia', from: 0.55, to: 1.8, step: 0.29, drifts: PETUNIA_DRIFTS, len: 4.5, size: 1.35 },
    { species: 'daisy', from: 1.8, to: BED_OUT - BED_IN - 0.08, step: 0.32, drifts: DAISY_DRIFTS, len: 5, size: 1.3 },
  ]) {
    for (let s = 1.2; s < PATH_LENGTH - 1.2; s += band.step) {
      if (side === -1 && s > BENCH_GAP[0] && s < BENCH_GAP[1]) continue
      for (let dd = band.from + band.step * 0.5; dd < band.to; dd += band.step) {
        const js = s + (rand() - 0.5) * band.step * 0.7
        const jd = dd + (rand() - 0.5) * band.step * 0.6
        // Soften the band boundary so rows don't look ruled.
        const wobble = 0.12 * Math.sin(js * 0.9 + side * 2)
        if (jd + wobble < band.from - 0.02 || jd + wobble > band.to + 0.02) continue
        const p = pathToWorld(js, side * (BED_IN + jd))
        if (exclusions.some((e) => (p.x - e.x) ** 2 + (p.z - e.z) ** 2 < e.r * e.r)) continue
        const scale = band.size * (0.88 + rand() * 0.24)
        q.setFromAxisAngle(UP, rand() * Math.PI * 2)
        tmp.compose(p, q, V(scale, scale * (0.9 + rand() * 0.2), scale))
        color.set(drift(band.drifts, js, band.len, side)).offsetHSL((rand() - 0.5) * 0.02, 0, (rand() - 0.5) * 0.06)
        beds[band.species].push({ matrix: tmp.clone(), color: color.clone(), variant: Math.floor(rand() * 3) })
      }
    }
  }
}

// ---------- Hanging baskets on the arcade ----------

const ARCH_COLORS = ['#ffffff', '#ffc2dc', '#ff86bf', '#ff4f9a', '#e2306e', '#c94fd0', '#9b4fd6', '#c94fd0', '#ff86bf']
export const BASKET_US = [-0.99, -0.93, -0.8, -0.6, -0.33, 0, 0.33, 0.6, 0.8, 0.93, 0.99]

export const baskets = []
for (const arch of arches) {
  BASKET_US.forEach((u, k) => {
    const along = (k % 2 ? 1 : -1) * 0.13
    const p = archPoint(arch, u, along)
    // Leg baskets sit on the outer side of the leg; crown baskets ride on top of the arch.
    const sideDir = V(arch.f.nx, 0, arch.f.nz).multiplyScalar(Math.sign(u))
    const outward = sideDir.multiplyScalar(Math.abs(u) > 0.8 ? 0.22 : 0.1).add(V(0, Math.abs(u) > 0.8 ? 0 : 0.12, 0))
    const pos = p.add(outward)
    q.setFromAxisAngle(UP, rand() * Math.PI * 2)
    const scale = 1.2 + rand() * 0.15
    const mix = rand() < 0.3 ? ARCH_COLORS[(arch.i + 1) % ARCH_COLORS.length] : ARCH_COLORS[arch.i]
    color.set(mix).offsetHSL(0, 0, (rand() - 0.5) * 0.05)
    baskets.push({ matrix: new THREE.Matrix4().compose(pos, q.clone(), V(scale, scale, scale)), color: color.clone(), variant: Math.floor(rand() * 3), anchor: archPoint(arch, u, along) })
  })
}

export const potPlants = pots.map((p, i) => {
  const base = pathToWorld(p.s, p.d)
  base.y += 0.58
  color.set(['#ff4f9a', '#ffffff', '#b45ce0', '#ff86bf'][i])
  return { matrix: new THREE.Matrix4().compose(base, new THREE.Quaternion().setFromAxisAngle(UP, i), V(0.85, 0.85, 0.85)), color: color.clone(), variant: i % 2 }
})

// ---------- Flower heads for picking ----------

function collectHeads() {
  const lib = getLibrary()
  const heads = []
  const species = []
  const add = (items, variants, sp) => {
    for (const it of items) {
      for (const h of variants[it.variant].heads) {
        const w = h.clone().applyMatrix4(it.matrix)
        heads.push(w.x, w.y, w.z)
        species.push(sp)
      }
    }
  }
  add(beds.petunia, lib.petunia, SPECIES_INDEX.petunia)
  add(beds.marigold, lib.marigold, SPECIES_INDEX.marigold)
  add(beds.daisy, lib.daisy, SPECIES_INDEX.daisy)
  add(baskets, lib.basket, SPECIES_INDEX.petunia)
  add(potPlants, lib.pot, SPECIES_INDEX.petunia)
  return { heads: new Float32Array(heads), species: new Uint8Array(species), count: species.length }
}

export const FLOWER_HEADS = collectHeads()
export const BED_PLANT_COUNT = beds.petunia.length + beds.marigold.length + beds.daisy.length
export { PATH_HALF }
