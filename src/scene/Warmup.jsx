import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { useGarden } from '../lib/store'

// Once assets finish loading, compile every shader and render a few frames before the
// visitor can start, so the first camera move never hitches. Progress is polled per frame
// (not subscribed) because loads start inside other components' renders.
export default function Warmup() {
  const { gl, scene, camera } = useThree()
  const frames = useRef(-1)

  useFrame(() => {
    const st = useGarden.getState()
    if (st.ready) return
    const { active, progress } = useProgress.getState()
    const pct = Math.round(progress)
    if (pct !== st.progress) useGarden.setState({ progress: pct })
    if (frames.current < 0) {
      if (active || progress < 100) return
      gl.compile(scene, camera)
      frames.current = 0
    }
    if (++frames.current > 20) useGarden.setState({ ready: true, progress: 100 })
  })
  return null
}
