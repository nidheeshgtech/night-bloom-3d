import { useEffect, useState } from 'react'
import { input } from '../lib/player'

const DIRS = [
  { id: 'up', label: 'Walk forward', key: 'move', value: 1, rot: 0 },
  { id: 'left', label: 'Turn left', key: 'turn', value: -1, rot: -90 },
  { id: 'right', label: 'Turn right', key: 'turn', value: 1, rot: 90 },
  { id: 'down', label: 'Walk back', key: 'move', value: -1, rot: 180 },
]

// Game-style direction pad for touch devices: hold up/down to walk, left/right to turn.
// Several buttons can be held at once (e.g. up + right walks in a curve).
export default function DPad() {
  const [held, setHeld] = useState({})

  useEffect(() => {
    const apply = () => {
      input.move = (held.up ? 1 : 0) - (held.down ? 1 : 0)
      input.turn = (held.right ? 1 : 0) - (held.left ? 1 : 0)
    }
    apply()
  }, [held])

  // Release everything if the pad unmounts or the page loses focus.
  useEffect(() => {
    const reset = () => setHeld({})
    window.addEventListener('blur', reset)
    return () => {
      window.removeEventListener('blur', reset)
      input.move = 0
      input.turn = 0
    }
  }, [])

  const press = (id) => (e) => {
    e.preventDefault()
    // Capture keeps the press if the finger slides off; some browsers refuse it, which is fine.
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* not capturable */
    }
    navigator.vibrate?.(8)
    setHeld((h) => ({ ...h, [id]: true }))
  }
  const release = (id) => (e) => {
    e.preventDefault()
    setHeld((h) => ({ ...h, [id]: false }))
  }

  return (
    <div className="dpad" onContextMenu={(e) => e.preventDefault()}>
      {DIRS.map((d) => (
        <button
          key={d.id}
          className={`dpad-btn dpad-${d.id} ${held[d.id] ? 'held' : ''}`}
          aria-label={d.label}
          onPointerDown={press(d.id)}
          onPointerUp={release(d.id)}
          onPointerCancel={release(d.id)}
          onLostPointerCapture={release(d.id)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" style={{ transform: `rotate(${d.rot}deg)` }} aria-hidden="true">
            <path d="M12 6l7 9H5z" fill="currentColor" />
          </svg>
        </button>
      ))}
      <span className="dpad-hub" />
    </div>
  )
}
