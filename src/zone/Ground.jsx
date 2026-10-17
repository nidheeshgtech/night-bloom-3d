import { useMemo } from 'react'
import * as THREE from 'three'
import { heightAt } from '../world/terrain'
import { MASK_EXTENT, getMasks } from './mask'
import { pbrSet } from './materials'
import { useGarden } from '../lib/store'
import { PLANT_FAR } from './LodInstances'

const SIZE = 520
const GRASS_TILE = 3 // metres per texture repeat
const SOIL_TILE = 1.4

// World ground: lawn, bed soil (mask G) and, beyond plant draw distance, a painted flower
// carpet so beds keep their colour from the air without drawing every plant.
export default function Ground() {
  const quality = useGarden((s) => s.quality)
  const segments = quality === 'high' ? 300 : 200
  const far = PLANT_FAR[quality]

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, segments, segments)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)))
    g.computeVertexNormals()
    return g
  }, [segments])

  const material = useMemo(() => {
    const grass = pbrSet('grass_ground', SIZE / GRASS_TILE)
    const soil = pbrSet('farm_soil', 1)
    const { mask, bloom } = getMasks()
    const E = MASK_EXTENT.toFixed(1)
    const m = new THREE.MeshStandardMaterial({
      map: grass.map,
      normalMap: grass.normalMap,
      roughnessMap: grass.arm,
      aoMap: grass.arm,
      roughness: 1,
      normalScale: new THREE.Vector2(0.8, 0.8),
    })
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uMask = { value: mask }
      shader.uniforms.uBloom = { value: bloom }
      shader.uniforms.uSoil = { value: soil.map }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vZone;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvZone = uv;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vZone;\nuniform sampler2D uMask;\nuniform sampler2D uBloom;\nuniform sampler2D uSoil;')
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          vec2 wp = (vZone - 0.5) * ${SIZE.toFixed(1)};
          vec2 world = vec2(wp.x, -wp.y);
          vec2 muv = vec2((world.x + ${E}) / (2.0 * ${E}), 1.0 - (world.y + ${E}) / (2.0 * ${E}));
          float soilAmt = texture2D(uMask, muv).g;
          vec3 soilCol = texture2D(uSoil, world / ${SOIL_TILE.toFixed(1)}).rgb * 0.75;
          // Beyond plant draw distance, speckle the beds with their flower colours.
          vec4 bloomCol = texture2D(uBloom, muv);
          float camDist = length(world - cameraPosition.xz);
          float carpet = smoothstep(${(far * 0.7).toFixed(1)}, ${far.toFixed(1)}, camDist) * bloomCol.a;
          float speck = fract(sin(dot(floor(world * 14.0), vec2(12.9898, 78.233))) * 43758.5453);
          vec3 flowers = mix(vec3(0.06, 0.13, 0.04), bloomCol.rgb, smoothstep(0.2, 0.5, speck)) * (0.8 + 0.3 * speck);
          soilCol = mix(soilCol, flowers, carpet);
          // The scanned lawn is brownish; pull it toward an irrigated Gulf-garden green.
          float patchy = 0.5 + 0.5 * sin(world.x * 0.21 + sin(world.y * 0.17) * 2.0) * sin(world.y * 0.19 + 1.3);
          vec3 lawn = diffuseColor.rgb * mix(vec3(0.5, 1.05, 0.3), vec3(0.62, 1.0, 0.36), patchy) * 1.15;
          diffuseColor.rgb = mix(lawn, soilCol, soilAmt);`,
        )
    }
    m.customProgramCacheKey = () => `ground-${far}`
    return m
  }, [far])

  return (
    <>
      <mesh geometry={geometry} material={material} receiveShadow />
      <OuterLawn />
    </>
  )
}

// Cheap, coarse lawn running out to the horizon under the detailed ground, lost in the fog.
function OuterLawn() {
  const material = useMemo(() => {
    const grass = pbrSet('grass_ground', 3000 / 6)
    return new THREE.MeshStandardMaterial({ map: grass.map, roughness: 1, color: new THREE.Color(0.55, 0.95, 0.36) })
  }, [])
  return (
    <mesh material={material} position-y={-0.6} rotation-x={-Math.PI / 2} receiveShadow>
      {/* Hole in the middle so it never covers the lake or the detailed ground. */}
      <ringGeometry args={[SIZE / 2 - 8, 1500, 96, 1]} />
    </mesh>
  )
}
