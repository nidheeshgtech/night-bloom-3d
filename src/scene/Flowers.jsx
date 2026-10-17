import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { buildFlowerGeometry } from '../lib/flowerGeometry'
import { createFlowerMaterial } from '../lib/flowerMaterial'
import { FLOWERS, FLOWER_COUNT } from '../lib/flowers'
import { useGarden } from '../lib/store'

export default function Flowers() {
  const ref = useRef()
  const quality = useGarden((s) => s.quality)

  const geometry = useMemo(() => {
    const g = buildFlowerGeometry()
    g.setAttribute('aTint', new THREE.InstancedBufferAttribute(FLOWERS.tints, 3))
    return g
  }, [])
  const material = useMemo(() => createFlowerMaterial({ ground: true }), [])

  useLayoutEffect(() => {
    ref.current.instanceMatrix.array.set(FLOWERS.matrices)
    ref.current.instanceMatrix.needsUpdate = true
  }, [])

  useLayoutEffect(() => {
    ref.current.count = FLOWER_COUNT[quality]
  }, [quality])

  return <instancedMesh ref={ref} args={[geometry, material, FLOWERS.count]} frustumCulled={false} />
}
