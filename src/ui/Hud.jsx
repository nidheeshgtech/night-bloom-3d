import { useEffect, useState } from 'react'
import { useGarden, usePerf } from '../lib/store'
import { rig } from '../lib/player'
import { audio } from '../lib/audio'
import { getWorld } from '../lib/world'
import { capturePhoto } from './capture'
import InfoPanel from './InfoPanel'
import CtaNote from './CtaNote'
import SiteMap from './SiteMap'
import DPad from './DPad'
import Icon from './Icon'
import { BRAND } from '../brand'

function Intro({ leaving, onGone }) {
  const ready = useGarden((s) => s.ready)
  const progress = useGarden((s) => s.progress)
  const start = (tour) => {
    useGarden.setState({ mode: 'aerial' })
    if (tour) setTimeout(() => rig.tour(), 50)
  }
  return (
    <div className={`intro ${leaving ? 'leaving' : ''}`} onTransitionEnd={() => leaving && onGone()}>
      <div className="intro-card">
        <p className="eyebrow">{BRAND.eyebrow}</p>
        <h1>{BRAND.name}</h1>
        <p className="lede">{BRAND.lede}</p>
        {ready ? (
          <div className="intro-actions">
            <button className="btn primary" onClick={() => start(true)}>
              Watch the tour
            </button>
            <button className="btn" onClick={() => start(false)}>
              Explore the garden
            </button>
          </div>
        ) : (
          <div className="loader" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="loader-bar" style={{ width: `${Math.max(progress, 4)}%` }} />
            <span>{progress < 100 ? `Growing the garden… ${progress}%` : 'Opening the gates…'}</span>
          </div>
        )}
        <p className="fine">{BRAND.fine}</p>
      </div>
    </div>
  )
}

function PerfOverlay() {
  const debug = useGarden((s) => s.debug)
  const { fps, calls, triangles } = usePerf()
  if (!debug) return null
  return (
    <div className="perf">
      {fps} fps · {calls} draw calls · {(triangles / 1000).toFixed(0)}k tris
    </div>
  )
}

const HINTS = {
  aerial: 'Drag to orbit · Scroll to zoom · Pick a zone to fly there',
  walk: 'Double-click to walk · Drag to look around · Click arrows or flowers · WASD also works',
  walkTouch: 'Hold the arrows to walk and turn · Or tap the ground · Swipe to look',
  inspect: 'Drag to circle the sculpture · Esc to go back',
}

function IconBtn({ icon, label, onClick, active, glow }) {
  return (
    <button className={`bar-btn ${active ? 'active' : ''} ${glow ? 'glow' : ''}`} onClick={onClick} aria-label={label} data-tip={label}>
      <Icon name={icon} />
    </button>
  )
}

// "Explore" popup listing places (gardens from the air, features inside a garden).
function Explore({ title, items }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = (e) => !e.target.closest?.('.explore') && setOpen(false)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])
  if (!items.length) return null
  return (
    <div className="explore">
      <button className={`bar-btn wide ${open ? 'active' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Explore places">
        <Icon name="pin" /> <span>Explore</span>
      </button>
      {open && (
        <div className="explore-pop" role="menu">
          <p className="label">{title}</p>
          {items.map((it) => (
            <button key={it.id} role="menuitem" onClick={() => (setOpen(false), it.go())} style={it.color ? { '--zone': it.color } : undefined}>
              {it.num ? <span className="zone-pin-num">{it.num}</span> : <span className="explore-dot" />}
              <span className="explore-text">
                <strong>{it.label}</strong>
                <span>{it.sub}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Shows each mode's hint for a few seconds, once per session, then fades it away.
const seenHints = new Set()
function Hint({ text, mode }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!text || seenHints.has(mode)) return setVisible(false)
    seenHints.add(mode)
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 6000)
    return () => clearTimeout(t)
  }, [text, mode])
  return <p className={`hint ${visible ? 'show' : ''}`}>{text}</p>
}

export default function Hud() {
  const mode = useGarden((s) => s.mode)
  const night = useGarden((s) => s.night)
  const quality = useGarden((s) => s.quality)
  const audioOn = useGarden((s) => s.audio)
  const photo = useGarden((s) => s.photo)
  const isTouch = useGarden((s) => s.isTouch)
  const hasPanel = useGarden((s) => !!s.selected)
  const focus = useGarden((s) => s.focus)
  const set = useGarden((s) => s.set)
  const [introGone, setIntroGone] = useState(false)

  useEffect(() => () => audio.stop(), [])
  // Backtick toggles the developer stats overlay.
  useEffect(() => {
    const onKey = (e) => e.key === '`' && useGarden.setState((s) => ({ debug: !s.debug }))
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const caption = useGarden((s) => s.caption)
  const here = useGarden((s) => s.here)
  const showOn = useGarden((s) => s.show !== null)
  const siteMapOn = useGarden((s) => s.siteMap)

  const toggleAudio = () => {
    audioOn ? audio.stop() : audio.start()
    set({ audio: !audioOn })
  }

  if (mode === 'tour') {
    return (
      <div className="hud">
        <header className="brand">
          <span className="brand-mark" />
          {BRAND.name}
        </header>
        {caption && (
          <div className="caption" key={caption.title + caption.sub}>
            <h2>{caption.title}</h2>
            <p>{caption.sub}</p>
          </div>
        )}
        <div className="dock">
          <button className="btn" onClick={rig.stopTour}>
            Take control
          </button>
        </div>
      </div>
    )
  }

  if (photo) {
    return (
      <div className="photo-bar">
        <button className="btn primary" onClick={capturePhoto}>
          <Icon name="camera" /> Capture
        </button>
        <button className="btn" onClick={() => set({ photo: false })}>
          Done
        </button>
      </div>
    )
  }

  const hint = mode === 'walk' && isTouch ? HINTS.walkTouch : HINTS[mode]
  const world = getWorld()
  const zones = world.zones || []
  const focused = zones.find((z) => z.id === focus)
  // Aerial world view lists zones; otherwise the inspectable features of the current zone.
  // Zone list from the air, or when walking between zones (lake, promenade, spokes).
  const showZones = zones.length > 0 && ((mode === 'aerial' && !focused) || (mode === 'walk' && !here))
  const area = mode === 'walk' ? here : focused?.id
  const features = world.sculptures.filter((s) => s.chip !== false && (!s.zone || !area || s.zone === area))
  const canTravel = mode === 'aerial' || mode === 'walk' || mode === 'inspect'

  return (
    <div className={`hud ${mode === 'intro' ? 'hidden' : ''} ${hasPanel ? 'has-panel' : ''}`}>
      {!introGone && <Intro leaving={mode !== 'intro'} onGone={() => setIntroGone(true)} />}

      <header className="brand">
        <span className="brand-mark" />
        {BRAND.name}
      </header>
      <PerfOverlay />

      <div className="toolbar">
        <button className="icon-btn" onClick={toggleAudio} aria-label={audioOn ? 'Mute sound' : 'Play sound'}>
          <Icon name={audioOn ? 'soundOn' : 'soundOff'} />
        </button>
        <button className="icon-btn" onClick={() => set({ photo: true, selected: null })} aria-label="Photo mode">
          <Icon name="camera" />
        </button>
        <button
          className="icon-btn text"
          onClick={() => set({ quality: quality === 'high' ? 'low' : 'high' })}
          aria-label="Toggle quality"
          title="Graphics quality"
        >
          {quality === 'high' ? 'HQ' : 'LQ'}
        </button>
      </div>

      <Hint text={hint} mode={mode} />

      {mode !== 'intro' && (
        <div className="bar" role="toolbar" aria-label="Garden controls">
          {mode === 'aerial' && focused && <IconBtn icon="home" label="World view" onClick={rig.toAerial} />}
          {mode === 'aerial' && !focused && <IconBtn icon="play" label="Watch the tour" onClick={rig.tour} />}
          {mode === 'aerial' && !focused && world.zones && (
            <IconBtn icon="map" label={siteMapOn ? 'Close site map' : 'Site map'} active={siteMapOn} onClick={siteMapOn ? rig.closeSiteMap : rig.siteMap} />
          )}
          {mode === 'walk' && <IconBtn icon="aerial" label="Exit to aerial view" onClick={rig.toAerial} />}
          {mode === 'inspect' && <IconBtn icon="back" label="Back" onClick={rig.back} />}
          {canTravel && (
            <Explore
              title={showZones ? 'Gardens' : 'In this garden'}
              items={showZones ? zones.map((z, i) => ({ id: z.id, label: z.name, sub: z.theme, num: i + 1, color: z.color, go: () => rig.focusZone(z.id) })) : features.map((f) => ({ id: f.id, label: f.name, sub: f.kind, go: () => rig.inspect(f.id) }))}
            />
          )}
          {mode === 'aerial' && focused?.status !== 'soon' && (
            <button className="bar-primary" onClick={rig.enter}>
              {focused ? `Enter ${focused.name}` : 'Enter garden'}
            </button>
          )}
          {(mode === 'aerial' || mode === 'walk') && world.tour && (
            <IconBtn icon={showOn ? 'close' : 'spark'} label={showOn ? 'Stop light show' : 'Light show'} glow={!showOn} onClick={showOn ? rig.stopShow : rig.lightShow} />
          )}
          {mode === 'flying' && <span className="bar-status">Flying…</span>}
          <div className="bar-mode" role="group" aria-label="Time of day">
            <button className={night < 0.5 ? 'on' : ''} aria-pressed={night < 0.5} aria-label="Day" data-tip="Day" onClick={() => set({ night: 0 })}>
              <Icon name="sun" size={17} />
            </button>
            <button className={night >= 0.5 ? 'on' : ''} aria-pressed={night >= 0.5} aria-label="Night" data-tip="Night" onClick={() => set({ night: 1 })}>
              <Icon name="moon" size={17} />
            </button>
          </div>
        </div>
      )}

      <InfoPanel />
      <CtaNote />
      <SiteMap />
      {isTouch && mode === 'walk' && <DPad />}
    </div>
  )
}
