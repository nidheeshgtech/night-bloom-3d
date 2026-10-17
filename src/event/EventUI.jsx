import { useEffect, useState } from 'react'
import { useGarden } from '../lib/store'
import { rig } from '../lib/player'
import Icon from '../ui/Icon'
import { POIS, SCHEDULE_TITLE, VENUE_DATA as EVENT } from '../venue'

// Demo clock: starts at EVENT.clockStart when the page opens and runs 10x real time.
const SPEED = 10
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const fmt = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(Math.floor(min % 60)).padStart(2, '0')}`
const t0 = performance.now()
export function useEventClock() {
  const [now, setNow] = useState(() => toMin(EVENT.clockStart))
  useEffect(() => {
    const id = setInterval(() => setNow(toMin(EVENT.clockStart) + ((performance.now() - t0) / 60000) * SPEED), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

const where = (item) => (item.where === 'show' ? 'Over the lake' : POIS.find((p) => p.id === item.where)?.name || '')

// Go to a schedule item: stages fly/walk there; the shows start the light show.
export function goToItem(item) {
  if (item.where === 'show') return rig.lightShow()
  const poi = POIS.find((p) => p.id === item.where)
  if (poi) rig.goTo(poi)
}

export function NextUp() {
  const now = useEventClock()
  const mode = useGarden((s) => s.mode)
  const showOn = useGarden((s) => s.show !== null)
  if (mode === 'intro' || mode === 'tour' || showOn) return null
  const next = EVENT.schedule.find((it) => toMin(it.time) >= now)
  if (!next) return null
  const mins = Math.max(0, Math.round(toMin(next.time) - now))
  return (
    <button className="next-up" onClick={() => goToItem(next)}>
      <span className="next-up-clock">{fmt(now)}</span>
      <span className="next-up-text">
        <strong>{mins === 0 ? 'Starting now' : `Next in ${mins} min`}</strong> · {next.title} · {where(next)}
      </span>
    </button>
  )
}

export function SchedulePanel() {
  const open = useGarden((s) => s.schedule)
  const now = useEventClock()
  if (!open) return null
  const close = () => useGarden.setState({ schedule: false })
  return (
    <aside className="sitemap schedule">
      <button className="icon-btn panel-close" onClick={close} aria-label="Close schedule">
        <Icon name="close" />
      </button>
      <p className="eyebrow">{EVENT.dates}</p>
      <h2>{SCHEDULE_TITLE}</h2>
      <ol className="sitemap-list">
        {EVENT.schedule.map((it, i) => {
          const start = toMin(it.time)
          const end = i + 1 < EVENT.schedule.length ? toMin(EVENT.schedule[i + 1].time) : start + 30
          const live = now >= start && now < end
          return (
            <li key={it.time + it.title}>
              <button className={live ? 'live' : now >= end ? 'past' : ''} onClick={() => (close(), goToItem(it))}>
                <span className="sched-time">{it.time}</span>
                <span className="sitemap-text">
                  <strong>
                    {it.title} {live && <em className="live-badge">LIVE</em>}
                  </strong>
                  <span>{where(it)}</span>
                </span>
                <Icon name={it.where === 'show' ? 'spark' : 'pin'} size={16} />
              </button>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
