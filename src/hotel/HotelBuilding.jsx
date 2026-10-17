import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BRAND } from '../brand'
import { zoneUniforms, bulbMat } from '../zone/materials'
import { withNightLight } from '../zone/nightlight'
import { rosetteMaterial } from '../world/patterns'
import { V, archPanel, boxAt, clean, cylAt, prism, textTexture } from './geom'
import { CRESCENT, FLOOR_H, LAND_Y, LOBBY_H, SUITE, SUITE_Y, TOWER, TOWER_TOP, arcPoint, floorY, wingFloors } from './layout'

// Facade: sandstone-white walls, window grid, night: warm windows, amber uplight from the base,
// lit band under the roofline. uv = (metres along the wall, metres up).
function facadeMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: '#efe6d8', roughness: 0.75 })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = zoneUniforms.uNight
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vF;\nvarying vec3 vFN;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvF = uv;\nvFN = normalize(mat3(modelMatrix) * normal);')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;\nvarying vec2 vF;\nvarying vec3 vFN;\nfloat fh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        bool wall = abs(vFN.y) < 0.5 && vF.y >= 0.0;
        float upper = step(${(LAND_Y + LOBBY_H).toFixed(2)}, vF.y);
        vec2 cell = vec2(vF.x / 3.6, (vF.y - ${(LAND_Y + LOBBY_H).toFixed(2)}) / ${FLOOR_H.toFixed(2)});
        vec2 f = fract(cell);
        float win = wall ? upper * step(0.16, f.x) * step(f.x, 0.84) * step(0.18, f.y) * step(f.y, 0.86) : 0.0;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.22, 0.27), win);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        if (wall) {
          float lit = step(0.42, fh(floor(cell) + floor(vFN.xz * 3.0)));
          vec3 warm = mix(vec3(1.0, 0.74, 0.45), vec3(1.0, 0.86, 0.66), fh(floor(cell) + 7.0));
          float wash = (1.0 - smoothstep(0.0, 14.0, vF.y)) * 0.55;
          totalEmissiveRadiance += (warm * lit * win * 1.4 + vec3(1.0, 0.72, 0.42) * wash * (1.0 - win)) * uNight;
        }`,
      )
  }
  return withNightLight(m)
}

// Glass curtain wall with mullions; nearly clear face-on, reflective at grazing angles.
function glassMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: '#9fc6d4', roughness: 0.05, metalness: 0.2, transparent: true, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.5 })
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vG;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvG = uv;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vG;').replace(
      '#include <lights_fragment_begin>',
      `float fres = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);
      vec2 g = abs(fract(vG / vec2(1.8, ${FLOOR_H.toFixed(2)})) - 0.5);
      float mull = 1.0 - smoothstep(0.0, 0.025, min(g.x, g.y));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.76, 0.66), mull);
      diffuseColor.a = max(mix(0.12, 0.6, fres), mull * 0.9);
      #include <lights_fragment_begin>`,
    )
  }
  return m
}

// Wall quads with world-metre uv, for glass planes.
function plane(x0, z0, x1, z1, y0, y1) {
  const len = Math.hypot(x1 - x0, z1 - z0)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute([x0, y0, z0, x1, y0, z1, x1, y1, z1, x0, y0, z0, x1, y1, z1, x0, y1, z0], 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, y0, len, y0, len, y1, 0, y0, len, y1, 0, y1], 2))
  g.computeVertexNormals()
  return g
}

function buildingParts() {
  const facade = []
  const white = []
  const glass = []
  const core = []
  const { r0, r1 } = CRESCENT
  // --- Wings: prism per 2° segment, balconies on the sea side, arcade at ground level.
  for (const [a0, a1] of [CRESCENT.east, CRESCENT.west]) {
    for (let d = a0; d < a1; d += 2) {
      const e = Math.min(a1, d + 2)
      const floors = wingFloors((d + e) / 2)
      const top = floorY(floors)
      const pts = [arcPoint(d, r0), arcPoint(e, r0), arcPoint(e, r1), arcPoint(d, r1)].map((p) => [p.x, p.z])
      facade.push(prism(pts, LAND_Y, top))
      // Parapet cap.
      white.push(prism(pts.map(([x, z]) => [x, z]), top, top + 0.6, { roof: true }))
      // Balcony slabs and glass rails on each upper floor, sea-facing side.
      const mid = (d + e) / 2
      const a = (mid * Math.PI) / 180
      const c = arcPoint(mid, r0 - 0.8)
      const yaw = Math.atan2(Math.cos(a), Math.sin(a))
      const w = (((e - d) * Math.PI) / 180) * r0 - 0.25
      for (let k = 1; k < floors; k++) {
        const y = floorY(k)
        const m = new THREE.Matrix4().compose(V(c.x, y, c.z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(1, 1, 1))
        white.push(clean(new THREE.BoxGeometry(w, 0.22, 1.7).applyMatrix4(m)))
        const rail = new THREE.BoxGeometry(w, 1.0, 0.05).translate(0, 0.6, -0.82).applyMatrix4(m)
        glass.push(clean(rail))
      }
      // Arcade: pointed-arch screen 2.6 m in front of the ground floor.
      const ac = arcPoint(mid, r0 - 2.6)
      const panel = archPanel(w + 0.26, LOBBY_H - 1.2, { depth: 0.6 })
      panel.rotateY(yaw).translate(ac.x, LAND_Y, ac.z)
      white.push(clean(panel))
      const roof = new THREE.BoxGeometry(w + 0.26, 0.4, 2.8).translate(0, LOBBY_H - 1.0, 1.3)
      roof.rotateY(yaw).translate(ac.x, LAND_Y, ac.z)
      white.push(clean(roof))
    }
  }
  // --- Tower: stone side walls, glass front/back, floor slabs, spandrels, dark cores.
  const { x0, x1, z0, z1, floors } = TOWER
  for (const x of [x0, x1]) facade.push(prism([[x - 0.4, z0], [x + 0.4, z0], [x + 0.4, z1], [x - 0.4, z1]], LAND_Y, TOWER_TOP, { roof: true }))
  for (const z of [z0, z1]) {
    // Lobby glass with a 8 m door opening, then full-height curtain wall above.
    glass.push(plane(x0, z, -4, z, LAND_Y, LAND_Y + LOBBY_H))
    glass.push(plane(4, z, x1, z, LAND_Y, LAND_Y + LOBBY_H))
    glass.push(plane(-4, z, 4, z, LAND_Y + 3.6, LAND_Y + LOBBY_H))
    glass.push(plane(x0, z, x1, z, LAND_Y + LOBBY_H, TOWER_TOP))
  }
  for (let k = 1; k <= floors; k++) {
    const y = floorY(k)
    white.push(boxAt(x1 - x0, 0.35, z1 - z0, 0, y - 0.17, (z0 + z1) / 2))
    for (const z of [z0 - 0.25, z1 + 0.25]) white.push(boxAt(x1 - x0 + 0.8, 0.55, 0.3, 0, y - 0.1, z))
  }
  // Cores: lit room boxes behind the glass, except the suite's half of floor 8.
  for (let k = 1; k < floors; k++) {
    const y0 = floorY(k) + 0.2
    const y1 = floorY(k + 1) - 0.4
    if (k === SUITE.floor) core.push(prism([[1.5, 45], [11.5, 45], [11.5, 55], [1.5, 55]], y0, y1, { roof: false }))
    else core.push(prism([[-11.5, 45], [11.5, 45], [11.5, 55], [-11.5, 55]], y0, y1, { roof: false }))
  }
  // Fins: slim vertical mashrabiya-like fins across the tower front above the lobby.
  for (let i = 0; i <= 14; i++) white.push(boxAt(0.18, TOWER_TOP - LAND_Y - LOBBY_H, 0.7, x0 + i * 2, (TOWER_TOP + LAND_Y + LOBBY_H) / 2, z0 - 0.6))
  // Roof cap.
  white.push(boxAt(x1 - x0 + 1.2, 0.7, z1 - z0 + 1.2, 0, TOWER_TOP + 0.35, (z0 + z1) / 2))
  return {
    facade: mergeGeometries(facade),
    white: mergeGeometries(white.map((g) => clean(g))),
    glass: mergeGeometries(glass.map((g) => clean(g))),
    core: mergeGeometries(core),
  }
}

// Lantern crown: eight ribs rising from the roof and curving in to a gold finial.
function crownGeometry() {
  const parts = []
  const cz = (TOWER.z0 + TOWER.z1) / 2
  const base = TOWER_TOP + 0.7
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8
    const pts = []
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      const r = 9 * Math.pow(1 - t, 0.85) * (1 - 0.2 * Math.sin(Math.PI * t))
      pts.push(V(Math.cos(a) * r, base + t * 16, cz + Math.sin(a) * r))
    }
    parts.push(clean(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.32, 6)))
  }
  for (const [y, r] of [[base + 0.3, 9], [base + 6, 6.9], [base + 11, 3.9]]) parts.push(clean(new THREE.TorusGeometry(r, 0.18, 6, 32).rotateX(Math.PI / 2).translate(0, y, cz)))
  parts.push(clean(new THREE.SphereGeometry(0.7, 12, 8).translate(0, base + 16.4, cz)))
  parts.push(clean(new THREE.ConeGeometry(0.18, 3, 8).translate(0, base + 18.2, cz)))
  return mergeGeometries(parts)
}

// --- Lobby: marble floor, reception, columns, lounges, chandelier.
function lobbyParts() {
  const parts = []
  const y = LAND_Y
  parts.push(boxAt(27.4, 0.1, 15.6, 0, y + 0.05, 50, '#e9e2d6'))
  // Reception desk (curved front) against the back wall.
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI
    parts.push(boxAt(1.3, 1.1, 0.7, Math.cos(a) * -5.2, y + 0.55, 56.2 + Math.sin(a) * 1.2, '#3b2a20'))
  }
  parts.push(boxAt(9, 4.2, 0.2, 0, y + 2.1, 57.6, '#7a5a3c'))
  // Columns.
  for (const x of [-9, 9]) for (const z of [45, 54]) parts.push(cylAt(0.45, 0.45, LOBBY_H, x, y + LOBBY_H / 2, z, 20, '#f4efe6'))
  // Two lounge groups.
  for (const sx of [-6.5, 6.5]) {
    parts.push(boxAt(3.4, 0.45, 1, sx, y + 0.3, 47.2, '#d8cbb6'))
    parts.push(boxAt(3.4, 0.7, 0.25, sx, y + 0.65, 46.8, '#d8cbb6'))
    parts.push(boxAt(1, 0.45, 1, sx - 2.2, y + 0.3, 48.8, '#b98d5e'))
    parts.push(boxAt(1, 0.45, 1, sx + 2.2, y + 0.3, 48.8, '#b98d5e'))
    parts.push(cylAt(0.7, 0.7, 0.4, sx, y + 0.25, 49, 20, '#2b2420'))
  }
  // Planters.
  for (const x of [-12.5, 12.5]) parts.push(cylAt(0.7, 0.55, 0.9, x, y + 0.45, 44, 16, '#b4613d'))
  return mergeGeometries(parts)
}

function chandelier() {
  const pts = []
  for (const [r, n, h] of [[3.2, 36, 7.4], [2.4, 28, 7.0], [1.6, 20, 6.6], [0.8, 12, 6.2]]) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      for (let k = 0; k < 4; k++) pts.push(V(Math.cos(a) * r, LAND_Y + h - k * 0.32, 50 + Math.sin(a) * r))
    }
  }
  const m = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.09), bulbMat, pts.length)
  pts.forEach((p, i) => m.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)))
  m.computeBoundingSphere()
  return m
}

// --- Signature suite: bed facing the sea, lounge, TV wall, desk, balcony.
function suiteParts() {
  const parts = []
  const y = SUITE_Y
  const { x0, x1, z0, z1 } = SUITE
  parts.push(boxAt(x1 - x0, 0.06, z1 - z0, (x0 + x1) / 2, y + 0.23, (z0 + z1) / 2, '#a57a52'))
  parts.push(boxAt(6, 0.03, 4.4, -7, y + 0.27, 50, '#bfa888'))
  parts.push(boxAt(0.2, FLOOR_H - 0.6, z1 - z0, x1 + 0.1, y + (FLOOR_H - 0.3) / 2, (z0 + z1) / 2, '#d9cdb9'))
  parts.push(boxAt(x1 - x0, FLOOR_H - 0.6, 0.2, (x0 + x1) / 2, y + (FLOOR_H - 0.3) / 2, z1 + 0.1, '#d9cdb9'))
  // Timber feature wall behind the bed, ceiling, curtains at the glass, framed art.
  parts.push(boxAt(7.6, FLOOR_H - 0.6, 0.08, -7, y + (FLOOR_H - 0.3) / 2, z1 - 0.04, '#6b4a33'))
  parts.push(boxAt(x1 - x0, 0.08, z1 - z0 + 0.4, (x0 + x1) / 2, y + FLOOR_H - 0.42, (z0 + z1) / 2, '#efe6d8'))
  for (const x of [x0 + 0.5, x1 - 0.5]) parts.push(boxAt(0.9, FLOOR_H - 0.7, 0.25, x, y + (FLOOR_H - 0.4) / 2, z0 + 0.35, '#cbb08a'))
  for (const z of [51.5, 54]) parts.push(boxAt(0.05, 1.1, 1.6, x1 - 0.03, y + 1.7, z, '#c9a35a'))
  for (const z of [51.5, 54]) parts.push(boxAt(0.06, 0.95, 1.45, x1 - 0.05, y + 1.7, z, '#2f6f7a'))
  // Floor lamp by the sofa.
  parts.push(cylAt(0.03, 0.03, 1.6, -2.2, y + 1.05, 45.4, 8, '#c9a35a'))
  parts.push(cylAt(0.18, 0.28, 0.35, -2.2, y + 1.95, 45.4, 16, '#f3e6cc'))
  // Bed: base, mattress, duvet runner, pillows, tall headboard against the back wall.
  parts.push(boxAt(3.2, 0.45, 3.4, -7, y + 0.45, 54.9, '#5a4434'))
  parts.push(boxAt(3.0, 0.3, 3.2, -7, y + 0.82, 54.9, '#fbf8f2'))
  parts.push(boxAt(3.05, 0.04, 0.9, -7, y + 0.99, 53.9, '#c9a35a'))
  for (const x of [-7.8, -6.2]) parts.push(boxAt(1.2, 0.25, 0.5, x, y + 1.1, 56.2, '#ffffff'))
  parts.push(boxAt(4.2, 1.8, 0.2, -7, y + 1.3, 57.2, '#c7b8a2'))
  for (const x of [-9.4, -4.6]) {
    parts.push(boxAt(0.7, 0.55, 0.5, x, y + 0.5, 56.6, '#3b2a20'))
    parts.push(cylAt(0.18, 0.12, 0.5, x, y + 1.05, 56.6, 10, '#c9a35a'))
  }
  // Lounge: sofa facing the TV on the west wall, coffee table.
  parts.push(boxAt(1, 0.45, 3, -2.4, y + 0.45, 47.5, '#d8cbb6'))
  parts.push(boxAt(0.3, 0.75, 3, -1.95, y + 0.75, 47.5, '#d8cbb6'))
  parts.push(boxAt(1.1, 0.35, 1.6, -4, y + 0.42, 47.5, '#2b2420'))
  parts.push(boxAt(0.2, 2.4, 4, -13.35, y + 1.5, 47.5, '#3b2a20'))
  parts.push(boxAt(2.2, 0.75, 0.6, -12, y + 0.6, 53.2, '#3b2a20'))
  // Balcony: slab, glass rail, two loungers and a side table.
  parts.push(boxAt(x1 - x0, 0.25, SUITE.balcony, (x0 + x1) / 2, y + 0.1, z0 - SUITE.balcony / 2, '#efe6d8'))
  for (const x of [-10, -7.5]) {
    parts.push(boxAt(0.75, 0.3, 1.8, x, y + 0.42, z0 - 1.5, '#ffffff'))
    parts.push(boxAt(0.75, 0.08, 0.6, x, y + 0.75, z0 - 0.75, '#ffffff'))
  }
  parts.push(cylAt(0.3, 0.3, 0.5, -5.2, y + 0.5, z0 - 1.4, 12, '#c9a35a'))
  return mergeGeometries(parts)
}

export default function HotelBuilding() {
  const { parts, crown, lobby, suite, chand, mats, signs } = useMemo(() => {
    const parts = buildingParts()
    const mats = {
      facade: facadeMaterial(),
      white: withNightLight(new THREE.MeshStandardMaterial({ color: '#f6f1e8', roughness: 0.6 })),
      glass: glassMaterial(),
      core: new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.9 }),
      crown: new THREE.MeshStandardMaterial({ color: '#c9a35a', metalness: 0.85, roughness: 0.3, emissive: '#ffb347', emissiveIntensity: 0 }),
      interior: withNightLight(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })),
    }
    // Core rooms glow warmly at night (curtains drawn, lights on).
    mats.core.onBeforeCompile = (shader) => {
      shader.uniforms.uNight = zoneUniforms.uNight
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uNight;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.72, 0.42) * (0.08 + 0.55 * uNight);')
    }
    const tv = new THREE.MeshBasicMaterial({ map: textTexture([[BRAND.name, 0.15], ['Welcome, guest · Today: sunset at the pier 17:45', 0.06, '#e0b25a', 600]], { w: 1024, h: 576, bg: '#0d1a22' }), toneMapped: false })
    const tvMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.46), tv)
    tvMesh.position.set(-13.22, SUITE_Y + 1.7, 47.5)
    tvMesh.rotation.y = Math.PI / 2
    const lobbySign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), new THREE.MeshBasicMaterial({ map: textTexture([[BRAND.name.toUpperCase(), 0.42, '#e0b25a']], { w: 1024, h: 190, bg: '#3b2a20', accent: null }), toneMapped: false }))
    lobbySign.position.set(0, LAND_Y + 3.2, 57.45)
    lobbySign.rotation.y = Math.PI
    const rosette = new THREE.Mesh(new THREE.CircleGeometry(4.5, 48).rotateX(-Math.PI / 2), rosetteMaterial())
    rosette.position.set(0, LAND_Y + 0.11, 50)
    return { parts, crown: crownGeometry(), lobby: lobbyParts(), suite: suiteParts(), chand: chandelier(), mats, signs: [tvMesh, lobbySign, rosette] }
  }, [])
  useFrame(() => {
    mats.crown.emissiveIntensity = 0.05 + zoneUniforms.uNight.value * 2.6
  })
  return (
    <>
      <mesh geometry={parts.facade} material={mats.facade} castShadow receiveShadow />
      <mesh geometry={parts.white} material={mats.white} castShadow receiveShadow />
      <mesh geometry={parts.core} material={mats.core} />
      <mesh geometry={crown} material={mats.crown} castShadow />
      <mesh geometry={lobby} material={mats.interior} receiveShadow />
      <mesh geometry={suite} material={mats.interior} castShadow receiveShadow />
      <primitive object={chand} />
      {signs.map((s, i) => (
        <primitive key={i} object={s} />
      ))}
      <mesh geometry={parts.glass} material={mats.glass} renderOrder={2} />
      {/* Interior lights: lobby chandelier and suite lamps (always on). */}
      <pointLight position={[0, LAND_Y + 6, 50]} color="#ffd9a8" intensity={60} distance={22} decay={2} />
      <pointLight position={[-6, SUITE_Y + 2.4, 52]} color="#ffd2a0" intensity={12} distance={12} decay={2} />
    </>
  )
}
