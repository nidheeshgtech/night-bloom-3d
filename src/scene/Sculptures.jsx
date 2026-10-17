import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import FlowerShell from './FlowerShell'
import { mulberry32 } from '../lib/random'
import { speciesColor } from '../lib/species'
import { heightAt, PATH_RADIUS } from '../lib/terrain'
import { HELIX_BASE, PODS, PODS_BASE, TUNNEL } from '../lib/sculptures'
import { foliageMat, glowMat, stoneMat } from '../lib/materials'

const jitter = (rand, amount) =>
  new THREE.Vector3((rand() - 0.5) * amount, (rand() - 0.5) * amount, (rand() - 0.5) * amount)

function Helix() {
  const { items, frame } = useMemo(() => {
    const rand = mulberry32(11)
    const items = []
    const tubes = []
    const ribbons = [
      { phase: 0, dir: 1, from: speciesColor('zinnia'), to: speciesColor('marigold') },
      { phase: Math.PI, dir: -1, from: speciesColor('pansy'), to: speciesColor('periwinkle') },
    ]
    const STEPS = 900
    for (const rb of ribbons) {
      const spine = []
      for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS
        const ang = rb.phase + rb.dir * t * Math.PI * 5
        const rad = 2.8 * (1 - 0.55 * t)
        const c = new THREE.Vector3(Math.cos(ang) * rad, 0.9 + t * 7.8, Math.sin(ang) * rad).add(HELIX_BASE)
        if (i % 30 === 0) spine.push(c.clone())
        const out = new THREE.Vector3(Math.cos(ang), 0.25, Math.sin(ang)).normalize()
        for (let k = 0; k < 3; k++) {
          items.push({
            p: c.clone().add(jitter(rand, 0.4)).addScaledVector(out, 0.2),
            n: out.clone().add(jitter(rand, 0.6)).normalize(),
            s: 0.9 + rand() * 0.5,
            color: rb.from.clone().lerp(rb.to, t).offsetHSL(0, 0, (rand() - 0.5) * 0.1),
          })
        }
      }
      tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spine), 120, 0.22, 6))
    }
    return { items, frame: mergeGeometries(tubes) }
  }, [])

  const { x, y, z } = HELIX_BASE
  return (
    <group>
      <mesh position={[x, y + 0.4, z]} material={stoneMat}>
        <cylinderGeometry args={[3.6, 3.9, 0.8, 32]} />
      </mesh>
      <mesh position={[x, y + 4.8, z]} material={foliageMat}>
        <cylinderGeometry args={[0.35, 0.7, 8.8, 12]} />
      </mesh>
      <mesh geometry={frame} material={foliageMat} />
      <mesh position={[x, y + 9.5, z]} material={glowMat}>
        <icosahedronGeometry args={[0.75, 3]} />
      </mesh>
      <FlowerShell items={items} />
    </group>
  )
}

function Pod({ pod, index }) {
  const ref = useRef()
  const rest = PODS_BASE.y + pod.dy

  const { items, vine } = useMemo(() => {
    const rand = mulberry32(100 + index)
    const [ca, cb] = pod.colors.map(speciesColor)
    const count = Math.round(4 * Math.PI * pod.r * pod.r * 20)
    const items = []
    for (let i = 0; i < count; i++) {
      // Fibonacci sphere for even coverage.
      const yy = 1 - ((i + 0.5) / count) * 2
      const rr = Math.sqrt(1 - yy * yy)
      const th = i * 2.399963
      const n = new THREE.Vector3(Math.cos(th) * rr, yy, Math.sin(th) * rr)
      const band = Math.sin(n.y * 6 + n.x * 3) > 0
      items.push({
        p: n.clone().multiplyScalar(pod.r),
        n,
        s: 0.9 + rand() * 0.5,
        color: (band ? ca : cb).clone().offsetHSL(0, 0, (rand() - 0.5) * 0.12),
      })
    }
    const ground = heightAt(PODS_BASE.x + pod.dx, PODS_BASE.z + pod.dz) - rest - 0.6
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -pod.r * 0.9, 0),
      new THREE.Vector3(0.5, (ground - pod.r) * 0.5, 0.3),
      new THREE.Vector3(0, ground, 0),
    ])
    return { items, vine: new THREE.TubeGeometry(curve, 20, 0.07, 5) }
  }, [pod, index, rest])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    ref.current.position.y = rest + Math.sin(t * 0.6 + index * 1.7) * 0.3
    ref.current.rotation.y = t * 0.05 * (index % 2 ? 1 : -1)
  })

  return (
    <group ref={ref} position={[PODS_BASE.x + pod.dx, rest, PODS_BASE.z + pod.dz]}>
      <mesh material={foliageMat}>
        <sphereGeometry args={[pod.r * 0.96, 24, 16]} />
      </mesh>
      <mesh geometry={vine} material={foliageMat} />
      <FlowerShell items={items} />
    </group>
  )
}

function Tunnel() {
  const { items, frame } = useMemo(() => {
    const rand = mulberry32(5)
    const items = []
    const tubes = []
    const palettes = [
      ['periwinkle', 'cornflower'],
      ['pansy', 'periwinkle'],
      ['cornflower', 'pansy'],
    ]
    let ai = 0
    for (let a = TUNNEL.from; a <= TUNNEL.to + 1e-6; a += TUNNEL.step, ai++) {
      const radial = new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
      const along = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a))
      const c = radial.clone().multiplyScalar(PATH_RADIUS)
      c.y = heightAt(c.x, c.z) - 0.2
      const pts = []
      for (let i = 0; i <= 16; i++) {
        const th = (Math.PI * i) / 16
        pts.push(
          c.clone().addScaledVector(radial, TUNNEL.halfWidth * Math.cos(th)).setY(c.y + TUNNEL.height * Math.sin(th)),
        )
      }
      const curve = new THREE.CatmullRomCurve3(pts)
      tubes.push(new THREE.TubeGeometry(curve, 32, 0.16, 6))
      const [ca, cb] = palettes[ai % 3].map(speciesColor)
      for (let i = 0; i < 44; i++) {
        const t = (i + 0.5) / 44
        const p = curve.getPointAt(t)
        const side = new THREE.Vector3().crossVectors(curve.getTangentAt(t), along).normalize()
        for (let k = 0; k < 6; k++) {
          const phi = (k / 6) * Math.PI * 2 + rand() * 0.5
          const n = along.clone().multiplyScalar(Math.cos(phi)).addScaledVector(side, Math.sin(phi)).normalize()
          items.push({
            p: p.clone().addScaledVector(n, 0.22),
            n,
            s: 0.8 + rand() * 0.4,
            color: (rand() < 0.5 ? ca : cb).clone().offsetHSL(0, 0, (rand() - 0.5) * 0.1),
          })
        }
      }
    }
    return { items, frame: mergeGeometries(tubes) }
  }, [])

  return (
    <group>
      <mesh geometry={frame} material={foliageMat} />
      <FlowerShell items={items} />
    </group>
  )
}

export default function Sculptures() {
  return (
    <>
      <Helix />
      {PODS.map((pod, i) => (
        <Pod key={i} pod={pod} index={i} />
      ))}
      <Tunnel />
    </>
  )
}
