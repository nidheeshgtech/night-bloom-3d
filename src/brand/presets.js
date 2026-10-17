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
  // Fictional event demo: venue map, stages, schedule, sponsors, tickets.
  festival: {
    name: 'Sandglow Festival',
    eyebrow: 'Winter festival · interactive venue map',
    lede: 'Find your stage, plan your night and see the drone show before you arrive.',
    fine: 'Fictional event demo built on the Night Bloom engine.',
    accent: '#ffb347',
    accentInk: '#2a1404',
    mark: ['#ffb347', '#ff5fb0', '#5fd0ff', '#ffe08a'],
    cta: { label: 'Get tickets', url: '' },
    showText: 'SANDGLOW',
    zones: {},
    event: {
      dates: 'Every Thu–Sat · Nov–Mar',
      clockStart: '18:48', // demo clock starts here and runs fast
      stages: { main: 'Lakeside Stage', second: 'Lantern Stage' },
      schedule: [
        { time: '19:00', title: 'Sunset DJ set', where: 'main' },
        { time: '19:30', title: 'Acoustic sessions', where: 'second' },
        { time: '20:30', title: 'Headline band', where: 'main' },
        { time: '21:30', title: 'Drone show', where: 'show' },
        { time: '22:00', title: 'Fireworks finale', where: 'show' },
      ],
      sponsors: ['Your Brand Here', 'Partner Two', 'Partner Three'],
    },
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
