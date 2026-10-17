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
import { detailed, hotelMaterials } from './materials'
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
  // Lawns: a garden belt behind the hotel (desert sand beyond), around villas and spa.
  ctx.fillStyle = '#0f0'
  ctx.fillRect(...px(-180, 20), 360 * k, 130 * k)
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
    const stone = pbrSet('marble_01', 1)
    const m = new THREE.MeshStandardMaterial({ map: sand.map, normalMap: sand.normalMap, normalScale: new THREE.Vector2(1, 1), roughness: 1 })
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, { uMask: { value: paintMask() }, uGrass: { value: grass.map }, uStone: { value: stone.map }, uStoneN: { value: stone.normalMap }, uStoneArm: { value: stone.arm } })
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vW;\nuniform sampler2D uMask;\nuniform sampler2D uGrass;\nuniform sampler2D uStone;\nuniform sampler2D uStoneN;\nuniform sampler2D uStoneArm;\n${SHORE_GLSL}`)
        .replace(
          '#include <map_fragment>',
          `vec2 muv = vec2((vW.x + ${MASK_E.toFixed(1)}) / ${(2 * MASK_E).toFixed(1)}, 1.0 - (vW.z + ${MASK_E.toFixed(1)}) / ${(2 * MASK_E).toFixed(1)});
          vec3 mk = texture2D(uMask, muv).rgb;
          vec3 sandC = texture2D(map, vW.xz / 7.0).rgb * vec3(1.32, 1.12, 0.86);
          // Wet sand darkens toward the waterline.
          float wet = 1.0 - smoothstep(0.0, 6.0, vW.z - shoreZ(vW.x));
          sandC *= 1.0 - 0.35 * wet;
          vec3 grassC = texture2D(uGrass, vW.xz / 3.0).rgb * vec3(0.55, 1.05, 0.34) * 1.15;
          // Travertine-style pavers: large pale tiles (about 1.2 m), satin finish.
          vec2 stUv = vec2(vW.x, -vW.z) / 2.4;
          vec3 stoneC = texture2D(uStone, stUv).rgb * vec3(1.62, 1.72, 2.05);
          vec3 col = mix(sandC, grassC, mk.g * (1.0 - mk.r));
          col = mix(col, stoneC, mk.r);
          diffuseColor.rgb *= col;`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `float roughnessFactor = mix(mix(1.0, 0.85, mk.g), 0.42 + 0.35 * texture2D(uStoneArm, stUv).g, mk.r);
          // Wet sand at the waterline is smoother and catches the sky.
          roughnessFactor = mix(roughnessFactor, 0.5, wet * 0.8 * (1.0 - mk.r));`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          `vec3 nSand = texture2D(normalMap, vec2(vW.x, -vW.z) / 7.0).xyz * 2.0 - 1.0;
          vec3 nStone = texture2D(uStoneN, stUv).xyz * 2.0 - 1.0;
          vec3 mapN = mix(vec3(nSand.xy * 0.35 * (1.0 - wet), nSand.z), vec3(nStone.xy * 0.9, nStone.z), mk.r);
          normal = normalize(tbn * mapN);`,
        )
    }
    return withNightLight(m)
  }, [])
  // Inland apron so the distant skyline stands on ground, not past the edge of the world.
  return (
    <>
      <mesh geometry={geometry} material={material} receiveShadow />
      {[
        [0, 1210, 3200, 1520],
        [1025, 240, 1150, 420],
        [-1025, 240, 1150, 420],
      ].map(([x, z, w, d]) => (
        <mesh key={x + ':' + z} material={material} position={[x, LAND_Y, z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[w, d]} />
        </mesh>
      ))}
    </>
  )
}

// Arabian Gulf: turquoise shallows to deep blue, two ripple layers, foam at the waterline.
function Sea() {
  const { mat, tex } = useMemo(() => {
    const tex = rippleTexture()
    tex.repeat.set(160, 160)
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.09, metalness: 0, normalMap: tex, normalScale: new THREE.Vector2(0.45, 0.45), envMapIntensity: 1.5, transparent: true })
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
          vec3 n3 = texture2D(normalMap, vNormalMapUv * 0.067 + vec2(-uTime * 0.0015, uTime * 0.001)).xyz * 2.0 - 1.0;
          // Ripples fade with distance (no shimmer far out); big swells stay.
          float seaFar = smoothstep(60.0, 600.0, length(vViewPosition));
          vec2 sw = (n1.xy * (1.0 - seaFar) + n2.xy * (1.0 - 0.6 * seaFar) + n3.xy * 0.8) * normalScale;
          normal = normalize(tbn * normalize(vec3(sw, 1.0)));`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float dist = shoreZ(vW.x) - vW.z;
          // Body colour only; the sky reflection (env map, fresnel) carries the rest.
          vec3 shallow = vec3(0.16, 0.68, 0.64);
          vec3 mid = vec3(0.02, 0.3, 0.4);
          vec3 deep = vec3(0.008, 0.08, 0.16);
          vec3 c = mix(shallow, mid, smoothstep(2.0, 30.0, dist));
          c = mix(c, deep, smoothstep(30.0, 160.0, dist));
          // Foam: a band at the waterline plus incoming wave lines.
          float wave = smoothstep(0.75, 1.0, sin(dist * 0.9 - uTime * 1.6)) * (1.0 - smoothstep(2.0, 14.0, dist));
          float foam = (1.0 - smoothstep(0.0, 2.2, dist)) * 0.9 + wave * 0.55;
          c = mix(c, vec3(0.95), clamp(foam, 0.0, 1.0));
          diffuseColor.rgb = c * mix(1.0, 0.45, uNight);
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

// Pool water: shallow edges to a deeper middle, mosaic tile grid seen through the water,
// moving caustics. basin = [cx, cz, rx, rz] of the main pool (others read as uniform depth).
function poolWaterMaterial(basin = [POOL.cx, POOL.cz, POOL.rx, POOL.rz]) {
  const tex = rippleTexture()
  tex.repeat.set(0.3, 0.3)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#30c8f0', emissiveIntensity: 0, roughness: 0.03, metalness: 0, normalMap: tex, normalScale: new THREE.Vector2(0.25, 0.25), envMapIntensity: 1.0 })
  m.customProgramCacheKey = () => 'pool:' + basin.join(',')
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
        vec2 bq = (vCW - vec2(${basin[0].toFixed(2)}, ${basin[1].toFixed(2)})) / vec2(${basin[2].toFixed(2)}, ${basin[3].toFixed(2)});
        float depth = 1.0 - smoothstep(0.35, 1.05, length(bq));
        vec3 water = mix(vec3(0.14, 0.6, 0.68), vec3(0.015, 0.26, 0.46), depth);
        vec2 tg = abs(fract(vCW / 0.6) - 0.5);
        float grout = 1.0 - smoothstep(0.0, 0.04, min(tg.x, tg.y));
        water *= 1.0 - grout * 0.12 * (1.0 - depth * 0.6);
        water += vec3(0.5, 0.9, 1.0) * caustic(vCW / 5.0, uTime * 0.35) * mix(0.32, 0.16, depth);
        diffuseColor.rgb = water;`,
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
  const copingMat = useMemo(() => withNightLight(detailed(new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.55 }), 'marble_01', { scale: 0.5, detail: 0.4 })), [])
  useFrame((_, dt) => {
    mat.userData.tex.offset.x += dt * 0.03
    mat.emissiveIntensity = zoneUniforms.uNight.value * 1.1
  })
  return (
    <>
      <mesh geometry={geo} material={mat} receiveShadow />
      <mesh geometry={coping} material={copingMat} receiveShadow />
    </>
  )
}

const place = (x, y, z, yaw = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(1, 1, 1))

// Everything static and vertex-coloured, merged into one draw per surface type
// (paint, wood, fabric, thatch, stone), each with its own physical material.
function siteGeometry() {
  const K = { paint: [], wood: [], fabric: [], thatch: [], stone: [] }
  const P = K.paint
  const add = (g, color, kind = 'paint') => K[kind].push(clean(g, color))
  const lounger = (m, color = '#f7f3ea') => {
    // Teak frame with legs, a thick linen cushion and a raised back.
    add(new THREE.BoxGeometry(0.72, 0.1, 1.95).translate(0, 0.22, 0).applyMatrix4(m), '#8a5a36', 'wood')
    for (const a of [-1, 1]) for (const b of [-1, 1]) add(new THREE.BoxGeometry(0.06, 0.2, 0.06).translate(a * 0.3, 0.1, b * 0.85).applyMatrix4(m), '#6b4428', 'wood')
    add(new THREE.BoxGeometry(0.68, 0.12, 1.25).translate(0, 0.33, 0.3).applyMatrix4(m), color, 'fabric')
    add(new THREE.BoxGeometry(0.68, 0.1, 0.72).rotateX(-0.55).translate(0, 0.52, -0.62).applyMatrix4(m), color, 'fabric')
  }
  const umbrella = (m, color, straw = false) => {
    add(new THREE.CylinderGeometry(0.05, 0.06, 2.5, 8).translate(0, 1.25, 0).applyMatrix4(m), straw ? '#7a5634' : '#c9b593', 'wood')
    if (straw) {
      add(new THREE.ConeGeometry(1.8, 0.95, 16, 2).translate(0, 2.62, 0).applyMatrix4(m), '#c2a06a', 'thatch')
      add(new THREE.CylinderGeometry(1.82, 1.86, 0.18, 16, 1, true).translate(0, 2.08, 0).applyMatrix4(m), '#a88a58', 'thatch')
    } else {
      // Eight-rib canopy with a scalloped valance.
      add(new THREE.ConeGeometry(1.6, 0.45, 8, 1, true).translate(0, 2.62, 0).applyMatrix4(m), color, 'fabric')
      add(new THREE.CylinderGeometry(1.6, 1.6, 0.2, 8, 1, true).translate(0, 2.3, 0).applyMatrix4(m), color, 'fabric')
      add(new THREE.SphereGeometry(0.07, 8, 6).translate(0, 2.88, 0).applyMatrix4(m), '#c9a35a')
    }
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
      for (const a of [-1, 1]) for (const b of [-1, 1]) add(new THREE.BoxGeometry(0.12, 2.6, 0.12).translate(cx + a * 1.5, LAND_Y + 1.3, cz + b * 1.5), '#8a5a36', 'wood')
      add(new THREE.BoxGeometry(3.5, 0.15, 3.5).translate(cx, LAND_Y + 2.65, cz), '#f4efe6', 'fabric')
      // Drapes tied back at the four corners.
      for (const a of [-1, 1]) for (const b of [-1, 1]) add(new THREE.CylinderGeometry(0.14, 0.32, 2.4, 8).translate(cx + a * 1.62, LAND_Y + 1.35, cz + b * 1.62), '#fbf8f2', 'fabric')
      add(new THREE.BoxGeometry(2.7, 0.3, 2.7).translate(cx, LAND_Y + 0.2, cz), '#8a5a36', 'wood')
      add(new THREE.BoxGeometry(2.6, 0.25, 2.6).translate(cx, LAND_Y + 0.47, cz), '#ffffff', 'fabric')
      for (const o of [-0.8, 0, 0.8]) add(new THREE.BoxGeometry(0.6, 0.35, 0.18).translate(cx + o, LAND_Y + 0.75, cz + 1.1), o ? '#e0b25a' : '#2f6f7a', 'fabric')
    }
  }
  // Swim-up bar island: stone ring, bar counter, timber canopy, stools in the water.
  add(new THREE.CylinderGeometry(BAR.r, BAR.r + 0.2, 0.6, 48).translate(BAR.x, LAND_Y - 0.1, BAR.z), '#efe6d6', 'stone')
  add(new THREE.TorusGeometry(BAR.r - 0.6, 0.35, 10, 48).rotateX(Math.PI / 2).translate(BAR.x, LAND_Y + 1.0, BAR.z), '#7a5a3c', 'wood')
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    add(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8).translate(BAR.x + Math.cos(a) * 1.4, LAND_Y + 1.6, BAR.z + Math.sin(a) * 1.4), '#7a5a3c', 'wood')
  }
  add(new THREE.ConeGeometry(BAR.r + 1.2, 1.4, 24, 2).translate(BAR.x, LAND_Y + 3.6, BAR.z), '#c2a06a', 'thatch')
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    add(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 12).translate(BAR.x + Math.cos(a) * (BAR.r + 0.8), LAND_Y - 0.1, BAR.z + Math.sin(a) * (BAR.r + 0.8)), '#efe6d6', 'stone')
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
  add(new THREE.BoxGeometry(PIER.half * 2, 0.25, len).translate(PIER.x, PIER.y - 0.12, (PIER.z0 + PIER.z1) / 2), '#b8875c', 'wood')
  for (let z = PIER.z1; z <= PIER.z0; z += 6) {
    for (const s of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.16, 0.18, 4, 10).translate(PIER.x + s * (PIER.half - 0.15), PIER.y - 1.6, z), '#5a3e28', 'wood')
      add(new THREE.BoxGeometry(0.1, 0.9, 0.1).translate(PIER.x + s * (PIER.half - 0.1), PIER.y + 0.45, z), '#6b4a30', 'wood')
    }
  }
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.08, 0.08, len).translate(PIER.x + s * (PIER.half - 0.1), PIER.y + 0.9, (PIER.z0 + PIER.z1) / 2), '#6b4a30', 'wood')
  // --- Overwater restaurant: round deck, posts, columns, teak roof, tables.
  const R = RESTAURANT
  add(new THREE.CylinderGeometry(R.r, R.r, 0.3, 64).translate(R.x, PIER.y - 0.15, R.z), '#b8875c', 'wood')
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    if (i === 3) continue // keep the pier entrance clear
    add(new THREE.CylinderGeometry(0.22, 0.24, 4, 10).translate(R.x + Math.cos(a) * (R.r - 0.8), PIER.y - 1.8, R.z + Math.sin(a) * (R.r - 0.8)), '#5a3e28', 'wood')
    add(new THREE.CylinderGeometry(0.16, 0.16, 3.4, 8).translate(R.x + Math.cos(a) * (R.r - 1.4), PIER.y + 1.7, R.z + Math.sin(a) * (R.r - 1.4)), '#f4efe6')
  }
  add(new THREE.ConeGeometry(R.r + 1.2, 3.2, 48, 3).translate(R.x, PIER.y + 5.0, R.z), '#c2a06a', 'thatch')
  add(new THREE.CylinderGeometry(R.r + 1.2, R.r + 1.2, 0.3, 48).translate(R.x, PIER.y + 3.4, R.z), '#6b4a30', 'wood')
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3
    const r = i % 2 ? 8.5 : 5
    const x = R.x + Math.cos(a) * r
    const z = R.z + Math.sin(a) * r
    add(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 16).translate(x, PIER.y + 0.78, z), '#f4efe6')
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6).translate(x, PIER.y + 0.38, z), '#333')
    for (let c = 0; c < 2; c++) add(new THREE.BoxGeometry(0.45, 0.45, 0.45).translate(x + (c ? 0.9 : -0.9), PIER.y + 0.23, z), '#e9dcc8', 'fabric')
  }
  // --- Beach villas: white boxes, timber screens, deck and plunge pool on the sea side.
  for (const v of VILLAS) {
    P.push(prism([[v.x - 5.5, v.z - 2], [v.x + 5.5, v.z - 2], [v.x + 5.5, v.z + 7], [v.x - 5.5, v.z + 7]], LAND_Y, LAND_Y + 3.6, { color: '#f6f1e8' }))
    add(new THREE.BoxGeometry(12.6, 0.3, 10.4).translate(v.x, LAND_Y + 3.75, v.z + 2.5), '#ece3d4')
    for (let k = 0; k < 13; k++) add(new THREE.BoxGeometry(0.08, 3, 0.08).translate(v.x - 4.2 + k * 0.7, LAND_Y + 1.7, v.z - 2.2), '#8a5a36', 'wood')
    add(new THREE.BoxGeometry(11, 0.2, 6).translate(v.x, LAND_Y + 0.1, v.z - 5.2), '#b8875c', 'wood')
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
  add(new THREE.CylinderGeometry(4.5, 4.8, 0.7, 48).translate(ARRIVAL.x, LAND_Y + 0.35, ARRIVAL.z + 6), '#efe6d6', 'stone')
  add(new THREE.CylinderGeometry(0.4, 0.6, 2.2, 16).translate(ARRIVAL.x, LAND_Y + 1.4, ARRIVAL.z + 6), '#efe6d6', 'stone')
  add(new THREE.CylinderGeometry(1.8, 0.8, 0.4, 32).translate(ARRIVAL.x, LAND_Y + 2.6, ARRIVAL.z + 6), '#efe6d6', 'stone')
  return Object.fromEntries(Object.entries(K).map(([k, list]) => [k, mergeGeometries(list)]))
}

function WaterSurfaces() {
  const mat = useMemo(() => poolWaterMaterial([0, 0, 1e4, 1e4]), [])
  useFrame(() => {
    mat.emissiveIntensity = zoneUniforms.uNight.value * 1.1
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
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), bulbMat, pts.length)
    pts.forEach((p, i) => m.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)))
    m.computeBoundingSphere()
    return m
  }, [])
  return <primitive object={mesh} />
}

export default function HotelSite() {
  const site = useMemo(siteGeometry, [])
  const mats = useMemo(hotelMaterials, [])
  return (
    <>
      <Ground />
      <Sea />
      <Pools />
      <WaterSurfaces />
      {Object.keys(site).map((k) => (
        <mesh key={k} geometry={site[k]} material={mats[k]} castShadow receiveShadow />
      ))}
      <Lights />
      <Palms items={PALM_SPOTS} />
    </>
  )
}

