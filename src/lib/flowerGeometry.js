import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// aPart tags each vertex: 0 = stem, 1 = petals, 2 = centre.
function tag(geometry, part) {
  const count = geometry.attributes.position.count
  geometry.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(count).fill(part), 1))
  return geometry
}

export function buildFlowerGeometry({ stem = true } = {}) {
  const lift = stem ? 0.58 : 0.05
  const parts = []
  if (stem) {
    const s = new THREE.CylinderGeometry(0.012, 0.02, 0.55, 4, 4)
    s.translate(0, 0.275, 0)
    parts.push(tag(s, 0))
  }
  const bloom = new THREE.CylinderGeometry(0.17, 0.03, 0.1, 9, 1, true)
  bloom.translate(0, lift, 0)
  parts.push(tag(bloom, 1))
  const core = new THREE.CircleGeometry(0.05, 8)
  core.rotateX(-Math.PI / 2)
  core.translate(0, lift + 0.04, 0)
  parts.push(tag(core, 2))
  return mergeGeometries(parts)
}
