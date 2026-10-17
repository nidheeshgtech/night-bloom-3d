import * as THREE from 'three'
import { mulberry32 } from '../lib/random'
import { NIGHT_EXTENT } from './nightlight'
import { ZONES, promenade, spokes } from '../world/plan'
import { LAMP_ANGLES } from '../world/PromenadeLamps'
import { PROMENADE_PALMS, TREES } from '../world/TreeBelts'
import { PAVILIONS } from '../world/Pavilions'
import { avenue, pathToWorld } from './layout'
import { arches, lamps } from './planting'
import { glassCenter, innerPath, stream } from './wingsong/layout'
import { LANTERNS, lanternPath, plazaCenter } from './lantern/layout'
import { C as HC, PAV, POOL, QUARTERS, quarterCentre, toWorld as herb } from './herbarium/layout'

const RES = 1024
// Each zone's accent colour for its border uplighting.
const ZONE_ACCENT = {
  bloom: '#ff5fb0',
  herbarium: '#ffc35a',
  wingsong: '#ff9d3a',
  canopy: '#3fe0c0',
  dreamroot: '#a86bff',
  lantern: '#5aa8ff',
}

// Paints the night light map: additive radial pools of coloured light, world top-down.
export function buildNightMap() {
  const c = document.createElement('canvas')
  c.width = c.height = RES
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, RES, RES)
  ctx.globalCompositeOperation = 'lighter'
  const k = RES / (2 * NIGHT_EXTENT)
  const px = (x, z) => [(x + NIGHT_EXTENT) * k, (z + NIGHT_EXTENT) * k]
  const glow = (x, z, r, color, a) => {
    const [cx, cy] = px(x, z)
    const col = new THREE.Color(color)
    const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * k)
    g.addColorStop(0, `rgba(${rgb},${a})`)
    g.addColorStop(0.45, `rgba(${rgb},${a * 0.55})`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.fillRect(cx - r * k, cy - r * k, 2 * r * k, 2 * r * k)
  }
  const alongPath = (path, step, d, r, color, a) => {
    for (let s = step / 2; s < path.length; s += step) {
      const p = path.toWorld(s, d)
      glow(p.x, p.z, r, color, a)
    }
  }
  const rand = mulberry32(99)

  // Soft violet base so nothing in the garden falls to black.
  glow(0, 0, 175, '#4a4890', 0.22)

  // Promenade: amber pools under every fanous, plus a warm wash along the walk.
  for (const a of LAMP_ANGLES) glow(Math.cos(a) * 54.1, Math.sin(a) * 54.1, 6.5, '#ffad5c', 0.85)
  alongPath(promenade, 6, 0, 4, '#ffcf8a', 0.25)
  for (const p of spokes) alongPath(p, 4, 0, 3.2, '#ffcf8a', 0.4)
  for (const p of PAVILIONS) glow(p.pos.x, p.pos.z, 5, '#ff9a4a', 0.7)

  // Bloom Terraces: pink and violet under the arcade, warm light along the beds.
  arches.forEach((a, i) => glow(a.center.x, a.center.z, 5.5, i % 2 ? '#b45cff' : '#ff4fa3', 0.85))
  for (const l of lamps) {
    const p = pathToWorld(l.s, l.d)
    glow(p.x, p.z, 6, '#ffad5c', 0.8)
  }
  for (const side of [-1, 1]) alongPath(avenue, 3, side * 3, 3.2, '#ffd6a0', 0.35)

  // Every petal: coloured uplighting along its flower border.
  for (const z of ZONES) {
    for (const { path, inward } of z.sides) alongPath(path, 5, inward * 1.9, 3.6, ZONE_ACCENT[z.id], 0.6)
  }

  // Wingsong Conservatory: warm path, cyan stream, gentle glow under the glass.
  const gc = glassCenter()
  glow(gc.x, gc.z, 24, '#ffb070', 0.18)
  alongPath(innerPath, 4, 0, 4, '#ffbe78', 0.45)
  alongPath(stream, 3, 0, 2.6, '#3fd2ff', 0.55)

  // Lantern Shore: each lantern pools its own colour.
  for (const L of LANTERNS) glow(L.pos.x, L.pos.z, L.hero ? 8 : 4.5, L.color, 0.75)
  const lp = plazaCenter()
  glow(lp.x, lp.z, 7, '#ffd9a0', 0.5)
  alongPath(lanternPath, 5, 0, 3, '#9fd8ff', 0.3)

  // Herbarium Walk: cyan fountain and pool, gold pavilion, warm lanterns and quarters.
  const f = herb(HC, 0)
  glow(f.x, f.z, 8.5, '#4fd8ff', 0.45)
  for (let R = POOL.r0; R <= POOL.r1; R += 2.5) {
    const p = herb(R, 0)
    glow(p.x, p.z, 3, '#4fd8ff', 0.5)
  }
  const pv = herb(PAV.r, 0)
  glow(pv.x, pv.z, 9, '#ffcf70', 0.75)
  for (const q of QUARTERS) {
    const p = herb(...quarterCentre(q))
    glow(p.x, p.z, 7, '#ffb85a', 0.4)
  }
  for (const [a, b] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const p = herb(HC + a * 18.8, b * 18.8)
    glow(p.x, p.z, 5, '#ffad5c', 0.75)
  }

  // Trees: palms washed gold, every third belt tree uplit in violet, cyan or pink.
  for (const p of PROMENADE_PALMS) glow(p.pos.x, p.pos.z, 3.2, '#ffc070', 0.7)
  const TREE_COLORS = ['#8a5cff', '#3fc8ff', '#ff6fc0']
  TREES.forEach((t, i) => {
    if (i % 3 || Math.hypot(t.pos.x, t.pos.z) > 155) return
    glow(t.pos.x, t.pos.z, 3.4 * t.s, TREE_COLORS[Math.floor(rand() * 3)], 0.6)
  })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.NoColorSpace
  tex.generateMipmaps = true
  return tex
}
