import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MASK_EXTENT } from './layout'
import { getMask } from './mask'
import { zoneUniforms } from './materials'
import { useGarden } from '../lib/store'

const SETTINGS = { high: { cell: 0.075, radius: 13 }, low: { cell: 0.13, radius: 8 } }

// GPU grass: blades laid out on a grid that follows the camera, positioned and masked
// entirely in the vertex shader. One draw call, no per-blade CPU data.
export default function Grass() {
  const quality = useGarden((s) => s.quality)
  const { cell, radius } = SETTINGS[quality]
  const side = Math.ceil((radius * 2) / cell)

  const { mesh, uniforms } = useMemo(() => {
    const g = new THREE.InstancedBufferGeometry()
    // Seven-vertex tapered blade, x in [-0.5, 0.5], y in [0, 1].
    const v = [-0.5, 0, 0.5, 0, -0.38, 0.4, 0.38, 0.4, -0.18, 0.75, 0.18, 0.75, 0, 1]
    const pos = []
    for (let i = 0; i < v.length; i += 2) pos.push(v[i], v[i + 1], 0)
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0), 3))
    g.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6])
    g.instanceCount = side * side

    const uniforms = {
      uCenter: { value: new THREE.Vector2() },
      uCam: { value: new THREE.Vector2() },
      uCell: { value: cell },
      uN: { value: side },
      uRadius: { value: radius },
      uMask: { value: getMask() },
      uTime: zoneUniforms.uTime,
    }
    const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 })
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      const E = MASK_EXTENT.toFixed(1)
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec2 uCenter;
          uniform vec2 uCam;
          uniform float uCell;
          uniform float uN;
          uniform float uRadius;
          uniform float uTime;
          uniform sampler2D uMask;
          varying float vH;
          varying float vTone;
          float hash12(vec2 p) {
            vec3 p3 = fract(vec3(p.xyx) * 0.1031);
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.x + p3.y) * p3.z);
          }
          float terrain(vec2 p) {
            return 0.22 * sin(p.x * 0.08) * cos(p.y * 0.07) + 0.12 * sin((p.x + p.y) * 0.13);
          }`,
        )
        .replace(
          '#include <beginnormal_vertex>',
          `// Blade placement runs here because the normal is transformed before begin_vertex.
          float n = uN;
          float fid = float(gl_InstanceID);
          vec2 cellId = vec2(mod(fid, n), floor(fid / n)) - n * 0.5;
          vec2 gp = (cellId + 0.5) * uCell + uCenter;
          vec2 p = gp + (vec2(hash12(gp), hash12(gp + 17.3)) - 0.5) * uCell;
          vec2 muv = vec2((p.x + ${E}) / (2.0 * ${E}), 1.0 - (p.y + ${E}) / (2.0 * ${E}));
          float masked = texture2D(uMask, muv).r;
          float dist = length(p - uCam);
          float keep = (1.0 - smoothstep(0.25, 0.6, masked)) * (1.0 - smoothstep(uRadius * 0.65, uRadius, dist));
          float ang = hash12(p * 3.1) * 6.2831;
          float ca = cos(ang), sa = sin(ang);
          vec3 objectNormal = normalize(vec3(sa * 0.35, 1.0, ca * 0.35));`,
        )
        .replace(
          '#include <begin_vertex>',
          `float h = (0.07 + 0.09 * hash12(p * 1.7)) * keep;
          float w = 0.018 + 0.01 * hash12(p * 2.3);
          vec3 local = vec3(position.x * w, position.y * h, 0.0);
          local.z += (0.2 + 0.5 * hash12(p * 5.3)) * position.y * position.y * h;
          local = vec3(local.x * ca - local.z * sa, local.y, local.x * sa + local.z * ca);
          float gust = sin(uTime * 1.7 + p.x * 0.55 + p.y * 0.35) * 0.5 + 0.5;
          local.xz += vec2(0.6, 0.45) * gust * position.y * position.y * h * 0.45;
          vec3 transformed = vec3(p.x, terrain(p) + 0.005, p.y) + local;
          vH = position.y;
          vTone = hash12(p * 7.7);`,
        )
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vH;\nvarying float vTone;')
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          vec3 base = vec3(0.045, 0.1, 0.02);
          vec3 tip = mix(vec3(0.22, 0.38, 0.07), vec3(0.32, 0.42, 0.1), vTone);
          diffuseColor.rgb *= mix(base, tip, smoothstep(0.0, 1.0, vH));`,
        )
    }
    const mesh = new THREE.Mesh(g, m)
    mesh.frustumCulled = false
    mesh.receiveShadow = true
    return { mesh, uniforms }
  }, [cell, radius, side])

  useFrame(({ camera }) => {
    const cx = camera.position.x
    const cz = camera.position.z
    uniforms.uCam.value.set(cx, cz)
    uniforms.uCenter.value.set(Math.floor(cx / cell) * cell, Math.floor(cz / cell) * cell)
    // From the air individual blades are sub-pixel; the textured lawn carries it.
    mesh.geometry.instanceCount = camera.position.y > 22 ? 0 : side * side
  })

  return <primitive object={mesh} />
}
