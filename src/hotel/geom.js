import * as THREE from 'three'

// Small geometry helpers shared by the hotel builders.
export const V = (x, y, z) => new THREE.Vector3(x, y, z)
export const UP = V(0, 1, 0)

// Keep position/normal/uv only (so parts merge), optional vertex colour.
export function clean(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k)
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
  if (color) {
    const c = new THREE.Color(color)
    const col = new Float32Array(g.attributes.position.count * 3)
    for (let i = 0; i < col.length; i += 3) col.set([c.r, c.g, c.b], i)
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  }
  return g
}

export const boxAt = (w, h, d, x, y, z, color) => clean(new THREE.BoxGeometry(w, h, d).translate(x, y, z), color)
export const cylAt = (r0, r1, h, x, y, z, seg, color) => clean(new THREE.CylinderGeometry(r0, r1, h, seg).translate(x, y, z), color)

// Vertical prism walls over a polygon (closed), uv = (metres along wall, metres up).
export function prism(points, y0, y1, { roof = true, color } = {}) {
  const pos = []
  const uv = []
  let u = 0
  for (let i = 0; i < points.length; i++) {
    const [ax, az] = points[i]
    const [bx, bz] = points[(i + 1) % points.length]
    const len = Math.hypot(bx - ax, bz - az)
    pos.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az)
    uv.push(u, y0, u + len, y0, u + len, y1, u, y0, u + len, y1, u, y1)
    u += len
  }
  if (roof) {
    const cx = points.reduce((s, p) => s + p[0], 0) / points.length
    const cz = points.reduce((s, p) => s + p[1], 0) / points.length
    for (let i = 0; i < points.length; i++) {
      const [ax, az] = points[i]
      const [bx, bz] = points[(i + 1) % points.length]
      pos.push(cx, y1, cz, bx, y1, bz, ax, y1, az)
      uv.push(0, -1, 0, -1, 0, -1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  // Make sure faces point outward (polygon winding may be either way).
  const n = g.attributes.normal
  const p = g.attributes.position
  const cx = points.reduce((s, q) => s + q[0], 0) / points.length
  const cz = points.reduce((s, q) => s + q[1], 0) / points.length
  if (n.getX(0) * (p.getX(0) - cx) + n.getZ(0) * (p.getZ(0) - cz) < 0) {
    for (let i = 0; i < p.count; i += 3) {
      for (const attr of [p, g.attributes.uv]) {
        const sz = attr.itemSize
        for (let c = 0; c < sz; c++) {
          const t = attr.array[(i + 1) * sz + c]
          attr.array[(i + 1) * sz + c] = attr.array[(i + 2) * sz + c]
          attr.array[(i + 2) * sz + c] = t
        }
      }
    }
    g.computeVertexNormals()
  }
  return clean(g, color)
}

// Panel with a pointed (Arabian) arch opening, centred at x = 0, base at y = 0, in the XY plane.
export function archPanel(w, h, { open = 0.62, spring = 0.55, depth = 0.5 } = {}) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2, 0)
  s.lineTo(w / 2, 0)
  s.lineTo(w / 2, h)
  s.lineTo(-w / 2, h)
  s.closePath()
  const ow = (w * open) / 2
  const sy = h * spring
  const hole = new THREE.Path()
  hole.moveTo(-ow, 0.001)
  hole.lineTo(-ow, sy)
  hole.quadraticCurveTo(-ow, sy + ow * 1.1, 0, sy + ow * 1.6)
  hole.quadraticCurveTo(ow, sy + ow * 1.1, ow, sy)
  hole.lineTo(ow, 0.001)
  hole.closePath()
  s.holes.push(hole)
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -depth / 2)
}

// Text texture for signs and screens.
export function textTexture(lines, { w = 1024, h = 256, bg = '#120a18', accent = '#e0b25a' } = {}) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach(([text, size, color, weight = 800], i) => {
    ctx.fillStyle = color || '#fff'
    ctx.font = `${weight} ${size * h}px system-ui, -apple-system, sans-serif`
    ctx.fillText(text, w / 2, h * ((i + 1) / (lines.length + 1)))
  })
  if (accent) {
    ctx.fillStyle = accent
    ctx.fillRect(w * 0.42, h * 0.92, w * 0.16, h * 0.02)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}
