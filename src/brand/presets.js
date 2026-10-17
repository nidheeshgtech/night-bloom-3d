// Brand presets. Each client re-skin is one entry here; choose with ?brand=<key>.
// Anything left out falls back to the default (Night Bloom).
//
// cta: booking/enquiry buttons. url can be a booking page, a mailto: link, or '' to show a
// "configure your booking link" note in demos. zones: per-zone name/tagline/cta overrides.
export const PRESETS = {
  nightbloom: {
    name: 'Night Bloom',
    eyebrow: 'Interactive WebGL garden',
    lede: 'Fly over thousands of living flowers, walk the paths, and stay for nightfall.',
    fine: 'Original concept by Nidheesh. Not affiliated with any existing attraction.',
    accent: '#ffb86b',
    accentInk: '#2a1708',
    mark: ['#ff4f7b', '#ffb02e', '#4fc3ff', '#b45cff'],
    cta: { label: 'Book a visit', url: '' },
    showText: 'NIGHT BLOOM',
    zones: {},
  },
  // Fictional sample client, to show how one config re-brands the whole experience.
  oasis: {
    name: 'Oasis Grove Resort',
    eyebrow: 'Resort gardens · virtual preview',
    lede: 'Walk our gardens before you arrive: day by the lake, evenings under the lanterns.',
    fine: 'Sample client re-skin of the Night Bloom engine. Fictional resort.',
    accent: '#5fd0c0',
    accentInk: '#082a26',
    mark: ['#5fd0c0', '#ffd27a', '#ffffff', '#3a8fd8'],
    cta: { label: 'Check availability', url: '' },
    showText: 'OASIS GROVE',
    zones: {
      bloom: { name: 'The Flower Promenade', tagline: 'Our arrival walk under the hanging-basket arches' },
      herbarium: { name: 'The Courtyard Garden', tagline: 'Fountain courtyard and orchard, next to the spa', cta: { label: 'Book the spa' } },
      wingsong: { name: 'Butterfly House', tagline: 'Family favourite, open daily 9am–6pm', cta: { label: 'Book family tickets' } },
      lantern: { name: 'Lantern Lawn', tagline: 'Evening dining by the lake', cta: { label: 'Reserve a table' } },
    },
  },
}
