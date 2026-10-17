import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mulberry32 } from '../lib/random'
import { BRAND } from '../brand'
import { heightAt } from '../world/terrain'
import { bulbMat, zoneUniforms } from '../zone/materials'
import { withNightLight } from '../zone/nightlight'
import { BOOTHS, ENTRANCE, EVENT, FIRST_AID, INFO, MAIN_STAGE, PARKING, SECOND_STAGE, TOILETS, TRUCKS } from './layout'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const UP = V(0, 1, 0)

// Colour a geometry per vertex and keep only position/normal/color so parts can merge.
function part(geo, color, matrix) {
  const g = geo.index ? geo.toNonIndexed() : geo
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k)
  if (matrix) g.applyMatrix4(matrix)
  const c = new THREE.Color(color)
  const col = new Float32Array(g.attributes.position.count * 3)
  for (let i = 0; i < col.length; i += 3) col.set([c.r, c.g, c.b], i)
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}
const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z)
const place = (pos, yaw) => new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromAxisAngle(UP, yaw), V(1, 1, 1))

// Text banner texture.
function banner(lines, { w = 1024, h = 256, bg = '#120a18', fg = '#ffffff', accent = BRAND.accent } = {}) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = accent
  ctx.lineWidth = h * 0.04
  ctx.strokeRect(h * 0.04, h * 0.04, w - h * 0.08, h - h * 0.08)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach(([text, size, color], i) => {
    ctx.fillStyle = color || fg
    ctx.font = `800 ${size * h}px system-ui, -apple-system, sans-serif`
    ctx.fillText(text, w / 2, h * ((i + 1) / (lines.length + 1)))
  })
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

const glowMaterial = (map, day = 0.6, night = 1.6) => {
  const m = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', roughness: 0.6 })
  m.userData.glow = [day, night]
  return m
}

function venueGeometry() {
  const parts = []
  const rand = mulberry32(88)
  // --- Main stage on the lake
  const S = MAIN_STAGE
  const top = S.pos.y
  const sm = place(V(S.pos.x, 0, S.pos.z), S.yaw)
  parts.push(part(box(S.w, top + 1.2, S.d, 0, (top - 1.2) / 2, 0), '#2b2530', sm))
  parts.push(part(box(S.w + 0.2, 0.12, 0.25, 0, top + 0.02, S.d / 2), '#c9a35a', sm))
  const TH = 9.5
  for (const x of [-S.w / 2 + 0.3, S.w / 2 - 0.3]) for (const z of [-S.d / 2 + 0.4, S.d / 2 - 0.6]) parts.push(part(box(0.45, TH, 0.45, x, top + TH / 2, z), '#1c1a20', sm))
  for (const z of [-S.d / 2 + 0.4, S.d / 2 - 0.6]) parts.push(part(box(S.w, 0.5, 0.5, 0, top + TH, z), '#1c1a20', sm))
  for (const x of [-S.w / 2 + 0.3, S.w / 2 - 0.3]) parts.push(part(box(0.5, 0.5, S.d, x, top + TH, 0), '#1c1a20', sm))
  for (const x of [-S.w / 2 - 1.2, S.w / 2 + 1.2]) parts.push(part(box(1.6, 5, 1.4, x, top + 2.5, S.d / 2 - 1.5), '#111014', sm))
  // --- Second stage: round platform and a half-shell canopy
  const T = SECOND_STAGE
  const tm = place(V(T.pos.x, T.pos.y, T.pos.z), T.yaw)
  parts.push(part(new THREE.CylinderGeometry(T.r, T.r + 0.2, 0.7, 40).translate(0, 0.35, 0), '#4a3f58', tm))
  parts.push(part(new THREE.CylinderGeometry(T.r + 0.05, T.r + 0.05, 0.1, 40).translate(0, 0.72, 0), '#c9a35a', tm))
  // Half-shell canopy behind the performers (open toward the path).
  parts.push(part(new THREE.CylinderGeometry(T.r - 0.1, T.r - 0.1, 4.8, 40, 1, true, Math.PI / 2, Math.PI).translate(0, 3.1, 0), '#e9dcc8', tm))
  parts.push(part(new THREE.TorusGeometry(T.r - 0.1, 0.12, 6, 40, Math.PI).rotateX(-Math.PI / 2).rotateY(Math.PI / 2).translate(0, 5.5, 0), '#c9a35a', tm))
  // --- Food trucks
  const TRUCK_COLORS = ['#e8504a', '#2fa4a8', '#f2b233', '#7b5cd6', '#ef7fb0', '#4f9e4a']
  for (const t of TRUCKS) {
    const m = place(t.pos, t.yaw)
    const c = TRUCK_COLORS[t.hue]
    parts.push(part(box(5.4, 2.5, 2.3, 0, 1.75, 0), c, m))
    parts.push(part(box(1.6, 1.9, 2.2, 3.4, 1.45, 0), c, m))
    parts.push(part(box(1.5, 0.7, 2.25, 3.45, 2.05, 0), '#1c2a35', m))
    for (const x of [-1.8, 1.6, 3.3]) for (const z of [-1.15, 1.15]) parts.push(part(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14).rotateX(Math.PI / 2).translate(x, 0.42, z), '#151515', m))
    // Striped awning over the serving side (facing the promenade, +z local).
    for (let k = 0; k < 6; k++) {
      const g = box(0.9, 0.05, 1.6, -2.25 + k * 0.9, 0, 0)
      g.rotateX(0.32).translate(0, 3.05, 1.85)
      parts.push(part(g, k % 2 ? '#ffffff' : c, m))
    }
    parts.push(part(box(4.6, 0.12, 0.6, -0.4, 1.15, 1.45), '#d8c9b0', m))
  }
  // Tables in front of the trucks.
  for (let i = 0; i < 8; i++) {
    const a = (112 + i * 2.6) * (Math.PI / 180)
    const p = V(Math.cos(a) * 60.3, 0, Math.sin(a) * 60.3)
    p.y = heightAt(p.x, p.z)
    const m = place(p, rand() * 6)
    parts.push(part(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 16).translate(0, 0.75, 0), '#e8e0d0', m))
    parts.push(part(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6).translate(0, 0.37, 0), '#333', m))
    parts.push(part(new THREE.ConeGeometry(1.4, 0.5, 8).translate(0, 2.45, 0), i % 2 ? '#ffffff' : BRAND.accent, m))
    parts.push(part(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 6).translate(0, 1.15, 0), '#ddd', m))
  }
  // --- Booths: pop-up tents with a back wall
  const BOOTH_COLORS = ['#ffffff', '#f2e6d0', '#d8eef2']
  for (const b of BOOTHS) {
    const m = place(b.pos, b.yaw)
    const c = b.sponsor >= 0 ? BRAND.accent : BOOTH_COLORS[Math.floor(rand() * 3)]
    for (const x of [-1.45, 1.45]) for (const z of [-1.45, 1.45]) parts.push(part(box(0.06, 2.3, 0.06, x, 1.15, z), '#cfcfcf', m))
    parts.push(part(new THREE.ConeGeometry(2.2, 1.0, 4).rotateY(Math.PI / 4).translate(0, 2.8, 0), c, m))
    parts.push(part(box(3, 2.2, 0.06, 0, 1.1, -1.45), c, m))
    parts.push(part(box(2.6, 0.9, 0.7, 0, 0.45, 0.9), '#e8e0d0', m))
  }
  // --- Toilets, first aid, info kiosks
  for (const t of TOILETS) {
    const m = place(t.pos, t.yaw)
    for (const x of [-0.75, 0.75]) parts.push(part(box(1.3, 2.4, 1.3, x, 1.2, 0), '#c7d3e0', m))
    parts.push(part(box(3, 0.12, 1.6, 0, 2.46, 0), '#7d8ea3', m))
  }
  {
    const m = place(FIRST_AID.pos, FIRST_AID.yaw)
    parts.push(part(box(3.6, 2.4, 3, 0, 1.2, 0), '#f5f5f5', m))
    parts.push(part(new THREE.ConeGeometry(2.6, 0.9, 4).rotateY(Math.PI / 4).translate(0, 2.85, 0), '#f5f5f5', m))
    parts.push(part(box(1.2, 0.35, 0.05, 0, 1.6, 1.53), '#e03030', m))
    parts.push(part(box(0.35, 1.2, 0.05, 0, 1.6, 1.53), '#e03030', m))
  }
  for (const k of INFO) {
    const m = place(k.pos, k.yaw)
    parts.push(part(new THREE.CylinderGeometry(0.35, 0.45, 2.4, 12).translate(0, 1.2, 0), '#2b2530', m))
    parts.push(part(new THREE.CylinderGeometry(1.1, 1.1, 0.12, 20).translate(0, 2.5, 0), '#ffe08a', m))
  }
  // --- Entrance: pylons and ticket turnstiles
  {
    const m = place(ENTRANCE.pos, ENTRANCE.yaw)
    for (const x of [-4.4, 4.4]) parts.push(part(box(1.1, 6.5, 1.1, x, 3.25, 0), '#2b2530', m))
    parts.push(part(box(9.9, 0.5, 0.8, 0, 6.75, 0), '#2b2530', m))
    for (const x of [-2.4, -0.8, 0.8, 2.4]) parts.push(part(box(0.5, 1.1, 1.2, x, 0.55, 1.2), '#c9a35a', m))
  }
  // --- Parking: cars in rows on an asphalt lot
  const P = PARKING
  const pm = place(V(P.pos.x, P.pos.y, P.pos.z), Math.atan2(P.pos.x, P.pos.z))
  parts.push(part(box(P.w, 0.12, P.d, 0, 0.04, 0), '#2a2a2e', pm))
  const CAR = ['#e8e8e8', '#202020', '#8a8f96', '#b03030', '#2c4f8a', '#d6c9a8']
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 16; i++) {
      if (rand() < 0.25) continue
      const x = -P.w / 2 + 2.5 + i * 3.6
      const z = -P.d / 2 + 5 + row * 12
      const m = pm.clone().multiply(place(V(x, 0, z), rand() < 0.5 ? 0 : Math.PI))
      const c = CAR[Math.floor(rand() * CAR.length)]
      parts.push(part(box(1.9, 0.75, 4.4, 0, 0.6, 0), c, m))
      parts.push(part(box(1.7, 0.6, 2.2, 0, 1.25, -0.2), '#1a2028', m))
    }
  }
  const g = mergeGeometries(parts)
  g.computeBoundingSphere()
  return g
}

// LED wall: event name over a flowing colour wash and equaliser bars.
function screenMaterial() {
  const map = banner([[BRAND.name.toUpperCase(), 0.26], [`presented by ${EVENT.sponsors[0].toUpperCase()}`, 0.1, BRAND.accent]], { w: 1024, h: 440, bg: '#000000' })
  return new THREE.ShaderMaterial({
    uniforms: { uMap: { value: map }, uTime: zoneUniforms.uTime, uNight: zoneUniforms.uNight },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uTime;
      uniform float uNight;
      varying vec2 vUv;
      vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
      void main() {
        vec3 wash = hue(fract(vUv.x * 0.4 + uTime * 0.05)) * 0.35;
        float col = floor(vUv.x * 40.0);
        float bar = 0.18 + 0.16 * (0.5 + 0.5 * sin(uTime * 3.0 + col * 1.7)) * (0.5 + 0.5 * sin(uTime * 1.3 + col));
        wash += step(vUv.y, bar) * hue(fract(col / 40.0 + uTime * 0.1)) * 0.6;
        vec4 t = texture2D(uMap, vUv);
        float lum = max(t.r, max(t.g, t.b));
        vec3 c = mix(wash, t.rgb * 1.4, smoothstep(0.15, 0.4, lum));
        gl_FragColor = vec4(c * mix(1.0, 1.8, uNight), 1.0);
        #include <colorspace_fragment>
      }`,
  })
}

// Moving spotlight beams from the main stage truss (night only).
function Beams() {
  const { mesh, beams } = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.15, 2.6, 16, 20, 1, true).translate(0, -8, 0)
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uNight: zoneUniforms.uNight },
      vertexShader: 'varying vec3 vC; varying float vY; void main() { vC = instanceColor; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uNight; varying vec3 vC; varying float vY; void main() { float a = smoothstep(-16.0, 0.0, vY) * 0.22 * uNight; gl_FragColor = vec4(vC * a, a); }',
    })
    const n = 8
    const mesh = new THREE.InstancedMesh(geo, mat, n)
    const colors = ['#ff4fa3', '#5fe0ff', '#ffd27a', '#b45cff']
    const S = MAIN_STAGE
    const beams = Array.from({ length: n }, (_, i) => {
      const x = -S.w / 2 + 1.5 + (i * (S.w - 3)) / (n - 1)
      mesh.setColorAt(i, new THREE.Color(colors[i % 4]))
      return { origin: V(S.pos.x + x, S.pos.y + 9.3, S.pos.z + S.d / 2 - 0.6), phase: i * 0.9 }
    })
    mesh.frustumCulled = false
    mesh.renderOrder = 4
    return { mesh, beams }
  }, [])
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    beams.forEach((b, i) => {
      // Sweep out over the crowd and back, alternating directions.
      e.set(0.55 + 0.35 * Math.sin(t * 0.7 + b.phase), 0, 0.5 * Math.sin(t * 0.5 + b.phase * 1.7) * (i % 2 ? 1 : -1))
      q.setFromEuler(e)
      mesh.setMatrixAt(i, m.compose(b.origin, q, V(1, 1, 1)))
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return <primitive object={mesh} />
}

// Festoon lights strung between poles along the food truck row.
function FoodLights() {
  const mesh = useMemo(() => {
    const pts = []
    for (let i = 0; i < 7; i++) {
      const a0 = (110.3 + i * 3.4) * (Math.PI / 180)
      const a1 = (110.3 + (i + 1) * 3.4) * (Math.PI / 180)
      for (let k = 0; k <= 10; k++) {
        const t = k / 10
        const a = a0 + (a1 - a0) * t
        const x = Math.cos(a) * 61.4
        const z = Math.sin(a) * 61.4
        pts.push(V(x, heightAt(x, z) + 3.9 - Math.sin(Math.PI * t) * 0.7, z))
      }
    }
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), bulbMat, pts.length)
    pts.forEach((p, i) => m.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)))
    m.computeBoundingSphere()
    return m
  }, [])
  return <primitive object={mesh} />
}

export default function EventVenue() {
  const geometry = useMemo(venueGeometry, [])
  const material = useMemo(() => withNightLight(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, metalness: 0.05, side: THREE.DoubleSide })), [])
  const screen = useMemo(screenMaterial, [])
  const signs = useMemo(() => {
    const S = MAIN_STAGE
    const arch = glowMaterial(banner([[BRAND.name.toUpperCase(), 0.34], [`${EVENT.dates} · presented by ${EVENT.sponsors[0]}`, 0.12, BRAND.accent]], { w: 1400, h: 300 }))
    const market = glowMaterial(banner([['MAKERS MARKET', 0.42]], { w: 512, h: 128, bg: '#2b2530' }), 0.4, 1.3)
    const sponsorMats = EVENT.sponsors.map((sp) => glowMaterial(banner([[sp.toUpperCase(), 0.4, '#2a1404']], { w: 512, h: 128, bg: BRAND.accent, accent: '#ffffff' }), 0.5, 1.4))
    const food = glowMaterial(banner([['FOOD TRUCK ROW', 0.42]], { w: 768, h: 128, bg: '#2b2530' }), 0.4, 1.3)
    const list = []
    const add = (mat, w, h, pos, yaw, y, fwd) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
      const dir = V(Math.sin(yaw), 0, Math.cos(yaw))
      mesh.position.copy(pos).add(V(0, y, 0)).addScaledVector(dir, fwd)
      mesh.rotation.y = yaw
      list.push(mesh)
    }
    add(screen, 14, 6, V(S.pos.x, S.pos.y, S.pos.z - S.d / 2 + 0.8), 0, 4.6, 0)
    add(arch, 9.6, 2.1, ENTRANCE.pos, ENTRANCE.yaw, 5.3, 0.45)
    add(arch, 9.6, 2.1, ENTRANCE.pos, ENTRANCE.yaw + Math.PI, 5.3, 0.45)
    BOOTHS.forEach((b) => add(b.sponsor >= 0 ? sponsorMats[b.sponsor % sponsorMats.length] : market, 2.9, 0.55, b.pos, b.yaw, 2.05, 1.5))
    add(food, 7, 1.15, TRUCKS[2].pos.clone().lerp(TRUCKS[3].pos, 0.5), TRUCKS[2].yaw, 4.6, 4.6)
    return { list, mats: [arch, market, food, ...sponsorMats] }
  }, [screen])
  useFrame(() => {
    const n = zoneUniforms.uNight.value
    for (const m of signs.mats) m.emissiveIntensity = THREE.MathUtils.lerp(m.userData.glow[0], m.userData.glow[1], n)
  })
  return (
    <>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      {signs.list.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
      <Beams />
      <FoodLights />
    </>
  )
}
