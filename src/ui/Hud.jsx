import { useEffect, useState } from 'react'
import { useGarden, usePerf } from '../lib/store'
import { rig } from '../lib/player'
import { audio } from '../lib/audio'
import { getWorld } from '../lib/world'
import { capturePhoto } from './capture'
import InfoPanel from './InfoPanel'
import Icon from './Icon'

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
        <p className="eyebrow">Interactive WebGL garden</p>
        <h1>Night Bloom</h1>
        <p className="lede">Fly over thousands of living flowers, walk the paths, and stay for nightfall.</p>
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
        <p className="fine">Original concept by Nidheesh. Not affiliated with any existing attraction.</p>
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
  walkTouch: 'Tap the ground or an arrow to walk · Swipe to look · Tap flowers to learn more',
  inspect: 'Drag to circle the sculpture · Esc to go back',
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

  const toggleAudio = () => {
    audioOn ? audio.stop() : audio.start()
    set({ audio: !audioOn })
  }

  if (mode === 'tour') {
    return (
      <div className="hud">
        <header className="brand">
          <span className="brand-mark" />
          Night Bloom
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
  const showZones = mode === 'aerial' && !focused && zones.length > 0
  const area = mode === 'walk' ? here : focused?.id
  const features = world.sculptures.filter((s) => s.chip !== false && (!s.zone || !area || s.zone === area))
  const canTravel = mode === 'aerial' || mode === 'walk' || mode === 'inspect'

  return (
    <div className={`hud ${mode === 'intro' ? 'hidden' : ''} ${hasPanel ? 'has-panel' : ''}`}>
      {!introGone && <Intro leaving={mode !== 'intro'} onGone={() => setIntroGone(true)} />}

      <header className="brand">
        <span className="brand-mark" />
        Night Bloom
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

      {hint && <p className="hint">{hint}</p>}

      <div className="dock">
        {canTravel && (
          <div className="travel">
            {showZones
              ? zones.map((z) => (
                  <button key={z.id} className="chip" onClick={() => rig.focusZone(z.id)}>
                    {z.name}
                  </button>
                ))
              : features.map((s) => (
                  <button key={s.id} className="chip" onClick={() => rig.inspect(s.id)}>
                    {s.name}
                  </button>
                ))}
          </div>
        )}
        <div className="dock-row">
          {mode === 'aerial' && focused && (
            <button className="btn" onClick={rig.toAerial}>
              World view
            </button>
          )}
          {mode === 'aerial' && !focused && (
            <button className="btn" onClick={rig.tour}>
              Tour
            </button>
          )}
          {mode === 'aerial' && focused?.status !== 'soon' && (
            <button className="btn primary" onClick={rig.enter}>
              {focused ? `Enter ${focused.name}` : 'Enter the garden'}
            </button>
          )}
          {mode === 'walk' && (
            <button className="btn" onClick={rig.toAerial}>
              Exit to aerial view
            </button>
          )}
          {mode === 'inspect' && (
            <button className="btn" onClick={rig.back}>
              Back
            </button>
          )}
          {mode === 'flying' && (
            <button className="btn" disabled>
              Flying…
            </button>
          )}
          <label className="time">
            <Icon name="sun" size={16} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={night}
              onChange={(e) => set({ night: Number(e.target.value) })}
              aria-label="Time of day"
            />
            <Icon name="moon" size={16} />
          </label>
        </div>
      </div>

      <InfoPanel />
    </div>
  )
}
