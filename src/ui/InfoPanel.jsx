import { useGarden } from '../lib/store'
import { rig } from '../lib/player'
import { getWorld } from '../lib/world'
import { SPECIES } from '../lib/species'
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
      <p className="label">Flowers used</p>
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

  return (
    <aside className="panel" aria-live="polite">
      <button className="icon-btn panel-close" onClick={close} aria-label="Close">
        <Icon name="close" />
      </button>
      {selected.kind === 'sculpture' ? <SculptureCard id={selected.id} /> : <FlowerCard species={selected.species} />}
    </aside>
  )
}
