import * as THREE from 'three'

// Uniforms shared by every flower material, the sky and the fireflies.
export const shared = {
  uTime: { value: 0 },
  uNight: { value: 0 },
  uPlayer: { value: new THREE.Vector3(0, -999, 0) },
}

// MeshStandardMaterial patched for per-instance tint, wind, player parting and night glow.
export function createFlowerMaterial({ ground = false } = {}) {
  const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.65 })
  if (ground) m.defines = { GROUND: '' }
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec3 aTint;
        attribute float aPart;
        uniform float uTime;
        uniform vec3 uPlayer;
        varying vec3 vTint;
        varying float vPart;
        varying float vPhase;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vTint = aTint;
        vPart = aPart;
        vec3 ip = instanceMatrix[3].xyz;
        float phase = ip.x * 0.35 + ip.z * 0.27;
        vPhase = phase;
        vec3 offset = vec3(0.0);
        #ifdef GROUND
          float h = clamp(position.y / 0.65, 0.0, 1.0);
          float gust = sin(uTime * 1.3 + phase) + 0.5 * sin(uTime * 2.7 + phase * 1.7);
          offset.x += gust * 0.07 * h * h;
          offset.z += cos(uTime * 1.1 + phase) * 0.05 * h * h;
          vec2 away = ip.xz - uPlayer.xz;
          float push = (1.0 - smoothstep(0.3, 1.4, length(away))) * h;
          offset.xz += normalize(away + 1e-4) * push * 0.45;
          offset.y -= push * 0.15;
        #else
          float s = sin(uTime * 1.6 + phase * 3.0) * 0.02;
          offset += vec3(s, 0.0, -s);
        #endif
        transformed += inverse(mat3(instanceMatrix)) * offset;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform float uNight;
        varying vec3 vTint;
        varying float vPart;
        varying float vPhase;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 stemCol = vec3(0.16, 0.42, 0.16);
        vec3 coreCol = vec3(0.95, 0.8, 0.2);
        vec3 base = vPart < 0.5 ? stemCol : (vPart < 1.5 ? vTint : coreCol);
        diffuseColor.rgb *= base;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float glow = vPart > 0.5 ? (0.55 + 0.45 * sin(uTime * 1.7 + vPhase * 2.0)) : 0.0;
        // Faint self-light keeps petal backs from going grey; glows fully at night.
        totalEmissiveRadiance += base * step(0.5, vPart) * (0.12 + glow * uNight * 1.6);`,
      )
  }
  return m
}
