import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGarden } from '../lib/store'
import { zoneUniforms } from '../zone/materials'
import { ZONES } from './plan'

const WIDTH = 0.9
const LIFT = 1.16 // just above the 1.1 m petal hedges

// Glowing ribbons of light along every petal edge in the zone's colour: from the air at night
// (or in site-map view) the whole world reads as a lit flower-shaped map.
export const outlineUniforms = { uLevel: { value: 0 }, uTime: zoneUniforms.uTime }

function ribbons() {
  const pos = []
  const col = []
  const along = []
  const idx = []
  const c = new THREE.Color()
  for (const z of ZONES) {
    c.set(z.color)
    for (const { path } of z.sides) {
      const base = pos.length / 3
      const n = Math.ceil(path.length / 1.5)
      for (let i = 0; i <= n; i++) {
        const s = (path.length * i) / n
        for (const side of [-1, 1]) {
          const p = path.toWorld(s, (side * WIDTH) / 2)
          pos.push(p.x, p.y + LIFT, p.z)
          col.push(c.r, c.g, c.b)
          along.push(s)
        }
        if (i > 0) {
          const k = base + (i - 1) * 2
          idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3)
        }
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1))
  g.setIndex(idx)
  return g
}

export default function ZoneOutlines() {
  const geometry = useMemo(ribbons, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexColors: true,
        uniforms: outlineUniforms,
        vertexShader: /* glsl */ `
          attribute float aAlong;
          varying vec3 vCol;
          varying float vAlong;
          void main() {
            vCol = color;
            vAlong = aAlong;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uLevel;
          uniform float uTime;
          varying vec3 vCol;
          varying float vAlong;
          void main() {
            // Steady glow plus bright pulses travelling outward along each edge.
            float pulse = pow(0.5 + 0.5 * sin(vAlong * 0.12 - uTime * 2.2), 8.0);
            vec3 c = vCol * (1.1 + 1.8 * pulse);
            gl_FragColor = vec4(c * uLevel, uLevel);
          }`,
      }),
    [],
  )
  const level = useRef(0)
  useFrame((_, dt) => {
    const st = useGarden.getState()
    const target = Math.max(zoneUniforms.uNight.value, st.siteMap ? 1 : 0)
    level.current += (target - level.current) * Math.min(1, dt * 3)
    outlineUniforms.uLevel.value = level.current
  })
  return <mesh geometry={geometry} material={material} renderOrder={4} frustumCulled={false} />
}
