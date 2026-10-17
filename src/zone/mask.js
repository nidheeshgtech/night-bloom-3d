import * as THREE from 'three'
import { BED_IN, BED_OUT, HEDGE_OUT, PATH_HALF, avenue } from './layout'
import { BENCH_GAP, DAISY_DRIFTS, MARIGOLD_DRIFTS, PETUNIA_DRIFTS, drift } from './planting'
import { PROMENADE, SPOKE_HALF, ZONES, promenade, spokes } from '../world/plan'
import { QUAY_RADIUS } from '../world/terrain'
import { petalBands } from '../world/petalPlanting'
import { PATH_HALF_IN, POND, STREAM_HALF, innerPath, stream, toWorld as wingToWorld } from './wingsong/layout'
import { LANTERN_PATH_HALF, PLAZA, lanternPath, plazaCenter } from './lantern/layout'

// World-space masks over [-E, E]² on x and z.
//   mask:  R = no grass (paths, beds, hedges, lake), G = soil (planting beds)
//   bloom: flower colour painted over beds, shown on the ground beyond plant draw distance
export const MASK_EXTENT = 180
const RES = 2048

export function maskUV(x, z) {
  return [(x + MASK_EXTENT) / (2 * MASK_EXTENT), 1 - (z + MASK_EXTENT) / (2 * MASK_EXTENT)]
}

const px = (x, z) => [((x + MASK_EXTENT) / (2 * MASK_EXTENT)) * RES, ((z + MASK_EXTENT) / (2 * MASK_EXTENT)) * RES]

// Filled strip between offsets d0 and d1 along a path (skip(s) leaves gaps).
function strip(ctx, path, d0, d1, fill, skip, every = 4) {
  ctx.fillStyle = fill
  ctx.beginPath()
  const pts = path.lut.filter((p, i) => i % every === 0 && !(skip && skip(p.s)))
  if (pts.length < 2) return
  pts.forEach((p, i) => {
    const [x, y] = px(p.x + p.nx * d0, p.z + p.nz * d0)
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  })
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    ctx.lineTo(...px(p.x + p.nx * d1, p.z + p.nz * d1))
  }
  ctx.closePath()
  ctx.fill()
}

// Band painted in segments so its colour can change along the path.
function band(ctx, path, d0, d1, colorAt, seg = 1) {
  for (let s = 0; s < path.length - seg; s += seg) {
    const a = path.frameAt(s)
    const b = path.frameAt(s + seg + 0.1)
    ctx.fillStyle = colorAt(s)
    ctx.beginPath()
    ctx.moveTo(...px(a.x + a.nx * d0, a.z + a.nz * d0))
    ctx.lineTo(...px(b.x + b.nx * d0, b.z + b.nz * d0))
    ctx.lineTo(...px(b.x + b.nx * d1, b.z + b.nz * d1))
    ctx.lineTo(...px(a.x + a.nx * d1, a.z + a.nz * d1))
    ctx.closePath()
    ctx.fill()
  }
}

const benchGap = (s) => s > BENCH_GAP[0] && s < BENCH_GAP[1]

let textures = null
export function getMasks() {
  if (textures) return textures

  // --- Grass / soil mask
  const mc = document.createElement('canvas')
  mc.width = mc.height = RES
  const m = mc.getContext('2d')
  m.fillStyle = '#000'
  m.fillRect(0, 0, RES, RES)
  m.filter = 'blur(1px)'
  m.fillStyle = '#f00'
  m.beginPath()
  m.arc(...px(0, 0), (QUAY_RADIUS / (2 * MASK_EXTENT)) * RES, 0, Math.PI * 2)
  m.fill()
  strip(m, promenade, -PROMENADE.half - 0.4, PROMENADE.half + 0.4, '#f00')
  spokes.forEach((p) => strip(m, p, -SPOKE_HALF - 0.4, SPOKE_HALF + 0.4, '#f00', null, 2))
  for (const side of [-1, 1]) {
    const gap = side === -1 ? benchGap : null
    strip(m, avenue, side * (BED_IN - 0.05), side * (BED_OUT + 0.05), '#ff0', gap, 2)
    strip(m, avenue, side * BED_OUT, side * (HEDGE_OUT + 0.1), '#f00', gap, 2)
    strip(m, avenue, 0, side * (PATH_HALF + 0.3), '#f00', null, 2)
  }
  strip(m, avenue, 0, -(BED_OUT - 0.5), '#f00', (s) => s < BENCH_GAP[0] + 0.4 || s > BENCH_GAP[1] - 0.4, 2)
  for (const z of ZONES) {
    for (const { path, inward } of z.sides) {
      strip(m, path, -0.5, 0.5, '#f00')
      strip(m, path, inward * 0.6, inward * 3.1, '#ff0')
    }
  }

  // Wingsong Conservatory interior.
  for (const side of [-1, 1]) strip(m, innerPath, side * (PATH_HALF_IN + 0.3), side * (PATH_HALF_IN + 2.2), '#ff0', (s) => s < 9, 2)
  strip(m, innerPath, -PATH_HALF_IN - 0.3, PATH_HALF_IN + 0.3, '#f00', null, 2)
  strip(m, stream, -STREAM_HALF - 0.5, STREAM_HALF + 0.5, '#f00', null, 2)
  const pond = wingToWorld(POND.a, POND.l)
  m.fillStyle = '#f00'
  m.beginPath()
  m.arc(...px(pond.x, pond.z), ((POND.r + 0.3) / (2 * MASK_EXTENT)) * RES, 0, Math.PI * 2)
  m.fill()

  // Lantern Shore path and plaza.
  strip(m, lanternPath, -LANTERN_PATH_HALF - 0.3, LANTERN_PATH_HALF + 0.3, '#f00', null, 2)
  const plaza = plazaCenter()
  m.beginPath()
  m.arc(...px(plaza.x, plaza.z), ((PLAZA.r + 0.2) / (2 * MASK_EXTENT)) * RES, 0, Math.PI * 2)
  m.fill()

  // --- Far-distance flower carpet colours
  const bc = document.createElement('canvas')
  bc.width = bc.height = RES
  const b = bc.getContext('2d')
  for (const side of [-1, 1]) {
    const dd = BED_OUT - BED_IN
    band(b, avenue, side * BED_IN, side * (BED_IN + 0.55), (s) => drift(MARIGOLD_DRIFTS, s, 3, side))
    band(b, avenue, side * (BED_IN + 0.55), side * (BED_IN + 1.8), (s) => drift(PETUNIA_DRIFTS, s, 4.5, side))
    band(b, avenue, side * (BED_IN + 1.8), side * (BED_IN + dd), (s) => drift(DAISY_DRIFTS, s, 5, side))
  }
  for (const pb of petalBands) band(b, pb.path, pb.d0, pb.d1, pb.colorAt)

  const mask = new THREE.CanvasTexture(mc)
  mask.colorSpace = THREE.NoColorSpace
  const bloom = new THREE.CanvasTexture(bc)
  bloom.colorSpace = THREE.SRGBColorSpace
  textures = { mask, bloom }
  return textures
}
