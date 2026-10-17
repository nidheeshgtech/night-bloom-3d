import { petuniaPlant, marigoldPlant, daisyPlant, basketPlant, basketBowl } from './botany/plants'

// Three seeded variants per plant type, each with a detailed and a far LOD geometry
// plus the local positions of its flower heads (for picking).
function variants(make, seeds, opts) {
  return seeds.map((seed) => {
    const p = make(seed, opts)
    return { geo0: p.lod0.toGeometry(), geo1: p.lod1.toGeometry(), heads: p.heads }
  })
}

let lib = null
export function getLibrary() {
  if (lib) return lib
  lib = {
    petunia: variants(petuniaPlant, [11, 12, 13]),
    marigold: variants(marigoldPlant, [21, 22, 23]),
    daisy: variants(daisyPlant, [31, 32, 33]),
    basket: variants(basketPlant, [41, 42, 43]),
    pot: variants(basketPlant, [51, 52], { trailers: 4 }),
    bowl: basketBowl(),
  }
  return lib
}
