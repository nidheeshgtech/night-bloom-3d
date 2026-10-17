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
import BotanyPreview from './zone/BotanyPreview'
import ArcadeScene from './zone/ArcadeScene'
import ZoneEffects from './zone/ZoneEffects'
import { arcadeWorld } from './zone/arcadeWorld'
import { islandWorld } from './lib/islandWorld'
import { setWorld } from './lib/world'

const ZONE = new URLSearchParams(window.location.search).get('zone')
const world = ZONE === 'arcade' ? arcadeWorld : islandWorld
setWorld(world)
const isZone = world.id === 'arcade'

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
          <ArcadeScene />
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
        {quality === 'high' && (isZone ? <ZoneEffects /> : <Effects />)}
      </Canvas>
      <Hud />
    </>
  )
}
