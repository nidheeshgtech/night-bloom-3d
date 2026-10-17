import { useMemo } from 'react'
import * as THREE from 'three'
import { mulberry32 } from '../lib/random'
import { useGarden } from '../lib/store'
import { duneHeight } from '../zone/Ground'
import { zoneUniforms } from '../zone/materials'

// A generic city district around the desert belt: a street grid of blocks with low and
// mid-rise buildings. By day sandstone and glass; at night lit windows, coloured facade
// washes and orange street lights, so the whole surroundings glow.
const R0 = 345
const R1 = 700
const BLOCK = 56
const ROAD = 9
const WASH = ['#5a6bff', '#3fd2ff', '#b45cff', '#ff9a4a', '#ffd9a0', '#ff5fb0']

function buildCity(dense) {
  const rand = mulberry32(2045)
  const buildings = []
  const lights = []
  const n = Math.ceil(R1 / BLOCK)
  for (let i = -n; i < n; i++) {
    for (let j = -n; j < n; j++) {
      const x0 = i * BLOCK
      const z0 = j * BLOCK
      const cx = x0 + BLOCK / 2
      const cz = z0 + BLOCK / 2
      const r = Math.hypot(cx, cz)
      if (r < R0 || r > R1) continue
      // Street lights along the block's west and south edges.
      for (let t = 0; t < BLOCK; t += 14) {
        lights.push(x0 + t, z0 + ROAD / 2, x0 + ROAD / 2, z0 + t)
      }
      // Buildings: subdivide the block into lots.
      const lots = dense ? 1 + Math.floor(rand() * 4) : 1 + Math.floor(rand() * 2)
      const inner = BLOCK - ROAD
      const cols = lots > 2 ? 2 : lots
      const rows = lots > 2 ? 2 : 1
      for (let a = 0; a < cols; a++) {
        for (let b = 0; b < rows; b++) {
          if (lots === 3 && a === 1 && b === 1) continue
          const w = inner / cols - 4
          const d = inner / rows - 4
          const bx = x0 + ROAD + (a + 0.5) * (inner / cols)
          const bz = z0 + ROAD + (b + 0.5) * (inner / rows)
          // Taller toward the skyline side, lower near the garden.
          const k = (r - R0) / (R1 - R0)
          const h = 8 + rand() * (14 + k * 36) * (rand() < 0.12 ? 2 : 1)
          buildings.push({ x: bx, z: bz, w: w * (0.65 + rand() * 0.35), d: d * (0.65 + rand() * 0.35), h, yaw: (rand() - 0.5) * 0.08, wash: WASH[Math.floor(rand() * WASH.length)] })
        }
      }
    }
  }
  const pts = []
  for (let i = 0; i < lights.length; i += 2) {
    const x = lights[i]
    const z = lights[i + 1]
    const r = Math.hypot(x, z)
    if (r > R0 - 8 && r < R1 + 8) pts.push(x, duneHeight(x, z) + 6, z)
  }
  return { buildings, lights: new Float32Array(pts) }
}

function cityMaterial() {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.2 })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = zoneUniforms.uNight
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCityPos;\nvarying vec3 vCityN;\nvarying float vLocalH;\nvarying float vSeed;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 cw = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vCityPos = cw.xyz;
        vCityN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vLocalH = position.y * length(instanceMatrix[1].xyz);
        vSeed = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uNight;
        varying vec3 vCityPos;
        varying vec3 vCityN;
        varying float vLocalH;
        varying float vSeed;
        float cityHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        bool wall = abs(vCityN.y) < 0.5;
        vec2 fc = vec2(dot(vCityPos.xz, vec2(-vCityN.z, vCityN.x)), vLocalH);
        vec2 cell = fc / vec2(3.4, 3.5);
        vec2 f = fract(cell);
        float glass = wall ? step(0.18, f.x) * step(f.x, 0.82) * step(0.25, f.y) * step(f.y, 0.85) : 0.0;
        // Day palette per building: sandstone, white, or blue glass.
        vec3 sand = vec3(0.78, 0.66, 0.5);
        vec3 white = vec3(0.86, 0.85, 0.82);
        vec3 glassC = vec3(0.32, 0.42, 0.5);
        vec3 body = vSeed < 0.45 ? sand : (vSeed < 0.75 ? white : glassC);
        diffuseColor.rgb = wall ? mix(body, body * 0.45 + vec3(0.05, 0.08, 0.1), glass * 0.85) : body * 0.7;
        diffuseColor.rgb *= 1.0 - 0.75 * uNight;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        if (wall) {
          float lit = step(0.55, cityHash(floor(cell) + vSeed * 91.0));
          vec3 win = mix(vec3(1.0, 0.72, 0.42), vec3(0.75, 0.86, 1.0), step(0.7, cityHash(floor(cell) + 3.7)));
          // Coloured architectural wash rising from the base, and a lit crown band.
          // Only some buildings get a coloured wash, concentrated at the base.
          float washed = step(0.55, vSeed);
          float wash = (1.0 - smoothstep(0.0, 10.0, vLocalH)) * washed;
          totalEmissiveRadiance += (win * lit * glass * 1.9 + vColor.rgb * wash * 0.55) * uNight;
        } else {
          totalEmissiveRadiance += vColor.rgb * 0.08 * uNight;
        }`,
      )
  }
  return m
}

export default function CityRing() {
  const quality = useGarden((s) => s.quality)
  const { mesh, points } = useMemo(() => {
    const { buildings, lights } = buildCity(quality === 'high')
    const geo = new THREE.BoxGeometry(1, 1, 1)
    geo.translate(0, 0.5, 0)
    const mat = cityMaterial()
    const mesh = new THREE.InstancedMesh(geo, mat, buildings.length)
    const c = new THREE.Color()
    buildings.forEach((b, i) => {
      const y = duneHeight(b.x, b.z) - 0.5
      mesh.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(b.x, y, b.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.yaw), new THREE.Vector3(b.w, b.h, b.d)))
      mesh.setColorAt(i, c.set(b.wash))
    })
    mesh.computeBoundingSphere()
    const pg = new THREE.BufferGeometry()
    pg.setAttribute('position', new THREE.BufferAttribute(lights, 3))
    const pm = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uNight: zoneUniforms.uNight },
      vertexShader: `void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(900.0 / -mv.z, 1.5, 6.0); }`,
      fragmentShader: `uniform float uNight; void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * uNight; gl_FragColor = vec4(vec3(1.0, 0.62, 0.28) * 2.0 * a, a); }`,
    })
    const points = new THREE.Points(pg, pm)
    points.frustumCulled = false
    return { mesh, points }
  }, [quality])
  return (
    <>
      <primitive object={mesh} />
      <primitive object={points} />
    </>
  )
}
