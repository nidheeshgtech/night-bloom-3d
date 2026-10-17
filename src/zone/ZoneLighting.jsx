import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, useEnvironment } from '@react-three/drei'
import SkyBackdrop, { skyUniforms } from './SkyBackdrop'
import * as THREE from 'three'
import { mulberry32 } from '../lib/random'
import { useGarden } from '../lib/store'
import { arches, archPoint, lamps } from './planting'
import { pathToWorld } from './layout'
import { bulbMat, fanousGlassMat, pavilionGlowMat, shadows, zoneUniforms } from './materials'
import { nightUniforms } from './nightlight'
import { buildNightMap } from './nightmap'

// Sun direction measured from the HDRI's brightest pixel, so shadows match the visible sun.
export const SUN_DIR = new THREE.Vector3(0.704, 0.486, 0.517).normalize()

const DAY = { env: 0.9, bg: 1.05, sun: 3.6, sunColor: new THREE.Color('#ffd09a'), fog: new THREE.Color('#e3cba6'), lamp: 0, bulb: 0 }
// Night: a moonlit festival, not darkness. Moon still casts shadows; a violet sky fill and the
// painted light map (nightmap.js) keep every bed, path and tree readable and colourful.
const NIGHT = { env: 0.16, bg: 0.07, sun: 1.0, sunColor: new THREE.Color('#a9b8ff'), fog: new THREE.Color('#231c42'), lamp: 22, bulb: 5, hemi: 0.95 }

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
  const controls = useThree((s) => s.controls)
  const gl = useThree((s) => s.gl)
  const shadowHalf = useRef(0)
  const shadowKey = useRef('')

  // Nothing that casts shadows moves (plant sway is shader-only and the shadow pass uses
  // unswayed depth), so the shadow map is cached and re-rendered only when it must be.
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    return () => (gl.shadowMap.autoUpdate = true)
  }, [gl])
  const quality = useGarden((s) => s.quality)
  const hdri = useEnvironment({ files: `${import.meta.env.BASE_URL}assets/hdri/autumn_field_puresky_2k.hdr` })
  const night = useRef(useGarden.getState().night)
  const lampLights = useRef([])
  const hemi = useRef()

  useEffect(() => {
    const map = buildNightMap()
    nightUniforms.uNightMap.value = map
    return () => map.dispose()
  }, [])

  const sun = useMemo(() => {
    const l = new THREE.DirectionalLight('#ffe2bf', DAY.sun)
    l.castShadow = true
    l.shadow.camera.near = 10
    l.shadow.camera.far = 320
    l.shadow.bias = -0.0002
    l.shadow.normalBias = 0.025
    return l
  }, [])
  sun.shadow.mapSize.setScalar(quality === 'high' ? 2048 : 1024)
  shadows.dirty = true
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
    // Shadow frustum follows what the visitor is looking at, sized to the camera distance.
    const mode = useGarden.getState().mode
    const cam = state.camera
    const focus = mode === 'walk' || mode === 'flying' || !controls ? cam.position : controls.target
    // Frustum size in discrete steps and position on a coarse grid, so orbiting or
    // zooming a little never triggers a re-render.
    const want = cam.position.distanceTo(focus) * 0.5
    const half = [30, 48, 75, 120].find((h) => h >= want) ?? 120
    const sc = sun.shadow.camera
    if (half !== shadowHalf.current) {
      shadowHalf.current = half
      sc.left = sc.bottom = -half
      sc.right = sc.top = half
      sc.updateProjectionMatrix()
    }
    const grid = half * 0.2
    const fx = Math.round(focus.x / grid) * grid
    const fz = Math.round(focus.z / grid) * grid
    const key = `${half}:${fx}:${fz}`
    if (key !== shadowKey.current || shadows.dirty || state.clock.elapsedTime < 6) {
      shadowKey.current = key
      shadows.dirty = false
      sun.target.position.set(fx, 0, fz)
      sun.position.set(fx, 0, fz).addScaledVector(SUN_DIR, 150)
      sun.target.updateMatrixWorld()
      gl.shadowMap.needsUpdate = true
    }

    const target = useGarden.getState().night
    night.current += (target - night.current) * Math.min(1, delta * 3)
    const t = night.current
    const lerp = THREE.MathUtils.lerp
    scene.environmentIntensity = lerp(DAY.env, NIGHT.env, t)
    skyUniforms.uIntensity.value = lerp(DAY.bg, NIGHT.bg, t)
    sun.intensity = lerp(DAY.sun, NIGHT.sun, t)
    sun.color.lerpColors(DAY.sunColor, NIGHT.sunColor, t)
    if (scene.fog) scene.fog.color.lerpColors(DAY.fog, NIGHT.fog, t)
    if (scene.fog) skyUniforms.uHaze.value.copy(scene.fog.color)
    skyUniforms.uHazeAmt.value = lerp(0.75, 0.35, t)
    fanousGlassMat.emissiveIntensity = lerp(0.15, 3.2, t)
    pavilionGlowMat.emissiveIntensity = lerp(0, 0.85, t)
    const lamp = lerp(DAY.lamp, NIGHT.lamp, t)
    lampLights.current.forEach((l) => l && (l.intensity = lamp))
    bulbMat.emissiveIntensity = lerp(DAY.bulb, NIGHT.bulb, t)
    zoneUniforms.uTime.value = state.clock.elapsedTime
    zoneUniforms.uNight.value = t
    nightUniforms.uNightLevel.value = t
    if (hemi.current) hemi.current.intensity = NIGHT.hemi * t
    zoneUniforms.uPlayer.value.copy(state.camera.position)
  })

  return (
    <>
      <Environment map={hdri} />
      <SkyBackdrop texture={hdri} />
      <fogExp2 attach="fog" args={['#e3cba6', 0.0011]} />
      <primitive object={sun} />
      <hemisphereLight ref={hemi} args={['#7c6ee0', '#1e3a58', 0]} />
      <primitive object={sun.target} />
      {lightSpots.map((p, i) => (
        <pointLight key={i} ref={(l) => (lampLights.current[i] = l)} position={p} color="#ffc27a" intensity={0} distance={16} decay={2} />
      ))}
      <Stars />
    </>
  )
}
