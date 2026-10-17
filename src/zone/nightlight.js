import * as THREE from 'three'

// Night light map: coloured light pools painted top-down over the whole world (see
// nightmap.js) and added to opted-in materials after dark. One texture lookup gives dozens
// of coloured "lights" without the per-pixel cost of real dynamic lights.
export const NIGHT_EXTENT = 190
const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
black.needsUpdate = true

export const nightUniforms = {
  uNightMap: { value: black },
  uNightLevel: { value: 0 },
  uNightStrength: { value: 1.5 },
}

const E = NIGHT_EXTENT.toFixed(1)

// Patch a standard material so it receives the light map. Chains any existing patch.
export function withNightLight(material) {
  if (material.userData.nightLight) return material
  material.userData.nightLight = true
  const prev = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer)
    Object.assign(shader.uniforms, nightUniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vNightWorld;')
      .replace(
        '#include <project_vertex>',
        `vec4 nlPos = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          nlPos = instanceMatrix * nlPos;
        #endif
        vNightWorld = (modelMatrix * nlPos).xyz;
        #include <project_vertex>`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vNightWorld;
        uniform sampler2D uNightMap;
        uniform float uNightLevel;
        uniform float uNightStrength;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        if (uNightLevel > 0.001) {
          vec2 nlUv = vec2((vNightWorld.x + ${E}) / (2.0 * ${E}), 1.0 - (vNightWorld.z + ${E}) / (2.0 * ${E}));
          vec3 nl = texture2D(uNightMap, nlUv).rgb;
          // Pools light the ground, planting and trees; fade out high above the ground.
          float nlFade = 1.0 - smoothstep(6.0, 13.0, vNightWorld.y);
          totalEmissiveRadiance += diffuseColor.rgb * nl * uNightLevel * uNightStrength * nlFade;
        }`,
      )
  }
  // The default cache key is the onBeforeCompile source, which is now this shared wrapper;
  // keep materials with different original patches on different programs.
  const own = Object.prototype.hasOwnProperty.call(material, 'customProgramCacheKey') ? material.customProgramCacheKey.bind(material) : null
  material.customProgramCacheKey = () => (own ? own() : prev ? prev.toString() : '') + '|night'
  return material
}
