import * as THREE from 'three'
import { heightAt, PATH_RADIUS } from './terrain'

export const TUNNEL = { from: -0.55, to: 0.55, step: 0.075, halfWidth: 2.8, height: 3.4 }

export const HELIX_BASE = new THREE.Vector3(0, heightAt(0, 0), 0)

export const PODS_BASE = new THREE.Vector3(-30.6, heightAt(-30.6, 25.7), 25.7)
export const PODS = [
  { dx: 0, dy: 5.4, dz: 0, r: 2.6, colors: ['petunia', 'zinnia'] },
  { dx: 4.6, dy: 3.6, dz: -2, r: 1.7, colors: ['marigold', 'zinnia'] },
  { dx: -4.2, dy: 4.2, dz: 2.6, r: 2, colors: ['cornflower', 'periwinkle'] },
  { dx: 1.6, dy: 8, dz: 3.6, r: 1.4, colors: ['petunia', 'periwinkle'] },
  { dx: -2.6, dy: 2.8, dz: -4.2, r: 1.3, colors: ['marigold', 'petunia'] },
]

const tunnelMid = new THREE.Vector3(PATH_RADIUS, heightAt(PATH_RADIUS, 0) + 1.8, 0)

function tunnelPickSpheres() {
  const out = []
  for (let a = TUNNEL.from; a <= TUNNEL.to + 1e-6; a += TUNNEL.step * 2) {
    const x = Math.cos(a) * PATH_RADIUS
    const z = Math.sin(a) * PATH_RADIUS
    out.push([x, heightAt(x, z) + 1.8, z, 3.3])
  }
  return out
}

export const SCULPTURES = [
  {
    id: 'helix',
    name: 'Helix of Light',
    tagline: 'A 9-metre double spiral of living blooms',
    description:
      'Two ribbons of flowers twist around a central trunk in opposite directions. The form nods to phyllotaxis, the spiral pattern plants use to space leaves and seeds so each one catches the sun. At night the crown lights the whole garden.',
    flowers: ['zinnia', 'marigold', 'pansy', 'periwinkle'],
    facts: [
      ['Height', '9 m'],
      ['Blooms', '≈5,400'],
      ['Structure', 'Counter-rotating double helix'],
    ],
    center: HELIX_BASE.clone().add(new THREE.Vector3(0, 4.5, 0)),
    viewDistance: 17,
    viewHeight: 2,
    pick: [
      [0, HELIX_BASE.y + 1.5, 0, 3.6],
      [0, HELIX_BASE.y + 4.5, 0, 3],
      [0, HELIX_BASE.y + 7.5, 0, 2.4],
    ],
  },
  {
    id: 'pods',
    name: 'Floating Seed Pods',
    tagline: 'Five flowering pods drifting above the meadow',
    description:
      'Inspired by the way dandelions and maples send their seeds into the wind. Each pod is a sphere of blooms tethered to the ground by a single vine, gently rising and falling. Walk underneath and look up.',
    flowers: ['petunia', 'zinnia', 'marigold', 'cornflower', 'periwinkle'],
    facts: [
      ['Pods', '5'],
      ['Highest pod', '≈8 m'],
      ['Blooms', '≈5,000'],
    ],
    center: PODS_BASE.clone().add(new THREE.Vector3(0, 4.5, 0)),
    viewDistance: 18,
    viewHeight: 1,
    pick: PODS.map((p) => [PODS_BASE.x + p.dx, PODS_BASE.y + p.dy, PODS_BASE.z + p.dz, p.r + 0.6]),
  },
  {
    id: 'tunnel',
    name: 'Lumen Tunnel',
    tagline: 'A walk-through arcade of fifteen floral arches',
    description:
      'Fifteen arches span the garden path, each wrapped in blooms. By day it is a shaded corridor of colour. As night falls the flowers glow and the tunnel becomes a passage of light.',
    flowers: ['periwinkle', 'cornflower', 'pansy'],
    facts: [
      ['Arches', '15'],
      ['Length', '≈24 m'],
      ['Blooms', '≈4,000'],
    ],
    center: tunnelMid,
    viewDistance: 15,
    viewHeight: 3,
    // Always view from outside the ring, so the camera never lands inside the arches.
    viewDir: new THREE.Vector3(1, 0, 0.7).normalize(),
    pick: tunnelPickSpheres(),
  },
]

// Ground-level circles the player can't walk into, and that flowers avoid.
export const COLLIDERS = [{ x: 0, z: 0, r: 4.3 }]
export const FLOWER_EXCLUSIONS = [{ x: 0, z: 0, r: 4.2 }]
