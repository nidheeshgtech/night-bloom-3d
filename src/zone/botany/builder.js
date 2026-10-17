import * as THREE from 'three'
import { WHITE_UV } from './atlas'

// Accumulates vertices for merged plant geometry: position, uv (atlas), colour, aTint
// (1 = takes the per-instance flower colour, 0 = keeps its own colour, e.g. leaves).
export class Builder {
  pos = []
  uv = []
  col = []
  tint = []
  idx = []

  get count() {
    return this.pos.length / 3
  }

  vertex(p, uv = WHITE_UV, c = [1, 1, 1], tint = 0) {
    this.pos.push(p.x, p.y, p.z)
    this.uv.push(uv[0], uv[1])
    this.col.push(c[0], c[1], c[2])
    this.tint.push(tint)
    return this.count - 1
  }

  // Quad grid; fn(i, j) -> { p, uv, c, tint } for i in 0..rows, j in 0..cols.
  grid(rows, cols, fn, matrix) {
    const base = this.count
    for (let i = 0; i <= rows; i++) {
      for (let j = 0; j <= cols; j++) {
        const v = fn(i, j)
        if (matrix) v.p.applyMatrix4(matrix)
        this.vertex(v.p, v.uv, v.c, v.tint)
      }
    }
    const w = cols + 1
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const a = base + i * w + j
        this.idx.push(a, a + w, a + 1, a + 1, a + w, a + w + 1)
      }
    }
  }

  // Tube along points with a radius per point (stems, wires).
  tube(points, radii, sides, c, matrix) {
    const up = new THREE.Vector3(0, 1, 0)
    const frames = points.map((p, i) => {
      const next = points[Math.min(i + 1, points.length - 1)]
      const prev = points[Math.max(i - 1, 0)]
      const t = next.clone().sub(prev).normalize()
      const ref = Math.abs(t.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : up
      const n = new THREE.Vector3().crossVectors(t, ref).normalize()
      const b = new THREE.Vector3().crossVectors(t, n)
      return { n, b }
    })
    this.grid(points.length - 1, sides, (i, j) => {
      const a = (j / sides) * Math.PI * 2
      const { n, b } = frames[i]
      const p = points[i].clone().addScaledVector(n, Math.cos(a) * radii[i]).addScaledVector(b, Math.sin(a) * radii[i])
      return { p, c }
    }, matrix)
  }

  toGeometry() {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2))
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3))
    g.setAttribute('aTint', new THREE.Float32BufferAttribute(this.tint, 1))
    g.setIndex(this.idx)
    g.computeVertexNormals()
    g.computeBoundingSphere()
    return g
  }
}

const UP = new THREE.Vector3(0, 1, 0)

// Basis with local +Y along dir, rolled by `roll`, at position p, uniform scale s.
export function facing(p, dir, roll = 0, s = 1) {
  const y = dir.clone().normalize()
  const ref = Math.abs(y.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : UP
  const x = new THREE.Vector3().crossVectors(ref, y).normalize().applyAxisAngle(y, roll)
  const z = new THREE.Vector3().crossVectors(x, y)
  return new THREE.Matrix4().makeBasis(x.multiplyScalar(s), y.multiplyScalar(s), z.multiplyScalar(s)).setPosition(p)
}

// Basis with local +X along dir (leaves grow along +X) and local +Y as close to up as possible.
export function along(p, dir, roll = 0, s = 1) {
  const x = dir.clone().normalize()
  const ref = Math.abs(x.y) > 0.95 ? new THREE.Vector3(0, 0, 1) : UP
  const z = new THREE.Vector3().crossVectors(x, ref).normalize()
  const y = new THREE.Vector3().crossVectors(z, x)
  const m = new THREE.Matrix4().makeBasis(x.multiplyScalar(s), y.multiplyScalar(s), z.multiplyScalar(s))
  if (roll) m.multiply(new THREE.Matrix4().makeRotationX(roll))
  return m.setPosition(p)
}
