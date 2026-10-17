import * as THREE from 'three'
import { mulberry32 } from '../../lib/random'
import { getLibrary } from '../library'
import { SPECIES_INDEX } from '../planting'
import { AX, C, HALF, LT, O, PAV, QUARTERS, quarterCentre, toWorld } from './layout'

const rand = mulberry32(3030)
const UP = new THREE.Vector3(0, 1, 0)
const SIZE = { petunia: 1.35, marigold: 1.2, daisy: 1.3 }

// One colour scheme per quarter.
const THEMES = [
  { pet: ['#ff4f9a', '#ff86bf'], daisy: '#ffffff', mari: '#ffb000' },
  { pet: ['#b45ce0', '#9b4fd6'], daisy: '#e4d8ff', mari: '#ffcc1a' },
  { pet: ['#f2f2ff', '#ffffff'], daisy: '#a678e0', mari: '#ff6a00' },
  { pet: ['#e2306e', '#ff4f9a'], daisy: '#ffffff', mari: '#ffb000' },
]

// Each quarter: four square beds (marigold edging, petunia stripes, daisy centre) around a
// central tree, inside a low box hedge.
export const herbBeds = { petunia: [], marigold: [], daisy: [] }
export const BED_RECTS = []
export const QUARTER_HEDGES = []
const color = new THREE.Color()
const q = new THREE.Quaternion()

QUARTERS.forEach((quad, qi) => {
  const [R0, R1, l0, l1] = quad
  const theme = THEMES[qi]
  const inset = 0.5
  QUARTER_HEDGES.push([R0 + inset, R1 - inset, l0 + inset, l1 - inset])
  const size = R1 - R0 - 2
  const bed = (size - 1) / 2
  for (let bi = 0; bi < 2; bi++) {
    for (let bj = 0; bj < 2; bj++) {
      const br0 = R0 + 1 + bi * (bed + 1)
      const bl0 = l0 + 1 + bj * (bed + 1)
      BED_RECTS.push([br0, br0 + bed, bl0, bl0 + bed, theme.pet[0]])
      const cr = br0 + bed / 2
      const cl = bl0 + bed / 2
      for (let R = br0 + 0.17; R < br0 + bed; R += 0.33) {
        for (let l = bl0 + 0.17; l < bl0 + bed; l += 0.33) {
          const jR = R + (rand() - 0.5) * 0.2
          const jl = l + (rand() - 0.5) * 0.2
          const edge = Math.min(jR - br0, br0 + bed - jR, jl - bl0, bl0 + bed - jl)
          const dc = Math.hypot(jR - cr, jl - cl)
          const species = edge < 0.5 ? 'marigold' : dc < 1.3 ? 'daisy' : 'petunia'
          const hex = species === 'marigold' ? theme.mari : species === 'daisy' ? theme.daisy : theme.pet[Math.floor((jR + jl) / 1.6) & 1]
          color.set(hex).offsetHSL((rand() - 0.5) * 0.02, 0, (rand() - 0.5) * 0.06)
          const s = SIZE[species] * (0.88 + rand() * 0.24)
          q.setFromAxisAngle(UP, rand() * Math.PI * 2)
          herbBeds[species].push({
            matrix: new THREE.Matrix4().compose(toWorld(jR, jl), q.clone(), new THREE.Vector3(s, s * (0.9 + rand() * 0.2), s)),
            color: color.clone(),
            variant: Math.floor(rand() * 3),
          })
        }
      }
    }
  }
})

// Trees: bitter orange / pomegranate at the quarter centres, cypress rows, date palms by the
// pool, one ghaf by the entrance.
export const FRUIT_TREES = QUARTERS.map((quad, qi) => ({ pos: toWorld(...quarterCentre(quad)), kind: qi === 0 || qi === 3 ? 'orange' : 'pomegranate' }))

export const CYPRESSES = (() => {
  const out = []
  for (const s of [-1, 1]) {
    for (let R = C - HALF + 4; R <= C + HALF - 4; R += 8) out.push(toWorld(R, s * (HALF + 1.3)))
    out.push(toWorld(C - HALF - 1.5, s * (HALF + 1.5)), toWorld(O + 1.5, s * (HALF + 1.5)), toWorld(PAV.r, s * 7.5))
  }
  return out
})()

export const HERB_PALMS = [69, 76].flatMap((R) => [-1, 1].map((s) => ({ pos: toWorld(R, s * 4.8), h: 6.2 + (R - 69) * 0.15 })))
export const HERB_GHAF = toWorld(72, -11)

const toXZ = (pts) => pts.map(([R, l]) => [AX.x * R + LT.x * l, AX.y * R + LT.y * l])
// Bed colours for the far-distance flower carpet.
export function herbBloomPolys() {
  return BED_RECTS.map(([R0, R1, l0, l1, fill]) => ({ pts: toXZ([[R0, l0], [R1, l0], [R1, l1], [R0, l1]]), fill }))
}

// Pickable flower heads (computed on demand; needs the plant library).
let heads = null
export function getHerbHeads() {
  if (heads) return heads
  const lib = getLibrary()
  const h = []
  const sp = []
  for (const [name, items] of Object.entries(herbBeds)) {
    for (const it of items) {
      for (const p of lib[name][it.variant].heads) {
        const w = p.clone().applyMatrix4(it.matrix)
        h.push(w.x, w.y, w.z)
        sp.push(SPECIES_INDEX[name])
      }
    }
  }
  heads = { heads: h, species: sp }
  return heads
}
