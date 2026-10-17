import { useGarden } from '../lib/store'
import { rig } from '../lib/player'
import { BRAND } from '../brand'
import { ZONES } from '../world/plan'
import Icon from './Icon'

// Infographic legend for the site-map view: numbered zones keyed to the map badges.
export default function SiteMap() {
  const on = useGarden((s) => s.siteMap)
  const mode = useGarden((s) => s.mode)
  if (!on || mode !== 'aerial') return null
  const open = ZONES.filter((z) => z.status === 'open').length
  return (
    <aside className="sitemap">
      <button className="icon-btn panel-close" onClick={rig.closeSiteMap} aria-label="Close site map">
        <Icon name="close" />
      </button>
      <p className="eyebrow">{BRAND.name}</p>
      <h2>Site map</h2>
      <p className="sitemap-lede">
        {ZONES.length} gardens around a central lake · {open} open now
      </p>
      <ol className="sitemap-list">
        {ZONES.map((z, i) => (
          <li key={z.id}>
            <button onClick={() => rig.focusZone(z.id)} style={{ '--zone': z.color }}>
              <span className="zone-pin-num">{i + 1}</span>
              <span className="sitemap-text">
                <strong>{z.name}</strong>
                <span>{z.status === 'open' ? z.theme : `${z.theme} · opening soon`}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  )
}
