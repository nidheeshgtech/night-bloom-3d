import * as THREE from 'three'

// Street View-style navigation helpers: ground picking, walkability, and grid pathfinding
// (A* on a 0.5 m grid, then string-pulled to a few straight legs).
const BODY = 0.35
const CELL = 0.5
export const MAX_WALK = 45

// Spatial hash of the world's circular colliders, built once per world.
const hashes = new WeakMap()
function colliderHash(world) {
  if (hashes.has(world)) return hashes.get(world)
  const H = 6
  const map = new Map()
  for (const c of world.colliders) {
    const r = c.r + BODY
    for (let i = Math.floor((c.x - r) / H); i <= Math.floor((c.x + r) / H); i++) {
      for (let j = Math.floor((c.z - r) / H); j <= Math.floor((c.z + r) / H); j++) {
        const k = i * 100003 + j
        if (!map.has(k)) map.set(k, [])
        map.get(k).push(c)
      }
    }
  }
  const h = { H, map }
  hashes.set(world, h)
  return h
}

export function walkable(world, x, z) {
  const [cx, cz] = world.clamp(x, z)
  if (Math.abs(cx - x) > 0.01 || Math.abs(cz - z) > 0.01) return false
  if (world.blockedAt && world.blockedAt(x, z)) return false
  const { H, map } = colliderHash(world)
  const cell = map.get(Math.floor(x / H) * 100003 + Math.floor(z / H))
  if (cell) for (const c of cell) if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + BODY) ** 2) return false
  for (const [ax, az, bx, bz] of world.walls || []) {
    const ex = bx - ax
    const ez = bz - az
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez || 1)))
    if ((x - ax - ex * t) ** 2 + (z - az - ez * t) ** 2 < (BODY + 0.05) ** 2) return false
  }
  return true
}

// First point where a ray meets the terrain (marching, then bisection).
export function groundHit(ray, world, maxDist = 80) {
  const p = new THREE.Vector3()
  let prev = 0
  for (let t = 0.3; t <= maxDist; t += 0.4) {
    ray.at(t, p)
    if (p.y < world.heightAt(p.x, p.z)) {
      let a = prev
      let b = t
      for (let i = 0; i < 8; i++) {
        const m = (a + b) / 2
        ray.at(m, p)
        if (p.y < world.heightAt(p.x, p.z)) b = m
        else a = m
      }
      ray.at(b, p)
      return p
    }
    prev = t
  }
  return null
}

function clearLine(world, ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az)
  const n = Math.max(1, Math.ceil(d / 0.3))
  for (let i = 1; i <= n; i++) {
    const t = i / n
    if (!walkable(world, ax + (bx - ax) * t, az + (bz - az) * t)) return false
  }
  return true
}

// Nearest walkable point to (x, z) within `radius`, or null.
export function nearestWalkable(world, x, z, radius = 2.5) {
  if (walkable(world, x, z)) return [x, z]
  for (let r = 0.3; r <= radius; r += 0.3) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2
      const px = x + Math.cos(a) * r
      const pz = z + Math.sin(a) * r
      if (walkable(world, px, pz)) return [px, pz]
    }
  }
  return null
}

// Route from (sx, sz) to (tx, tz): list of [x, z] waypoints, or null if unreachable.
// snap: how far a blocked target may be nudged to the nearest walkable point.
export function findPath(world, sx, sz, tx, tz, snap = 2.5) {
  const goal = nearestWalkable(world, tx, tz, snap)
  if (!goal) return null
  ;[tx, tz] = goal
  if (clearLine(world, sx, sz, tx, tz)) return [[sx, sz], [tx, tz]]

  const M = 14
  const x0 = Math.min(sx, tx) - M
  const z0 = Math.min(sz, tz) - M
  const W = Math.ceil((Math.max(sx, tx) + M - x0) / CELL)
  const D = Math.ceil((Math.max(sz, tz) + M - z0) / CELL)
  const idx = (i, j) => j * W + i
  const free = new Int8Array(W * D).fill(-1)
  const ok = (i, j) => {
    const k = idx(i, j)
    if (free[k] < 0) free[k] = walkable(world, x0 + (i + 0.5) * CELL, z0 + (j + 0.5) * CELL) ? 1 : 0
    return free[k] === 1
  }
  const si = Math.floor((sx - x0) / CELL)
  const sj = Math.floor((sz - z0) / CELL)
  const ti = Math.floor((tx - x0) / CELL)
  const tj = Math.floor((tz - z0) / CELL)
  const g = new Float32Array(W * D).fill(Infinity)
  const from = new Int32Array(W * D).fill(-1)
  const closed = new Uint8Array(W * D)
  // Binary heap of [f, k].
  const heap = []
  const push = (f, k) => {
    heap.push([f, k])
    let i = heap.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heap[p][0] <= heap[i][0]) break
      ;[heap[p], heap[i]] = [heap[i], heap[p]]
      i = p
    }
  }
  const pop = () => {
    const top = heap[0]
    const last = heap.pop()
    if (heap.length) {
      heap[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r
        if (m === i) break
        ;[heap[m], heap[i]] = [heap[i], heap[m]]
        i = m
      }
    }
    return top
  }
  const hcost = (i, j) => Math.hypot(i - ti, j - tj)
  const sk = idx(si, sj)
  g[sk] = 0
  push(hcost(si, sj), sk)
  const tk = idx(ti, tj)
  let found = false
  let steps = 0
  while (heap.length && steps++ < 60000) {
    const [, k] = pop()
    if (closed[k]) continue
    closed[k] = 1
    if (k === tk) {
      found = true
      break
    }
    const i = k % W
    const j = (k - i) / W
    for (const [di, dj, c] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]]) {
      const ni = i + di
      const nj = j + dj
      if (ni < 0 || nj < 0 || ni >= W || nj >= D) continue
      const nk = idx(ni, nj)
      if (closed[nk] || (!ok(ni, nj) && nk !== tk)) continue
      if (di && dj && (!ok(i + di, j) || !ok(i, j + dj))) continue
      const ng = g[k] + c
      if (ng < g[nk]) {
        g[nk] = ng
        from[nk] = k
        push(ng + hcost(ni, nj), nk)
      }
    }
  }
  if (!found) return null
  const cells = []
  for (let k = tk; k !== -1; k = from[k]) {
    const i = k % W
    cells.push([x0 + (i + 0.5) * CELL, z0 + ((k - i) / W + 0.5) * CELL])
  }
  cells.reverse()
  cells[0] = [sx, sz]
  cells[cells.length - 1] = [tx, tz]
  // String-pull: keep only the waypoints needed to stay in line of sight.
  const out = [cells[0]]
  let a = 0
  while (a < cells.length - 1) {
    let b = cells.length - 1
    while (b > a + 1 && !clearLine(world, cells[a][0], cells[a][1], cells[b][0], cells[b][1])) b--
    out.push(cells[b])
    a = b
  }
  return out
}
