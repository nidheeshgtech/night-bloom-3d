import * as THREE from 'three'
import { mulberry32 } from '../../lib/random'

// Right-wing textures for each species, side by side: x = body (0) to wing tip, y = head
// (top) to tail. Left wings reuse them mirrored. The last column is body colour.
export const WING_COL = 192
export const WING_TEX_W = 1024
const H = 256

const FORE = [
  [0.02, 0.3],
  [0.32, 0.1],
  [0.78, 0.04],
  [0.98, 0.12],
  [0.92, 0.3],
  [0.62, 0.5],
  [0.05, 0.53],
]
const HIND = [
  [0.03, 0.47],
  [0.55, 0.47],
  [0.8, 0.62],
  [0.72, 0.85],
  [0.42, 0.98],
  [0.13, 0.9],
  [0.02, 0.7],
]

function smoothClosed(ctx, pts, x0) {
  const P = pts.map(([u, t]) => [x0 + u * WING_COL, t * H])
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  ctx.moveTo(...mid(P[P.length - 1], P[0]))
  for (let i = 0; i < P.length; i++) {
    const m = mid(P[i], P[(i + 1) % P.length])
    ctx.quadraticCurveTo(P[i][0], P[i][1], m[0], m[1])
  }
  ctx.closePath()
}

const dot = (ctx, x0, u, t, r, fill) => {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(x0 + u * WING_COL, t * H, r, 0, Math.PI * 2)
  ctx.fill()
}

function wingPath(ctx, x0) {
  ctx.beginPath()
  smoothClosed(ctx, FORE, x0)
  smoothClosed(ctx, HIND, x0)
}

function veins(ctx, x0, color) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1.2
  for (const [u, t] of [
    [0.9, 0.08],
    [0.97, 0.18],
    [0.85, 0.36],
    [0.6, 0.48],
    [0.75, 0.66],
    [0.6, 0.9],
    [0.3, 0.95],
  ]) {
    ctx.beginPath()
    ctx.moveTo(x0 + 4, t < 0.5 ? 0.38 * H : 0.55 * H)
    ctx.lineTo(x0 + u * WING_COL, t * H)
    ctx.stroke()
  }
}

function border(ctx, x0, color, width) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  wingPath(ctx, x0)
  ctx.stroke()
}

const PAINTERS = [
  // Plain Tiger: tawny orange, black forewing tip with a white band, spotted dark margins.
  (ctx, x0) => {
    ctx.fillStyle = '#e8862a'
    ctx.fillRect(x0, 0, WING_COL, H)
    ctx.fillStyle = '#1a1210'
    ctx.beginPath()
    ctx.moveTo(x0 + 0.5 * WING_COL, 0)
    ctx.lineTo(x0 + WING_COL, 0)
    ctx.lineTo(x0 + WING_COL, 0.36 * H)
    ctx.lineTo(x0 + 0.72 * WING_COL, 0.4 * H)
    ctx.closePath()
    ctx.fill()
    for (let i = 0; i < 5; i++) dot(ctx, x0, 0.62 + i * 0.07, 0.12 + i * 0.04, 4.5, '#f6f2ea')
    for (const [u, t] of [[0.3, 0.6], [0.4, 0.66], [0.35, 0.72]]) dot(ctx, x0, u, t, 3, '#1a1210')
    border(ctx, x0, '#1a1210', 9)
    for (let i = 0; i < 8; i++) dot(ctx, x0, 0.2 + i * 0.07, 0.9 - Math.abs(i - 4) * 0.05, 1.6, '#f6f2ea')
    veins(ctx, x0, 'rgba(40,20,10,0.45)')
  },
  // Painted Lady: salmon orange, black blotches, black tip with white spots, dotted hindwing.
  (ctx, x0) => {
    ctx.fillStyle = '#e88a4a'
    ctx.fillRect(x0, 0, WING_COL, H)
    ctx.fillStyle = '#6b4a35'
    ctx.fillRect(x0, 0, 0.22 * WING_COL, H)
    ctx.fillStyle = '#1a1210'
    ctx.beginPath()
    ctx.moveTo(x0 + 0.58 * WING_COL, 0)
    ctx.lineTo(x0 + WING_COL, 0)
    ctx.lineTo(x0 + WING_COL, 0.3 * H)
    ctx.lineTo(x0 + 0.7 * WING_COL, 0.28 * H)
    ctx.closePath()
    ctx.fill()
    for (const [u, t] of [[0.45, 0.25], [0.55, 0.38], [0.38, 0.42]]) dot(ctx, x0, u, t, 9, '#1a1210')
    for (const [u, t] of [[0.75, 0.08], [0.85, 0.14], [0.8, 0.22], [0.92, 0.2]]) dot(ctx, x0, u, t, 3.5, '#f6f2ea')
    for (let i = 0; i < 5; i++) dot(ctx, x0, 0.3 + i * 0.1, 0.78 - Math.abs(i - 2) * 0.03, 3.4, '#1a1210')
    border(ctx, x0, '#3a2418', 5)
    veins(ctx, x0, 'rgba(40,20,10,0.4)')
  },
  // Blue Pansy: dark forewing with white and orange bars, blue hindwing with eyespots.
  (ctx, x0) => {
    ctx.fillStyle = '#1c1820'
    ctx.fillRect(x0, 0, WING_COL, 0.5 * H)
    const g = ctx.createLinearGradient(x0, 0.5 * H, x0 + WING_COL, H)
    g.addColorStop(0, '#1d2a6e')
    g.addColorStop(0.5, '#2f6bff')
    g.addColorStop(1, '#5aa0ff')
    ctx.fillStyle = g
    ctx.fillRect(x0, 0.5 * H, WING_COL, 0.5 * H)
    ctx.fillStyle = '#f2efe6'
    ctx.fillRect(x0 + 0.55 * WING_COL, 0.12 * H, 0.3 * WING_COL, 0.05 * H)
    ctx.fillStyle = '#e8862a'
    ctx.fillRect(x0 + 0.4 * WING_COL, 0.3 * H, 0.35 * WING_COL, 0.06 * H)
    for (const [u, t] of [[0.48, 0.7], [0.6, 0.8]]) {
      dot(ctx, x0, u, t, 9, '#e8862a')
      dot(ctx, x0, u, t, 5, '#111')
    }
    border(ctx, x0, '#141018', 6)
    veins(ctx, x0, 'rgba(0,0,0,0.35)')
  },
  // Lime Butterfly: black with irregular pale yellow spots and a red-blue eyespot.
  (ctx, x0) => {
    const rand = mulberry32(4)
    ctx.fillStyle = '#17140f'
    ctx.fillRect(x0, 0, WING_COL, H)
    for (let i = 0; i < 46; i++) {
      const u = 0.08 + rand() * 0.85
      const t = 0.06 + rand() * 0.88
      dot(ctx, x0, u, t, 3 + rand() * 5, '#f0dc6a')
    }
    dot(ctx, x0, 0.12, 0.78, 8, '#d23a2a')
    dot(ctx, x0, 0.12, 0.78, 4, '#3a6fe0')
    border(ctx, x0, '#17140f', 7)
    veins(ctx, x0, 'rgba(0,0,0,0.5)')
  },
  // Blue Morpho: luminous blue centre, black margins with small white spots.
  (ctx, x0) => {
    const g = ctx.createRadialGradient(x0 + 0.25 * WING_COL, 0.5 * H, 10, x0 + 0.25 * WING_COL, 0.5 * H, 0.9 * WING_COL)
    g.addColorStop(0, '#4fc0ff')
    g.addColorStop(0.55, '#1e7bff')
    g.addColorStop(0.8, '#0d2a6e')
    g.addColorStop(1, '#0a0a12')
    ctx.fillStyle = g
    ctx.fillRect(x0, 0, WING_COL, H)
    border(ctx, x0, '#0a0a12', 18)
    for (let i = 0; i < 7; i++) dot(ctx, x0, 0.7 + i * 0.035, 0.08 + i * 0.045, 2.6, '#f2f2f2')
    veins(ctx, x0, 'rgba(0,10,40,0.35)')
  },
]

let tex = null
export function getWingTexture() {
  if (tex) return tex
  const canvas = document.createElement('canvas')
  canvas.width = WING_TEX_W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  PAINTERS.forEach((paint, i) => {
    const x0 = i * WING_COL
    ctx.save()
    wingPath(ctx, x0)
    ctx.clip()
    paint(ctx, x0)
    ctx.restore()
  })
  ctx.fillStyle = '#2a2018'
  ctx.fillRect(PAINTERS.length * WING_COL, 0, WING_TEX_W - PAINTERS.length * WING_COL, H)
  tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
