import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { buildFlowerGeometry } from '../lib/flowerGeometry'
import { createFlowerMaterial } from '../lib/flowerMaterial'

const material = createFlowerMaterial()
const UP = new THREE.Vector3(0, 1, 0)

// Stemless blooms facing outward from a surface. items: [{ p, n, s, color }]
export default function FlowerShell({ items }) {
  const ref = useRef()

  const geometry = useMemo(() => {
    const g = buildFlowerGeometry({ stem: false })
    const tint = new Float32Array(items.length * 3)
    items.forEach((it, i) => tint.set([it.color.r, it.color.g, it.color.b], i * 3))
    g.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3))
    return g
  }, [items])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3()
    items.forEach((it, i) => {
      q.setFromUnitVectors(UP, it.n)
      s.setScalar(it.s)
      m.compose(it.p, q, s)
      ref.current.setMatrixAt(i, m)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [items])

  return <instancedMesh ref={ref} args={[geometry, material, items.length]} />
}
