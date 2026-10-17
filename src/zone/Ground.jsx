import { useMemo } from 'react'
import * as THREE from 'three'
import { heightAt, MASK_EXTENT } from './layout'
import { getMask } from './mask'
import { pbrSet } from './materials'

const SIZE = 160
const SEGMENTS = 220
const GRASS_TILE = 3 // metres per texture repeat
const SOIL_TILE = 1.4

// Lawn with soil showing through in the planting beds, blended by the zone mask.
export default function Ground() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)))
    g.computeVertexNormals()
    return g
  }, [])

  const material = useMemo(() => {
    const grass = pbrSet('grass_ground', SIZE / GRASS_TILE)
    const soil = pbrSet('farm_soil', 1)
    const m = new THREE.MeshStandardMaterial({
      map: grass.map,
      normalMap: grass.normalMap,
      roughnessMap: grass.arm,
      aoMap: grass.arm,
      roughness: 1,
      normalScale: new THREE.Vector2(0.8, 0.8),
    })
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uMask = { value: getMask() }
      shader.uniforms.uSoil = { value: soil.map }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vZone;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvZone = uv;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vZone;\nuniform sampler2D uMask;\nuniform sampler2D uSoil;')
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          vec2 wp = (vZone - 0.5) * ${SIZE.toFixed(1)};
          vec2 world = vec2(wp.x, -wp.y);
          vec2 muv = vec2((world.x + ${MASK_EXTENT.toFixed(1)}) / ${(2 * MASK_EXTENT).toFixed(1)}, 1.0 - (world.y + ${MASK_EXTENT.toFixed(1)}) / ${(2 * MASK_EXTENT).toFixed(1)});
          float soilAmt = texture2D(uMask, muv).g;
          vec3 soilCol = texture2D(uSoil, world / ${SOIL_TILE.toFixed(1)}).rgb * 0.75;
          // The scanned lawn is brownish; pull it toward an irrigated Gulf-garden green.
          float patchy = 0.5 + 0.5 * sin(world.x * 0.21 + sin(world.y * 0.17) * 2.0) * sin(world.y * 0.19 + 1.3);
          vec3 lawn = diffuseColor.rgb * mix(vec3(0.5, 1.05, 0.3), vec3(0.62, 1.0, 0.36), patchy) * 1.15;
          diffuseColor.rgb = mix(lawn, soilCol, soilAmt);`,
        )
    }
    return m
  }, [])

  return <mesh geometry={geometry} material={material} receiveShadow />
}
