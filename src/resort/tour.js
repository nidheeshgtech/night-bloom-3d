import * as THREE from 'three'
import { BRAND } from '../brand'
import { DINING, POOL, VILLAS } from './layout'
import { RESORT_POIS } from './layout'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const up = (p, h) => p.clone().setY(p.y + h)
const poi = (id) => RESORT_POIS.find((p) => p.id === id)
// A lifted viewpoint between the lake and a facility, and a slow push toward it.
function visit(id, caption, sub, { height = 9, dist = 0.55, duration = 9 } = {}) {
  const p = poi(id)
  const target = up(p.look, 0)
  const far = p.pos.clone().lerp(new THREE.Vector3(0, 0, 0), dist).setY(height + 6)
  const near = up(p.pos, 2.6)
  return { caption, sub, pos: [far, near], look: [target, target], duration }
}

export function buildResortTour() {
  const lake = V(0, 0, 0)
  return [
    { caption: BRAND.name, sub: 'A garden resort in the desert, explored in 3D', pos: [V(0, 165, 230), V(120, 110, 140)], look: [V(0, 0, 10), lake], duration: 7, night: 0 },
    visit('arrival', 'Arrival', 'Check-in under the porte-cochère, straight into the gardens'),
    visit('pool', 'Infinity Pool', '22 m of water on the lake edge, cabanas and a pool bar', { dist: 0.3 }),
    { caption: 'Garden Villas', sub: 'Six private villas, each with a plunge pool', pos: [up(VILLAS[2].pos, 22), up(VILLAS[1].pos.clone().lerp(lake, 0.25), 6)], look: [VILLAS[1].pos, VILLAS[1].pos], duration: 9 },
    visit('spa', 'Courtyard Spa', 'Treatments in a four-part garden around a fountain', { dist: 0.15 }),
    visit('kids', 'Kids Club', 'A butterfly glasshouse to explore', { dist: 0.2 }),
    { caption: 'Golden hour', sub: 'Evenings at the resort', pos: [V(-20, 60, 60), up(DINING.pos.clone().lerp(lake, 0.45), 8)], look: [lake, up(DINING.pos, 2)], duration: 9, night: 0.6 },
    { caption: 'Lakeview Terrace', sub: 'Dinner under the pergola lights', pos: [up(poi('dining').pos, 3)], look: [up(DINING.pos, 1.5)], duration: 6, night: 1 },
    { caption: BRAND.name, sub: 'Book your stay', pos: [up(POOL.pos.clone().lerp(lake, 0.4), 30), V(0, 165, 230)], look: [lake, V(0, 0, 10)], duration: 9 },
  ]
}
