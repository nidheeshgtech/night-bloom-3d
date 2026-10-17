import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'
import { mulberry32 } from '../lib/random'
import { useGarden } from '../lib/store'
import { arches, archPoint, lamps } from './planting'
import { pathToWorld } from './layout'
import { bulbMat, zoneUniforms } from './materials'

// Sun direction measured from the HDRI's brightest pixel, so shadows match the visible sun.
export const SUN_DIR = new THREE.Vector3(0.704, 0.486, 0.517).normalize()
const CENTER = new THREE.Vector3(0, 0, 1)

const DAY = { env: 0.75, bg: 1, sun: 3.2, sunColor: new THREE.Color('#ffe2bf'), fog: new THREE.Color('#cdd9e6'), lamp: 0, bulb: 0 }
const NIGHT = { env: 0.06, bg: 0.04, sun: 0.4, sunColor: new THREE.Color('#9db0ff'), fog: new THREE.Color('#0b1120'), lamp: 22, bulb: 5 }

function Stars() {
  const { geometry, material } = useMemo(() => {
    const rand = mulberry32(12)
    const pos = []
    for (let i = 0; i < 1400; i++) {
      const y = 0.08 + rand() * 0.92
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(1 - y * y)
      pos.push(Math.cos(a) * r * 500, y * 500, Math.sin(a) * r * 500)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    const m = new THREE.PointsMaterial({ color: '#ffffff', size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })
    return { geometry: g, material: m }
  }, [])
  useFrame(() => (material.opacity = Math.max(0, (useGarden.getState().night - 0.5) * 2) * 0.85))
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

export default function ZoneLighting() {
  const scene = useThree((s) => s.scene)
  const quality = useGarden((s) => s.quality)
  const night = useRef(useGarden.getState().night)
  const lampLights = useRef([])

  const sun = useMemo(() => {
    const l = new THREE.DirectionalLight('#ffe2bf', DAY.sun)
    l.position.copy(CENTER).addScaledVector(SUN_DIR, 70)
    l.target.position.copy(CENTER)
    l.castShadow = true
    const cam = l.shadow.camera
    cam.left = cam.bottom = -30
    cam.right = cam.top = 30
    cam.near = 20
    cam.far = 130
    l.shadow.bias = -0.0002
    l.shadow.normalBias = 0.025
    return l
  }, [])
  sun.shadow.mapSize.setScalar(quality === 'high' ? 4096 : 2048)
  if (sun.shadow.map) {
    sun.shadow.map.dispose()
    sun.shadow.map = null
  }

  // Practical night lights: four park lamps plus two warm fills under the arcade.
  const lightSpots = useMemo(() => {
    const spots = lamps.map((l) => pathToWorld(l.s, l.d).add(new THREE.Vector3(0, 3.1, 0)))
    for (const i of [2, 6]) spots.push(archPoint(arches[i], 0).add(new THREE.Vector3(0, -0.6, 0)))
    return spots
  }, [])

  useFrame((state, delta) => {
    const target = useGarden.getState().night
    night.current += (target - night.current) * Math.min(1, delta * 3)
    const t = night.current
    const lerp = THREE.MathUtils.lerp
    scene.environmentIntensity = lerp(DAY.env, NIGHT.env, t)
    scene.backgroundIntensity = lerp(DAY.bg, NIGHT.bg, t)
    sun.intensity = lerp(DAY.sun, NIGHT.sun, t)
    sun.color.lerpColors(DAY.sunColor, NIGHT.sunColor, t)
    if (scene.fog) scene.fog.color.lerpColors(DAY.fog, NIGHT.fog, t)
    const lamp = lerp(DAY.lamp, NIGHT.lamp, t)
    lampLights.current.forEach((l) => l && (l.intensity = lamp))
    bulbMat.emissiveIntensity = lerp(DAY.bulb, NIGHT.bulb, t)
    zoneUniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <>
      <Environment files="/assets/hdri/autumn_field_puresky_2k.hdr" background />
      <fogExp2 attach="fog" args={['#c9d3df', 0.0042]} />
      <primitive object={sun} />
      <primitive object={sun.target} />
      {lightSpots.map((p, i) => (
        <pointLight key={i} ref={(l) => (lampLights.current[i] = l)} position={p} color="#ffc27a" intensity={0} distance={16} decay={2} />
      ))}
      <Stars />
    </>
  )
}
