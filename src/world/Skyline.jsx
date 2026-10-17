import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mulberry32 } from '../lib/random'
import { duneHeight } from '../zone/Ground'
import { zoneUniforms } from '../zone/materials'

// An original, generic Gulf skyline on the horizon: glass towers with setbacks, crowns and
// spires. Deliberately not modelled on any real building.
const CLUSTERS = [
  { angle: -1.32, dist: 720, spread: 0.36, count: 28, maxH: 230 },
  { angle: 0.42, dist: 760, spread: 0.2, count: 12, maxH: 140 },
]

// One tower: stacked tapered prisms. uv = (metres around the facade, metres up).
function towerGeometry(rand, height) {
  const sides = [4, 4, 6, 8, 3, 12][Math.floor(rand() * 6)]
  const r0 = 9 + rand() * 9
  const tiers = 1 + Math.floor(rand() * 3)
  const twist = rand() < 0.25 ? (rand() - 0.5) * 1.2 : 0
  const pos = []
  const uv = []
  let y = 0
  let r = r0
  for (let t = 0; t < tiers; t++) {
    const h = height * (t === tiers - 1 ? 1 - y / height : 0.35 + rand() * 0.25)
    const r1 = r * (0.78 + rand() * 0.15)
    const rows = 6
    for (let i = 0; i < rows; i++) {
      const ya = y + (h * i) / rows
      const yb = y + (h * (i + 1)) / rows
      const ra = r + ((r1 - r) * i) / rows
      const rb = r + ((r1 - r) * (i + 1)) / rows
      const ta = (twist * ya) / height
      const tb = (twist * yb) / height
      for (let s = 0; s < sides; s++) {
        const a0 = (s / sides) * Math.PI * 2 + Math.PI / sides
        const a1 = ((s + 1) / sides) * Math.PI * 2 + Math.PI / sides
        const p = (a, rr, yy, tw) => [Math.cos(a + tw) * rr, yy, Math.sin(a + tw) * rr]
        const A = p(a0, ra, ya, ta)
        const B = p(a1, ra, ya, ta)
        const C = p(a1, rb, yb, tb)
        const D = p(a0, rb, yb, tb)
        const w = 2 * ra * Math.sin(Math.PI / sides)
        const u0 = s * w
        pos.push(...A, ...B, ...C, ...A, ...C, ...D)
        uv.push(u0, ya, u0 + w, ya, u0 + w, yb, u0, ya, u0 + w, yb, u0, yb)
      }
    }
    // Flat roof for the tier (also hidden in fog, but keeps the silhouette solid).
    for (let s = 0; s < sides; s++) {
      const a0 = (s / sides) * Math.PI * 2 + Math.PI / sides
      const a1 = ((s + 1) / sides) * Math.PI * 2 + Math.PI / sides
      const tw = (twist * (y + h)) / height
      pos.push(0, y + h, 0, Math.cos(a1 + tw) * r1, y + h, Math.sin(a1 + tw) * r1, Math.cos(a0 + tw) * r1, y + h, Math.sin(a0 + tw) * r1)
      uv.push(0, -1, 0, -1, 0, -1)
    }
    y += h
    r = r1 * (t < tiers - 1 ? 0.82 : 1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  // Spire on the tallest towers.
  if (height > 150) {
    const spire = new THREE.ConeGeometry(r * 0.35, height * 0.18, 8).toNonIndexed()
    spire.translate(0, y + height * 0.09, 0)
    spire.deleteAttribute('normal')
    const su = spire.attributes.uv
    for (let i = 0; i < su.count; i++) su.setXY(i, 0, -1)
    return { geometry: mergeGeometries([g, spire]), top: y + height * 0.18 }
  }
  return { geometry: g, top: y }
}

function buildSkyline() {
  const rand = mulberry32(2030)
  const parts = []
  const tops = []
  for (const c of CLUSTERS) {
    for (let i = 0; i < c.count; i++) {
      // Taller towers toward the centre of each cluster.
      const k = (rand() * 2 - 1) * Math.pow(rand(), 0.6)
      const a = c.angle + k * c.spread
      const d = c.dist + (rand() - 0.5) * 120
      const height = c.maxH * (0.3 + 0.7 * Math.pow(1 - Math.abs(k), 1.6)) * (0.7 + rand() * 0.3)
      const x = Math.cos(a) * d
      const z = Math.sin(a) * d
      const { geometry, top } = towerGeometry(rand, height)
      geometry.translate(x, duneHeight(x, z) - 4, z)
      parts.push(geometry)
      if (height > 90) tops.push(x, duneHeight(x, z) - 4 + top + 1, z, rand() * 6.28)
    }
  }
  const g = mergeGeometries(parts)
  g.computeVertexNormals()
  return { geometry: g, tops }
}

function towerMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: '#3e5868', metalness: 0.95, roughness: 0.1, envMapIntensity: 1.5 })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = zoneUniforms.uNight
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFacade;\nvarying vec3 vWorld;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvFacade = uv;\nvWorld = (modelMatrix * vec4(position, 1.0)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;\nvarying vec2 vFacade;\nvarying vec3 vWorld;\nfloat hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // Floor slabs as subtle horizontal bands; large window bays so nothing shimmers at
        // horizon distance.
        vec2 cell = vFacade / vec2(6.0, 3.6);
        vec2 f = fract(cell);
        float frame = (vFacade.y < 0.0) ? 0.0 : step(0.8, f.y);
        diffuseColor.rgb *= 1.0 - frame * 0.35;
        // Sunlit glass picks up a warm gold sheen toward the top.
        diffuseColor.rgb += vec3(0.12, 0.08, 0.02) * smoothstep(40.0, 220.0, vFacade.y) * (1.0 - uNight);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        if (vFacade.y >= 0.0) {
          vec2 id = floor(vFacade / vec2(6.0, 3.6)) + floor(vWorld.xz * 0.05) * 13.0;
          float lit = step(0.74, hash(id));
          float warm = hash(id + 7.0);
          vec3 win = mix(vec3(1.0, 0.72, 0.42), vec3(0.8, 0.88, 1.0), step(0.8, warm));
          // Faint overall facade glow keeps the silhouette, sparse warm windows, and a lit
          // crown band near the top of each tier.
          float crown = smoothstep(0.0, 1.0, fract(vFacade.y / 3.6)) * step(0.97, fract(vWorld.y / 70.0 + 0.02));
          totalEmissiveRadiance += (vec3(0.05, 0.06, 0.09) + win * lit * (1.0 - frame) * 1.3 + vec3(1.0, 0.85, 0.6) * crown * 1.2) * uNight;
        }`,
      )
  }
  return m
}

function AviationLights({ tops }) {
  const points = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const n = tops.length / 4
    const pos = []
    const ph = []
    for (let i = 0; i < n; i++) {
      pos.push(tops[i * 4], tops[i * 4 + 1], tops[i * 4 + 2])
      ph.push(tops[i * 4 + 3])
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(ph, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: zoneUniforms.uTime, uNight: zoneUniforms.uNight },
      vertexShader: `attribute float aPhase; varying float vBlink; uniform float uTime;
        void main() { vBlink = step(0.55, fract(uTime * 0.5 + aPhase)); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = 5.0; }`,
      fragmentShader: `uniform float uNight; varying float vBlink;
        void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * vBlink * (0.25 + 0.75 * uNight); gl_FragColor = vec4(vec3(1.0, 0.15, 0.1) * 2.0 * a, a); }`,
    })
    const p = new THREE.Points(g, m)
    p.frustumCulled = false
    return p
  }, [tops])
  return <primitive object={points} />
}

export default function Skyline() {
  const { geometry, tops } = useMemo(buildSkyline, [])
  const material = useMemo(towerMaterial, [])
  return (
    <>
      <mesh geometry={geometry} material={material} />
      <AviationLights tops={tops} />
    </>
  )
}
