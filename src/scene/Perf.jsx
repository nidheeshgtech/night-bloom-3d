import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { usePerf } from '../lib/store'

// Samples fps + renderer stats twice a second into the store.
export default function Perf() {
  const frames = useRef(0)
  const last = useRef(performance.now())

  useFrame(({ gl }) => {
    frames.current++
    const now = performance.now()
    if (now - last.current >= 500) {
      const fps = Math.round((frames.current * 1000) / (now - last.current))
      usePerf.setState({
        fps,
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
      })
      frames.current = 0
      last.current = now
    }
  })
  return null
}
