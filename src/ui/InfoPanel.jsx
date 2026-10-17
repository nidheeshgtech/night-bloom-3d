import { useGarden } from '../lib/store'
import { rig } from '../lib/player'
import { getWorld } from '../lib/world'
import { SPECIES } from '../lib/species'
import { BUTTERFLIES } from '../lib/butterflies'
import Icon from './Icon'

function SculptureCard({ id }) {
  const s = getWorld().sculptures.find((sc) => sc.id === id)
  return (
    <>
      <p className="eyebrow">{s.kind || 'Concept sculpture'}</p>
      <h2>{s.name}</h2>
      <p className="tagline">{s.tagline}</p>
      <p>{s.description}</p>
      <dl className="facts">
        {s.facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {s.flowers.length > 0 && <p className="label">Flowers used</p>}
      <ul className="chips">
        {s.flowers.map((f) => {
          const sp = SPECIES.find((x) => x.id === f)
          return (
            <li key={f}>
              <span className="dot" style={{ background: sp.color }} />
              {sp.name}
            </li>
          )
        })}
      </ul>
    </>
  )
}

function ButterflyCard({ species }) {
  const found = useGarden((s) => s.discoveredButterflies)
  const b = BUTTERFLIES[species]
  return (
    <>
      <p className="eyebrow">
        <span className="dot" style={{ background: b.color }} /> Butterfly
      </p>
      <h2>{b.name}</h2>
      <p className="latin">{b.latin}</p>
      <dl className="facts">
        <div>
          <dt>Family</dt>
          <dd>{b.family}</dd>
        </div>
        <div>
          <dt>Wingspan</dt>
          <dd>{b.wingspan}</dd>
        </div>
        <div>
          <dt>Range</dt>
          <dd>{b.range}</dd>
        </div>
      </dl>
      <p>{b.note}</p>
      <p className="fine-print">Shown about 1.8× life size so they're easy to spot.</p>
      <div className="collection">
        <p className="label">
          Butterflies found {found.length} / {BUTTERFLIES.length}
        </p>
        <div className="collection-dots">
          {BUTTERFLIES.map((x, i) => (
            <span key={x.id} title={found.includes(i) ? x.name : 'Not found yet'} className={found.includes(i) ? 'found' : ''} style={{ '--c': x.color }} />
          ))}
        </div>
      </div>
    </>
  )
}

function ZoneCard({ id }) {
  const z = getWorld().zones.find((zone) => zone.id === id)
  return (
    <>
      <p className="eyebrow">{z.theme}</p>
      <h2>{z.name}</h2>
      <p className="tagline">{z.tagline}</p>
      <p>{z.description}</p>
      <p className={`status ${z.status}`}>{z.status === 'open' ? 'Open: enter to explore' : 'Opening soon. The flower carpet is planted; the garden inside is still being built.'}</p>
    </>
  )
}

function FlowerCard({ species }) {
  const discovered = useGarden((s) => s.discovered)
  const sp = SPECIES[species]
  const ids = getWorld().speciesIds
  const found = ids.filter((i) => discovered.includes(i)).length
  return (
    <>
      <p className="eyebrow">
        <span className="dot" style={{ background: sp.color }} /> Flower
      </p>
      <h2>{sp.name}</h2>
      <p className="latin">{sp.latin}</p>
      <dl className="facts">
        <div>
          <dt>Family</dt>
          <dd>{sp.family}</dd>
        </div>
        <div>
          <dt>Origin</dt>
          <dd>{sp.origin}</dd>
        </div>
        <div>
          <dt>Season</dt>
          <dd>{sp.season}</dd>
        </div>
      </dl>
      <p>{sp.note}</p>
      <div className="collection">
        <p className="label">
          Species found {found} / {ids.length}
        </p>
        <div className="collection-dots">
          {ids.map((i) => (
            <span
              key={SPECIES[i].id}
              title={discovered.includes(i) ? SPECIES[i].name : 'Not found yet'}
              className={discovered.includes(i) ? 'found' : ''}
              style={{ '--c': SPECIES[i].color }}
            />
          ))}
        </div>
        {found === ids.length && <p className="tagline">You found every species in the garden.</p>}
      </div>
    </>
  )
}

export default function InfoPanel() {
  const selected = useGarden((s) => s.selected)
  const mode = useGarden((s) => s.mode)
  if (!selected) return null

  const close = () => (mode === 'inspect' ? rig.back() : useGarden.setState({ selected: null }))
  const body =
    selected.kind === 'sculpture' ? <SculptureCard id={selected.id} /> : selected.kind === 'zone' ? <ZoneCard id={selected.id} /> : selected.kind === 'butterfly' ? <ButterflyCard species={selected.species} /> : <FlowerCard species={selected.species} />

  return (
    <aside className="panel" aria-live="polite">
      <button className="icon-btn panel-close" onClick={close} aria-label="Close">
        <Icon name="close" />
      </button>
      {body}
    </aside>
  )
}
