import { DEMOS, OWNER } from './demos'
import './showcase.css'

const BASE = import.meta.env.BASE_URL

export default function Showcase() {
  document.title = `${OWNER.name} · Interactive 3D experiences`
  const contact = OWNER.email ? `mailto:${OWNER.email}?subject=${encodeURIComponent('Interactive 3D experience')}` : OWNER.linkedin
  return (
    <div className="sc">
      <header className="sc-hero">
        <p className="sc-eyebrow">{OWNER.title}</p>
        <h1>Interactive 3D experiences for places people visit</h1>
        <p className="sc-lede">
          Real-time, browser-based worlds that visitors explore before they arrive: on desktop and phone, no app to
          install. Every demo below is a live build you can walk through.
        </p>
        {contact && (
          <a className="sc-btn primary" href={contact} target="_blank" rel="noreferrer">
            Get one for your venue
          </a>
        )}
      </header>

      <main className="sc-grid">
        {DEMOS.map((d) => (
          <a key={d.path} className="sc-card" href={`${BASE}${d.path}`}>
            <div className="sc-thumb" style={{ backgroundImage: `url(${BASE}${d.image})` }}>
              <span className="sc-kind">{d.kind}</span>
            </div>
            <div className="sc-body">
              <h2>{d.title}</h2>
              <p>{d.pitch}</p>
              <ul className="sc-tags">
                {d.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <div className="sc-foot">
                <span>{d.for}</span>
                <span className="sc-open">Open demo →</span>
              </div>
            </div>
          </a>
        ))}
      </main>

      <section className="sc-how">
        <div>
          <h3>Your brand, your venue</h3>
          <p>Names, colours, places, schedules, sponsors and booking links change per client from one configuration.</p>
        </div>
        <div>
          <h3>Built for phones too</h3>
          <p>Tap to walk or use the on-screen arrows; quality adapts to the device.</p>
        </div>
        <div>
          <h3>Drives action</h3>
          <p>Every place can link to tickets, bookings or enquiries, so the experience sells, not just shows.</p>
        </div>
      </section>

      <footer className="sc-footer">
        <span>
          {OWNER.name} · React Three Fiber, Three.js, WebGL
        </span>
        <span>Demos are original concepts with fictional names, not affiliated with any real venue.</span>
      </footer>
    </div>
  )
}
