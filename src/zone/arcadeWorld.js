import * as THREE from 'three'
import { ARCADE, BED_IN, PATH_LENGTH, WALK_LIMIT, frameAt, heightAt, pathToWorld, worldToPath } from './layout'
import { BED_PLANT_COUNT, BENCH, FLOWER_HEADS, SPECIES_INDEX, legs, lamps, pots } from './planting'
import { PALMS } from './Palms'

const EYE = 1.7
const mid = (ARCADE.from + ARCADE.to) / 2

const spawnFrame = frameAt(2.5)
const spawnPos = pathToWorld(2.5, 0)
spawnPos.y += EYE

const arcadeCentre = pathToWorld(mid, 0)
arcadeCentre.y += 2
const borderCentre = pathToWorld(6.5, BED_IN + 1.2)
borderCentre.y += 0.3

const aerialTarget = pathToWorld(PATH_LENGTH / 2, 0)
aerialTarget.y = 0.5

const pickAlong = (from, to, d, y, r) => {
  const out = []
  for (let s = from; s <= to; s += r) {
    const p = pathToWorld(s, d)
    out.push([p.x, p.y + y, p.z, r])
  }
  return out
}

export const arcadeWorld = {
  id: 'arcade',
  heightAt,
  clamp(x, z) {
    const { dist, frame } = worldToPath(x, z)
    if (dist <= WALK_LIMIT) return [x, z]
    const k = WALK_LIMIT / dist
    return [frame.x + (x - frame.x) * k, frame.z + (z - frame.z) * k]
  },
  colliders: [
    ...legs.map((p) => ({ x: p.x, z: p.z, r: 0.35 })),
    ...lamps.map((l) => ({ ...xz(pathToWorld(l.s, l.d)), r: 0.25 })),
    ...pots.map((p) => ({ ...xz(pathToWorld(p.s, p.d)), r: 0.5 })),
    { ...xz(pathToWorld(BENCH.s, BENCH.d)), r: 0.95 },
    ...PALMS.map((p) => ({ ...xz(pathToWorld(p.s, p.d)), r: 0.55 })),
  ],
  sculptures: [
    {
      id: 'arcade',
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
      viewDir: new THREE.Vector3(frameAt(mid).nx, 0, frameAt(mid).nz).multiplyScalar(-1).add(new THREE.Vector3(frameAt(mid).tx, 0, frameAt(mid).tz).multiplyScalar(-0.8)).normalize(),
      pick: legs.filter((_, i) => i % 2 === 0).map((p) => [p.x, p.y + 2, p.z, 1.4]).concat(
        Array.from({ length: ARCADE.count }, (_, i) => {
          const p = pathToWorld(ARCADE.from + ((ARCADE.to - ARCADE.from) * i) / (ARCADE.count - 1), 0)
          return [p.x, p.y + 3.6, p.z, 0.9]
        }),
      ),
    },
    {
      id: 'border',
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
  ],
  flowers: { heads: FLOWER_HEADS.heads, species: FLOWER_HEADS.species, count: () => FLOWER_HEADS.count },
  speciesIds: [SPECIES_INDEX.petunia, SPECIES_INDEX.marigold, SPECIES_INDEX.daisy],
  pickRadius: 0.05,
  marker: { radius: 0.06, lift: 0.015 },
  spawn: { pos: spawnPos, yaw: Math.atan2(-spawnFrame.tx, -spawnFrame.tz) },
  aerial: { target: aerialTarget, distance: 34, height: 22 },
  camera: { position: [aerialTarget.x + 26, 20, aerialTarget.z + 24], far: 1200 },
  orbit: { min: 6, max: 70 },
}

function xz(v) {
  return { x: v.x, z: v.z }
}
