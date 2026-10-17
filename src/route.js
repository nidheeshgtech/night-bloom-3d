// URL routing without a router: clean paths for each demo, query params still supported.
//   /            → showcase (list of demos)
//   /garden      → Night Bloom garden
//   /festival    → Sandglow Festival (event mode)
//   /resort      → Dunebloom Resort tour
//   /hotel       → Saffron Shores beach hotel; /hotel-tv → looping TV / lobby-screen mode
//   ?brand=key   → any preset (client links), ?world=island, ?zone=botany (dev)
export const PATH_PRESETS = { garden: 'nightbloom', festival: 'festival', resort: 'resort', oasis: 'oasis', hotel: 'hotel', 'hotel-tv': 'hotel' }

const params = new URLSearchParams(window.location.search)
const segment = window.location.pathname.replace(/\/+$/, '').split('/').pop()

export const ROUTE = (() => {
  if (params.get('brand')) return { kind: 'app', brand: params.get('brand'), fromPath: false, tv: params.has('tv') }
  if (PATH_PRESETS[segment]) return { kind: 'app', brand: PATH_PRESETS[segment], fromPath: true, tv: segment.endsWith('-tv') || params.has('tv') }
  if (params.has('world') || params.has('zone')) return { kind: 'app', brand: null, fromPath: false }
  return { kind: 'showcase' }
})()
