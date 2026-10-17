import * as THREE from 'three'
import { mulberry32 } from '../../lib/random'

// One 2048² canvas holds every plant texture so all vegetation can share a single material.
// Regions are in pixels; uv(region, a, b) maps local coords (a across, b down from region top).
const SIZE = 2048
export const REGION = {
  petunia: [0, 0, 512, 512],
  marigold: [512, 0, 256, 256],
  daisy: [768, 0, 256, 256],
  leaf: [512, 256, 512, 256],
  leafAlpha: [1024, 0, 512, 256],
  pinnate: [1024, 256, 512, 256],
  foliage: [0, 512, 1024, 1024],
  bougainvillea: [1024, 512, 1024, 1024],
  frond: [0, 1536, 1536, 512],
  coir: [1536, 1536, 256, 256],
  white: [1792, 1536, 128, 128],
  trunk: [1536, 1792, 512, 256],
}

const INSET = 3 // px, keeps mip bleed from neighbouring regions out
export function uv(region, a, b) {
  const [x, y, w, h] = REGION[region]
  const u = (x + INSET + a * (w - 2 * INSET)) / SIZE
  const v = 1 - (y + INSET + b * (h - 2 * INSET)) / SIZE
  return [u, v]
}
export const WHITE_UV = uv('white', 0.5, 0.5)

const grey = (v, a = 1) => `rgba(${v * 255},${v * 255},${v * 255},${a})`

function clip(ctx, region, fn) {
  const [x, y, w, h] = REGION[region]
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.translate(x, y)
  fn(w, h)
  ctx.restore()
}

// Petunia lobe, unwrapped: x = across one of five lobes, y = rim (top) to throat (bottom).
// Neutral greys so the per-instance colour tints it; veins branch like the reference photo.
function petunia(ctx, rand) {
  clip(ctx, 'petunia', (w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, grey(0.98))
    g.addColorStop(0.45, grey(0.88))
    g.addColorStop(0.8, grey(0.55))
    g.addColorStop(1, grey(0.22))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    // Star-shaped dark flush running up each lobe centre.
    const flush = ctx.createLinearGradient(0, 0, 0, h)
    flush.addColorStop(0, 'rgba(40,20,60,0)')
    flush.addColorStop(0.6, 'rgba(40,20,60,0.25)')
    flush.addColorStop(1, 'rgba(40,20,60,0.6)')
    ctx.fillStyle = flush
    ctx.beginPath()
    ctx.moveTo(w * 0.5, h * 0.05)
    ctx.quadraticCurveTo(w * 0.62, h * 0.6, w * 0.8, h)
    ctx.lineTo(w * 0.2, h)
    ctx.quadraticCurveTo(w * 0.38, h * 0.6, w * 0.5, h * 0.05)
    ctx.fill()

    ctx.globalCompositeOperation = 'multiply'
    ctx.lineCap = 'round'
    const vein = (x0, y0, x1, y1, width, alpha, depth) => {
      const segs = 14
      let px = x0
      let py = y0
      for (let i = 1; i <= segs; i++) {
        const t = i / segs
        const nx = x0 + (x1 - x0) * t + (rand() - 0.5) * 7
        const ny = y0 + (y1 - y0) * t + (rand() - 0.5) * 4
        ctx.strokeStyle = grey(0.35, alpha * (1 - t * 0.6))
        ctx.lineWidth = width * (1 - t * 0.7)
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(nx, ny)
        ctx.stroke()
        if (depth > 0 && rand() < 0.28) {
          const len = 30 + rand() * 60
          const ang = Math.atan2(y1 - y0, x1 - x0) + (rand() < 0.5 ? -1 : 1) * (0.5 + rand() * 0.6)
          vein(nx, ny, nx + Math.cos(ang) * len, ny + Math.sin(ang) * len, width * 0.5, alpha * 0.8, depth - 1)
        }
        px = nx
        py = ny
      }
    }
    // Main veins: lobe centre and both lobe edges, plus fanned primaries.
    vein(w * 0.5, h, w * 0.5, 0, 7, 0.9, 2)
    vein(0, h, 0, 0, 6, 0.8, 1)
    vein(w, h, w, 0, 6, 0.8, 1)
    for (let i = 0; i < 12; i++) {
      const a = (i + 0.5) / 12
      vein(w * (0.35 + a * 0.3), h, w * a, h * (0.02 + rand() * 0.08), 3.5, 0.65, 2)
    }
    ctx.globalCompositeOperation = 'source-over'
    // Pale yellow-green throat at the very bottom.
    const throat = ctx.createLinearGradient(0, h * 0.9, 0, h)
    throat.addColorStop(0, 'rgba(210,220,140,0)')
    throat.addColorStop(1, 'rgba(210,220,140,0.7)')
    ctx.fillStyle = throat
    ctx.fillRect(0, h * 0.9, w, h * 0.1)
  })
}

// Petal with alpha outline: drawn pointing up, base at bottom.
function petalShape(ctx, w, h, widthAt, tipRuffle, rand) {
  ctx.beginPath()
  const steps = 40
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const y = h * (1 - t)
    const ruffle = t > 0.85 ? Math.sin(t * 90 + rand()) * tipRuffle : 0
    ctx.lineTo(w / 2 + widthAt(t) * w * 0.5 + ruffle, y)
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps
    const y = h * (1 - t)
    const ruffle = t > 0.85 ? Math.sin(t * 77 + rand()) * tipRuffle : 0
    ctx.lineTo(w / 2 - widthAt(t) * w * 0.5 - ruffle, y)
  }
  ctx.closePath()
}

function marigold(ctx, rand) {
  clip(ctx, 'marigold', (w, h) => {
    petalShape(ctx, w, h, (t) => Math.min(1, Math.sin(Math.PI * Math.min(t * 1.1, 1)) * 1.15) * 0.92, 10, rand)
    const g = ctx.createLinearGradient(0, h, 0, 0)
    g.addColorStop(0, grey(0.72))
    g.addColorStop(0.35, grey(0.92))
    g.addColorStop(0.7, grey(1))
    g.addColorStop(1, grey(1))
    ctx.fillStyle = g
    ctx.fill()
    ctx.save()
    ctx.clip()
    ctx.globalCompositeOperation = 'multiply'
    for (let i = 0; i < 26; i++) {
      const x = w * (0.1 + 0.8 * rand())
      ctx.strokeStyle = grey(0.75, 0.5)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(w / 2, h)
      ctx.quadraticCurveTo(x, h * 0.5, x + (rand() - 0.5) * 20, 0)
      ctx.stroke()
    }
    ctx.restore()
  })
}

function daisy(ctx, rand) {
  clip(ctx, 'daisy', (w, h) => {
    petalShape(ctx, w, h, (t) => (t < 0.15 ? 0.35 + t * 2.5 : Math.sin(Math.PI * (0.15 + t * 0.85)) * 0.7 + 0.25) * 0.55, 3, rand)
    const g = ctx.createLinearGradient(0, h, 0, 0)
    g.addColorStop(0, 'rgb(70,60,170)')
    g.addColorStop(0.18, 'rgb(150,140,220)')
    g.addColorStop(0.35, 'rgb(245,243,255)')
    g.addColorStop(1, 'rgb(255,255,255)')
    ctx.fillStyle = g
    ctx.fill()
    ctx.save()
    ctx.clip()
    for (let i = -3; i <= 3; i++) {
      ctx.strokeStyle = 'rgba(120,110,190,0.25)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(w / 2, h)
      ctx.lineTo(w / 2 + i * w * 0.06, 0)
      ctx.stroke()
    }
    ctx.restore()
  })
}

// Leaf texture: base at x = 0, tip at x = w, midrib along the middle.
function leafVeins(ctx, w, h, rand, light, dark) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, dark)
  g.addColorStop(0.5, light)
  g.addColorStop(1, dark)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(200,230,150,0.55)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(0, h / 2)
  ctx.lineTo(w, h / 2)
  ctx.stroke()
  ctx.lineWidth = 1.6
  ctx.strokeStyle = 'rgba(190,225,140,0.35)'
  for (let i = 1; i < 9; i++) {
    const x = (i / 9) * w
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(x, h / 2)
      ctx.quadraticCurveTo(x + w * 0.06, h / 2 + side * h * 0.22, x + w * 0.1 + rand() * 8, h / 2 + side * h * 0.48)
      ctx.stroke()
    }
  }
  // Speckle for surface variation.
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(${rand() < 0.5 ? '20,40,10' : '160,200,110'},${0.05 + rand() * 0.05})`
    ctx.fillRect(rand() * w, rand() * h, 2 + rand() * 3, 2 + rand() * 3)
  }
}

function ovatePath(ctx, x0, y0, len, wid, rot = 0) {
  ctx.save()
  ctx.translate(x0, y0)
  ctx.rotate(rot)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(len * 0.25, -wid * 0.75, len * 0.7, -wid * 0.55, len, 0)
  ctx.bezierCurveTo(len * 0.7, wid * 0.55, len * 0.25, wid * 0.75, 0, 0)
  ctx.restore()
}

function leaves(ctx, rand) {
  clip(ctx, 'leaf', (w, h) => leafVeins(ctx, w, h, rand, '#5d9a3a', '#2f6223'))
  clip(ctx, 'leafAlpha', (w, h) => {
    ovatePath(ctx, 4, h / 2, w - 8, h * 0.9)
    ctx.save()
    ctx.clip()
    leafVeins(ctx, w, h, rand, '#5d9a3a', '#2f6223')
    ctx.restore()
  })
  clip(ctx, 'pinnate', (w, h) => {
    ctx.strokeStyle = '#3d6b2a'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w * 0.98, h / 2)
    ctx.stroke()
    for (let i = 0; i < 18; i++) {
      const x = w * (0.05 + i * 0.052)
      const len = h * (0.44 - i * 0.013)
      for (const side of [-1, 1]) {
        ctx.fillStyle = i % 2 ? '#2f5f22' : '#3a7029'
        ovatePath(ctx, x, h / 2, len, len * 0.38, side * 0.95)
        ctx.fill()
      }
    }
  })
}

// Dense leaf cluster for shrubs and hedges; optional papery bracts (bougainvillea).
function cluster(ctx, region, rand, { count, size, bracts }) {
  clip(ctx, region, (w, h) => {
    const greens = ['#2d5a22', '#386b28', '#447a2e', '#2a4f1f', '#4f8a35']
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(rand()) * w * 0.44
      const a = rand() * Math.PI * 2
      const x = w / 2 + Math.cos(a) * r
      const y = h / 2 + Math.sin(a) * r
      const s = size * (0.7 + rand() * 0.6)
      const depth = r / (w * 0.44)
      ovatePath(ctx, x, y, s, s * 0.55, rand() * Math.PI * 2)
      ctx.fillStyle = greens[Math.floor(rand() * greens.length)]
      ctx.fill()
      ctx.fillStyle = `rgba(0,0,0,${0.25 * (1 - depth)})`
      ctx.fill()
      if (bracts && rand() < 0.55) {
        const pinks = ['#d81b7a', '#e93a8f', '#ff4fa3', '#c2185b']
        for (let k = 0; k < 3; k++) {
          const ba = rand() * Math.PI * 2
          ovatePath(ctx, x + Math.cos(ba) * s * 0.3, y + Math.sin(ba) * s * 0.3, s * 0.7, s * 0.6, ba)
          ctx.fillStyle = pinks[Math.floor(rand() * pinks.length)]
          ctx.fill()
        }
      }
    }
  })
}

function frond(ctx, rand) {
  clip(ctx, 'frond', (w, h) => {
    ctx.lineCap = 'round'
    for (let i = 0; i < 70; i++) {
      const t = i / 70
      const x = w * (0.06 + t * 0.92)
      const len = h * 0.46 * Math.sin(Math.PI * (0.08 + t * 0.84)) ** 0.7
      for (const side of [-1, 1]) {
        ctx.strokeStyle = ['#5f7d45', '#6b8a4c', '#56733d', '#7a9455'][Math.floor(rand() * 4)]
        ctx.lineWidth = 6 + rand() * 3
        ctx.beginPath()
        ctx.moveTo(x, h / 2)
        ctx.quadraticCurveTo(x + len * 0.35, h / 2 + side * len * 0.5, x + len * 0.55, h / 2 + side * len * 0.95)
        ctx.stroke()
      }
    }
    ctx.strokeStyle = '#8a8a52'
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()
  })
}

function coir(ctx, rand) {
  clip(ctx, 'coir', (w, h) => {
    ctx.fillStyle = '#5a3d24'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 900; i++) {
      const x = rand() * w
      const y = rand() * h
      const a = rand() * Math.PI
      const l = 6 + rand() * 18
      ctx.strokeStyle = rand() < 0.5 ? 'rgba(140,100,60,0.7)' : 'rgba(40,25,12,0.6)'
      ctx.lineWidth = 1 + rand()
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
      ctx.stroke()
    }
  })
}

function trunk(ctx, rand) {
  clip(ctx, 'trunk', (w, h) => {
    ctx.fillStyle = '#6e5a43'
    ctx.fillRect(0, 0, w, h)
    // Diamond lattice of old leaf bases.
    const cols = 6
    const rows = 3
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const cx = (c + (r % 2) * 0.5) * (w / cols)
        const cy = r * (h / rows)
        ctx.beginPath()
        ctx.moveTo(cx, cy - h / rows / 2)
        ctx.lineTo(cx + w / cols / 2, cy)
        ctx.lineTo(cx, cy + h / rows / 2)
        ctx.lineTo(cx - w / cols / 2, cy)
        ctx.closePath()
        ctx.fillStyle = `rgb(${120 + rand() * 30},${100 + rand() * 25},${75 + rand() * 20})`
        ctx.fill()
        ctx.strokeStyle = 'rgba(40,28,18,0.8)'
        ctx.lineWidth = 5
        ctx.stroke()
      }
    }
  })
}

let atlas = null
export function getAtlas() {
  if (atlas) return atlas
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  const rand = mulberry32(42)
  petunia(ctx, rand)
  marigold(ctx, rand)
  daisy(ctx, rand)
  leaves(ctx, rand)
  cluster(ctx, 'foliage', rand, { count: 650, size: 70, bracts: false })
  cluster(ctx, 'bougainvillea', rand, { count: 420, size: 85, bracts: true })
  frond(ctx, rand)
  coir(ctx, rand)
  trunk(ctx, rand)
  clip(ctx, 'white', (w, h) => {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
  })
  atlas = new THREE.CanvasTexture(canvas)
  atlas.colorSpace = THREE.SRGBColorSpace
  atlas.anisotropy = 8
  return atlas
}
