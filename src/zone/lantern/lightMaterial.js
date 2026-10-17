import * as THREE from 'three'
import { zoneUniforms } from '../materials'

// Light-art material: vertex colours for the base (opal by day), per-instance colour as the
// glow colour on parts marked aTint = 1. At night the glow breathes; options add proximity
// brightening, a click wave travelling through the grove, reed sway and floating bob.
export function lightArtMaterial({ proximity = false, burst = false, sway = false, bob = false, rim = true, strength = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0 })
  m.defines = {}
  if (proximity) m.defines.PROXIMITY = ''
  if (burst) m.defines.BURST = ''
  if (sway) m.defines.SWAY = ''
  if (bob) m.defines.BOB = ''
  if (rim) m.defines.RIM = ''
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, zoneUniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aTint;
        uniform float uTime;
        varying vec3 vGlow;
        varying vec3 vInst;
        varying float vPhase;`,
      )
      .replace(
        '#include <color_vertex>',
        `vColor *= 0.0;
        vColor += 1.0;
        vColor.rgb *= color.rgb;
        vGlow = vec3(0.0);
        #ifdef USE_INSTANCING_COLOR
          vColor.rgb *= mix(vec3(1.0), instanceColor.rgb, aTint * 0.3);
          vGlow = instanceColor.rgb * aTint;
        #endif`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vInst = instanceMatrix[3].xyz;
        vPhase = fract(sin(dot(vInst.xz, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;
        #ifdef SWAY
          float k = position.y * position.y;
          transformed.x += sin(uTime * 1.4 + vPhase) * 0.06 * k;
          transformed.z += cos(uTime * 1.1 + vPhase) * 0.05 * k;
        #endif
        #ifdef BOB
          transformed.y += sin(uTime * 0.8 + vPhase) * 0.035;
        #endif`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform float uNight;
        uniform vec3 uPlayer;
        uniform vec3 uBurstPos;
        uniform float uBurstTime;
        varying vec3 vGlow;
        varying vec3 vInst;
        varying float vPhase;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float glow = 0.12 + uNight * (1.1 + 0.35 * sin(uTime * 0.9 + vPhase));
        #ifdef PROXIMITY
          float near = 1.0 - smoothstep(1.5, 7.0, distance(vInst.xz, uPlayer.xz));
          glow *= 1.0 + 1.8 * near * uNight;
          #ifdef SWAY
            // Ripples of light rolling outward from the visitor through the reeds.
            float dist = distance(vInst.xz, uPlayer.xz);
            glow += uNight * 1.6 * max(0.0, sin(dist * 1.1 - uTime * 3.0)) * (1.0 - smoothstep(4.0, 16.0, dist));
          #endif
        #endif
        #ifdef BURST
          float age = uTime - uBurstTime;
          float ring = distance(vInst.xz, uBurstPos.xz) - age * 7.0;
          glow += exp(-ring * ring / 3.0) * clamp(1.0 - age / 5.0, 0.0, 1.0) * (1.5 + 3.0 * uNight);
        #endif
        #ifdef RIM
          float rimK = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
          glow *= 0.55 + 0.9 * rimK;
        #endif
        totalEmissiveRadiance += vGlow * glow * ${strength.toFixed(2)};`,
      )
  }
  m.customProgramCacheKey = () => JSON.stringify(m.defines) + strength
  return m
}
