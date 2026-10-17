import { useEffect, useRef, useState } from 'react'
import { input } from '../lib/player'

const RADIUS = 46

export default function Joystick() {
  const base = useRef()
  const active = useRef(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const update = (e) => {
    const rect = base.current.getBoundingClientRect()
    let dx = e.clientX - (rect.left + rect.width / 2)
    let dy = e.clientY - (rect.top + rect.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS
      dy = (dy / len) * RADIUS
    }
    setKnob({ x: dx, y: dy })
    input.move.x = dx / RADIUS
    input.move.y = -dy / RADIUS
  }

  const release = (e) => {
    if (active.current !== e.pointerId) return
    active.current = null
    setKnob({ x: 0, y: 0 })
    input.move.x = 0
    input.move.y = 0
  }

  useEffect(
    () => () => {
      input.move.x = 0
      input.move.y = 0
    },
    [],
  )

  return (
    <div
      ref={base}
      className="joystick"
      onPointerDown={(e) => {
        active.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e)
      }}
      onPointerMove={(e) => active.current === e.pointerId && update(e)}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  )
}
