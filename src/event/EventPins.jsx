import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useGarden } from '../lib/store'
import Icon from '../ui/Icon'
import { CATEGORIES, POIS } from '../venue'

// Compact icon pins for festival points of interest. From the air: all pins (filterable);
// walking: pins within 70 m.
function Pin({ poi }) {
  const [near, setNear] = useState(false)
  const last = useRef(-1)
  const mode = useGarden((s) => s.mode)
  const hidden = useGarden((s) => s.hiddenCats.includes(poi.cat))
  const showOn = useGarden((s) => s.show !== null)
  const active = useGarden((s) => s.selected?.kind === 'poi' && s.selected.id === poi.id)
  useFrame(({ camera, clock }) => {
    if (clock.elapsedTime - last.current < 0.4) return
    last.current = clock.elapsedTime
    const n = camera.position.distanceTo(poi.pos) < 70
    if (n !== near) setNear(n)
  })
  const visible = !hidden && !showOn && (mode === 'aerial' || (mode === 'walk' && near))
  if (!visible) return null
  const cat = CATEGORIES[poi.cat]
  return (
    <Html position={[poi.pos.x, poi.pos.y + (mode === 'walk' ? 3.2 : 6), poi.pos.z]} center zIndexRange={[11, 0]}>
      <button
        className={`poi-pin ${active ? 'active' : ''}`}
        style={{ '--cat': cat.color }}
        aria-label={poi.name}
        data-tip={poi.name}
        onWheel={(e) => document.querySelector('canvas')?.dispatchEvent(new WheelEvent('wheel', e.nativeEvent))}
        onClick={() => useGarden.setState({ selected: { kind: 'poi', id: poi.id } })}
      >
        <Icon name={cat.icon} size={15} />
      </button>
    </Html>
  )
}

export default function EventPins() {
  return POIS.map((p) => <Pin key={p.id} poi={p} />)
}
