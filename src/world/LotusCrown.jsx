import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { WATER_LEVEL } from './terrain'
import { pbrSet, zoneUniforms } from '../zone/materials'
import { withNightLight } from '../zone/nightlight'

// The Lotus Crown: an original centrepiece on an island in the lake. Two rings of tall,
// outward-leaning petal fins; pearl by day, colour flowing up the petals after dark.
export const LOTUS = { r: 7.5, height: 19 }
const BASE = WATER_LEVEL + 0.55

function petal(ring, k, n, { r0, H, W, lean, cup, phase }) {
  const a = (k / n) * Math.PI * 2 + phase
  const radial = new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
  const tangent = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a))
  const ROWS = 18
  const COLS = 6
  const pos = []
  const aV = []
  const aP = []
  const idx = []
  for (let i = 0; i <= ROWS; i++) {
    const v = i / ROWS
    const w = W * Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + v * 0.98)), 0.8) * (1 - 0.25 * v)
    const out = r0 + lean * v * v
    for (let j = 0; j <= COLS; j++) {
      const u = (j / COLS) * 2 - 1
      const p = radial
        .clone()
        .multiplyScalar(out - cup * (1 - u * u) * Math.sin(Math.PI * v))
        .addScaledVector(tangent, u * w)
      p.y = BASE + v * H
      pos.push(p.x, p.y, p.z)
      aV.push(v)
      aP.push(ring * 20 + k)
    }
  }
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      const q = i * (COLS + 1) + j
      idx.push(q, q + COLS + 1, q + 1, q + 1, q + COLS + 1, q + COLS + 2)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('aV', new THREE.Float32BufferAttribute(aV, 1))
  g.setAttribute('aPetal', new THREE.Float32BufferAttribute(aP, 1))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g.toNonIndexed()
}

function crownGeometry() {
  const parts = []
  for (let k = 0; k < 8; k++) parts.push(petal(0, k, 8, { r0: 2.6, H: LOTUS.height, W: 2.1, lean: 3.2, cup: 0.9, phase: 0 }))
  for (let k = 0; k < 10; k++) parts.push(petal(1, k, 10, { r0: 4.4, H: LOTUS.height * 0.62, W: 2.2, lean: 4.2, cup: 0.8, phase: Math.PI / 10 }))
  return mergeGeometries(parts)
}

function crownMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.3, metalness: 0.15, side: THREE.DoubleSide, envMapIntensity: 1.2 })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = zoneUniforms.uNight
    shader.uniforms.uTime = zoneUniforms.uTime
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aV;\nattribute float aPetal;\nvarying float vV;\nvarying float vPetal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvV = aV;\nvPetal = aPetal;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uNight;
        uniform float uTime;
        varying float vV;
        varying float vPetal;
        vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // Colour flows up the petals and around the crown; brighter toward the tips.
        float h = fract(uTime * 0.03 + vV * 0.35 + mod(vPetal, 20.0) * 0.045 + step(19.5, vPetal) * 0.5);
        vec3 c = mix(hue(h), vec3(1.0), 0.15);
        float band = 0.6 + 0.4 * sin(vV * 14.0 - uTime * 2.0);
        totalEmissiveRadiance += c * (0.35 + vV * 1.4) * band * uNight * 1.6;
        // Daytime: faint pearly sheen.
        totalEmissiveRadiance += hue(fract(vV * 0.5 + 0.55)) * 0.04 * (1.0 - uNight);`,
      )
  }
  return m
}

export default function LotusCrown() {
  const crown = useMemo(crownGeometry, [])
  const mat = useMemo(crownMaterial, [])
  const stone = useMemo(() => {
    const t = pbrSet('white_sandstone_bricks', 1)
    return withNightLight(new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.arm, roughness: 1, color: '#efe2cc' }))
  }, [])
  const glow = useMemo(() => {
    const g = new THREE.RingGeometry(LOTUS.r + 0.2, LOTUS.r + 3.5, 64, 1)
    g.rotateX(-Math.PI / 2)
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uNight: zoneUniforms.uNight, uTime: zoneUniforms.uTime },
      vertexShader: 'varying vec2 vP; void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uNight; uniform float uTime; varying vec2 vP;
        void main() { float r = length(vP); float a = (1.0 - smoothstep(${(LOTUS.r + 0.2).toFixed(1)}, ${(LOTUS.r + 3.5).toFixed(1)}, r)) * uNight * (0.7 + 0.3 * sin(uTime * 1.5 - r));
        gl_FragColor = vec4(vec3(0.45, 0.6, 1.0) * a, a); }`,
    })
    const mesh = new THREE.Mesh(g, m)
    mesh.position.y = WATER_LEVEL + 0.03
    mesh.renderOrder = 3
    return mesh
  }, [])
  return (
    <group>
      <mesh material={stone} position-y={WATER_LEVEL + 0.12} receiveShadow castShadow>
        <cylinderGeometry args={[LOTUS.r, LOTUS.r + 0.5, 0.9, 48]} />
      </mesh>
      <mesh geometry={crown} material={mat} castShadow receiveShadow />
      <primitive object={glow} />
    </group>
  )
}
