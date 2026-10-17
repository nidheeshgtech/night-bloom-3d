import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useGarden } from '../../lib/store'
import { registerPicker } from '../../lib/picking'
import { WATER_LEVEL } from '../../world/terrain'
import { LANTERNS, LILIES } from './layout'
import { lanternGeometry, lilyGeometry } from './geometry'
import { lightArtMaterial } from './lightMaterial'
import { zoneUniforms } from '../materials'

const V = (x, y, z) => new THREE.Vector3(x, y, z)

function instanced(geometry, material, items, matrixOf, colorOf) {
  const m = new THREE.InstancedMesh(geometry, material, items.length)
  items.forEach((it, i) => {
    m.setMatrixAt(i, matrixOf(it))
    m.setColorAt(i, new THREE.Color(colorOf(it)))
  })
  m.computeBoundingSphere()
  return m
}

// Always mounted: Seed Lantern grove and Moon Lilies glow from the air at night.
export default function LanternLandmark() {
  const lanterns = useMemo(() => {
    const m = instanced(lanternGeometry(), lightArtMaterial({ proximity: true, burst: true, strength: 1.6 }), LANTERNS, (L) => new THREE.Matrix4().compose(L.pos, new THREE.Quaternion(), V(L.h, L.h, L.h)), (L) => L.color)
    m.castShadow = true
    m.receiveShadow = true
    return m
  }, [])
  const lilies = useMemo(
    () =>
      instanced(
        lilyGeometry(),
        lightArtMaterial({ bob: true, strength: 1.4 }),
        LILIES,
        (l) => new THREE.Matrix4().compose(V(l.pos.x, WATER_LEVEL, l.pos.z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), l.phase), V(l.s, l.s, l.s)),
        (l) => l.color,
      ),
    [],
  )

  // Click a lantern: a wave of light rolls out through the grove from it.
  useEffect(() => {
    const sphere = new THREE.Sphere()
    const hitPt = V(0, 0, 0)
    const offLanterns = registerPicker((ray, bestD) => {
      let hit = null
      LANTERNS.forEach((L) => {
        sphere.center.copy(L.pos).add(V(0, L.h * 0.72, 0))
        sphere.radius = L.h * 0.3
        if (!ray.intersectSphere(sphere, hitPt)) return
        const d = hitPt.distanceTo(ray.origin)
        if (d < bestD && (!hit || d < hit.d)) hit = { d, L }
      })
      if (!hit) return null
      return {
        d: hit.d,
        onSelect: () => {
          zoneUniforms.uBurstPos.value.copy(hit.L.pos)
          zoneUniforms.uBurstTime.value = zoneUniforms.uTime.value
          useGarden.setState({ selected: { kind: 'sculpture', id: 'seedlanterns' } })
        },
      }
    })
    const offLilies = registerPicker((ray, bestD) => {
      let hit = null
      LILIES.forEach((l) => {
        sphere.center.set(l.pos.x, WATER_LEVEL + 0.15, l.pos.z)
        sphere.radius = 0.5 * l.s
        if (!ray.intersectSphere(sphere, hitPt)) return
        const d = hitPt.distanceTo(ray.origin)
        if (d < bestD && (!hit || d < hit.d)) hit = { d }
      })
      return hit && { d: hit.d, onSelect: () => useGarden.setState({ selected: { kind: 'sculpture', id: 'moonlilies' } }) }
    })
    return () => {
      offLanterns()
      offLilies()
    }
  }, [])

  return (
    <>
      <primitive object={lanterns} />
      <primitive object={lilies} />
    </>
  )
}
