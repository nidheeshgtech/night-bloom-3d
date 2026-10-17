import * as THREE from 'three'
import { mulberry32 } from './random'
import { heightAt, pathDistance, ISLAND_RADIUS, PATH_HALF_WIDTH } from './terrain'
import { FLOWER_EXCLUSIONS } from './sculptures'
import { SPECIES } from './species'

export const FLOWER_COUNT = { high: 22000, low: 7000 }

// Points are generated in random order, so the first N are an even subset for low quality.
function build(max) {
  const rand = mulberry32(7)
  const matrices = new Float32Array(max * 16)
  const tints = new Float32Array(max * 3)
  const heads = new Float32Array(max * 3)
  const species = new Uint8Array(max)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  let n = 0

  while (n < max) {
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(rand()) * (ISLAND_RADIUS - 4)
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (pathDistance(x, z) < PATH_HALF_WIDTH + 0.4) continue
    if (FLOWER_EXCLUSIONS.some((e) => Math.hypot(x - e.x, z - e.z) < e.r)) continue

    // Low-frequency field -> patches of a single species.
    const field = Math.sin(x * 0.09 + 1.3) + Math.cos(z * 0.11) + Math.sin((x + z) * 0.05)
    const idx = Math.abs(Math.floor((field + 3) * 1.2)) % SPECIES.length
    color.set(SPECIES[idx].color).offsetHSL((rand() - 0.5) * 0.03, 0, (rand() - 0.5) * 0.12)

    const y = heightAt(x, z)
    const s = 0.55 + rand() * 0.5
    const sy = s * (0.75 + rand() * 0.5)
    dummy.position.set(x, y, z)
    dummy.rotation.y = rand() * Math.PI * 2
    dummy.scale.set(s, sy, s)
    dummy.updateMatrix()
    dummy.matrix.toArray(matrices, n * 16)
    tints.set([color.r, color.g, color.b], n * 3)
    heads.set([x, y + 0.6 * sy, z], n * 3)
    species[n] = idx
    n++
  }
  return { count: max, matrices, tints, heads, species }
}

export const FLOWERS = build(FLOWER_COUNT.high)
