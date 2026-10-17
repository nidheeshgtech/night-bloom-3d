import * as THREE from 'three'
import { makePath } from './pathlib'
import { heightAt } from './terrain'
import { pathToWorld } from '../zone/layout'

// Site plan: six petal-shaped zones around a central lake, so the whole world reads as one
// flower from the air. A promenade rings the lake; a spoke path leads to each zone's gate.
export const PROMENADE = { radius: 51, half: 2.5 }
export const SPOKE_HALF = 2
export const PETAL = { r0: 64, tip: 150, halfAngle: 0.45 }
export const WORLD_RADIUS = 175

const deg = (d) => (d * Math.PI) / 180

// Placeholder names: run a trademark search before publishing.
const DEFS = [
  {
    id: 'bloom',
    color: '#ff5fb0',
    name: 'Bloom Terraces',
    theme: 'Flower kingdom',
    angle: 90,
    status: 'open',
    tagline: 'Flower carpets, the Ribbon Arcade and long planted borders',
    description: 'The main gate. A curving avenue of hanging-basket arches leads from the lake into terraces of bedding flowers.',
    border: { species: 'petunia', colors: ['#ff4f9a', '#ffffff', '#b45ce0', '#ff86bf'] },
  },
  {
    id: 'herbarium',
    color: '#ffc35a',
    name: 'Herbarium Walk',
    theme: 'Botanical garden',
    angle: 30,
    status: 'open',
    tagline: 'A chahar bagh: four gardens around a fountain, quartered by water',
    description: 'A formal four-part garden in the Islamic tradition: raised water channels, parterre beds, fruit trees, a domed pavilion and labelled plant specimens.',
    border: { species: 'daisy', colors: ['#ffffff', '#e4d8ff', '#ffffff'] },
  },
  {
    id: 'wingsong',
    color: '#ff9d3a',
    name: 'Wingsong Conservatory',
    theme: 'Butterfly sanctuary',
    angle: -30,
    status: 'open',
    pinHeight: 16,
    tagline: 'A leaf-shaped glasshouse alive with butterflies',
    description: 'A single organic glasshouse over a stream and nectar-rich shrubs, home to hundreds of free-flying butterflies.',
    border: { species: 'marigold', colors: ['#ffb000', '#ff6a00', '#ffcc1a'] },
  },
  {
    id: 'canopy',
    color: '#3fe0c0',
    name: 'Canopy Hollow',
    theme: 'Tropical rainforest',
    angle: -90,
    status: 'soon',
    tagline: 'A misty ravine, a waterfall and a canopy bridge',
    description: 'Layered rainforest on the hill. The waterfall here feeds the stream that runs through the world into the lake.',
    border: { species: 'daisy', colors: ['#ffffff', '#f4f1ff'] },
  },
  {
    id: 'dreamroot',
    color: '#a86bff',
    name: 'Dreamroot Wilds',
    theme: 'Fantasy realm',
    angle: -150,
    status: 'soon',
    tagline: 'Oversized flower pavilions and hidden trails',
    description: 'Organic architecture grown from giant roots and petals, with secret paths and discoveries to collect.',
    border: { species: 'petunia', colors: ['#e2306e', '#9b4fd6', '#c94fd0'] },
  },
  {
    id: 'lantern',
    color: '#5aa8ff',
    name: 'Lantern Shore',
    theme: 'Light garden',
    angle: 150,
    status: 'open',
    tagline: 'Glowing installations on the lake shore after dusk',
    description: 'Light sculptures that wake at sunset and reflect in the lake, with installations that respond to visitors.',
    border: { species: 'petunia', colors: ['#ffffff', '#b45ce0', '#f2f2ff'] },
  },
]

// Petal half-angle at parameter t (0 = gate, 1 = tip).
const petalWidth = (t) => PETAL.halfAngle * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.9)

function petalSide(a, sign) {
  const pts = []
  for (let t = 0.05; t <= 1.0001; t += 0.025) {
    const r = PETAL.r0 + t * (PETAL.tip - PETAL.r0)
    const phi = a + sign * petalWidth(Math.min(t, 0.999))
    pts.push([Math.cos(phi) * r, Math.sin(phi) * r])
  }
  return makePath(pts, { step: 0.25 })
}

export const ZONES = DEFS.map((d) => {
  const a = deg(d.angle)
  const dir = new THREE.Vector2(Math.cos(a), Math.sin(a))
  const gate = d.id === 'bloom' ? pathToWorld(0, 0) : new THREE.Vector3(dir.x * PETAL.r0, 0, dir.y * PETAL.r0)
  gate.y = heightAt(gate.x, gate.z)
  const center = new THREE.Vector3(dir.x * 100, 0, dir.y * 100)
  center.y = heightAt(center.x, center.z)
  const sides = [petalSide(a, 1), petalSide(a, -1)].map((path) => {
    // Inward = the normal side that points toward the petal's axis.
    const mid = path.frameAt(path.length * 0.4)
    const toAxis = new THREE.Vector2(dir.x * 100 - mid.x, dir.y * 100 - mid.z)
    return { path, inward: Math.sign(toAxis.x * mid.nx + toAxis.y * mid.nz) }
  })
  return { pinHeight: 9, ...d, a, dir, gate, center, sides }
})

export const zoneById = (id) => ZONES.find((z) => z.id === id)

// Angle of the gap between petal k and the next one (tree belts live here).
export const GAP_ANGLES = ZONES.map((z) => z.a + deg(30))
export { petalWidth }

const ringPts = Array.from({ length: 40 }, (_, i) => {
  const a = (i / 40) * Math.PI * 2
  return [Math.cos(a) * PROMENADE.radius, Math.sin(a) * PROMENADE.radius]
})
export const promenade = makePath(ringPts, { closed: true, step: 0.25 })

export const spokes = ZONES.map((z) => {
  const start = new THREE.Vector2(z.gate.x, z.gate.z).normalize().multiplyScalar(PROMENADE.radius + PROMENADE.half + 0.4)
  const mid = start.clone().lerp(new THREE.Vector2(z.gate.x, z.gate.z), 0.5)
  return makePath(
    [
      [start.x, start.y],
      [mid.x, mid.y],
      [z.gate.x, z.gate.z],
    ],
    { step: 0.25 },
  )
})
