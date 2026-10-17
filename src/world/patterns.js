import * as THREE from 'three'
import { withNightLight } from '../zone/nightlight'

// Traditional Islamic geometric patterns, drawn in code (no external artwork).

function starPath(ctx, x, y, r, inner, points, rot = 0) {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 + rot
    const rr = i % 2 ? inner : r
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath()
}

// Mashrabiya screen: timber lattice with 8-point star openings (alpha cut out).
let lattice = null
export function latticeTexture() {
  if (lattice) return lattice
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, 128, 128)
  ctx.globalCompositeOperation = 'destination-out'
  for (const [x, y] of [[32, 32], [96, 32], [32, 96], [96, 96]]) {
    starPath(ctx, x, y, 21, 13, 8, Math.PI / 8)
    ctx.fill()
  }
  for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128], [64, 64]]) {
    starPath(ctx, x, y, 9, 6, 4, Math.PI / 4)
    ctx.fill()
  }
  lattice = new THREE.CanvasTexture(c)
  lattice.wrapS = lattice.wrapT = THREE.RepeatWrapping
  lattice.anisotropy = 4
  return lattice
}

// Paving rosette: 16-point star medallion in sandstone, terracotta and teal.
let rosette = null
function rosetteTexture() {
  if (rosette) return rosette
  const S = 1024
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  const m = S / 2
  ctx.fillStyle = '#dcc9a6'
  ctx.fillRect(0, 0, S, S)
  ctx.lineJoin = 'round'
  // Border rings.
  ctx.strokeStyle = '#8a6a44'
  ctx.lineWidth = 34
  ctx.beginPath()
  ctx.arc(m, m, 492, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = '#2f7f86'
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.arc(m, m, 458, 0, Math.PI * 2)
  ctx.stroke()
  // Ring of small 8-point stars.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    starPath(ctx, m + Math.cos(a) * 410, m + Math.sin(a) * 410, 28, 17, 8, a)
    ctx.fillStyle = '#b5713f'
    ctx.fill()
  }
  // Radial strapwork from the big star's points to the ring.
  ctx.strokeStyle = '#6b4f30'
  ctx.lineWidth = 7
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(m + Math.cos(a) * 330, m + Math.sin(a) * 330)
    ctx.lineTo(m + Math.cos(a) * 382, m + Math.sin(a) * 382)
    ctx.stroke()
  }
  // Central 16-point star.
  starPath(ctx, m, m, 332, 236, 16)
  ctx.fillStyle = '#c9935a'
  ctx.fill()
  ctx.stroke()
  starPath(ctx, m, m, 222, 150, 8, Math.PI / 8)
  ctx.fillStyle = '#2f7f86'
  ctx.fill()
  ctx.stroke()
  starPath(ctx, m, m, 120, 112, 8, Math.PI / 8)
  ctx.fillStyle = '#e9dcc0'
  ctx.fill()
  starPath(ctx, m, m, 95, 56, 8)
  ctx.fillStyle = '#b5713f'
  ctx.fill()
  ctx.stroke()
  rosette = new THREE.CanvasTexture(c)
  rosette.colorSpace = THREE.SRGBColorSpace
  rosette.anisotropy = 8
  return rosette
}

let rosetteMat = null
export function rosetteMaterial() {
  return (rosetteMat ??= withNightLight(new THREE.MeshStandardMaterial({
    map: rosetteTexture(),
    roughness: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })))
}
