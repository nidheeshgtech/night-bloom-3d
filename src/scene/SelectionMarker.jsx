import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGarden } from '../lib/store'
import { FLOWERS } from '../lib/flowers'

// Pulsing ring above the selected flower.
export default function SelectionMarker() {
  const selected = useGarden((s) => s.selected)
  const ref = useRef()

  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.15)
  })

  if (selected?.kind !== 'flower') return null
  const h = FLOWERS.heads
  const i = selected.index
  return (
    <mesh ref={ref} position={[h[i * 3], h[i * 3 + 1] + 0.03, h[i * 3 + 2]]} rotation-x={-Math.PI / 2}>
      <torusGeometry args={[0.22, 0.018, 8, 32]} />
      <meshBasicMaterial color="#fff6d8" toneMapped={false} />
    </mesh>
  )
}
