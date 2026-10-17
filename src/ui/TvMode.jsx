import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useGarden } from '../lib/store'
import { rig } from '../lib/player'
import { BRAND } from '../brand'
import { VENUE_DATA } from '../venue'
import CineCaption from './CineCaption'

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Lobby screen / in-room TV channel: the guided tour loops forever (no controls), with a
// side panel for the clock, today's activities, rotating offers and a QR code to book.
export default function TvMode() {
  const ready = useGarden((s) => s.ready)
  const mode = useGarden((s) => s.mode)
  const caption = useGarden((s) => s.caption)
  const [now, setNow] = useState(() => new Date())
  const [offer, setOffer] = useState(0)
  const [qr, setQr] = useState(null)
  const bookUrl = BRAND.cta.url || `${window.location.origin}${window.location.pathname.replace(/-tv$/, '')}`
  const offers = VENUE_DATA?.offers || []

  useEffect(() => {
    QRCode.toDataURL(bookUrl, { margin: 1, width: 360, color: { dark: '#1a1208', light: '#ffffff' } }).then(setQr)
  }, [bookUrl])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000)
    const id2 = setInterval(() => setOffer((o) => o + 1), 8000)
    return () => {
      clearInterval(id)
      clearInterval(id2)
    }
  }, [])

  // Start the tour once loaded, and restart it whenever it ends.
  useEffect(() => {
    if (!ready || mode === 'tour' || mode === 'flying') return
    const t = setTimeout(() => {
      useGarden.setState({ mode: 'aerial' })
      rig.tour({ silent: true })
    }, mode === 'intro' ? 300 : 2500)
    return () => clearTimeout(t)
  }, [ready, mode])

  const minutes = now.getHours() * 60 + now.getMinutes()
  const schedule = VENUE_DATA?.schedule || []
  const nextIdx = schedule.findIndex((it) => toMin(it.time) >= minutes)
  const clock = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })
  const card = offers.length ? offers[offer % offers.length] : null

  return (
    <div className="tv">
      {!ready && <div className="tv-loading">{BRAND.name}</div>}
      {caption && <CineCaption caption={caption} variant="tv" key={caption.title + caption.sub} />}
      <aside className="tv-panel">
        <div className="tv-brand">
          <span className="brand-mark" />
          <span>{BRAND.name}</span>
        </div>
        <div className="tv-clock">{clock}</div>
        <div className="tv-date">{date}</div>
        {schedule.length > 0 && (
          <>
            <p className="tv-label">Today at the resort</p>
            <ol className="tv-sched">
              {schedule.map((it, i) => (
                <li key={it.time + it.title} className={i === nextIdx ? 'next' : nextIdx >= 0 && i < nextIdx ? 'past' : ''}>
                  <span>{it.time}</span>
                  {it.title}
                  {i === nextIdx && <em>Next</em>}
                </li>
              ))}
            </ol>
          </>
        )}
        {card && (
          <div className="tv-offer" key={offer}>
            <strong>{card[0]}</strong>
            <span>{card[1]}</span>
          </div>
        )}
        {qr && (
          <div className="tv-qr">
            <img src={qr} alt="QR code to book" />
            <span>
              <strong>Scan to book</strong>
              {BRAND.cta.label}
            </span>
          </div>
        )}
      </aside>
    </div>
  )
}
