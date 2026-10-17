import * as THREE from 'three'
import { heightAt, ISLAND_RADIUS, PATH_RADIUS } from './terrain'
import { COLLIDERS, SCULPTURES } from './sculptures'
import { FLOWERS, FLOWER_COUNT } from './flowers'
import { useGarden } from './store'

const SPAWN_ANGLE = -1.05 // just before the tunnel, facing into it
const EYE = 1.7

const spawnPos = new THREE.Vector3(Math.cos(SPAWN_ANGLE) * PATH_RADIUS, 0, Math.sin(SPAWN_ANGLE) * PATH_RADIUS)
spawnPos.y = heightAt(spawnPos.x, spawnPos.z) + EYE

export const islandWorld = {
  id: 'island',
  heightAt,
  clamp(x, z) {
    const r = Math.hypot(x, z)
    const max = ISLAND_RADIUS - 5
    return r > max ? [(x * max) / r, (z * max) / r] : [x, z]
  },
  colliders: COLLIDERS,
  sculptures: SCULPTURES,
  flowers: {
    heads: FLOWERS.heads,
    species: FLOWERS.species,
    count: () => FLOWER_COUNT[useGarden.getState().quality],
  },
  speciesIds: [0, 1, 2, 3, 4, 5],
  spawn: { pos: spawnPos, yaw: Math.atan2(Math.sin(SPAWN_ANGLE), -Math.cos(SPAWN_ANGLE)) },
  aerial: { target: new THREE.Vector3(0, 2, 0), distance: 80, height: 48 },
  camera: { position: [70, 42, 70], far: 600 },
  orbit: { min: 12, max: 170 },
}
