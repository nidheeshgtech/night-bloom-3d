import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '../../lib/random'
import { useGarden } from '../../lib/store'
import { registerPicker } from '../../lib/picking'
import { BUTTERFLIES } from '../../lib/butterflies'
import { WING_COL, WING_TEX_W, getWingTexture } from './wings'
import { getWingsongTargets } from './library'
import { inside, toWorld, GH, halfWidth } from './layout'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const COUNT = { high: 240, low: 100 }
// Species mix: common local species outnumber the tropical morpho.
const MIX = [0, 0, 0, 1, 1, 2, 2, 3, 3, 4]
// Shown ~1.8x life size so they read at walking distance (noted in the info card).
const VISIBILITY = 1.8

// Unit butterfly: two wing quads hinged on a thin body along +Z (head forward).
function butterflyGeometry() {
  const pos = []
  const uv = []
  const side = []
  const idx = []
  const wing = (s) => {
    const base = pos.length / 3
    for (let i = 0; i <= 2; i++) {
      for (let j = 0; j <= 2; j++) {
        const u = j / 2
        const t = i / 2
        pos.push(s * u, 0, (t - 0.5) * 1.1)
        uv.push(u, t)
        side.push(s)
      }
    }
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const k = base + i * 3 + j
        idx.push(k, k + 3, k + 1, k + 1, k + 3, k + 4)
      }
    }
  }
  wing(1)
  wing(-1)
  const b = pos.length / 3
  for (const [x, y, z] of [
    [-0.025, 0, 0.36],
    [0.025, 0, 0.36],
    [0.025, 0, -0.42],
    [-0.025, 0, -0.42],
    [0, 0.04, 0],
  ]) {
    pos.push(x, y, z)
    uv.push(-1, 0.5)
    side.push(0)
  }
  idx.push(b, b + 1, b + 4, b + 1, b + 2, b + 4, b + 2, b + 3, b + 4, b + 3, b, b + 4)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function butterflyMaterial() {
  const m = new THREE.MeshStandardMaterial({ map: getWingTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55 })
  const col = (WING_COL / WING_TEX_W).toFixed(5)
  const bodyU = ((BUTTERFLIES.length * WING_COL + 16) / WING_TEX_W).toFixed(5)
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSide;\nattribute float aAngle;\nattribute float aSpecies;')
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        vMapUv = aSide == 0.0 ? vec2(${bodyU}, 0.5) : vec2((aSpecies + uv.x) * ${col}, uv.y);`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `float th = aSide == 0.0 ? 0.0 : aAngle;
        vec3 objectNormal = aSide == 0.0 ? vec3(0.0, 1.0, 0.0) : vec3(-aSide * sin(th), cos(th), 0.0);`,
      )
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3(position.x * cos(th), position.y + abs(position.x) * sin(th), position.z);`,
      )
  }
  return m
}

// Flight model: fly toward a nectar flower with wandering, land and feed, move on.
// Flee from the visitor; roost with wings closed at night.
function makeSwarm(n, nectar, rand) {
  const randomInside = () => {
    for (let k = 0; k < 50; k++) {
      const a = GH.a0 + 3 + rand() * (GH.L - GH.a0 - 8)
      const l = (rand() * 2 - 1) * (halfWidth(a) - 2)
      const p = toWorld(a, l, 0.6 + rand() * 3)
      if (inside(p, 0.6)) return p
    }
    return toWorld(GH.L * 0.4, 0, 2)
  }
  return Array.from({ length: n }, () => {
    const species = MIX[Math.floor(rand() * MIX.length)]
    return {
      species,
      scale: (BUTTERFLIES[species].span / 2) * VISIBILITY,
      pos: randomInside(),
      vel: V(rand() - 0.5, 0, rand() - 0.5),
      target: nectar[Math.floor(rand() * nectar.length)],
      state: 'fly',
      timer: 0,
      phase: rand() * 100,
      rate: 9 + rand() * 4,
      yaw: rand() * 6.28,
      angle: 0.5,
    }
  })
}

export default function Butterflies() {
  const quality = useGarden((s) => s.quality)
  const n = COUNT[quality]
  const { nectar } = getWingsongTargets()

  const { mesh, swarm, angles } = useMemo(() => {
    const rand = mulberry32(55)
    const geo = butterflyGeometry()
    const angles = new THREE.InstancedBufferAttribute(new Float32Array(n), 1)
    angles.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('aAngle', angles)
    const swarm = makeSwarm(n, nectar, rand)
    geo.setAttribute('aSpecies', new THREE.InstancedBufferAttribute(new Float32Array(swarm.map((b) => b.species)), 1))
    const mesh = new THREE.InstancedMesh(geo, butterflyMaterial(), n)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.frustumCulled = false
    if (import.meta.env.DEV && window.__garden) window.__garden.swarm = swarm
    return { mesh, swarm, angles }
  }, [n, nectar])

  // Click to identify: nearest butterfly close to the ray.
  useEffect(() => {
    const pt = V(0, 0, 0)
    return registerPicker((ray, bestD) => {
      let hit = null
      swarm.forEach((b, i) => {
        const d = b.pos.distanceTo(ray.origin)
        if (d > 25 || d > bestD) return
        pt.copy(b.pos)
        if (ray.distanceSqToPoint(pt) < (0.08 + d * 0.012) ** 2 && (!hit || d < hit.d)) hit = { d, i }
      })
      if (!hit) return null
      const b = swarm[hit.i]
      return {
        d: Math.max(0, hit.d - 0.3), // win ties against the flower it is sitting on
        onSelect: () => {
          const st = useGarden.getState()
          const found = st.discoveredButterflies.includes(b.species) ? st.discoveredButterflies : [...st.discoveredButterflies, b.species]
          st.set({ selected: { kind: 'butterfly', index: hit.i, species: b.species }, discoveredButterflies: found })
        },
      }
    })
  }, [swarm])

  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, 'YXZ'), s: V(1, 1, 1), d: V(0, 0, 0) }), [])

  useFrame(({ camera, clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime
    const st = useGarden.getState()
    const night = st.night > 0.6
    const held = st.selected?.kind === 'butterfly' ? st.selected.index : -1
    const visitor = camera.position
    swarm.forEach((b, i) => {
      const toVisitor = b.pos.distanceTo(visitor)
      if (i === held) {
        b.state = 'hold'
      } else if (b.state === 'hold') {
        b.state = 'fly'
      }
      if (night && b.state === 'fly') {
        b.state = 'roost'
        b.target = nectar[Math.floor((b.phase * 7) % nectar.length)]
      }
      if (!night && b.state === 'roost') b.state = 'fly'

      if (b.state === 'fly' || (b.state === 'roost' && b.pos.distanceTo(b.target) > 0.08)) {
        const d = tmp.d.copy(b.target).sub(b.pos)
        const dist = d.length()
        d.normalize().multiplyScalar(Math.min(1.4, 0.4 + dist))
        // Wander: smooth pseudo-random drift, fading out on the final approach so they land.
        const wander = Math.min(1, dist / 1.5)
        d.x += Math.sin(t * 1.3 + b.phase) * 0.9 * wander
        d.y += Math.sin(t * 2.1 + b.phase * 1.7) * 0.6 * wander
        d.z += Math.cos(t * 1.1 + b.phase * 0.7) * 0.9 * wander
        if (toVisitor < 1.6) d.add(b.pos.clone().sub(visitor).normalize().multiplyScalar(2.5)).add(V(0, 1, 0))
        if (!inside(b.pos, 0.8)) d.add(toWorld(GH.L * 0.42, 0, 3).sub(b.pos).normalize().multiplyScalar(2))
        b.vel.lerp(d, Math.min(1, dt * (dist < 1 ? 5 : 2.2)))
        b.pos.addScaledVector(b.vel, dt)
        b.yaw = Math.atan2(b.vel.x, b.vel.z)
        b.angle = 0.55 + 0.75 * Math.sin(t * b.rate * 6.283 + b.phase)
        if (dist < 0.15) {
          if (b.state === 'roost') b.pos.copy(b.target)
          else {
            b.state = 'feed'
            b.timer = 3 + ((b.phase * 13) % 7)
            b.pos.copy(b.target).add(V(0, 0.015, 0))
          }
        }
      } else if (b.state === 'feed') {
        // Basking: wings slowly opening and closing, mostly open so the pattern shows.
        b.angle = 0.55 + 0.45 * Math.sin(t * 1.1 + b.phase)
        b.timer -= dt
        if (b.timer < 0 || toVisitor < 0.9) {
          b.state = 'fly'
          b.target = nectar[Math.floor(((b.phase += 7.31) * 9.7) % nectar.length)]
          b.vel.set(0, 1.2, 0)
        }
      } else if (b.state === 'roost') {
        b.angle = 1.45
      } else if (b.state === 'hold') {
        b.angle = 0.9 + 0.5 * Math.sin(t * 2 + b.phase)
      }
      const flying = b.state === 'fly'
      tmp.e.set(flying ? -Math.atan2(b.vel.y, Math.hypot(b.vel.x, b.vel.z)) * 0.6 : -0.2, b.yaw, flying ? Math.sin(t * 2 + b.phase) * 0.25 : 0)
      tmp.q.setFromEuler(tmp.e)
      tmp.s.setScalar(b.scale)
      tmp.m.compose(b.pos, tmp.q, tmp.s)
      mesh.setMatrixAt(i, tmp.m)
      angles.array[i] = b.angle
    })
    mesh.instanceMatrix.needsUpdate = true
    angles.needsUpdate = true
  })

  return <primitive object={mesh} />
}
