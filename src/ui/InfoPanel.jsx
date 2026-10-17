import { useGarden } from '../lib/store'
import { rig } from '../lib/player'
import { SCULPTURES } from '../lib/sculptures'
import { SPECIES } from '../lib/species'
import Icon from './Icon'

function SculptureCard({ id }) {
  const s = SCULPTURES.find((sc) => sc.id === id)
  return (
    <>
      <p className="eyebrow">Concept sculpture</p>
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
          Species found {discovered.length} / {SPECIES.length}
        </p>
        <div className="collection-dots">
          {SPECIES.map((s, i) => (
            <span
              key={s.id}
              title={discovered.includes(i) ? s.name : 'Not found yet'}
              className={discovered.includes(i) ? 'found' : ''}
              style={{ '--c': s.color }}
            />
          ))}
        </div>
        {discovered.length === SPECIES.length && <p className="tagline">You found every species in the garden.</p>}
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
