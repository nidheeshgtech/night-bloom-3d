import * as THREE from 'three'
import { HOTEL_POIS, PALM_SPOTS, PIER, WALLS, blockedAt, clampWalk, setLevel, shoreZ, walkHeight } from './layout'
import { makePath } from '../world/pathlib'
import { buildHotelTour } from './tour'

const EYE = 1.7
const spawn = HOTEL_POIS.find((p) => p.id === 'pool')
const spawnYaw = Math.atan2(-(spawn.look.x - spawn.pos.x), -(spawn.look.z - spawn.pos.z))

// World config consumed by the shared camera rig, picking and HUD.
export const hotelWorld = {
  id: 'hotel',
  heightAt: walkHeight,
  clamp: clampWalk,
  blockedAt,
  setLevel,
  colliders: PALM_SPOTS.map((p) => ({ x: p.pos.x, z: p.pos.z, r: 0.5 })),
  walls: WALLS,
  sculptures: [],
  flowers: { heads: new Float32Array(0), species: new Uint8Array(0), count: () => 0 },
  speciesIds: [],
  walkPaths: [
    { path: makePath(Array.from({ length: 43 }, (_, i) => { const x = -168 + i * 8; return [x, shoreZ(x) + 19.7] }), { step: 0.25 }), half: 1.6 },
    { path: makePath([[PIER.x, PIER.z0 + 1], [PIER.x, (PIER.z0 + PIER.z1) / 2], [PIER.x, PIER.z1 + 1]], { step: 0.25 }), half: 1.8 },
  ],
  spawn: { pos: spawn.pos.clone().setY(spawn.pos.y + EYE), yaw: spawnYaw },
  aerial: { target: new THREE.Vector3(0, 6, -10), distance: 150, height: 85 },
  camera: { position: [60, 85, -150], far: 2400 },
  orbit: { min: 10, max: 320 },
  showView: { pos: [PIER.x - 6, 9, -40], target: [0, 50, -150] },
  tour: buildHotelTour,
}
