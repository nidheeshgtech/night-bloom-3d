# Asset sources and licences

Night Bloom is an independent concept. It is not affiliated with, and does not reproduce, any
existing garden or attraction. All sculptures, layouts and installations are original designs.

## External assets

| File(s) | Source | Author | Licence | Notes |
|---|---|---|---|---|
| `public/assets/hdri/autumn_field_puresky_2k.hdr` | [Poly Haven](https://polyhaven.com/a/autumn_field_puresky) | Sergej Majboroda (original), Jarod Guest (sky edits) | CC0 1.0 | Sky-only HDRI: used for image-based lighting and as the sky backdrop (no landscape or buildings in frame). |
| `public/assets/textures/herringbone_pavement/*` (2k) | [Poly Haven](https://polyhaven.com/a/herringbone_pavement) | Poly Haven | CC0 1.0 | Path paving. |
| `public/assets/textures/grass_ground/*` (1k) | [Poly Haven](https://polyhaven.com/a/grass_ground) | Poly Haven | CC0 1.0 | Lawn base, tinted greener in the shader. |
| `public/assets/textures/aerial_beach_01/*` (1k) | [Poly Haven](https://polyhaven.com/a/aerial_beach_01) | Rob Tuytel | CC0 1.0 | Desert dune sand, tinted golden in the shader. |
| `public/assets/textures/farm_soil/*` (1k) | [Poly Haven](https://polyhaven.com/a/farm_soil) | Poly Haven | CC0 1.0 | Bed soil. |
| `public/assets/textures/mossy_rock/*` (1k) | [Poly Haven](https://polyhaven.com/a/mossy_rock) | Rob Tuytel | CC0 1.0 | Stream and grotto boulders (Wingsong Conservatory). |
| `public/assets/textures/white_sandstone_bricks/*` (1k) | [Poly Haven](https://polyhaven.com/a/white_sandstone_bricks) | Poly Haven | CC0 1.0 | Path kerb stones. |

CC0 places no conditions on use, including commercial use. Attribution above is a courtesy and
for traceability. Check the asset pages again before publishing in case anything has changed.

## Generated in code (no external source)

- All flowers (petunia, French marigold, African daisy), leaves, stems and hanging-basket plants:
  procedural geometry in `src/zone/botany/plants.js`.
- Petal, leaf, frond, foliage-cluster, coir and palm-trunk textures: drawn at runtime on a canvas
  in `src/zone/botany/atlas.js`.
- Arcade, baskets, hedges, shrubs, trees, palms, lamps, bench and pots: procedural geometry in
  `src/zone/`.
- Hibiscus, lantana, fern and alocasia plants; butterfly wing patterns (drawn from general field-guide
  descriptions of each species, not traced from photographs); Seed Lanterns, Light Reeds and Moon
  Lilies: all generated in code in `src/zone/`.
- Lotus Crown, zone light outlines, city ring and street lights: original designs generated in code.
  The Lotus Crown is deliberately unlike any existing landmark (open petal fins, not a lattice dome).
- Festival venue (stages, food trucks, booths, signage) and the fictional 'Sandglow Festival'
  name: generated in code; sponsor names are placeholders.
- Skyline: generic procedural towers, deliberately not modelled on any real building.
- Herbarium Walk (chahar bagh layout, domed pavilion, fountain, fruit trees): original design in
  code, after the traditional four-part garden form.
- Wind-tower pavilions, mashrabiya lattice, star rosettes and ghaf trees: original designs drawn
  in code from traditional regional forms.
- Fanous lanterns and the 8-point-star lattice: traditional geometric pattern drawn in code.
- Ambient audio: synthesised with the Web Audio API in `src/lib/audio.js`.

## Reference images

Photographs supplied during development were used only as a guide for realism (petal detail,
density, light). They are not included in the project, and no layout, sculpture or branding was
copied from them.

## Before adding anything new

Record source, author, licence and URL here. Flag for review before publishing:

- Anything not CC0 or CC-BY.
- Store licences (Fab/Quixel, Sketchfab "Standard", marketplace packs) that may restrict shipping
  raw model files on a public website.
- Any asset depicting a real, identifiable attraction, sculpture, logo or brand.
