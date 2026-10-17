import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BRAND } from '../brand'
import { bulbMat, pbrSet, zoneUniforms } from '../zone/materials'
import { withNightLight } from '../zone/nightlight'
import { rippleTexture } from '../world/Lake'
import Palms from '../zone/Palms'
import { V, archPanel, clean, prism } from './geom'
import { ARRIVAL, BAR, CRESCENT, KIDS_POOL, LAND_Y, PALM_SPOTS, PIER, POOL, POOL_OUTLINE, RESTAURANT, SEA_Y, SPA, TOWER, VILLAS, arcPoint, shoreZ, terrainH } from './layout'

const MASK_E = 200
const SHORE_GLSL = 'float shoreZ(float x) { return -40.0 + 3.0 * sin(x * 0.025) + 2.0 * sin(x * 0.06 + 1.0); }'

// Paved deck, arrival court and promenade (R); lawns (G). Sand elsewhere.
function paintMask() {
  const RES = 1024
  const c = document.createElement('canvas')
  c.width = c.height = RES
  const ctx = c.getContext('2d')
  const k = RES / (2 * MASK_E)
  const px = (x, z) => [(x + MASK_E) * k, (z + MASK_E) * k]
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, RES, RES)
  ctx.filter = 'blur(2px)'
  // Lawns: behind the hotel and around villas and spa.
  ctx.fillStyle = '#0f0'
  ctx.fillRect(...px(-200, 20), 400 * k, 180 * k)
  for (const v of VILLAS) {
    ctx.beginPath()
    ctx.ellipse(...px(v.x, v.z + 6), 13 * k, 12 * k, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.ellipse(...px(SPA.x, SPA.z + 4), 20 * k, 16 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  // Deck inside the crescent, down to the promenade above the beach.
  ctx.fillStyle = '#f00'
  ctx.beginPath()
  for (let d = 18; d <= 162; d += 3) {
    const p = arcPoint(d, CRESCENT.r0 + 1)
    ctx.lineTo(...px(p.x, Math.max(p.z, shoreZ(p.x) + 19)))
  }
  for (let x = 74; x >= -74; x -= 4) ctx.lineTo(...px(x, shoreZ(x) + 19))
  ctx.closePath()
  ctx.fill()
  // Promenade strip along the top of the beach.
  ctx.beginPath()
  for (let x = -170; x <= 170; x += 4) ctx.lineTo(...px(x, shoreZ(x) + 18))
  for (let x = 170; x >= -170; x -= 4) ctx.lineTo(...px(x, shoreZ(x) + 21.5))
  ctx.fill()
  // Arrival court and drive.
  ctx.fillRect(...px(-34, TOWER.z1), 68 * k, 50 * k)
  ctx.beginPath()
  ctx.arc(...px(ARRIVAL.x, ARRIVAL.z + 6), 12 * k, 0, Math.PI * 2)
  ctx.fill()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.NoColorSpace
  return t
}

function Ground() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(900, 900, 300, 300)
    g.rotateX(-Math.PI / 2)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) p.setY(i, terrainH(p.getX(i), p.getZ(i)))
    g.computeVertexNormals()
    return g
  }, [])
  const material = useMemo(() => {
    const sand = pbrSet('aerial_beach_01', 1)
    const grass = pbrSet('grass_ground', 1)
    const stone = pbrSet('white_sandstone_bricks', 1)
    const m = new THREE.MeshStandardMaterial({ map: sand.map, normalMap: sand.normalMap, normalScale: new THREE.Vector2(0.35, 0.35), roughness: 1 })
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, { uMask: { value: paintMask() }, uGrass: { value: grass.map }, uStone: { value: stone.map } })
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vW;\nuniform sampler2D uMask;\nuniform sampler2D uGrass;\nuniform sampler2D uStone;\n${SHORE_GLSL}`)
        .replace(
          '#include <map_fragment>',
          `vec2 muv = vec2((vW.x + ${MASK_E.toFixed(1)}) / ${(2 * MASK_E).toFixed(1)}, 1.0 - (vW.z + ${MASK_E.toFixed(1)}) / ${(2 * MASK_E).toFixed(1)});
          vec3 mk = texture2D(uMask, muv).rgb;
          vec3 sandC = texture2D(map, vW.xz / 7.0).rgb * vec3(1.32, 1.12, 0.86);
          // Wet sand darkens toward the waterline.
          float wet = 1.0 - smoothstep(0.0, 6.0, vW.z - shoreZ(vW.x));
          sandC *= 1.0 - 0.35 * wet;
          vec3 grassC = texture2D(uGrass, vW.xz / 3.0).rgb * vec3(0.55, 1.05, 0.34) * 1.15;
          vec3 stoneC = texture2D(uStone, vW.xz / 2.2).rgb * vec3(1.45, 1.38, 1.26);
          vec3 col = mix(sandC, grassC, mk.g * (1.0 - mk.r));
          col = mix(col, stoneC, mk.r);
          diffuseColor.rgb *= col;`,
        )
    }
    return withNightLight(m)
  }, [])
  return <mesh geometry={geometry} material={material} receiveShadow />
}

// Arabian Gulf: turquoise shallows to deep blue, two ripple layers, foam at the waterline.
function Sea() {
  const { mat, tex } = useMemo(() => {
    const tex = rippleTexture()
    tex.repeat.set(160, 160)
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.08, metalness: 0.1, normalMap: tex, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.2, transparent: true })
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = zoneUniforms.uTime
      shader.uniforms.uNight = zoneUniforms.uNight
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vW;\nuniform float uTime;\nuniform float uNight;\n${SHORE_GLSL}`)
        .replace(
          '#include <normal_fragment_maps>',
          `vec3 n1 = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
          vec3 n2 = texture2D(normalMap, vNormalMapUv * 0.31 + vec2(uTime * 0.004, -uTime * 0.006)).xyz * 2.0 - 1.0;
          normal = normalize(tbn * normalize(vec3((n1.xy + n2.xy) * normalScale, n1.z * n2.z)));`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float dist = shoreZ(vW.x) - vW.z;
          vec3 shallow = vec3(0.18, 0.78, 0.76);
          vec3 mid = vec3(0.04, 0.42, 0.55);
          vec3 deep = vec3(0.02, 0.16, 0.32);
          vec3 c = mix(shallow, mid, smoothstep(2.0, 30.0, dist));
          c = mix(c, deep, smoothstep(30.0, 160.0, dist));
          // Foam: a band at the waterline plus incoming wave lines.
          float wave = smoothstep(0.75, 1.0, sin(dist * 0.9 - uTime * 1.6)) * (1.0 - smoothstep(2.0, 14.0, dist));
          float foam = (1.0 - smoothstep(0.0, 2.2, dist)) * 0.9 + wave * 0.55;
          c = mix(c, vec3(0.95), clamp(foam, 0.0, 1.0));
          diffuseColor.rgb = c * mix(1.0, 0.35, uNight);
          diffuseColor.a = smoothstep(-1.0, 0.6, dist) * 0.97;`,
        )
    }
    return { mat, tex }
  }, [])
  useFrame((_, dt) => {
    tex.offset.x += dt * 0.003
  })
  return (
    <mesh material={mat} position-y={SEA_Y} rotation-x={-Math.PI / 2} renderOrder={1}>
      <planeGeometry args={[3000, 3000, 1, 1]} />
    </mesh>
  )
}

function poolWaterMaterial() {
  const tex = rippleTexture()
  tex.repeat.set(0.3, 0.3)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  const m = new THREE.MeshStandardMaterial({ color: '#4fd4ec', emissive: '#30c8f0', emissiveIntensity: 0.12, roughness: 0.04, metalness: 0.05, normalMap: tex, normalScale: new THREE.Vector2(0.2, 0.2), envMapIntensity: 1.2 })
  m.userData.tex = tex
  // Moving caustic light on the pool floor, so the water reads as clear and shallow.
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = zoneUniforms.uTime
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vCW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCW = (modelMatrix * vec4(transformed, 1.0)).xz;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        varying vec2 vCW;
        float caustic(vec2 uv, float t) {
          vec2 p = mod(uv * 6.2831, 6.2831) - 250.0;
          vec2 i = p;
          float c = 1.0;
          for (int n = 0; n < 4; n++) {
            float tt = t * (1.0 - 3.5 / float(n + 1));
            i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
            c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.005), p.y / (cos(i.y + tt) / 0.005)));
          }
          c = 1.17 - pow(c / 4.0, 1.4);
          return clamp(pow(abs(c), 8.0), 0.0, 1.0);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        diffuseColor.rgb += vec3(0.55, 0.95, 1.0) * caustic(vCW / 5.0, uTime * 0.35) * 0.45;`,
      )
  }
  return m
}

function shapeFrom(points) {
  const s = new THREE.Shape()
  points.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)))
  s.closePath()
  return s
}

function Pools() {
  const { geo, mat, coping } = useMemo(() => {
    const lagoon = new THREE.ShapeGeometry(shapeFrom(POOL_OUTLINE), 2)
    const kids = new THREE.CircleGeometry(KIDS_POOL.r, 32).translate(KIDS_POOL.x, -KIDS_POOL.z, 0)
    const geo = mergeGeometries([lagoon, kids].map((g) => clean(g)))
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, LAND_Y + 0.05, 0)
    // Coping: a rounded stone edge following each outline.
    const tube = (pts) => clean(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, z]) => V(x, LAND_Y + 0.1, z)), true), 160, 0.32, 6, true))
    const ring = Array.from({ length: 32 }, (_, i) => [KIDS_POOL.x + Math.cos((i / 32) * Math.PI * 2) * KIDS_POOL.r, KIDS_POOL.z + Math.sin((i / 32) * Math.PI * 2) * KIDS_POOL.r])
    return { geo, mat: poolWaterMaterial(), coping: mergeGeometries([tube(POOL_OUTLINE), tube(ring)]) }
  }, [])
  useFrame((_, dt) => {
    mat.userData.tex.offset.x += dt * 0.03
    mat.emissiveIntensity = 0.12 + zoneUniforms.uNight.value * 1.1
  })
  return (
    <>
      <mesh geometry={geo} material={mat} receiveShadow />
      <mesh geometry={coping} receiveShadow>
        <meshStandardMaterial color="#f4efe6" roughness={0.7} />
      </mesh>
    </>
  )
}

const place = (x, y, z, yaw = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(1, 1, 1))

// Everything static and vertex-coloured, merged into one draw.
function siteGeometry() {
  const P = []
  const add = (g, color) => P.push(clean(g, color))
  const lounger = (m, color = '#ffffff') => {
    add(new THREE.BoxGeometry(0.75, 0.22, 1.9).translate(0, 0.32, 0).applyMatrix4(m), color)
    add(new THREE.BoxGeometry(0.75, 0.08, 0.7).rotateX(-0.6).translate(0, 0.6, -0.78).applyMatrix4(m), color)
  }
  const umbrella = (m, color, straw = false) => {
    add(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6).translate(0, 1.25, 0).applyMatrix4(m), straw ? '#8a6a44' : '#ddd')
    add(new THREE.ConeGeometry(straw ? 1.8 : 1.6, straw ? 0.9 : 0.5, straw ? 12 : 10).translate(0, 2.6, 0).applyMatrix4(m), color)
  }
  // --- Pool deck: loungers + umbrellas around the lagoon (sea side and wing sides).
  for (let i = 0; i < 22; i++) {
    const t = Math.PI * 0.08 + (i / 21) * Math.PI * 0.84 + Math.PI
    const k = 1.32
    const x = POOL.cx + Math.cos(t) * POOL.rx * k
    const z = POOL.cz + Math.sin(t) * POOL.rz * k * 1.6
    if (z < shoreZ(x) + 21) continue
    const yaw = Math.atan2(POOL.cx - x, POOL.cz - z)
    const m = place(x, LAND_Y, z, yaw)
    lounger(m)
    if (i % 2 === 0) umbrella(place(x + Math.cos(t) * 1.2, LAND_Y, z, 0), i % 4 ? '#f4efe6' : BRAND.accent)
  }
  for (const side of [-1, 1]) {
    for (let j = 0; j < 6; j++) {
      const x = side * (27 + (j % 2) * 3)
      const z = 4 + j * 4.5
      lounger(place(x, LAND_Y, z, side * Math.PI / 2))
    }
    // Cabanas: white canopy on four posts, daybed inside.
    for (let j = 0; j < 2; j++) {
      const cx = side * 44
      const cz = 18 + j * 9
      for (const a of [-1, 1]) for (const b of [-1, 1]) add(new THREE.BoxGeometry(0.12, 2.6, 0.12).translate(cx + a * 1.5, LAND_Y + 1.3, cz + b * 1.5), '#c9b593')
      add(new THREE.BoxGeometry(3.5, 0.15, 3.5).translate(cx, LAND_Y + 2.65, cz), '#f4efe6')
      add(new THREE.BoxGeometry(2.6, 0.45, 2.6).translate(cx, LAND_Y + 0.3, cz), '#ffffff')
    }
  }
  // Swim-up bar island: stone ring, bar counter, timber canopy, stools in the water.
  add(new THREE.CylinderGeometry(BAR.r, BAR.r + 0.2, 0.6, 32).translate(BAR.x, LAND_Y - 0.1, BAR.z), '#e6dccb')
  add(new THREE.TorusGeometry(BAR.r - 0.6, 0.35, 8, 32).rotateX(Math.PI / 2).translate(BAR.x, LAND_Y + 1.0, BAR.z), '#7a5a3c')
  add(new THREE.CylinderGeometry(0.2, 0.2, 3.2, 8).translate(BAR.x, LAND_Y + 1.6, BAR.z), '#7a5a3c')
  add(new THREE.ConeGeometry(BAR.r + 1.2, 1.4, 16).translate(BAR.x, LAND_Y + 3.6, BAR.z), '#c9a86b')
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    add(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 10).translate(BAR.x + Math.cos(a) * (BAR.r + 0.8), LAND_Y - 0.1, BAR.z + Math.sin(a) * (BAR.r + 0.8)), '#e6dccb')
  }
  // Kids splash zone: slide, mushroom fountain, coloured shade sails.
  const kx = KIDS_POOL.x
  const kz = KIDS_POOL.z
  add(new THREE.CylinderGeometry(0.15, 0.25, 1.6, 10).translate(kx, LAND_Y + 0.6, kz), '#ffd27a')
  add(new THREE.SphereGeometry(1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(kx, LAND_Y + 1.3, kz), '#ff6fa8')
  const slide = new THREE.CatmullRomCurve3([V(kx + 7, LAND_Y + 3, kz - 1), V(kx + 6, LAND_Y + 2.2, kz - 3.5), V(kx + 4, LAND_Y + 1, kz - 4), V(kx + 2.5, LAND_Y + 0.2, kz - 3)])
  add(new THREE.TubeGeometry(slide, 24, 0.5, 8), '#4fa8ff')
  add(new THREE.BoxGeometry(2, 3, 2).translate(kx + 7.5, LAND_Y + 1.5, kz), '#7fe08a')
  for (const [dx, dz, c] of [[-3, 6, '#ff6fa8'], [3, 7, '#ffd27a']]) add(new THREE.ConeGeometry(4, 0.3, 3).translate(kx + dx, LAND_Y + 3.4, kz + dz), c)
  // --- Beach: palapas with pairs of loungers, rows across the bay.
  for (let x = -66; x <= 70; x += 7.5) {
    if (Math.abs(x - PIER.x) < 6) continue
    for (const off of [9.5, 14.5]) {
      const zx = x + (off === 9.5 ? 0 : 3.6)
      const z = shoreZ(zx) + off
      const y = terrainH(zx, z)
      umbrella(place(zx, y, z), '#c9a86b', true)
      lounger(place(zx - 0.6, y, z + 1.2, Math.PI))
      lounger(place(zx + 0.6, y, z + 1.2, Math.PI))
    }
  }
  // --- Pier: deck, posts, rope-light posts.
  const len = PIER.z0 - PIER.z1
  add(new THREE.BoxGeometry(PIER.half * 2, 0.25, len).translate(PIER.x, PIER.y - 0.12, (PIER.z0 + PIER.z1) / 2), '#9a6a44')
  for (let z = PIER.z1; z <= PIER.z0; z += 6) {
    for (const s of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.16, 0.16, 4, 6).translate(PIER.x + s * (PIER.half - 0.15), PIER.y - 1.6, z), '#6b4a30')
      add(new THREE.BoxGeometry(0.1, 0.9, 0.1).translate(PIER.x + s * (PIER.half - 0.1), PIER.y + 0.45, z), '#6b4a30')
    }
  }
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.06, 0.06, len).translate(PIER.x + s * (PIER.half - 0.1), PIER.y + 0.9, (PIER.z0 + PIER.z1) / 2), '#6b4a30')
  // --- Overwater restaurant: round deck, posts, columns, teak roof, tables.
  const R = RESTAURANT
  add(new THREE.CylinderGeometry(R.r, R.r, 0.3, 48).translate(R.x, PIER.y - 0.15, R.z), '#9a6a44')
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    if (i === 3) continue // keep the pier entrance clear
    add(new THREE.CylinderGeometry(0.22, 0.22, 4, 8).translate(R.x + Math.cos(a) * (R.r - 0.8), PIER.y - 1.8, R.z + Math.sin(a) * (R.r - 0.8)), '#6b4a30')
    add(new THREE.CylinderGeometry(0.16, 0.16, 3.4, 8).translate(R.x + Math.cos(a) * (R.r - 1.4), PIER.y + 1.7, R.z + Math.sin(a) * (R.r - 1.4)), '#f4efe6')
  }
  add(new THREE.ConeGeometry(R.r + 1.2, 3.2, 24).translate(R.x, PIER.y + 5.0, R.z), '#a77b4e')
  add(new THREE.CylinderGeometry(R.r + 1.2, R.r + 1.2, 0.3, 24).translate(R.x, PIER.y + 3.4, R.z), '#6b4a30')
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3
    const r = i % 2 ? 8.5 : 5
    const x = R.x + Math.cos(a) * r
    const z = R.z + Math.sin(a) * r
    add(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 16).translate(x, PIER.y + 0.78, z), '#f4efe6')
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6).translate(x, PIER.y + 0.38, z), '#333')
    for (let c = 0; c < 2; c++) add(new THREE.BoxGeometry(0.45, 0.45, 0.45).translate(x + (c ? 0.9 : -0.9), PIER.y + 0.23, z), '#e9dcc8')
  }
  // --- Beach villas: white boxes, timber screens, deck and plunge pool on the sea side.
  for (const v of VILLAS) {
    P.push(prism([[v.x - 5.5, v.z - 2], [v.x + 5.5, v.z - 2], [v.x + 5.5, v.z + 7], [v.x - 5.5, v.z + 7]], LAND_Y, LAND_Y + 3.6, { color: '#f6f1e8' }))
    add(new THREE.BoxGeometry(12.6, 0.3, 10.4).translate(v.x, LAND_Y + 3.75, v.z + 2.5), '#ece3d4')
    for (let k = 0; k < 13; k++) add(new THREE.BoxGeometry(0.08, 3, 0.08).translate(v.x - 4.2 + k * 0.7, LAND_Y + 1.7, v.z - 2.2), '#8a5a36')
    add(new THREE.BoxGeometry(11, 0.2, 6).translate(v.x, LAND_Y + 0.1, v.z - 5.2), '#9a6a44')
    lounger(place(v.x + 3, LAND_Y + 0.2, v.z - 5, Math.PI))
    lounger(place(v.x + 4.2, LAND_Y + 0.2, v.z - 5, Math.PI))
  }
  // --- Spa: white pavilion with an arched colonnade and three small domes.
  P.push(prism([[SPA.x - SPA.w / 2, SPA.z - SPA.d / 2], [SPA.x + SPA.w / 2, SPA.z - SPA.d / 2], [SPA.x + SPA.w / 2, SPA.z + SPA.d / 2], [SPA.x - SPA.w / 2, SPA.z + SPA.d / 2]], LAND_Y, LAND_Y + 5, { color: '#f6f1e8' }))
  for (let i = 0; i < 6; i++) {
    const g = archPanel(3.7, 4.6, { depth: 0.5 }).translate(SPA.x - SPA.w / 2 + 1.85 + i * 3.67, LAND_Y, SPA.z + SPA.d / 2 + 2)
    add(g, '#f6f1e8')
  }
  add(new THREE.BoxGeometry(SPA.w + 0.4, 0.4, 2.6).translate(SPA.x, LAND_Y + 4.8, SPA.z + SPA.d / 2 + 1), '#f6f1e8')
  for (const dx of [-6, 0, 6]) add(new THREE.SphereGeometry(dx ? 2 : 2.8, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(SPA.x + dx, LAND_Y + 5, SPA.z), '#f6f1e8')
  // --- Arrival: porte-cochère, roundabout fountain.
  for (const x of [-7, 7]) for (const z of [TOWER.z1 + 2, TOWER.z1 + 12]) add(new THREE.CylinderGeometry(0.45, 0.45, 5, 16).translate(x, LAND_Y + 2.5, z), '#f6f1e8')
  add(new THREE.BoxGeometry(17, 0.6, 13).translate(0, LAND_Y + 5.3, TOWER.z1 + 7), '#f6f1e8')
  add(new THREE.BoxGeometry(17.2, 0.15, 13.2).translate(0, LAND_Y + 5.68, TOWER.z1 + 7), '#c9a35a')
  add(new THREE.CylinderGeometry(4.5, 4.8, 0.7, 32).translate(ARRIVAL.x, LAND_Y + 0.35, ARRIVAL.z + 6), '#e6dccb')
  add(new THREE.CylinderGeometry(0.4, 0.6, 2.2, 12).translate(ARRIVAL.x, LAND_Y + 1.4, ARRIVAL.z + 6), '#e6dccb')
  add(new THREE.CylinderGeometry(1.8, 0.8, 0.4, 20).translate(ARRIVAL.x, LAND_Y + 2.6, ARRIVAL.z + 6), '#e6dccb')
  return mergeGeometries(P)
}

function WaterSurfaces() {
  const mat = useMemo(poolWaterMaterial, [])
  useFrame(() => {
    mat.emissiveIntensity = 0.12 + zoneUniforms.uNight.value * 1.1
  })
  const list = useMemo(
    () => [
      ...VILLAS.map((v) => ({ p: V(v.x - 2.5, LAND_Y + 0.22, v.z - 5.2), w: 4.5, d: 2.6 })),
      { p: V(ARRIVAL.x, LAND_Y + 0.68, ARRIVAL.z + 6), w: 0, d: 0, r: 4.3 },
    ],
    [],
  )
  return list.map((s, i) => (
    <mesh key={i} material={mat} position={s.p} rotation-x={-Math.PI / 2}>
      {s.r ? <circleGeometry args={[s.r, 32]} /> : <planeGeometry args={[s.w, s.d]} />}
    </mesh>
  ))
}

// Fairy lights: restaurant roof edge, pier rails, beach promenade.
function Lights() {
  const mesh = useMemo(() => {
    const pts = []
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2
      pts.push(V(RESTAURANT.x + Math.cos(a) * (RESTAURANT.r + 1.1), PIER.y + 3.3, RESTAURANT.z + Math.sin(a) * (RESTAURANT.r + 1.1)))
    }
    for (let z = PIER.z1; z <= PIER.z0; z += 1.5) for (const s of [-1, 1]) pts.push(V(PIER.x + s * (PIER.half - 0.1), PIER.y + 0.95, z))
    for (let x = -168; x <= 168; x += 4) {
      const z = shoreZ(x) + 18.2
      pts.push(V(x, terrainH(x, z) + 0.15, z))
    }
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 8, 6), bulbMat, pts.length)
    pts.forEach((p, i) => m.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)))
    m.computeBoundingSphere()
    return m
  }, [])
  return <primitive object={mesh} />
}

export default function HotelSite() {
  const site = useMemo(siteGeometry, [])
  const mat = useMemo(() => withNightLight(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide })), [])
  return (
    <>
      <Ground />
      <Sea />
      <Pools />
      <WaterSurfaces />
      <mesh geometry={site} material={mat} castShadow receiveShadow />
      <Lights />
      <Palms items={PALM_SPOTS} />
    </>
  )
}

