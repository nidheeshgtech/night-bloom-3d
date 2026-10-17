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
import Warmup from './scene/Warmup'
import Hud from './ui/Hud'
import { useGarden } from './lib/store'
import BotanyPreview from './zone/BotanyPreview'
import WorldScene from './world/WorldScene'
import ZoneEffects from './zone/ZoneEffects'
import { bloomWorld } from './world/bloomWorld'
import { islandWorld } from './lib/islandWorld'
import { setWorld } from './lib/world'

const params = new URLSearchParams(window.location.search)
const ZONE = params.get('zone')
// The first prototype (floating island) stays available at ?world=island for comparison.
const world = params.get('world') === 'island' ? islandWorld : bloomWorld
setWorld(world)
const isZone = world.id === 'bloom'

export default function App() {
  if (ZONE === 'botany') {
    return (
      <Canvas shadows camera={{ position: [0.55, 0.45, 0.75], fov: 40, near: 0.01, far: 100 }}>
        <BotanyPreview />
      </Canvas>
    )
  }
  const quality = useGarden((s) => s.quality)
  const maxDpr = quality === 'high' ? 2 : 1.5
  const [dpr, setDpr] = useState(maxDpr)

  useEffect(() => setDpr(maxDpr), [maxDpr])

  return (
    <>
      <Canvas
        dpr={dpr}
        shadows={isZone}
        camera={{ position: world.camera.position, fov: 45, near: 0.1, far: world.camera.far }}
        gl={{ antialias: quality === 'low', preserveDrawingBuffer: true }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(maxDpr)} />
        {isZone ? (
          <WorldScene />
        ) : (
          <>
            <Atmosphere />
            <Terrain />
            <Flowers />
            <Sculptures />
            <Lanterns />
          </>
        )}
        <SelectionMarker />
        <CameraRig />
        <Interaction />
        <Perf />
        <Warmup />
        {quality === 'high' && (isZone ? <ZoneEffects /> : <Effects />)}
      </Canvas>
      <Hud />
    </>
  )
}
