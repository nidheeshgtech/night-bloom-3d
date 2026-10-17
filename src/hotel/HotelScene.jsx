import { useMemo } from 'react'
import * as THREE from 'three'
import ZoneLighting from '../zone/ZoneLighting'
import Skyline from '../world/Skyline'
import LightShow from '../world/LightShow'
import EventPins from '../event/EventPins'
import HotelBuilding from './HotelBuilding'
import HotelSite from './HotelSite'
import HotelLife from './HotelLife'
import { buildHotelNightMap } from './nightmap'
import { LAND_Y, PIER, RESTAURANT, terrainH } from './layout'

// City skyline inland and along the coast (never out at sea).
const CLUSTERS = [
  { angle: 1.25, dist: 620, spread: 0.32, count: 26, maxH: 210 },
  { angle: 0.12, dist: 700, spread: 0.12, count: 12, maxH: 150 },
  { angle: 3.02, dist: 700, spread: 0.12, count: 10, maxH: 130 },
]
// Day bounce: blue sky from above, warm sand and stone reflecting back up.
const FILL = { sky: '#cfe2ff', ground: '#d8b98c', intensity: 0.3 }
const groundAt = (x, z) => Math.max(terrainH(x, z), LAND_Y)

export default function HotelScene() {
  const spots = useMemo(() => [new THREE.Vector3(RESTAURANT.x, PIER.y + 2.8, RESTAURANT.z)], [])
  return (
    <>
      <ZoneLighting nightMap={buildHotelNightMap} spots={spots} fill={FILL} softness={3} fogDensity={0.0013} />
      <HotelSite />
      <HotelLife />
      <HotelBuilding />
      <Skyline clusters={CLUSTERS} groundAt={groundAt} />
      <LightShow center={[0, 0, -150]} />
      <EventPins />
    </>
  )
}
