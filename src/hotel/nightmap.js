import * as THREE from 'three'
import { NIGHT_EXTENT } from '../zone/nightlight'
import { ARRIVAL, BAR, CRESCENT, KIDS_POOL, PIER, POOL, RESTAURANT, SPA, TOWER, VILLAS, arcPoint, shoreZ } from './layout'

// Night light pools for the hotel grounds (same technique as the garden's nightmap).
export function buildHotelNightMap() {
  const RES = 1024
  const c = document.createElement('canvas')
  c.width = c.height = RES
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, RES, RES)
  ctx.globalCompositeOperation = 'lighter'
  const k = RES / (2 * NIGHT_EXTENT)
  const glow = (x, z, r, color, a) => {
    const cx = (x + NIGHT_EXTENT) * k
    const cy = (z + NIGHT_EXTENT) * k
    const col = new THREE.Color(color)
    const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * k)
    g.addColorStop(0, `rgba(${rgb},${a})`)
    g.addColorStop(0.5, `rgba(${rgb},${a * 0.5})`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.fillRect(cx - r * k, cy - r * k, 2 * r * k, 2 * r * k)
  }
  glow(0, 20, 120, '#3b3a70', 0.25)
  // Deck: warm wash in front of the wings, cyan around the pools.
  for (let d = 24; d <= 156; d += 8) {
    const p = arcPoint(d, CRESCENT.r0 - 4)
    glow(p.x, p.z, 9, '#ffb466', 0.55)
  }
  glow(POOL.cx, POOL.cz, 26, '#3fd2ff', 0.45)
  glow(BAR.x, BAR.z, 6, '#ffc070', 0.6)
  glow(KIDS_POOL.x, KIDS_POOL.z, 9, '#3fd2ff', 0.5)
  glow(0, (TOWER.z0 + TOWER.z1) / 2, 14, '#ffd9a0', 0.6)
  // Promenade and beach torches.
  for (let x = -168; x <= 168; x += 8) glow(x, shoreZ(x) + 18.5, 5, '#ffad5c', 0.7)
  for (let x = -64; x <= 70; x += 15) glow(x, shoreZ(x) + 12, 6, '#ff9a4a', 0.35)
  // Pier and restaurant.
  for (let z = PIER.z1; z <= PIER.z0; z += 6) glow(PIER.x, z, 4.5, '#ffc070', 0.6)
  glow(RESTAURANT.x, RESTAURANT.z, 16, '#ffd9a8', 0.45)
  for (const v of VILLAS) glow(v.x, v.z, 12, '#ffc070', 0.6)
  glow(SPA.x, SPA.z + 6, 16, '#c99bff', 0.55)
  glow(ARRIVAL.x, ARRIVAL.z, 22, '#ffd9a0', 0.6)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.NoColorSpace
  return tex
}
