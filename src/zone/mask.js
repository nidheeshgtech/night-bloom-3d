import * as THREE from 'three'
import { BED_IN, BED_OUT, HEDGE_OUT, MASK_EXTENT, PATH, PATH_HALF } from './layout'
import { BENCH_GAP } from './planting'

// Top-down mask over [-E, E]²: R = no grass (path, beds, hedges), G = soil (beds).
// Sampled by the ground shader and the GPU grass.
const RES = 1024
let tex = null

export function maskUV(x, z) {
  return [(x + MASK_EXTENT) / (2 * MASK_EXTENT), 1 - (z + MASK_EXTENT) / (2 * MASK_EXTENT)]
}

export function getMask() {
  if (tex) return tex
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = RES
  const ctx = canvas.getContext('2d')
  const px = (x, z) => [((x + MASK_EXTENT) / (2 * MASK_EXTENT)) * RES, ((z + MASK_EXTENT) / (2 * MASK_EXTENT)) * RES]

  const strip = (d0, d1, side, fill, skip) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    const pts = PATH.filter((_, i) => i % 3 === 0 && !(skip && skip(PATH[i].s)))
    pts.forEach((p, i) => {
      const [x, y] = px(p.x + p.nx * d0 * side, p.z + p.nz * d0 * side)
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
    })
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i]
      ctx.lineTo(...px(p.x + p.nx * d1 * side, p.z + p.nz * d1 * side))
    }
    ctx.closePath()
    ctx.fill()
  }

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, RES, RES)
  ctx.filter = 'blur(1.5px)'
  for (const side of [-1, 1]) {
    const gap = side === -1 ? (s) => s > BENCH_GAP[0] && s < BENCH_GAP[1] : null
    strip(BED_IN - 0.05, BED_OUT + 0.05, side, '#ffff00', gap)
    strip(BED_OUT, HEDGE_OUT + 0.1, side, '#ff0000', gap)
    strip(0, PATH_HALF + 0.3, side, '#ff0000')
  }
  // Paved bay for the bench.
  strip(0, BED_OUT - 0.5, -1, '#ff0000', (s) => s < BENCH_GAP[0] + 0.4 || s > BENCH_GAP[1] - 0.4)

  tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace
  return tex
}
