import { useMemo } from 'react'
import { Environment, OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { petuniaPlant, marigoldPlant, daisyPlant, basketPlant } from './botany/plants'
import { plantMaterial, plantDepthMaterial, zoneUniforms } from './materials'

// Dev-only close-up of the procedural plants for judging geometry and shading.
function Plant({ make, seed, color, position, lod = 0 }) {
  const geometry = useMemo(() => make(seed)[lod ? 'lod1' : 'lod0'].toGeometry(), [make, seed, lod])
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geometry, plantMaterial(), 1)
    m.setMatrixAt(0, new THREE.Matrix4().setPosition(...position))
    m.setColorAt(0, new THREE.Color(color))
    m.castShadow = true
    m.receiveShadow = true
    m.customDepthMaterial = plantDepthMaterial()
    return m
  }, [geometry, color, position])
  return <primitive object={mesh} />
}

export default function BotanyPreview() {
  useFrame(({ clock }) => (zoneUniforms.uTime.value = clock.elapsedTime))
  return (
    <>
      <Environment files="/assets/hdri/autumn_field_puresky_2k.hdr" background environmentIntensity={0.6} />
      <directionalLight position={[7, 4.9, 5.2]} intensity={3} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003}>
        <orthographicCamera attach="shadow-camera" args={[-1, 1, 1, -1, 0.1, 30]} />
      </directionalLight>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial color="#3b2a1c" roughness={1} />
      </mesh>
      <Plant make={petuniaPlant} seed={1} color="#b65cd8" position={[-0.25, 0, 0]} />
      <Plant make={petuniaPlant} seed={2} color="#ff5c9a" position={[0.08, 0, 0.1]} />
      <Plant make={marigoldPlant} seed={3} color="#ffb21e" position={[0.35, 0, -0.05]} />
      <Plant make={daisyPlant} seed={4} color="#ffffff" position={[0.05, 0, -0.3]} />
      <Plant make={basketPlant} seed={5} color="#f070c0" position={[-0.45, 0.45, -0.35]} />
      <Plant make={petuniaPlant} seed={6} color="#ffffff" position={[0.6, 0, 0.2]} lod={1} />
      <OrbitControls target={[0, 0.12, 0]} makeDefault />
    </>
  )
}
