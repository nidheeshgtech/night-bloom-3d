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
import NavArrows from './scene/NavArrows'
import Hud from './ui/Hud'
import { useGarden } from './lib/store'
import BotanyPreview from './zone/BotanyPreview'
import WorldScene from './world/WorldScene'
import ZoneEffects from './zone/ZoneEffects'
import { bloomWorld } from './world/bloomWorld'
import { islandWorld } from './lib/islandWorld'
import { setWorld } from './lib/world'

// Render resolution from a pixel budget rather than a fixed ratio: small high-density screens
// (phones) get sharp output, large desktop windows don't overload the GPU.
const PIXEL_BUDGET = { high: 1.5e6, low: 1.3e6 }
function budgetDpr(quality) {
  const css = window.innerWidth * window.innerHeight
  const ideal = Math.sqrt(PIXEL_BUDGET[quality] / css)
  const floor = quality === 'high' ? 1.25 : 1 // measured smooth on desktop at 1.25x
  return Math.round(Math.min(window.devicePixelRatio || 1, 2, Math.max(floor, ideal)) * 100) / 100
}

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
  const maxDpr = budgetDpr(quality)
  const ready = useGarden((s) => s.ready)
  // Only judge performance once loading and shader compilation are over; the slow frames
  // during warm-up used to trigger a permanent drop to low resolution on every device.
  const [monitor, setMonitor] = useState(false)
  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => setMonitor(true), 4000)
    return () => clearTimeout(t)
  }, [ready])
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
        {/* If the device struggles, step resolution down gradually (never below 1x). Never
            step back up: every change re-allocates render targets, a visible hitch. */}
        {monitor && <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(1, Math.round(d * 0.8 * 100) / 100))} />}
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
        <NavArrows />
        <Perf />
        <Warmup />
        {quality === 'high' && (isZone ? <ZoneEffects /> : <Effects />)}
      </Canvas>
      <Hud />
    </>
  )
}
