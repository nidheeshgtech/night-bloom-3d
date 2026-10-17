import * as THREE from 'three'
import { BRAND } from '../brand'
import { zoneById } from './plan'
import { avenue } from '../zone/layout'
import { innerPath, toWorld as wingToWorld } from '../zone/wingsong/layout'
import { lanternPath } from '../zone/lantern/layout'
import { toWorld as herbToWorld } from '../zone/herbarium/layout'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const up = (p, h) => p.clone().setY(p.y + h)

// Points along a path at height h, with look targets `ahead` metres further on.
function glide(path, s0, s1, h, ahead, lookH = h - 0.4, step = 4) {
  const pos = []
  const look = []
  for (let s = s0; s <= s1 + 1e-6; s += step) {
    pos.push(up(path.toWorld(s, 0), h))
    look.push(up(path.toWorld(Math.min(path.length - 0.1, s + ahead), 0), lookH))
  }
  return { pos, look }
}

// Cinematic tour: each segment is a camera spline + look spline, a duration, an optional
// time-of-day target and a caption. Segments chain from wherever the previous one ended.
export function buildTour() {
  const lake = V(0, 0, 0)
  const av = glide(avenue, 2, 36, 2.3, 9)
  const inside = glide(innerPath, 7, innerPath.length - 4, 1.9, 6, 1.5, 3)
  const shore = glide(lanternPath, 1, lanternPath.length - 2, 2.2, 8, 1.9)
  return [
    {
      caption: BRAND.name,
      sub: 'Six garden zones arranged like a flower around a central lake',
      pos: [V(0, 165, 230), V(140, 120, 120)],
      look: [V(0, 0, 10), V(0, 0, 0)],
      duration: 7,
      night: 0,
    },
    {
      caption: zoneById('bloom').name,
      sub: 'The Ribbon Arcade: nine steel arches carrying 99 hanging baskets',
      pos: [V(60, 40, 120), up(avenue.toWorld(0, 0), 7), av.pos[0]],
      look: [V(0, 0, 70), up(avenue.toWorld(8, 0), 2), av.look[0]],
      duration: 5,
    },
    { caption: zoneById('bloom').name, sub: 'Every flower is a real 3D model: petals, leaves and stems', ...av, duration: 13, ease: 'none' },
    {
      caption: zoneById('wingsong').name,
      sub: 'A leaf-shaped glasshouse',
      pos: [up(avenue.toWorld(40, 0), 9), V(80, 30, 10), wingToWorld(-12, 0, 6), wingToWorld(2, 0, 2.2), inside.pos[0]],
      look: [V(60, 4, -30), wingToWorld(18, 0, 6), wingToWorld(18, 0, 4), wingToWorld(14, 0, 1.8), inside.look[0]],
      duration: 9,
    },
    { caption: zoneById('wingsong').name, sub: 'Hundreds of free-flying butterflies, each one clickable', ...inside, duration: 18, ease: 'none' },
    {
      caption: zoneById('herbarium').name,
      sub: 'A chahar bagh: four gardens around a fountain, quartered by water',
      pos: [wingToWorld(30, 0, 16), herbToWorld(60, 0, 22), herbToWorld(78, 0, 4.5)],
      look: [herbToWorld(100, 0, 0), herbToWorld(100, 0, 0), herbToWorld(100, 0, 1.5)],
      duration: 9,
    },
    {
      caption: zoneById('herbarium').name,
      sub: 'Fruit trees, parterres and labelled plant specimens',
      pos: [herbToWorld(84, 0, 4.5), herbToWorld(94, 0, 3.2), herbToWorld(106, 0, 3.2), herbToWorld(118, 0, 3.6)],
      look: [herbToWorld(110, 0, 2), herbToWorld(120, 0, 2.5), herbToWorld(128, 0, 4), herbToWorld(128, 0, 5)],
      duration: 12,
      ease: 'none',
    },
    {
      caption: 'Golden hour',
      sub: 'Light and atmosphere change with the time of day',
      pos: [herbToWorld(128, 0, 22), V(30, 60, 10), V(-50, 45, 50)],
      look: [lake, lake, V(-80, 0, 45)],
      duration: 9,
      night: 0.55,
    },
    {
      caption: zoneById('lantern').name,
      sub: 'Light installations that wake at dusk and respond to visitors',
      pos: [up(lanternPath.toWorld(0, 0), 8), shore.pos[0]],
      look: [up(lanternPath.toWorld(12, 0), 2), shore.look[0]],
      duration: 5,
      night: 1,
    },
    { caption: zoneById('lantern').name, sub: 'Seed lanterns, light reeds and moon lilies on the lake', ...shore, duration: 16, ease: 'none' },
    {
      caption: 'A garden in the desert',
      sub: 'An oasis by day, framed by city lights at night',
      pos: [up(lanternPath.toWorld(lanternPath.length - 1, 0), 14), V(-30, 14, 45), V(15, 5, 22)],
      look: [lake, V(100, 50, -400), V(180, 90, -700)],
      duration: 11,
    },
    {
      caption: BRAND.name,
      sub: 'Explore it yourself',
      pos: [V(15, 25, 10), V(-40, 70, 120), V(0, 165, 230)],
      look: [V(150, 80, -600), lake, V(0, 0, 10)],
      duration: 9,
    },
  ]
}
