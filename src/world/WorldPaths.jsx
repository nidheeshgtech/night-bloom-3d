import PavedPath from '../zone/Path'
import { PROMENADE, SPOKE_HALF, promenade, spokes } from './plan'

// Outer-kerb gaps where each spoke meets the promenade ring.
const spokeAngles = spokes.map((p) => Math.atan2(p.lut[0].z, p.lut[0].x))
const gapHalf = (SPOKE_HALF + 0.3) / (PROMENADE.radius + PROMENADE.half)
const skipRing = (side, s) => {
  if (side !== -1) return false // +d points into the lake; -1 is the outer edge
  const a = (s / promenade.length) * Math.PI * 2
  return spokeAngles.some((sa) => Math.abs(Math.atan2(Math.sin(a - sa), Math.cos(a - sa))) < gapHalf)
}
const skipSpokeStart = (_, s) => s < 0.3

export default function WorldPaths() {
  return (
    <>
      <PavedPath path={promenade} half={PROMENADE.half} skipKerb={skipRing} seed={3} />
      {spokes.map((p, i) => (
        <PavedPath key={i} path={p} half={SPOKE_HALF} skipKerb={skipSpokeStart} seed={20 + i} />
      ))}
    </>
  )
}
