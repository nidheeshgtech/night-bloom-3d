import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import Instances from '../zone/Instances'
import Palms from '../zone/Palms'
import { shrubGeometry } from '../zone/foliage'
import { mulberry32 } from '../lib/random'
import { zoneUniforms } from '../zone/materials'
import { withNightLight } from '../zone/nightlight'
import { V, clean } from './geom'
import { hotelMaterials } from './materials'
import { CRESCENT, LAND_Y, SEA_Y, TOWER, VILLAS, arcPoint } from './layout'

// --- Boats ------------------------------------------------------------------------------

// Hull plan (top view, x across, z along, bow at +z), extruded up and tapered by scaling.
function hullGeometry(L, W, H, color) {
  const s = new THREE.Shape()
  s.moveTo(-W / 2, -L / 2)
  s.lineTo(W / 2, -L / 2)
  s.bezierCurveTo(W / 2, L * 0.1, W * 0.35, L * 0.38, 0, L / 2)
  s.bezierCurveTo(-W * 0.35, L * 0.38, -W / 2, L * 0.1, -W / 2, -L / 2)
  const g = new THREE.ExtrudeGeometry(s, { depth: H, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2, curveSegments: 16 })
  g.rotateX(-Math.PI / 2) // extrusion -> +y, bow -> -z
  g.rotateY(Math.PI) // bow -> +z (a mirror would turn the faces inside out)
  return clean(g, color)
}

// Motor yacht: white hull with a dark boot stripe, two stepped decks, tinted glass band.
function yachtGeometry() {
  const P = [
    hullGeometry(16, 4.4, 1.6, '#f7f5f0').translate(0, -0.6, 0),
    hullGeometry(16.1, 4.45, 0.25, '#1d2a36').translate(0, -0.55, 0),
    hullGeometry(9, 3.4, 1.1, '#f7f5f0').translate(0, 1.0, -1.6),
    hullGeometry(8.6, 3.2, 0.5, '#16222c').translate(0, 1.35, -1.5),
    hullGeometry(5.2, 2.8, 0.9, '#f7f5f0').translate(0, 2.1, -2.6),
    hullGeometry(4.8, 2.6, 0.35, '#16222c').translate(0, 2.35, -2.5),
    clean(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6).translate(0, 4.0, -2.2), '#d8d8d8'),
    clean(new THREE.BoxGeometry(1.6, 0.08, 0.1).translate(0, 4.6, -2.2), '#d8d8d8'),
  ]
  return mergeGeometries(P)
}

// Dhow-style wooden sailing boat with a single cream lateen sail.
function dhowGeometry() {
  const wood = mergeGeometries([
    hullGeometry(12, 3.4, 1.4, '#8a5a36').translate(0, -0.5, 0),
    hullGeometry(12.1, 3.45, 0.18, '#e9dcc0').translate(0, 0.8, 0),
    clean(new THREE.CylinderGeometry(0.12, 0.15, 8.5, 8).translate(0, 4.8, 1.2), '#6b4428'),
    clean(new THREE.CylinderGeometry(0.07, 0.07, 11, 6).rotateX(1.05).translate(0, 7, 0.6), '#6b4428'),
  ])
  const sail = new THREE.BufferGeometry()
  // Lateen sail: a tall triangle hung from the yard, slightly bellied.
  const a = V(0, 2.3, -4.0)
  const b = V(0, 11.7, 5.2)
  const c = V(0, 1.8, 3.6)
  const pos = []
  const N = 6
  const pt = (u, v) => {
    const p = a.clone().lerp(b, u).lerp(c.clone().lerp(b, u), v)
    p.x += Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * 0.9
    return p
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const p00 = pt(i / N, j / N)
      const p10 = pt((i + 1) / N, j / N)
      const p01 = pt(i / N, (j + 1) / N)
      const p11 = pt((i + 1) / N, (j + 1) / N)
      pos.push(...p00.toArray(), ...p10.toArray(), ...p11.toArray(), ...p00.toArray(), ...p11.toArray(), ...p01.toArray())
    }
  }
  sail.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  sail.computeVertexNormals()
  return { wood, sail: clean(sail, '#f2e8d2') }
}

// Foam wake: a fan behind the boat, brightest at the stern, broken up by moving noise.
function wakeMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: zoneUniforms.uTime, uNight: zoneUniforms.uNight },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime; uniform float uNight;
      float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        float along = 1.0 - vUv.y;         // 1 at the stern, 0 at the tail
        // The wake fans out behind the boat.
        float across = abs(vUv.x - 0.5) * 2.0 / mix(1.0, 0.3, along);
        if (across > 1.0) discard;
        float edge = smoothstep(0.55, 1.0, across) + smoothstep(0.4, 0.0, across) * 0.6;
        float foam = n(vec2(vUv.x * 18.0, vUv.y * 40.0 + uTime * 3.0)) * edge;
        float a = foam * pow(along, 1.6) * 0.85;
        gl_FragColor = vec4(vec3(0.95) * mix(1.0, 0.35, uNight), a);
      }`,
  })
}

const ROUTES = [
  // kind, centre x, centre z, radius x, radius z, seconds per lap, direction
  { kind: 'yacht', cx: -20, cz: -270, rx: 320, rz: 80, lap: 260, dir: 1, phase: 0.1 },
  { kind: 'yacht', cx: 60, cz: -360, rx: 260, rz: 60, lap: 300, dir: -1, phase: 0.6 },
  { kind: 'dhow', cx: -10, cz: -150, rx: 95, rz: 28, lap: 240, dir: 1, phase: 0.35 },
]

function Boats() {
  const { yacht, dhow, mats, wake } = useMemo(() => {
    const gel = withNightLight(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.05 }))
    const m = hotelMaterials()
    return { yacht: yachtGeometry(), dhow: dhowGeometry(), mats: { gel, wood: m.wood, fabric: m.fabric }, wake: wakeMaterial() }
  }, [])
  const refs = useRef([])
  useFrame(() => {
    const t = zoneUniforms.uTime.value
    ROUTES.forEach((r, i) => {
      const g = refs.current[i]
      if (!g) return
      const a = (t / r.lap + r.phase) * Math.PI * 2 * r.dir
      const x = r.cx + Math.cos(a) * r.rx
      const z = r.cz + Math.sin(a) * r.rz
      // Heading along the ellipse tangent; gentle bob, pitch and roll.
      const dx = -Math.sin(a) * r.rx * r.dir
      const dz = Math.cos(a) * r.rz * r.dir
      g.position.set(x, SEA_Y + 0.05 * Math.sin(t * 1.3 + i), z)
      g.rotation.set(0.015 * Math.sin(t * 0.9 + i), Math.atan2(dx, dz), 0.025 * Math.sin(t * 0.7 + i * 2))
    })
  })
  return ROUTES.map((r, i) => (
    <group key={i} ref={(g) => (refs.current[i] = g)}>
      {r.kind === 'yacht' ? (
        <mesh geometry={yacht} material={mats.gel} />
      ) : (
        <>
          <mesh geometry={dhow.wood} material={mats.wood} />
          <mesh geometry={dhow.sail} material={mats.fabric} />
        </>
      )}
      <mesh material={wake} rotation-x={-Math.PI / 2} position={[0, 0.06, r.kind === 'yacht' ? -26 : -18]} renderOrder={2}>
        <planeGeometry args={[r.kind === 'yacht' ? 14 : 9, r.kind === 'yacht' ? 38 : 26]} />
      </mesh>
    </group>
  ))
}

// --- Gulls ------------------------------------------------------------------------------

const GULLS = 18

function Gulls() {
  const { mesh, flights } = useMemo(() => {
    // Body plus two wings; wing vertices flap in the vertex shader by their distance from
    // the body (|x|), each bird with its own phase.
    const body = new THREE.ConeGeometry(0.09, 0.55, 6).rotateX(Math.PI / 2)
    const wing = new THREE.BufferGeometry()
    wing.setAttribute('position', new THREE.Float32BufferAttribute([0.05, 0, 0.12, 0.62, 0.02, -0.02, 0.05, 0, -0.12, -0.05, 0, 0.12, -0.05, 0, -0.12, -0.62, 0.02, -0.02], 3))
    wing.computeVertexNormals()
    const g = mergeGeometries([clean(body), clean(wing)])
    g.scale(1.4, 1.4, 1.4)
    const m = new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.8, side: THREE.DoubleSide })
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = zoneUniforms.uTime
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float aPhase;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float span = abs(position.x);
          transformed.y += sin(uTime * 7.0 + aPhase) * span * span * 1.1;`,
        )
    }
    const mesh = new THREE.InstancedMesh(g, m, GULLS)
    const rand = mulberry32(31)
    const phase = new Float32Array(GULLS)
    const flights = []
    for (let i = 0; i < GULLS; i++) {
      phase[i] = rand() * 6.28
      flights.push({ cx: -30 + rand() * 90, cz: -80 + rand() * 50, r: 25 + rand() * 45, y: 18 + rand() * 22, w: (0.08 + rand() * 0.07) * (rand() < 0.5 ? -1 : 1), p: rand() * 6.28 })
    }
    g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1))
    mesh.frustumCulled = false
    return { mesh, flights }
  }, [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame(() => {
    const t = zoneUniforms.uTime.value
    flights.forEach((f, i) => {
      const a = t * f.w + f.p
      dummy.position.set(f.cx + Math.cos(a) * f.r, f.y + Math.sin(t * 0.3 + f.p) * 3, f.cz + Math.sin(a) * f.r)
      // Face along the circle and bank into the turn.
      dummy.rotation.set(0, Math.atan2(-Math.sin(a) * Math.sign(f.w), Math.cos(a) * Math.sign(f.w)), -Math.sign(f.w) * 0.35, 'YXZ')
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return <primitive object={mesh} />
}

// --- Planting ---------------------------------------------------------------------------

// Shrub beds in front of the arcades (green and bougainvillea), around the villas, and
// palms lining the arrival drive.
function Planting() {
  const geos = useMemo(() => [shrubGeometry(11, 'foliage'), shrubGeometry(12, 'bougainvillea'), shrubGeometry(13, 'foliage')], [])
  const byKind = useMemo(() => {
    const rand = mulberry32(17)
    const lists = [[], [], []]
    const put = (x, z, sc) => {
      const k = Math.floor(rand() * 3)
      lists[k].push(new THREE.Matrix4().compose(V(x, LAND_Y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), rand() * 6.28), V(sc, sc * (0.8 + rand() * 0.3), sc)))
    }
    for (const [a0, a1] of [CRESCENT.east, CRESCENT.west]) {
      for (let d = a0 + 2; d <= a1 - 2; d += 3.2) {
        const p = arcPoint(d + (rand() - 0.5), CRESCENT.r0 - 5 + rand() * 0.8)
        put(p.x, p.z, 0.9 + rand() * 0.6)
      }
    }
    for (const v of VILLAS) {
      for (const dx of [-7.5, 7.5]) for (let j = 0; j < 3; j++) put(v.x + dx + (rand() - 0.5), v.z - 1 + j * 3, 1 + rand() * 0.5)
    }
    for (const x of [-11, 11]) for (let z = TOWER.z1 + 16; z < TOWER.z1 + 40; z += 3) put(x + (rand() - 0.5), z, 0.8 + rand() * 0.4)
    return lists
  }, [])
  const palms = useMemo(() => {
    const out = []
    for (const x of [-15, 15]) for (let z = TOWER.z1 + 18; z <= TOWER.z1 + 46; z += 9) out.push({ pos: V(x, LAND_Y, z), h: 7.5 + (z % 2) })
    return out
  }, [])
  return (
    <>
      {geos.map((g, k) => (
        <Instances key={k} geometry={g} matrices={byKind[k]} />
      ))}
      <Palms items={palms} />
    </>
  )
}

export default function HotelLife() {
  return (
    <>
      <Boats />
      <Gulls />
      <Planting />
    </>
  )
}
