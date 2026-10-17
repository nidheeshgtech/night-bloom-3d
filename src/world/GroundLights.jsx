import { useMemo } from 'react'
import * as THREE from 'three'
import { getWorld } from '../lib/world'
import { zoneUniforms } from '../zone/materials'

const SPACING = 2.6

// Light dots set into the paving along both edges of every path. Emissive only.
export default function GroundLights() {
  const mesh = useMemo(() => {
    const world = getWorld()
    const spots = []
    for (const { path, half } of world.walkPaths || []) {
      for (let s = SPACING / 2; s < path.length; s += SPACING) {
        for (const side of [-1, 1]) spots.push(path.toWorld(s, side * (half - 0.25)))
      }
    }
    const geo = new THREE.CircleGeometry(0.07, 10)
    geo.rotateX(-Math.PI / 2)
    const mat = new THREE.MeshBasicMaterial({ color: '#ffe2b0', toneMapped: false, transparent: true, depthWrite: false })
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uNight = zoneUniforms.uNight
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uNight;')
        .replace('#include <opaque_fragment>', 'diffuseColor.rgb *= 0.25 + 2.6 * uNight;\ndiffuseColor.a = 0.35 + 0.65 * uNight;\noutgoingLight = diffuseColor.rgb;\n#include <opaque_fragment>')
    }
    const m = new THREE.InstancedMesh(geo, mat, spots.length)
    spots.forEach((p, i) => m.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y + 0.045, p.z)))
    m.renderOrder = 3
    m.computeBoundingSphere()
    return m
  }, [])
  return <primitive object={mesh} />
}
