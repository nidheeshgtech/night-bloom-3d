import { useGarden } from '../lib/store'
import { zoneById } from '../world/plan'
import Icon from './Icon'

// Demo stand-in for a client's booking page when no URL is configured.
export default function CtaNote() {
  const note = useGarden((s) => s.ctaNote)
  if (!note) return null
  const close = () => useGarden.setState({ ctaNote: null })
  return (
    <div className="cta-note" role="dialog" aria-modal="true" onClick={close}>
      <div className="cta-note-card" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn panel-close" onClick={close} aria-label="Close">
          <Icon name="close" />
        </button>
        <p className="eyebrow">{zoneById(note.zoneId)?.name}</p>
        <h2>{note.label}</h2>
        <p>
          In a client build, this button opens their booking, ticketing or enquiry page, with the zone passed along so
          sales know where interest came from.
        </p>
        <p className="fine-print">Configure per client in src/brand/presets.js (cta.url).</p>
        <button className="btn primary" onClick={close}>
          Got it
        </button>
      </div>
    </div>
  )
}
