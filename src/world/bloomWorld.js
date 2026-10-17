import * as THREE from 'three'
import { ARCADE, BED_IN, frameAt, pathToWorld } from '../zone/layout'
import { BED_PLANT_COUNT, BENCH, FLOWER_HEADS, SPECIES_INDEX, legs, lamps, pots } from '../zone/planting'
import { PALMS } from '../zone/Palms'
import { getLibrary } from '../zone/library'
import { QUAY_RADIUS, heightAt } from './terrain'
import { WORLD_RADIUS, ZONES, spokes } from './plan'
import { petalBeds } from './petalPlanting'
import { PROMENADE_PALMS, TREES } from './TreeBelts'

const EYE = 1.7
const xz = (v) => ({ x: v.x, z: v.z })

// ---------- Zone spawn points: on each spoke, facing the gate ----------
const zones = ZONES.map((z, i) => {
  let pos
  let yaw
  if (z.id === 'bloom') {
    const f = frameAt(2.5)
    pos = pathToWorld(2.5, 0)
    yaw = Math.atan2(-f.tx, -f.tz)
  } else {
    const path = spokes[i]
    const f = path.frameAt(path.length * 0.35)
    pos = path.toWorld(path.length * 0.35, 0)
    yaw = Math.atan2(-f.tx, -f.tz)
  }
  pos.y += EYE
  return { ...z, spawn: { pos, yaw } }
})

// ---------- Inspectable features (Bloom Terraces) ----------
const mid = (ARCADE.from + ARCADE.to) / 2
const arcadeCentre = pathToWorld(mid, 0).add(new THREE.Vector3(0, 2, 0))
const borderCentre = pathToWorld(6.5, BED_IN + 1.2).add(new THREE.Vector3(0, 0.3, 0))
const pickAlong = (from, to, d, y, r) => {
  const out = []
  for (let s = from; s <= to; s += r) {
    const p = pathToWorld(s, d)
    out.push([p.x, p.y + y, p.z, r])
  }
  return out
}
const fm = frameAt(mid)

const sculptures = [
  {
    id: 'arcade',
    zone: 'bloom',
    kind: 'Floral installation',
    name: 'Ribbon Arcade',
    tagline: 'Nine steel ribbons carrying a wave of trailing petunias',
    description:
      'A curving arcade of paired flat-bar steel arches. Ninety-nine coir-lined baskets of trailing petunias ride along the ribbons, shifting from white through pink to violet as you walk. Climbing foliage softens the steel between the flowers.',
    flowers: ['petunia'],
    facts: [
      ['Arches', '9, paired steel ribbons'],
      ['Baskets', '99 hanging, coir-lined'],
      ['Clear height', '≈3.7 m'],
    ],
    center: arcadeCentre,
    viewDistance: 13,
    viewHeight: 4,
    viewDir: new THREE.Vector3(-fm.nx - fm.tx * 0.8, 0, -fm.nz - fm.tz * 0.8).normalize(),
    pick: legs
      .filter((_, i) => i % 2 === 0)
      .map((p) => [p.x, p.y + 2, p.z, 1.4])
      .concat(
        Array.from({ length: ARCADE.count }, (_, i) => {
          const p = pathToWorld(ARCADE.from + ((ARCADE.to - ARCADE.from) * i) / (ARCADE.count - 1), 0)
          return [p.x, p.y + 3.6, p.z, 0.9]
        }),
      ),
  },
  {
    id: 'border',
    zone: 'bloom',
    kind: 'Planting design',
    name: 'The Long Border',
    tagline: 'Three-tier bedding along the garden walk',
    description:
      'Planted in bands like a classic Gulf winter border: low French marigolds along the kerb, a broad middle of petunias in colour drifts, and taller African daisies at the back against a clipped hedge.',
    flowers: ['marigold', 'petunia', 'daisy'],
    facts: [
      ['Depth', '≈2.4 m each side'],
      ['Plants', BED_PLANT_COUNT.toLocaleString('en')],
      ['Season', 'Oct–Apr bedding'],
    ],
    center: borderCentre,
    viewDistance: 5.5,
    viewHeight: 2.2,
    pick: [...pickAlong(2, 11, BED_IN + 1.2, 0.3, 1.2), ...pickAlong(2, 11, -(BED_IN + 1.2), 0.3, 1.2)],
  },
]

// ---------- Pickable flower heads: avenue beds + baskets + petal borders ----------
function petalHeads() {
  const lib = getLibrary()
  const heads = []
  const species = []
  for (const [name, items] of Object.entries(petalBeds)) {
    for (const it of items) {
      for (const h of lib[name][it.variant].heads) {
        const w = h.clone().applyMatrix4(it.matrix)
        heads.push(w.x, w.y, w.z)
        species.push(SPECIES_INDEX[name])
      }
    }
  }
  return { heads, species }
}
const extra = petalHeads()
const heads = new Float32Array(FLOWER_HEADS.heads.length + extra.heads.length)
heads.set(FLOWER_HEADS.heads)
heads.set(extra.heads, FLOWER_HEADS.heads.length)
const species = new Uint8Array(FLOWER_HEADS.species.length + extra.species.length)
species.set(FLOWER_HEADS.species)
species.set(extra.species, FLOWER_HEADS.species.length)

const WALK_MIN = QUAY_RADIUS + 0.6

export const bloomWorld = {
  id: 'bloom',
  heightAt,
  // Keep visitors on land: out of the lake and inside the outer tree ring.
  clamp(x, z) {
    const r = Math.hypot(x, z) || 1
    if (r < WALK_MIN) return [(x * WALK_MIN) / r, (z * WALK_MIN) / r]
    if (r > WORLD_RADIUS - 12) return [(x * (WORLD_RADIUS - 12)) / r, (z * (WORLD_RADIUS - 12)) / r]
    return [x, z]
  },
  colliders: [
    ...legs.map((p) => ({ x: p.x, z: p.z, r: 0.35 })),
    ...lamps.map((l) => ({ ...xz(pathToWorld(l.s, l.d)), r: 0.25 })),
    ...pots.map((p) => ({ ...xz(pathToWorld(p.s, p.d)), r: 0.5 })),
    { ...xz(pathToWorld(BENCH.s, BENCH.d)), r: 0.95 },
    ...PALMS.map((p) => ({ ...xz(p.pos), r: 0.55 })),
    ...PROMENADE_PALMS.map((p) => ({ ...xz(p.pos), r: 0.55 })),
    ...TREES.map((t) => ({ ...xz(t.pos), r: 0.45 * t.s })),
  ],
  zones,
  sculptures,
  flowers: { heads, species, count: () => species.length },
  speciesIds: [SPECIES_INDEX.petunia, SPECIES_INDEX.marigold, SPECIES_INDEX.daisy],
  pickRadius: 0.05,
  marker: { radius: 0.06, lift: 0.015 },
  spawn: zones[0].spawn,
  aerial: { target: new THREE.Vector3(0, 0, 12), distance: 235, height: 165 },
  camera: { position: [0, 165, 247], far: 1600 },
  orbit: { min: 12, max: 380 },
}
