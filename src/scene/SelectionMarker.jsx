import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGarden } from '../lib/store'
import { getWorld } from '../lib/world'

// Pulsing ring above the selected flower.
export default function SelectionMarker() {
  const selected = useGarden((s) => s.selected)
  const ref = useRef()

  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.15)
  })

  if (selected?.kind !== 'flower') return null
  const world = getWorld()
  const h = world.flowers.heads
  const i = selected.index
  const { radius, lift } = world.marker || { radius: 0.22, lift: 0.03 }
  return (
    <mesh ref={ref} position={[h[i * 3], h[i * 3 + 1] + lift, h[i * 3 + 2]]} rotation-x={-Math.PI / 2}>
      <torusGeometry args={[radius, radius * 0.08, 8, 32]} />
      <meshBasicMaterial color="#fff6d8" toneMapped={false} />
    </mesh>
  )
}
