import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import SkyDome, { SUN, skyMaterial } from './SkyDome'
import Fireflies from './Fireflies'
import { shared } from '../lib/flowerMaterial'
import { glowMat } from '../lib/materials'
import { useGarden } from '../lib/store'
import { audio } from '../lib/audio'

const palette = (p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, typeof v === 'string' ? new THREE.Color(v) : v]))

const DAY = palette({
  top: '#3a5f9e',
  horizon: '#f6c48f',
  bottom: '#e8a87c',
  glow: '#ffbf73',
  sun: '#ffd9a8',
  sunI: 2.4,
  hemiSky: '#ffe3c2',
  hemiGround: '#4a6b3a',
  hemiI: 0.9,
})
const NIGHT = palette({
  top: '#03061a',
  horizon: '#1c2552',
  bottom: '#0b0f2a',
  glow: '#9fb4ff',
  sun: '#9fb4ff',
  sunI: 0.45,
  hemiSky: '#5a6bb0',
  hemiGround: '#1a2340',
  hemiI: 0.55,
})

// Smoothly blends sky, fog, lights and glow between golden hour and night.
export default function Atmosphere() {
  const bg = useRef()
  const fog = useRef()
  const sun = useRef()
  const hemi = useRef()
  const night = useRef(useGarden.getState().night)

  useFrame((state, delta) => {
    const target = useGarden.getState().night
    night.current += (target - night.current) * Math.min(1, delta * 3)
    const t = night.current
    const u = skyMaterial.uniforms

    u.uTop.value.lerpColors(DAY.top, NIGHT.top, t)
    u.uHorizon.value.lerpColors(DAY.horizon, NIGHT.horizon, t)
    u.uBottom.value.lerpColors(DAY.bottom, NIGHT.bottom, t)
    u.uGlow.value.lerpColors(DAY.glow, NIGHT.glow, t)
    bg.current.copy(u.uHorizon.value)
    fog.current.color.copy(u.uHorizon.value)
    sun.current.color.lerpColors(DAY.sun, NIGHT.sun, t)
    sun.current.intensity = THREE.MathUtils.lerp(DAY.sunI, NIGHT.sunI, t)
    hemi.current.color.lerpColors(DAY.hemiSky, NIGHT.hemiSky, t)
    hemi.current.groundColor.lerpColors(DAY.hemiGround, NIGHT.hemiGround, t)
    hemi.current.intensity = THREE.MathUtils.lerp(DAY.hemiI, NIGHT.hemiI, t)

    shared.uNight.value = t
    shared.uTime.value = state.clock.elapsedTime
    glowMat.emissiveIntensity = 0.2 + t * 4
    audio.setNight(t)
  })

  return (
    <>
      <color ref={bg} attach="background" args={['#f6c48f']} />
      <fog ref={fog} attach="fog" args={['#f6c48f', 130, 340]} />
      <SkyDome />
      <hemisphereLight ref={hemi} />
      <directionalLight ref={sun} position={SUN.toArray()} />
      <Fireflies />
    </>
  )
}
