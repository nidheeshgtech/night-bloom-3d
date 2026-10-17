import * as THREE from 'three'
import { getAtlas } from './botany/atlas'

// Set when static shadow casters are added, so the cached shadow map is re-rendered.
export const shadows = { dirty: true }

// Time uniform for vegetation wind, advanced by the zone lighting rig.
export const zoneUniforms = {
  uTime: { value: 0 },
  uNight: { value: 0 },
  uPlayer: { value: new THREE.Vector3(0, -999, 0) },
  uBurstPos: { value: new THREE.Vector3(0, -999, 0) },
  uBurstTime: { value: -999 },
}

let plant = null
let plantDepth = null

// One material for all vegetation: atlas texture, vertex colours, alpha-tested outlines,
// per-instance flower colour masked by aTint, and a gentle height-weighted sway.
export function plantMaterial() {
  if (plant) return plant
  plant = new THREE.MeshStandardMaterial({
    map: getAtlas(),
    vertexColors: true,
    side: THREE.DoubleSide,
    alphaTest: 0.5,
    roughness: 0.62,
    metalness: 0,
  })
  plant.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = zoneUniforms.uTime
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aTint;
        uniform float uTime;`,
      )
      .replace(
        '#include <color_vertex>',
        `// vColor is vec3 or vec4 depending on three's defines; this form works for both.
        vColor *= 0.0;
        vColor += 1.0;
        #ifdef USE_COLOR
          vColor.rgb *= color.rgb;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vColor.rgb *= mix(vec3(1.0), instanceColor.rgb, aTint);
        #endif`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = instanceMatrix[3].xyz;
        #else
          vec3 ip = vec3(0.0);
        #endif
        float sway = abs(position.y);
        float ph = ip.x * 0.7 + ip.z * 0.5;
        transformed.x += sin(uTime * 1.6 + ph) * 0.03 * sway;
        transformed.z += cos(uTime * 1.3 + ph * 1.3) * 0.02 * sway;`,
      )
  }
  return plant
}

// Shadow depth for alpha-tested vegetation so leaf outlines cast correct shadows.
export function plantDepthMaterial() {
  if (plantDepth) return plantDepth
  plantDepth = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: getAtlas(),
    alphaTest: 0.5,
  })
  return plantDepth
}

const loader = new THREE.TextureLoader()
const cache = new Map()

// Poly Haven PBR set: diff (sRGB), nor_gl, arm (AO/roughness/metal packed in R/G/B).
export function pbrSet(name, repeat) {
  const key = `${name}:${repeat}`
  if (cache.has(key)) return cache.get(key)
  const load = (file, srgb) => {
    const t = loader.load(`${import.meta.env.BASE_URL}assets/textures/${name}/${file}.jpg`)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeat, repeat)
    t.anisotropy = 8
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    return t
  }
  const set = { map: load('diff', true), normalMap: load('nor_gl'), arm: load('arm') }
  cache.set(key, set)
  return set
}

// Structural and prop materials.
export const metalMat = new THREE.MeshStandardMaterial({ color: '#2b2520', metalness: 0.75, roughness: 0.4 })
export const terracottaMat = new THREE.MeshStandardMaterial({ color: '#b4613d', roughness: 0.85 })
export const woodMat = new THREE.MeshStandardMaterial({ color: '#8a5a36', roughness: 0.65 })
export const concreteMat = new THREE.MeshStandardMaterial({ color: '#7d776d', roughness: 0.95 })
// Lamp glass and arch string lights; emissive intensity follows time of day.
export const bulbMat = new THREE.MeshStandardMaterial({ color: '#cfc6b4', emissive: '#ffc780', emissiveIntensity: 0, roughness: 0.3 })

// Fanous (traditional lantern) panels: brass lattice pierced with 8-point stars.
function starLattice() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#3a2810'
  ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = '#ffe2b0'
  const star = (x, y, r) => {
    ctx.beginPath()
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.PI / 8
      const rr = i % 2 ? r * 0.62 : r
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    }
    ctx.closePath()
    ctx.fill()
  }
  for (const [x, y] of [[32, 32], [96, 32], [32, 96], [96, 96]]) star(x, y, 22)
  for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128], [64, 64], [64, 0], [0, 64], [128, 64], [64, 128]]) {
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}
const lattice = starLattice()
export const brassMat = new THREE.MeshStandardMaterial({ color: '#b08440', metalness: 0.9, roughness: 0.35 })
export const fanousGlassMat = new THREE.MeshStandardMaterial({
  map: lattice,
  emissiveMap: lattice,
  emissive: '#ffb860',
  emissiveIntensity: 0.15,
  roughness: 0.5,
  metalness: 0.3,
  side: THREE.DoubleSide,
})

// Wind-tower pavilion interiors: dark by day, warm glow through the screens at night.
export const pavilionGlowMat = new THREE.MeshStandardMaterial({ color: '#1a120c', emissive: '#ff8a3a', emissiveIntensity: 0, roughness: 0.9 })
