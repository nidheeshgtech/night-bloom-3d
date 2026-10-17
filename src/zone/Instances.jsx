import { useLayoutEffect, useRef } from 'react'
import { plantMaterial, plantDepthMaterial } from './materials'

// Static instanced vegetation (shrubs, trees, palms) sharing the plant material.
export default function Instances({ geometry, matrices, material = plantMaterial(), castShadow = true }) {
  const ref = useRef()
  useLayoutEffect(() => {
    matrices.forEach((m, i) => ref.current.setMatrixAt(i, m))
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
    ref.current.customDepthMaterial = plantDepthMaterial()
  }, [matrices])
  if (!matrices.length) return null
  return <instancedMesh ref={ref} args={[geometry, material, matrices.length]} castShadow={castShadow} receiveShadow />
}
