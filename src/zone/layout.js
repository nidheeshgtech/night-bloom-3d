import { heightAt } from '../world/terrain'
import { makePath } from '../world/pathlib'

export { heightAt }

// Ribbon Arcade avenue: the entry walk of Bloom Terraces, running outward from the lake
// promenade (south petal). Points are authored locally, then placed in world space.
export const PATH_HALF = 1.6 // paved width 3.2 m
export const EDGE_W = 0.2 // sandstone edging
export const BED_IN = PATH_HALF + EDGE_W + 0.05
export const BED_OUT = 4.3
export const HEDGE_IN = BED_OUT + 0.1
export const HEDGE_OUT = BED_OUT + 0.75

export const ARCADE = { from: 12.5, to: 32.5, count: 9, legOffset: 2.05, height: 3.7 }

const LOCAL = [
  [-24, 7],
  [-13, 2.5],
  [-2.5, -1.5],
  [8, -1.2],
  [17, 3.5],
  [25, 9.5],
]
const toWorld = ([x, z]) => [z - 4, 64 + x + 24]

export const avenue = makePath(LOCAL.map(toWorld))
export const PATH_LENGTH = avenue.length
export const PATH = avenue.lut
export const frameAt = avenue.frameAt
export const pathToWorld = avenue.toWorld
export const worldToPath = avenue.nearest
