import * as THREE from 'three'
import { BRAND } from '../brand'
import { BAR, PIER, RESTAURANT, SUITE, SUITE_Y, TOWER, TOWER_TOP, VILLAS, shoreZ } from './layout'

const V = (x, y, z) => new THREE.Vector3(x, y, z)

// Hotel guided tour: arrive from the sea, the beach and pier, the pool, through the lobby glass,
// up into the suite, then golden hour, night and fireworks over the water.
export function buildHotelTour() {
  const tc = (TOWER.z0 + TOWER.z1) / 2
  return [
    { caption: BRAND.name, sub: 'A beachfront resort on the Arabian Gulf', pos: [V(-120, 70, -260), V(-60, 45, -150)], look: [V(0, 10, 20), V(0, 12, 20)], duration: 8, night: 0 },
    { caption: 'Private beach', sub: 'Palapas, loungers and calm turquoise water', pos: [V(-40, 14, -75), V(-12, 3.2, shoreZ(-12) + 4)], look: [V(10, 1, shoreZ(10) + 10), V(20, 1.5, shoreZ(20) + 12)], duration: 8 },
    { caption: 'The pier', sub: 'A boardwalk out to the overwater restaurant', pos: [V(PIER.x - 4, PIER.y + 2.4, -30), V(PIER.x, PIER.y + 2, -80)], look: [V(PIER.x, 2, -80), V(RESTAURANT.x, 3, RESTAURANT.z)], duration: 8 },
    { caption: 'Lagoon pool', sub: 'A 42 m lagoon with a swim-up bar', pos: [V(PIER.x - 10, 22, -40), V(-18, 7, -2), V(-10, 3, 6)], look: [V(BAR.x, 1, BAR.z), V(BAR.x, 1, BAR.z), V(BAR.x, 1.5, BAR.z)], duration: 10 },
    { caption: 'Grand lobby', sub: 'Double height, under a crystal chandelier', pos: [V(0, 4, 26), V(0, 2.6, 38), V(0, 2.3, 44)], look: [V(0, 4, 50), V(0, 3.8, 53), V(0, 3.4, 57)], duration: 8 },
    { caption: 'Signature Suite', sub: 'Floor 8 · bed facing the sea', cut: true, pos: [V(-2.2, SUITE_Y + 1.7, 44.2), V(-4.5, SUITE_Y + 1.65, 46), V(-10.8, SUITE_Y + 1.6, 46.5)], look: [V(-6, SUITE_Y + 0.9, 55), V(-7, SUITE_Y + 0.9, 55), V(-6.5, SUITE_Y + 0.9, 53)], duration: 9 },
    { caption: 'The view', sub: 'From the suite balcony to the Gulf', pos: [V(-7, SUITE_Y + 1.7, 50), V(-7, SUITE_Y + 1.6, SUITE.z0 - 2.4)], look: [V(-7, SUITE_Y - 2, -40), V(-7, SUITE_Y - 6, -80)], duration: 6 },
    { caption: 'Beach villas', sub: 'Private plunge pools on the sand', cut: true, pos: [V(-60, 30, -40), V(-100, 9, -40)], look: [V(-116, 2, -12), V(VILLAS[1].x, 2, VILLAS[1].z)], duration: 8, night: 0.6 },
    { caption: 'Golden hour', sub: 'Lights come on along the bay', pos: [V(-40, 20, -95), V(70, 26, -120)], look: [V(0, 12, 20), V(0, TOWER_TOP * 0.6, tc)], duration: 9, night: 1 },
    { caption: 'Dinner over the water', sub: 'The overwater restaurant after dark', pos: [V(RESTAURANT.x + 22, 7, RESTAURANT.z - 18)], look: [V(RESTAURANT.x, PIER.y + 2, RESTAURANT.z)], duration: 6 },
    { caption: BRAND.name, sub: 'Book your stay', pos: [V(90, 60, -200), V(0, 90, -260)], look: [V(0, 20, 20), V(0, 15, 10)], duration: 8 },
  ]
}
