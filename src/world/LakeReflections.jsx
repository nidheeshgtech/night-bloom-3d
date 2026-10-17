import { useMemo } from 'react'
import * as THREE from 'three'
import { WATER_LEVEL, QUAY_RADIUS } from './terrain'
import { LAMP_ANGLES } from './PromenadeLamps'
import { LILIES } from '../zone/lantern/layout'
import { zoneUniforms } from '../zone/materials'

// Night reflections: shimmering light streaks on the water stretching from each light
// toward the viewer. A cheap stand-in for planar reflections that reads well at night.
export default function LakeReflections() {
  const mesh = useMemo(() => {
    const items = [
      ...LAMP_ANGLES.map((a) => ({ x: Math.cos(a) * (QUAY_RADIUS - 0.4), z: Math.sin(a) * (QUAY_RADIUS - 0.4), color: '#ffc27a', w: 0.45, l: 11, k: 0.8 })),
      ...LILIES.map((l) => ({ x: l.pos.x, z: l.pos.z, color: l.color, w: 0.9 * l.s, l: 5, k: 1 })),
    ]
    const g = new THREE.InstancedBufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, -0.5, 1, 0, 0.5, 1, 0], 3))
    g.setIndex([0, 1, 2, 2, 1, 3])
    g.instanceCount = items.length
    const attr = (n, fn) => g.setAttribute(n, new THREE.InstancedBufferAttribute(new Float32Array(items.flatMap(fn)), fn(items[0]).length))
    attr('aPos', (it) => [it.x, it.z])
    attr('aColor', (it) => new THREE.Color(it.color).toArray())
    attr('aSize', (it) => [it.w, it.l, it.k])
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: zoneUniforms.uTime, uNight: zoneUniforms.uNight, uWater: { value: WATER_LEVEL + 0.02 } },
      vertexShader: /* glsl */ `
        attribute vec2 aPos;
        attribute vec3 aColor;
        attribute vec3 aSize;
        uniform float uWater;
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vK;
        void main() {
          vec2 rel = cameraPosition.xz - aPos;
          vec2 toCam = rel / max(length(rel), 1e-3);
          vec2 side = vec2(-toCam.y, toCam.x);
          vec2 p = aPos + side * position.x * aSize.x + toCam * position.y * aSize.y;
          vUv = vec2(position.x + 0.5, position.y);
          vColor = aColor;
          vK = aSize.z;
          gl_Position = projectionMatrix * viewMatrix * vec4(p.x, uWater, p.y, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uNight;
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vK;
        void main() {
          float across = 1.0 - abs(vUv.x * 2.0 - 1.0);
          // Clamp: interpolation can push vUv.y past 1, and pow() of a negative is NaN,
          // which the bloom pass would spread over the whole frame.
          float along = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.6);
          float shimmer = 0.55 + 0.45 * sin(vUv.y * 70.0 - uTime * 3.0 + vUv.x * 9.0) * sin(vUv.y * 23.0 + uTime * 1.7);
          float a = across * across * along * shimmer * uNight * vK;
          gl_FragColor = vec4(vColor * a * 1.6, a);
        }
      `,
    })
    const m = new THREE.Mesh(g, mat)
    m.frustumCulled = false
    m.renderOrder = 3
    return m
  }, [])
  return <primitive object={mesh} />
}
