import { useMemo } from 'react'
import * as THREE from 'three'
import { mulberry32 } from '../lib/random'
import { heightAt, ISLAND_RADIUS } from '../lib/terrain'
import { shared } from '../lib/flowerMaterial'

const COUNT = 350

export default function Fireflies() {
  const geometry = useMemo(() => {
    const rand = mulberry32(3)
    const pos = new Float32Array(COUNT * 3)
    const seed = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand()) * (ISLAND_RADIUS - 6)
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      pos.set([x, heightAt(x, z) + 0.6 + rand() * 2.5, z], i * 3)
      seed[i] = rand() * 100
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: shared.uTime, uNight: shared.uNight },
        vertexShader: /* glsl */ `
          attribute float aSeed;
          uniform float uTime;
          varying float vBlink;
          void main() {
            vec3 p = position;
            p.x += sin(uTime * 0.4 + aSeed) * 1.2;
            p.y += sin(uTime * 0.7 + aSeed * 1.3) * 0.5;
            p.z += cos(uTime * 0.35 + aSeed * 0.7) * 1.2;
            vBlink = 0.5 + 0.5 * sin(uTime * 2.5 + aSeed * 4.0);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = 90.0 / -mv.z;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uNight;
          varying float vBlink;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d) * uNight * vBlink;
            gl_FragColor = vec4(vec3(1.0, 0.92, 0.45) * 2.5 * a, a);
          }
        `,
      }),
    [],
  )

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
