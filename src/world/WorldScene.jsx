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
import BookingPins from './BookingPins'
import LightShow from './LightShow'
import ZoneOutlines from './ZoneOutlines'
import GroundLights from './GroundLights'
import CityRing from './CityRing'
import LotusCrown from './LotusCrown'
import { EVENT } from '../event/layout'
import EventVenue from '../event/EventVenue'
import EventPins from '../event/EventPins'
import LakeReflections from './LakeReflections'
import Skyline from './Skyline'
import Pavilions from './Pavilions'
import { ZONES } from './plan'

// Zone content, code-split. Landmarks (structures visible from the air) are always mounted;
// details (planting, creatures, interiors) mount only when the camera is within range.
const CONTENT = {
  bloom: { detail: lazy(() => import('../zone/BloomZone')), radius: Infinity },
  wingsong: {
    landmark: lazy(() => import('../zone/wingsong/Glasshouse')),
    detail: lazy(() => import('../zone/wingsong/WingsongDetail')),
    radius: Infinity,
  },
  herbarium: {
    detail: lazy(() => import('../zone/herbarium/HerbariumZone')),
    radius: Infinity,
  },
  lantern: {
    landmark: lazy(() => import('../zone/lantern/LanternLandmark')),
    detail: lazy(() => import('../zone/lantern/LanternDetail')),
    radius: Infinity,
  },
}

function InRange({ zone, radius, children }) {
  const [active, setActive] = useState(radius === Infinity)
  const last = useRef(-1)
  useFrame(({ camera, clock }) => {
    if (radius === Infinity || clock.elapsedTime - last.current < 0.5) return
    last.current = clock.elapsedTime
    const d = camera.position.distanceTo(zone.center)
    // Hysteresis so a zone doesn't flicker in and out at the boundary.
    if (!active && d < radius) setActive(true)
    else if (active && d > radius * 1.2) setActive(false)
  })
  return active ? children : null
}

function ZoneContent({ zone }) {
  const entry = CONTENT[zone.id]
  if (!entry) return null
  const { landmark: Landmark, detail: Detail, radius } = entry
  return (
    <Suspense fallback={null}>
      {Landmark && <Landmark />}
      {Detail && (
        <InRange zone={zone} radius={radius}>
          <Detail />
        </InRange>
      )}
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
      <Pavilions />
      <PromenadeLamps />
      <LakeReflections />
      <Skyline />
      {ZONES.map((z) => (
        <ZoneContent key={z.id} zone={z} />
      ))}
      <ZoneMarkers />
      <BookingPins />
      <LightShow />
      <ZoneOutlines />
      <GroundLights />
      <CityRing />
      <LotusCrown />
      {EVENT && <EventVenue />}
      {EVENT && <EventPins />}
    </>
  )
}
