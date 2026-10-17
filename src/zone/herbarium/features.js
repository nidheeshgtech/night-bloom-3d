import * as THREE from 'three'
import { C, FOUNTAIN_R, PAV, POOL, QUARTERS, quarterCentre, toWorld } from './layout'
import { CYPRESSES, FRUIT_TREES, HERB_GHAF, HERB_PALMS } from './planting'
import { herbBeds } from './planting'

const sphere = (p, y, r) => [p.x, p.y + y, p.z, r]
const crown = (p, y = 2.3) => p.clone().add(new THREE.Vector3(0, y, 0))
const along = new THREE.Vector3(Math.cos(Math.PI / 6), 0, Math.sin(Math.PI / 6))

// Main features (shown as chips) plus labelled plant specimens (found by clicking).
export const HERB_FEATURES = [
  {
    id: 'chaharbagh',
    zone: 'herbarium',
    kind: 'Garden design',
    name: 'The Four Gardens',
    tagline: 'A chahar bagh: four quarters divided by water',
    description:
      'A garden plan that spread from Persia across the Islamic world, from Andalusia to India: a square divided into four by water channels that meet at a central fountain. Each quarter here is a parterre of flower beds around a fruit tree.',
    flowers: ['marigold', 'petunia', 'daisy'],
    facts: [
      ['Size', '40 × 40 m'],
      ['Quarters', '4, each with 4 beds'],
      ['Plants', (herbBeds.petunia.length + herbBeds.marigold.length + herbBeds.daisy.length).toLocaleString('en')],
    ],
    center: toWorld(C - 9, -9, 0.5),
    viewDistance: 26,
    viewHeight: 16,
    viewDir: along.clone().negate(),
    pick: QUARTERS.map((q) => sphere(toWorld(...quarterCentre(q)), 0.6, 5.5)),
  },
  {
    id: 'fountain',
    zone: 'herbarium',
    kind: 'Water feature',
    name: 'Fountain of the Four Channels',
    tagline: 'A tiered fountain feeding four raised rills',
    description:
      'Water rises through a two-tier stone basin into an octagonal pool, then runs out along four raised channels to the corners of the garden. The plaza around it is inlaid with a sixteen-point star.',
    flowers: [],
    facts: [
      ['Pool', 'Octagonal, ≈7 m across'],
      ['Channels', '4 × 14 m'],
      ['Paving', '16-point star rosette'],
    ],
    center: toWorld(C, 0, 1.2),
    viewDistance: 9,
    viewHeight: 2.5,
    pick: [sphere(toWorld(C, 0), 1, FOUNTAIN_R)],
  },
  {
    id: 'pavilion',
    zone: 'herbarium',
    kind: 'Architecture',
    name: 'The Herbarium Pavilion',
    tagline: 'An octagonal domed kiosk at the head of the garden',
    description:
      'Eight pointed arches under a white dome, raised on stone steps at the end of the main axis. From inside, the view runs straight down the channel to the fountain and the entrance pool.',
    flowers: [],
    facts: [
      ['Plan', 'Octagonal, 8 arches'],
      ['Height', '≈10 m to the finial'],
      ['Floor', 'Star rosette'],
    ],
    center: toWorld(PAV.r, 0, 4),
    viewDistance: 16,
    viewHeight: 3,
    viewDir: along.clone().negate(),
    pick: [sphere(toWorld(PAV.r, 0), 3.5, 5)],
  },
  {
    id: 'reflectingpool',
    zone: 'herbarium',
    kind: 'Water feature',
    name: 'Reflecting Pool',
    tagline: 'A raised pool lined with date palms',
    description: 'The entrance walk passes either side of a long raised pool. On a still day it mirrors the palms and the pavilion dome at the far end of the axis.',
    flowers: [],
    facts: [
      ['Length', `${POOL.r1 - POOL.r0} m`],
      ['Edging', 'Sandstone coping'],
      ['Planting', 'Date palms, lily pads'],
    ],
    center: toWorld((POOL.r0 + POOL.r1) / 2, 0, 0.8),
    viewDistance: 10,
    viewHeight: 3,
    pick: [70, 74, 78].map((R) => sphere(toWorld(R, 0), 0.4, 1.6)),
  },
  ...[
    {
      id: 'sp-orange',
      name: 'Bitter Orange',
      latin: 'Citrus × aurantium',
      at: FRUIT_TREES[0].pos,
      facts: [['Family', 'Rutaceae'], ['Native to', 'Southeast Asia'], ['Grown for', 'Scent, shade, fruit']],
      description: 'Long planted in courtyard gardens from Andalusia to Iran. Its blossom is distilled into orange-flower water, and the sour fruit is used for marmalade.',
    },
    {
      id: 'sp-pomegranate',
      name: 'Pomegranate',
      latin: 'Punica granatum',
      at: FRUIT_TREES[1].pos,
      facts: [['Family', 'Lythraceae'], ['Native to', 'Iran to northern India'], ['Grown for', 'Fruit, ornament']],
      description: 'Cultivated in the Middle East for thousands of years and well suited to dry climates. The fruit is packed with juicy seed coats called arils.',
    },
    {
      id: 'sp-date',
      name: 'Date Palm',
      latin: 'Phoenix dactylifera',
      at: HERB_PALMS[0].pos,
      crownY: 5.5,
      facts: [['Family', 'Arecaceae'], ['Native to', 'Arabia and North Africa'], ['Grown for', 'Dates, shade, fibre']],
      description: 'The defining tree of Arabian oases. Every part has been used: fruit for food, fronds for roofing and baskets, trunks for building. A single palm can yield tens of kilograms of dates a year.',
    },
    {
      id: 'sp-ghaf',
      name: 'Ghaf',
      latin: 'Prosopis cineraria',
      at: HERB_GHAF,
      crownY: 3.2,
      facts: [['Family', 'Fabaceae'], ['Native to', 'Arabia to India'], ['Status', 'UAE national tree']],
      description: 'A drought-hardy desert tree whose deep taproot reaches groundwater far below the surface. It stays green through the summer and gives shade where little else grows.',
    },
    {
      id: 'sp-cypress',
      name: 'Italian Cypress',
      latin: 'Cupressus sempervirens',
      at: CYPRESSES[0],
      crownY: 3.5,
      facts: [['Family', 'Cupressaceae'], ['Native to', 'Eastern Mediterranean, Iran'], ['Grown for', 'Formal avenues']],
      description: 'A classic tree of Persian garden design. Its narrow evergreen form lines walks and frames views without casting wide shade.',
    },
  ].map((s) => ({
    id: s.id,
    zone: 'herbarium',
    chip: false,
    pickBias: 8,
    kind: 'Plant specimen',
    name: s.name,
    tagline: s.latin,
    description: s.description,
    flowers: [],
    facts: s.facts,
    center: crown(s.at, s.crownY ?? 2.2),
    viewDistance: 7,
    viewHeight: 0.5,
    pick: [sphere(s.at, s.crownY ?? 2.2, 1.4)],
  })),
]
