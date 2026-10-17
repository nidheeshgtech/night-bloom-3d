import { Suspense, lazy, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import ZoneLighting from '../zone/ZoneLighting'
import Ground from '../zone/Ground'
import Grass from '../zone/Grass'
import Lake from './Lake'
import WorldPaths from './WorldPaths'
import Petals from './Petals'
import TreeBelts from './TreeBelts'
import Gates from './Gates'
import ZoneMarkers from './ZoneMarkers'
import PromenadeLamps from './PromenadeLamps'
import { ZONES } from './plan'

// Zone content modules, code-split and mounted only when the camera is within range.
// Zones without content yet show their gate, hedges and borders only.
const CONTENT = {
  bloom: { load: lazy(() => import('../zone/BloomZone')), radius: Infinity },
}

function ZoneContent({ zone }) {
  const entry = CONTENT[zone.id]
  const [active, setActive] = useState(entry?.radius === Infinity)
  const last = useRef(0)
  useFrame(({ camera, clock }) => {
    if (!entry || entry.radius === Infinity || clock.elapsedTime - last.current < 0.5) return
    last.current = clock.elapsedTime
    const d = camera.position.distanceTo(zone.center)
    // Hysteresis so a zone doesn't flicker in and out at the boundary.
    if (!active && d < entry.radius) setActive(true)
    else if (active && d > entry.radius * 1.2) setActive(false)
  })
  if (!entry || !active) return null
  const Content = entry.load
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  )
}

export default function WorldScene() {
  return (
    <>
      <ZoneLighting />
      <Ground />
      <Grass />
      <Lake />
      <WorldPaths />
      <Petals />
      <TreeBelts />
      <Gates />
      <PromenadeLamps />
      {ZONES.map((z) => (
        <ZoneContent key={z.id} zone={z} />
      ))}
      <ZoneMarkers />
    </>
  )
}
