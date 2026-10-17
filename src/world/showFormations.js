import * as THREE from 'three'
import { mulberry32 } from '../lib/random'
import { WATER_LEVEL } from './terrain'

// Drone-show formations: each shape is drawn on a small canvas and sampled into N points
// (position in a vertical plane + colour). Strokes rather than fills so shapes read as lines
// of light, the way real drone shows do.
export const DRONES = 1100
const W = 320
const H = 170
const SCALE = 0.42 // metres per canvas pixel (formations ~130 m wide)
export const SHOW_Y = 58
const toLin = (c) => Math.pow(c / 255, 2.2)

function sample(draw, seed) {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  draw(ctx)
  const data = ctx.getImageData(0, 0, W, H).data
  const lit = []
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * 4
      if (data[i + 3] > 120) lit.push([x, y, data[i], data[i + 1], data[i + 2]])
    }
  }
  const rand = mulberry32(seed)
  const pos = new Float32Array(DRONES * 3)
  const col = new Float32Array(DRONES * 3)
  // Shuffle, then take evenly; repeat with jitter if there are fewer pixels than drones.
  for (let i = lit.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[lit[i], lit[j]] = [lit[j], lit[i]]
  }
  for (let i = 0; i < DRONES; i++) {
    const [x, y, r, g, b] = lit[i % lit.length]
    const j = i >= lit.length ? 1.2 : 0
    pos.set([(x - W / 2 + (rand() - 0.5) * j) * SCALE, (H / 2 - y + (rand() - 0.5) * j) * SCALE, (rand() - 0.5) * 1.2], i * 3)
    col.set([toLin(r), toLin(g), toLin(b)], i * 3)
  }
  return { pos, col }
}

function star8(ctx) {
  const cx = W / 2
  const cy = H / 2
  const r = 70
  ctx.lineWidth = 5
  for (const [rot, color] of [[0, '#ffd27a'], [Math.PI / 4, '#ffb04a']]) {
    ctx.strokeStyle = color
    ctx.beginPath()
    for (let k = 0; k < 4; k++) {
      const a = rot + (k / 4) * Math.PI * 2 + Math.PI / 4
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.stroke()
  }
  ctx.strokeStyle = '#5fe0ff'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(cx, cy, 30, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(cx, cy, 8, 0, Math.PI * 2)
  ctx.fill()
}

function flower(ctx) {
  const cx = W / 2
  const cy = H / 2 - 12
  ctx.strokeStyle = '#4fdc7a'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(cx, cy + 40)
  ctx.quadraticCurveTo(cx + 6, cy + 70, cx, cy + 82)
  ctx.stroke()
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(cx + s * 18, cy + 64, 14, 6, s * -0.5, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.lineWidth = 5
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    ctx.strokeStyle = k % 2 ? '#ff4fa3' : '#ff86c8'
    ctx.beginPath()
    ctx.ellipse(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26, 22, 11, a, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = '#ffd24a'
  ctx.beginPath()
  ctx.arc(cx, cy, 11, 0, Math.PI * 2)
  ctx.fill()
}

// Temple Fay's butterfly curve.
function butterfly(ctx) {
  const cx = W / 2
  const cy = H / 2 + 8
  ctx.lineWidth = 4.5
  let prev = null
  for (let t = 0; t <= Math.PI * 12; t += 0.02) {
    const r = Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t) - Math.pow(Math.sin(t / 12), 5)
    const p = [cx + Math.sin(t) * r * 20, cy - Math.cos(t) * r * 20]
    if (prev) {
      ctx.strokeStyle = p[1] < cy ? '#3aa0ff' : '#ff9a3a'
      ctx.beginPath()
      ctx.moveTo(...prev)
      ctx.lineTo(...p)
      ctx.stroke()
    }
    prev = p
  }
}

function palm(ctx) {
  const bx = W / 2
  const by = H - 10
  const top = [W / 2 + 14, 52]
  ctx.strokeStyle = '#d9a35a'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(bx, by)
  ctx.quadraticCurveTo(bx - 4, (by + top[1]) / 2, ...top)
  ctx.stroke()
  ctx.strokeStyle = '#5fe08a'
  ctx.lineWidth = 5
  for (let k = 0; k < 8; k++) {
    const a = -Math.PI + (k / 7) * Math.PI
    const len = 62
    const end = [top[0] + Math.cos(a) * len, top[1] + Math.sin(a) * len * 0.55 + 22]
    ctx.beginPath()
    ctx.moveTo(...top)
    ctx.quadraticCurveTo(top[0] + Math.cos(a) * len * 0.55, top[1] + Math.sin(a) * len * 0.6 - 18, ...end)
    ctx.stroke()
  }
  ctx.fillStyle = '#ffb04a'
  for (const [dx, dy] of [[-6, 8], [5, 10], [0, 14]]) {
    ctx.beginPath()
    ctx.arc(top[0] + dx, top[1] + dy, 4, 0, Math.PI * 2)
    ctx.fill()
  }
}

function text(str) {
  return (ctx) => {
    let size = 70
    ctx.font = `800 ${size}px system-ui, -apple-system, sans-serif`
    while (ctx.measureText(str).width > W - 20 && size > 20) {
      size -= 4
      ctx.font = `800 ${size}px system-ui, -apple-system, sans-serif`
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const g = ctx.createLinearGradient(0, 0, W, 0)
    g.addColorStop(0, '#ff4fa3')
    g.addColorStop(0.5, '#ffd27a')
    g.addColorStop(1, '#5fe0ff')
    ctx.fillStyle = g
    ctx.fillText(str, W / 2, H / 2)
  }
}

function ring(ctx) {
  ctx.lineWidth = 6
  for (let k = 0; k < 36; k++) {
    const a0 = (k / 36) * Math.PI * 2
    ctx.strokeStyle = `hsl(${(k / 36) * 360}, 90%, 65%)`
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, 62, a0, a0 + Math.PI / 18 + 0.02)
    ctx.stroke()
  }
}

// Resting grid on the lake surface (launch and landing), in world space relative to centre.
function launchPad() {
  const pos = new Float32Array(DRONES * 3)
  const col = new Float32Array(DRONES * 3).fill(0.6)
  const side = Math.ceil(Math.sqrt(DRONES))
  for (let i = 0; i < DRONES; i++) {
    const x = ((i % side) - side / 2) * 1.2
    const z = (Math.floor(i / side) - side / 2) * 1.2
    pos.set([x, WATER_LEVEL + 0.4 - SHOW_Y, z], i * 3)
  }
  return { pos, col, flat: true }
}

export function buildFormations(label) {
  return [
    launchPad(),
    sample(ring, 1),
    sample(star8, 2),
    sample(flower, 3),
    sample(butterfly, 4),
    sample(palm, 5),
    sample(text(label), 6),
    launchPad(),
  ]
}

// Fireworks: bursts scheduled over the finale. Each burst = 1 rocket + shell particles.
export function buildFireworks(seed = 7) {
  const rand = mulberry32(seed)
  const COLORS = ['#ff4fa3', '#ffd27a', '#5fe0ff', '#b45cff', '#ffffff', '#ff8a3d', '#6dff9a']
  const bursts = []
  let t = 0
  for (let i = 0; i < 22; i++) {
    t += i < 16 ? 0.45 + rand() * 0.55 : 0.15 + rand() * 0.2 // finale gets faster
    bursts.push({ t, x: (rand() - 0.5) * 140, y: 60 + rand() * 45, z: (rand() - 0.5) * 40 - 20, color: COLORS[Math.floor(rand() * COLORS.length)], n: 220 + Math.floor(rand() * 80) })
  }
  const total = bursts.reduce((s, b) => s + b.n + 1, 0)
  const origin = new Float32Array(total * 3)
  const vel = new Float32Array(total * 3)
  const color = new Float32Array(total * 3)
  const time = new Float32Array(total * 2) // [t0, kind] kind 0 = rocket, 1 = shell
  let k = 0
  const c = new THREE.Color()
  for (const b of bursts) {
    origin.set([b.x, b.y, b.z], k * 3)
    color.set([1, 0.85, 0.6], k * 3)
    time.set([b.t, 0], k * 2)
    k++
    c.set(b.color)
    const speed = 20 + rand() * 10
    for (let j = 0; j < b.n; j++) {
      const u = rand() * 2 - 1
      const a = rand() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      const v = speed * (0.85 + rand() * 0.15)
      origin.set([b.x, b.y, b.z], k * 3)
      vel.set([Math.cos(a) * s * v, u * v, Math.sin(a) * s * v], k * 3)
      const tint = rand() < 0.15 ? [1, 1, 1] : [c.r, c.g, c.b]
      color.set(tint, k * 3)
      time.set([b.t, 1], k * 2)
      k++
    }
  }
  return { origin, vel, color, time, count: total, duration: t + 3.5, bursts }
}
