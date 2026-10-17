import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Terrain from './scene/Terrain'
import Flowers from './scene/Flowers'
import Perf from './scene/Perf'
import SkyDome from './scene/SkyDome'
import { usePerf } from './lib/store'

const SUN = [-60, 22, -40]
const FOG = '#f6c48f'

function PerfOverlay() {
  const { fps, calls, triangles } = usePerf()
  return (
    <div className="perf">
      {fps} fps · {calls} draw calls · {(triangles / 1000).toFixed(0)}k tris
    </div>
  )
}

export default function App() {
  return (
    <>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [70, 42, 70], fov: 45, near: 0.1, far: 600 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={[FOG]} />
        <fog attach="fog" args={[FOG, 130, 340]} />
        <SkyDome sun={SUN} />
        <hemisphereLight args={['#ffe3c2', '#4a6b3a', 0.9]} />
        <directionalLight position={SUN} intensity={2.4} color="#ffd9a8" />
        <Terrain />
        <Flowers />
        <OrbitControls
          autoRotate
          autoRotateSpeed={0.4}
          enableDamping
          dampingFactor={0.06}
          minDistance={12}
          maxDistance={160}
          maxPolarAngle={Math.PI / 2 - 0.05}
          target={[0, 2, 0]}
        />
        <Perf />
      </Canvas>
      <PerfOverlay />
    </>
  )
}
