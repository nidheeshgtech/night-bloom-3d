import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useGarden } from '../lib/store'
import { ctaFor, openCta } from '../brand'
import { ZONES, spokes } from './plan'

// Call-to-action pins at each open zone's gate: shown when walking nearby or when the
// aerial camera is framing that zone.
const PINS = ZONES.map((z, i) => {
  const path = spokes[i]
  const p = path.toWorld(path.length - 5, 3.4)
  p.y += 2.6
  return { zone: z, pos: p }
}).filter((p) => p.zone.status === 'open')

export const triggerCta = (zoneId, label) => {
  const note = openCta(zoneId)
  if (note) useGarden.setState({ ctaNote: { ...note, ...(label ? { label } : {}), zoneId } })
}

function Pin({ pin }) {
  const [show, setShow] = useState(false)
  const last = useRef(-1)
  useFrame(({ camera, clock }) => {
    if (clock.elapsedTime - last.current < 0.3) return
    last.current = clock.elapsedTime
    const st = useGarden.getState()
    const near = st.mode === 'walk' && camera.position.distanceTo(pin.pos) < 40
    const framed = st.mode === 'aerial' && st.focus === pin.zone.id
    if (near || framed) !show && setShow(true)
    else show && setShow(false)
  })
  if (!show) return null
  return (
    <Html position={pin.pos} center zIndexRange={[12, 0]}>
      <button className="cta-pin" onClick={() => triggerCta(pin.zone.id)}>
        <span className="cta-pin-dot" />
        {ctaFor(pin.zone.id).label}
      </button>
    </Html>
  )
}

export default function BookingPins() {
  return PINS.map((p) => <Pin key={p.zone.id} pin={p} />)
}
