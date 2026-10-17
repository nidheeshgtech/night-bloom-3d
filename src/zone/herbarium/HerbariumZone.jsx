import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import Instances from '../Instances'
import LodInstances, { PLANT_FAR } from '../LodInstances'
import Palms from '../Palms'
import Fanous from '../Fanous'
import { pavingMaterial } from '../Path'
import { Builder } from '../botany/builder'
import { cypressGeometry, fruitTreeGeometry, ghafGeometry, hedgeAlong } from '../foliage'
import { getLibrary } from '../library'
import { brassMat, fanousGlassMat, pbrSet, plantMaterial, plantDepthMaterial, zoneUniforms } from '../materials'
import { makePath } from '../../world/pathlib'
import { withNightLight } from '../nightlight'
import { rippleTexture } from '../../world/Lake'
import { rosetteMaterial } from '../../world/patterns'
import { useGarden } from '../../lib/store'
import { mulberry32 } from '../../lib/random'
import { C, CH, FOUNTAIN_R, PAV, PAV_FACE, PAVING, PLAZA_R, POOL, WATER_Y, toWorld } from './layout'
import { CYPRESSES, FRUIT_TREES, HERB_GHAF, HERB_PALMS, QUARTER_HEDGES, herbBeds } from './planting'
import { HERB_FEATURES } from './features'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const ni = (g) => (g.index ? g.toNonIndexed() : g)
const X = V(1, 0, 0)

// Flat grid over a local rectangle, uv in metres / uvScale.
function rectGeo(R0, R1, l0, l1, lift, uvScale = 1.6, step = 1) {
  const [a0, a1] = [Math.min(R0, R1), Math.max(R0, R1)]
  const [b0, b1] = [Math.min(l0, l1), Math.max(l0, l1)]
  const nR = Math.max(1, Math.ceil((a1 - a0) / step))
  const nl = Math.max(1, Math.ceil((b1 - b0) / step))
  const pos = []
  const uv = []
  const idx = []
  for (let i = 0; i <= nR; i++) {
    for (let j = 0; j <= nl; j++) {
      const R = a0 + ((a1 - a0) * i) / nR
      const l = b0 + ((b1 - b0) * j) / nl
      const p = toWorld(R, l, lift)
      pos.push(p.x, p.y, p.z)
      uv.push(l / uvScale, R / uvScale)
    }
  }
  const w = nl + 1
  for (let i = 0; i < nR; i++) {
    for (let j = 0; j < nl; j++) {
      const k = i * w + j
      idx.push(k, k + 1, k + w, k + 1, k + w + 1, k + w)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g.toNonIndexed()
}

// Box along a local segment, sitting on the ground (bottom at y0 above ground).
function segBox(R0, l0, R1, l1, w, h, y0) {
  const a = toWorld(R0, l0)
  const b = toWorld(R1, l1)
  const mid = a.clone().lerp(b, 0.5)
  const dir = b.clone().sub(a).setY(0)
  const len = dir.length()
  return new THREE.Matrix4().compose(V(mid.x, mid.y + y0 + h / 2, mid.z), new THREE.Quaternion().setFromUnitVectors(X, dir.normalize()), V(len, h, w))
}

// Polygon fan in local coordinates (water octagon).
function fanGeo(pts, lift) {
  const c = pts.reduce((s, [R, l]) => [s[0] + R / pts.length, s[1] + l / pts.length], [0, 0])
  const pos = []
  const uv = []
  pts.forEach(([R, l], i) => {
    const [R2, l2] = pts[(i + 1) % pts.length]
    for (const [r, ll] of [c, [R, l], [R2, l2]]) {
      const p = toWorld(r, ll, lift)
      pos.push(p.x, p.y, p.z)
      uv.push(ll / 1.6, r / 1.6)
    }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  if (g.attributes.normal.getY(0) < 0) {
    // Fix winding so the water faces up.
    const p = g.attributes.position
    for (let i = 0; i < p.count; i += 3) {
      const t = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)]
      p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2))
      p.setXYZ(i + 2, ...t)
    }
    g.computeVertexNormals()
  }
  return g
}

// Fanous lanterns: four on the fountain plaza between the channels, four at the corners.
const LANTERNS = [
  ...[1, 3, 5, 7].map((k) => toWorld(C + Math.cos((k * Math.PI) / 4) * 4.7, Math.sin((k * Math.PI) / 4) * 4.7)),
  ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => toWorld(C + a * 18.8, b * 18.8)),
]

const OCT = (r) => Array.from({ length: 8 }, (_, k) => [C + Math.cos((k * Math.PI) / 4 + Math.PI / 8) * r, Math.sin((k * Math.PI) / 4 + Math.PI / 8) * r])

// Raised water: four channels, the fountain pool, the entrance pool; plus their coping.
function waterworks() {
  const water = []
  const coping = []
  const COP_W = 0.3
  const COP_H = 0.36
  const COP_Y = -0.06
  const arm = (axis, s) => {
    const a = C + s * (FOUNTAIN_R + 0.15)
    const b = C + s * CH.end
    const h = CH.half
    const P = (u, v) => (axis === 'R' ? [u, v] : [C + v, u - C])
    const [R0, l0] = P(a, -h)
    const [R1, l1] = P(b, h)
    water.push(rectGeo(R0, R1, l0, l1, WATER_Y, 1.6, 1))
    for (const side of [-1, 1]) coping.push(segBox(...P(a, side * (h + 0.15)), ...P(b, side * (h + 0.15)), COP_W, COP_H, COP_Y))
    coping.push(segBox(...P(b + s * 0.15, -(h + 0.3)), ...P(b + s * 0.15, h + 0.3), COP_W, COP_H, COP_Y))
  }
  for (const s of [-1, 1]) {
    arm('R', s)
    arm('l', s)
  }
  water.push(fanGeo(OCT(FOUNTAIN_R + 0.05), WATER_Y))
  const oct = OCT(FOUNTAIN_R + 0.2)
  oct.forEach((p, i) => coping.push(segBox(...p, ...oct[(i + 1) % 8], 0.4, 0.46, COP_Y)))
  water.push(rectGeo(POOL.r0, POOL.r1, -POOL.half, POOL.half, WATER_Y + 0.08))
  const h = POOL.half + 0.15
  const c = [[POOL.r0 - 0.15, -h - 0.15], [POOL.r1 + 0.15, -h - 0.15], [POOL.r1 + 0.15, h + 0.15], [POOL.r0 - 0.15, h + 0.15]]
  c.forEach((p, i) => coping.push(segBox(...p, ...c[(i + 1) % 4], COP_W, 0.48, COP_Y)))
  return { water: mergeGeometries(water), coping }
}

function Water({ geometry }) {
  const { mat, tex } = useMemo(() => {
    const tex = rippleTexture()
    tex.repeat.set(1.5, 1.5)
    const mat = new THREE.MeshStandardMaterial({ color: '#1a4a52', emissive: '#1f9fc0', emissiveIntensity: 0, roughness: 0.04, metalness: 0.1, normalMap: tex, normalScale: new THREE.Vector2(0.3, 0.3), envMapIntensity: 1.4 })
    return { mat, tex }
  }, [])
  useFrame((_, dt) => {
    tex.offset.y -= dt * 0.08
    mat.emissiveIntensity = zoneUniforms.uNight.value * 0.55
  })
  return <mesh geometry={geometry} material={mat} receiveShadow />
}

function InstancedBoxes({ matrices, material }) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, matrices.length)
    matrices.forEach((x, i) => m.setMatrixAt(i, x))
    m.castShadow = m.receiveShadow = true
    m.computeBoundingSphere()
    return m
  }, [matrices, material])
  return <primitive object={mesh} />
}

// Two-tier stone fountain with an umbrella of falling water.
const FOUNTAIN_PROFILE = [
  [0, 0], [0.5, 0], [0.45, 0.2], [0.25, 0.35], [0.22, 0.75], [1.25, 0.85], [1.3, 0.95], [1.2, 1.0], [0.3, 1.0],
  [0.18, 1.15], [0.16, 1.55], [0.6, 1.62], [0.62, 1.7], [0.55, 1.73], [0.12, 1.75], [0.08, 1.95], [0, 2.0],
].map(([x, y]) => new THREE.Vector2(x, y))

function Fountain({ stone }) {
  const base = toWorld(C, 0, WATER_Y - 0.15)
  const basin = useMemo(() => new THREE.LatheGeometry(FOUNTAIN_PROFILE, 32), [])
  const jets = useMemo(() => {
    const rand = mulberry32(8)
    const N = 420
    const dir = []
    const ph = []
    const tier = []
    for (let i = 0; i < N; i++) {
      const a = rand() * Math.PI * 2
      dir.push(Math.cos(a), Math.sin(a))
      ph.push(rand())
      tier.push(i % 3 === 0 ? 1 : 0)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3))
    g.setAttribute('aDir', new THREE.Float32BufferAttribute(dir, 2))
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(ph, 1))
    g.setAttribute('aTier', new THREE.Float32BufferAttribute(tier, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: zoneUniforms.uTime, uNight: zoneUniforms.uNight },
      vertexShader: /* glsl */ `
        attribute vec2 aDir;
        attribute float aPhase;
        attribute float aTier;
        uniform float uTime;
        varying float vA;
        void main() {
          // Top jet arcs out and falls into the upper bowl; lower tier spills over the bowl rim.
          float T = aTier > 0.5 ? 0.55 : 0.42;
          float t = fract(uTime / T + aPhase) * T;
          vec3 p;
          if (aTier > 0.5) {
            p = vec3(aDir.x * 1.25, 1.0, aDir.y * 1.25) + vec3(aDir.x * 0.5 * t, -4.9 * t * t, aDir.y * 0.5 * t);
          } else {
            p = vec3(0.0, 2.0, 0.0) + vec3(aDir.x * 1.0 * t, 1.4 * t - 4.9 * t * t, aDir.y * 1.0 * t);
          }
          vA = 1.0 - t / T;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = 26.0 / -mv.z;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uNight;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.15, d) * (0.35 + 0.4 * vA);
          vec3 c = mix(vec3(0.85, 0.93, 1.0), vec3(1.0, 0.8, 0.55), uNight * 0.6);
          gl_FragColor = vec4(c, a);
        }`,
    })
    const p = new THREE.Points(g, m)
    p.frustumCulled = false
    return p
  }, [])
  return (
    <group position={base}>
      <mesh geometry={basin} material={stone} castShadow receiveShadow />
      <primitive object={jets} />
    </group>
  )
}

// Octagonal domed pavilion: eight pointed-arch panels, cornice, drum, dome and finial.
function pavilionGeometry() {
  const plaster = []
  const stone = []
  const brass = []
  const FLOOR = 0.44
  const apothem = PAV.radius * Math.cos(Math.PI / 8)
  const half = PAV.radius * Math.sin(Math.PI / 8)
  const shape = new THREE.Shape()
  shape.moveTo(-half, 0)
  shape.lineTo(-1.12, 0)
  shape.lineTo(-1.12, 2.7)
  shape.quadraticCurveTo(-1.08, 3.45, 0, 3.78)
  shape.quadraticCurveTo(1.08, 3.45, 1.12, 2.7)
  shape.lineTo(1.12, 0)
  shape.lineTo(half, 0)
  shape.lineTo(half, 4.2)
  shape.lineTo(-half, 4.2)
  shape.closePath()
  for (let k = 0; k < 8; k++) {
    const th = PAV_FACE + (k * Math.PI) / 4
    const g = ni(new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false, curveSegments: 10 }))
    g.translate(0, FLOOR, -0.175)
    g.rotateY(Math.atan2(Math.cos(th), Math.sin(th)))
    g.translate(Math.cos(th) * apothem, 0, Math.sin(th) * apothem)
    plaster.push(g)
  }
  const psi = Math.PI / 2 - PAV_FACE - Math.PI / 8
  const cyl = (r0, r1, h, y, seg, arr) => {
    const g = new THREE.CylinderGeometry(r0, r1, h, seg).toNonIndexed()
    g.rotateY(psi)
    g.translate(0, y, 0)
    arr.push(g)
  }
  cyl(PAV.radius + 0.35, PAV.radius + 0.35, 0.3, FLOOR + 4.35, 8, plaster)
  cyl(3.5, 3.5, 0.9, FLOOR + 4.95, 16, plaster)
  cyl(5.6, 5.6, 0.22, 0.11, 8, stone)
  cyl(5.0, 5.0, 0.22, 0.33, 8, stone)
  const dome = new THREE.LatheGeometry(
    [[3.5, 0], [3.55, 0.3], [3.35, 1.2], [2.85, 2.2], [1.95, 3.1], [0.95, 3.8], [0.32, 4.2], [0.14, 4.4], [0, 4.45]].map(([x, y]) => new THREE.Vector2(x, y)),
    32,
  ).toNonIndexed()
  dome.translate(0, FLOOR + 5.4, 0)
  plaster.push(dome)
  const top = FLOOR + 5.4 + 4.4
  for (const [r, y] of [[0.16, top + 0.12], [0.11, top + 0.42], [0.08, top + 0.66]]) {
    const s = new THREE.SphereGeometry(r, 10, 8).toNonIndexed()
    s.translate(0, y, 0)
    brass.push(s)
  }
  const spike = new THREE.ConeGeometry(0.04, 0.6, 8).toNonIndexed()
  spike.translate(0, top + 1.0, 0)
  brass.push(spike)
  const chain = new THREE.CylinderGeometry(0.015, 0.015, 2.2, 5).toNonIndexed()
  chain.translate(0, FLOOR + 4.7, 0)
  brass.push(chain)
  const lantern = new THREE.CylinderGeometry(0.22, 0.22, 0.5, 8)
  lantern.translate(0, FLOOR + 3.35, 0)
  const strip = (g) => {
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k)
    return g
  }
  return {
    plaster: mergeGeometries(plaster.map(strip)),
    stone: mergeGeometries(stone.map(strip)),
    brass: mergeGeometries(brass.map(strip)),
    lantern,
    floorY: FLOOR,
  }
}

function Pavilion({ stone }) {
  const parts = useMemo(pavilionGeometry, [])
  const plaster = useMemo(() => withNightLight(new THREE.MeshStandardMaterial({ color: '#f3dcbc', roughness: 0.85, envMapIntensity: 0.35, side: THREE.DoubleSide })), [])
  const floor = useMemo(() => {
    const g = new THREE.RingGeometry(0, PAV.radius - 0.2, 48, 4)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const c = toWorld(PAV.r, 0)
  return (
    <group position={c}>
      <mesh geometry={parts.plaster} material={plaster} castShadow receiveShadow />
      <mesh geometry={parts.stone} material={stone} castShadow receiveShadow />
      <mesh geometry={parts.brass} material={brassMat} castShadow />
      <mesh geometry={parts.lantern} material={fanousGlassMat} />
      <mesh geometry={floor} material={rosetteMaterial()} position-y={parts.floorY + 0.01} receiveShadow />
    </group>
  )
}

function hedgeGeometry() {
  const b = new Builder()
  let seed = 700
  for (const [R0, R1, l0, l1] of QUARTER_HEDGES) {
    const c = [[R0, l0], [R1, l0], [R1, l1], [R0, l1]].map(([R, l]) => toWorld(R, l))
    for (let i = 0; i < 4; i++) {
      const a = c[i]
      const z = c[(i + 1) % 4]
      const path = makePath([[a.x, a.z], [z.x, z.z]], { step: 0.2 })
      hedgeAlong(b, path, { d0: -0.2, d1: 0.2, H: 0.5, runs: [[0, path.length]], seed: seed++, step: 0.26 })
    }
  }
  return b.toGeometry()
}

const yawMatrices = (list, scaleFn) => {
  const rand = mulberry32(17)
  return list.map((p) => {
    const s = scaleFn ? scaleFn(rand) : 1
    return new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), rand() * 6.28), V(s, s, s))
  })
}

function Plaques() {
  const { posts, plates } = useMemo(() => {
    const posts = []
    const plates = []
    for (const f of HERB_FEATURES.filter((x) => x.chip === false)) {
      const [x, y, z] = f.pick[0]
      const toPath = toWorld(C, 0).sub(V(x, 0, z)).setY(0).normalize()
      const base = V(x, 0, z).addScaledVector(toPath, 1.6)
      const g = toWorld(C, 0).y // levelled plot
      base.y = g
      const yaw = Math.atan2(toPath.x, toPath.z)
      const q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw)
      posts.push(new THREE.Matrix4().compose(base.clone().setY(g + 0.45), q, V(0.1, 0.9, 0.1)))
      const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.6, yaw, 0, 'YXZ'))
      plates.push(new THREE.Matrix4().compose(base.clone().setY(g + 0.95).addScaledVector(toPath, 0.04), tilt, V(0.42, 0.3, 0.025)))
    }
    return { posts, plates }
  }, [])
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cbb894', roughness: 0.9 }), [])
  return (
    <>
      <InstancedBoxes matrices={posts} material={stone} />
      <InstancedBoxes matrices={plates} material={brassMat} />
    </>
  )
}

function LilyPads() {
  const mesh = useMemo(() => {
    const rand = mulberry32(55)
    const geo = new THREE.CircleGeometry(0.22, 12, 0.3, Math.PI * 2 - 0.6)
    geo.rotateX(-Math.PI / 2)
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#3f6b2a', roughness: 0.6, side: THREE.DoubleSide }), 14)
    for (let i = 0; i < 14; i++) {
      const p = toWorld(POOL.r0 + 0.5 + rand() * (POOL.r1 - POOL.r0 - 1), (rand() - 0.5) * (POOL.half * 1.6), WATER_Y + 0.09)
      const s = 0.8 + rand() * 0.7
      m.setMatrixAt(i, new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), rand() * 6.28), V(s, 1, s)))
    }
    m.receiveShadow = true
    return m
  }, [])
  return <primitive object={mesh} />
}

export default function HerbariumZone() {
  const high = useGarden((s) => s.quality === 'high')
  const lib = getLibrary()
  const stone = useMemo(() => {
    const t = pbrSet('white_sandstone_bricks', 1)
    return withNightLight(new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.arm, roughness: 1, color: '#efe2cc' }))
  }, [])
  const paving = useMemo(() => mergeGeometries(PAVING.map((r) => rectGeo(...r, 0.035))), [])
  const plaza = useMemo(() => {
    const g = new THREE.RingGeometry(0, PLAZA_R, 48, 4)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const { water, coping } = useMemo(waterworks, [])
  const hedges = useMemo(hedgeGeometry, [])
  const trees = useMemo(
    () => ({
      orange: fruitTreeGeometry(91, [0.95, 0.32, 0.02], [0.75, 0.9, 0.7]),
      pomegranate: fruitTreeGeometry(92, [0.6, 0.04, 0.03], [0.95, 1.05, 0.85]),
      cypress: cypressGeometry(93),
      ghaf: ghafGeometry(94),
    }),
    [],
  )
  const fruit = useMemo(
    () => ({
      orange: yawMatrices(FRUIT_TREES.filter((t) => t.kind === 'orange').map((t) => t.pos), (r) => 1 + r() * 0.15),
      pomegranate: yawMatrices(FRUIT_TREES.filter((t) => t.kind === 'pomegranate').map((t) => t.pos), (r) => 1 + r() * 0.15),
      cypress: yawMatrices(CYPRESSES).map((m) => m.multiply(new THREE.Matrix4().makeScale(0.9, 1, 0.9))),
      ghaf: yawMatrices([HERB_GHAF], () => 1.2),
    }),
    [],
  )
  const bedProps = { near: high ? 7 : 4, far: PLANT_FAR[high ? 'high' : 'low'], shadow: 'none', stride: high ? 1 : 2 }
  const plazaPos = toWorld(C, 0, 0.05)
  return (
    <>
      <mesh geometry={paving} material={pavingMaterial()} receiveShadow />
      <mesh geometry={plaza} material={rosetteMaterial()} position={plazaPos} receiveShadow />
      <Water geometry={water} />
      <InstancedBoxes matrices={coping} material={stone} />
      <Fountain stone={stone} />
      <Pavilion stone={stone} />
      <mesh geometry={hedges} material={plantMaterial()} castShadow receiveShadow customDepthMaterial={plantDepthMaterial()} />
      <LodInstances variants={lib.marigold} items={herbBeds.marigold} {...bedProps} />
      <LodInstances variants={lib.petunia} items={herbBeds.petunia} {...bedProps} />
      <LodInstances variants={lib.daisy} items={herbBeds.daisy} {...bedProps} />
      <Instances geometry={trees.orange} matrices={fruit.orange} />
      <Instances geometry={trees.pomegranate} matrices={fruit.pomegranate} />
      <Instances geometry={trees.cypress} matrices={fruit.cypress} />
      <Instances geometry={trees.ghaf} matrices={fruit.ghaf} />
      <Palms items={HERB_PALMS} />
      <Plaques />
      <Fanous positions={LANTERNS} height={2.6} />
      <LilyPads />
    </>
  )
}

