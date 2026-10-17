import { useEffect, useState } from 'react'
import { useGarden, usePerf } from '../lib/store'
import { rig } from '../lib/player'
import { audio } from '../lib/audio'
import { getWorld } from '../lib/world'
import { capturePhoto } from './capture'
import InfoPanel from './InfoPanel'
import Joystick from './Joystick'
import Icon from './Icon'

function Intro({ leaving, onGone }) {
  return (
    <div className={`intro ${leaving ? 'leaving' : ''}`} onTransitionEnd={() => leaving && onGone()}>
      <div className="intro-card">
        <p className="eyebrow">Interactive WebGL garden</p>
        <h1>Night Bloom</h1>
        <p className="lede">Fly over thousands of living flowers, walk the paths, and stay for nightfall.</p>
        <button className="btn primary" onClick={() => useGarden.setState({ mode: 'aerial' })}>
          Explore the garden
        </button>
        <p className="fine">Original concept by Nidheesh. Not affiliated with any existing attraction.</p>
      </div>
    </div>
  )
}

function PerfOverlay() {
  const { fps, calls, triangles } = usePerf()
  return (
    <div className="perf">
      {fps} fps · {calls} draw calls · {(triangles / 1000).toFixed(0)}k tris
    </div>
  )
}

const HINTS = {
  aerial: 'Drag to orbit · Scroll to zoom · Click a sculpture',
  walk: 'WASD to walk · Shift to run · Drag to look · Click flowers and sculptures',
  walkTouch: 'Left stick to walk · Drag to look · Tap flowers and sculptures',
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
  const set = useGarden((s) => s.set)
  const [introGone, setIntroGone] = useState(false)

  useEffect(() => () => audio.stop(), [])

  const toggleAudio = () => {
    audioOn ? audio.stop() : audio.start()
    set({ audio: !audioOn })
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
            {getWorld().sculptures.map((s) => (
              <button key={s.id} className="chip" onClick={() => rig.inspect(s.id)}>
                {s.name}
              </button>
            ))}
          </div>
        )}
        <div className="dock-row">
          {mode === 'aerial' && (
            <button className="btn primary" onClick={rig.enter}>
              Enter the garden
            </button>
          )}
          {mode === 'walk' && (
            <button className="btn" onClick={rig.toAerial}>
              Aerial view
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
      {isTouch && mode === 'walk' && <Joystick />}
    </div>
  )
}
