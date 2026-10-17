import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { usePerf } from '../lib/store'

// Samples fps + renderer stats twice a second. Counters are reset manually so
// totals cover every pass of a frame, including post-processing.
export default function Perf() {
  const gl = useThree((s) => s.gl)
  const frames = useRef(0)
  const last = useRef(performance.now())

  useEffect(() => {
    gl.info.autoReset = false
    return () => (gl.info.autoReset = true)
  }, [gl])

  useFrame(() => {
    frames.current++
    const now = performance.now()
    if (now - last.current >= 500) {
      usePerf.setState({
        fps: Math.round((frames.current * 1000) / (now - last.current)),
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
      })
      frames.current = 0
      last.current = now
    }
    gl.info.reset()
  })
  return null
}
