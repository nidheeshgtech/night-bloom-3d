import * as THREE from 'three'
import { mulberry32 } from '../../lib/random'
import { hibiscusBloom, alocasiaPlant, fernPlant } from '../botany/plants'
import { facing } from '../botany/builder'
import { hibiscusShrub, lantanaShrub, rockGeometry, shrubGeometry } from '../foliage'
import { getLibrary } from '../library'
import { SPECIES_INDEX } from '../planting'
import { ALOCASIA, BOUGAINVILLEA, FERNS, HIBISCUS, LANTANA, ROCKS, conservatoryBeds } from './planting'
import { inside } from './layout'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const SP = { hibiscus: 7, lantana: 8 }

// Geometry variants and instance matrices for the conservatory interior.
let lib = null
export function getWingsongLibrary() {
  if (lib) return lib
  const rand = mulberry32(31)
  const inst = (list, variants, scaleFn) =>
    list.map((p, i) => {
      const s = scaleFn ? scaleFn() : 1
      return { matrix: new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), rand() * 6.28), V(s, s * (0.9 + rand() * 0.2), s)), variant: i % variants }
    })
  lib = {
    hibiscus: [hibiscusShrub(0, hibiscusBloom, facing), hibiscusShrub(1, hibiscusBloom, facing), hibiscusShrub(2, hibiscusBloom, facing), hibiscusShrub(3, hibiscusBloom, facing)],
    lantana: [lantanaShrub(3), lantanaShrub(4)],
    bougainvillea: shrubGeometry(5, 'bougainvillea'),
    alocasia: [alocasiaPlant(6), alocasiaPlant(7)],
    fern: [fernPlant(8), fernPlant(9)],
    rock: [rockGeometry(10), rockGeometry(11), rockGeometry(12)],
  }
  lib.items = {
    hibiscus: inst(HIBISCUS, 4, () => 1.1 + rand() * 0.4),
    lantana: inst(LANTANA, 2, () => 1 + rand() * 0.4),
    bougainvillea: inst(BOUGAINVILLEA, 1, () => 1.3 + rand() * 0.4),
    alocasia: inst(ALOCASIA, 2, () => 0.9 + rand() * 0.5),
    fern: inst(FERNS, 2, () => 0.8 + rand() * 0.5),
    rock: ROCKS.map((r, i) => ({
      matrix: new THREE.Matrix4().compose(r.p.clone().add(V(0, r.big ? r.s * 0.2 : 0.02, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 0.4, rand() * 6.28, rand() * 0.4)), V(r.s, r.s, r.s)),
      variant: i % 3,
    })),
  }
  return lib
}

// Pickable flower heads and butterfly nectar targets inside the conservatory.
let targets = null
export function getWingsongTargets() {
  if (targets) return targets
  const w = getWingsongLibrary()
  const base = getLibrary()
  const heads = []
  const species = []
  const add = (items, variants, sp) => {
    for (const it of items) for (const h of variants[it.variant].heads) {
      const p = h.clone().applyMatrix4(it.matrix)
      heads.push(p)
      species.push(sp)
    }
  }
  add(w.items.hibiscus, w.hibiscus, SP.hibiscus)
  add(w.items.lantana, w.lantana, SP.lantana)
  add(conservatoryBeds.petunia, base.petunia, SPECIES_INDEX.petunia)
  add(conservatoryBeds.daisy, base.daisy, SPECIES_INDEX.daisy)
  // Butterflies only visit flowers that are safely inside the glass.
  const nectar = heads.filter((p) => inside(p.clone().add(V(0, 0.3, 0)), 0.6))
  targets = { heads, species, nectar }
  return targets
}
