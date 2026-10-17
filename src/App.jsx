import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import Atmosphere from './scene/Atmosphere'
import Terrain from './scene/Terrain'
import Flowers from './scene/Flowers'
import Sculptures from './scene/Sculptures'
import Lanterns from './scene/Lanterns'
import SelectionMarker from './scene/SelectionMarker'
import CameraRig from './scene/CameraRig'
import Interaction from './scene/Interaction'
import Effects from './scene/Effects'
import Perf from './scene/Perf'
import Hud from './ui/Hud'
import { useGarden } from './lib/store'

export default function App() {
  const quality = useGarden((s) => s.quality)
  const maxDpr = quality === 'high' ? 2 : 1.5
  const [dpr, setDpr] = useState(maxDpr)

  useEffect(() => setDpr(maxDpr), [maxDpr])

  return (
    <>
      <Canvas
        dpr={dpr}
        camera={{ position: [70, 42, 70], fov: 45, near: 0.1, far: 600 }}
        gl={{ antialias: quality === 'low', preserveDrawingBuffer: true }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(maxDpr)} />
        <Atmosphere />
        <Terrain />
        <Flowers />
        <Sculptures />
        <Lanterns />
        <SelectionMarker />
        <CameraRig />
        <Interaction />
        <Perf />
        {quality === 'high' && <Effects />}
      </Canvas>
      <Hud />
    </>
  )
}
