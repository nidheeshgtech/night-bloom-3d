import PavedPath from './Path'
import Beds from './Beds'
import Arcade from './Arcade'
import Vegetation from './Vegetation'
import Palms from './Palms'
import Props from './Props'
import { EDGE_W, PATH_HALF, avenue } from './layout'
import { BENCH, BENCH_GAP } from './planting'

// Bloom Terraces content: the Ribbon Arcade avenue and its borders. Loaded on demand.
const BAY = [[BENCH.d - 1.2, -PATH_HALF - EDGE_W, BENCH_GAP[0] + 0.4, BENCH_GAP[1] - 0.4]]
const skipBay = (side, s) => side === -1 && s > BAY[0][2] && s < BAY[0][3]

export default function BloomZone() {
  return (
    <>
      <PavedPath path={avenue} half={PATH_HALF} extra={BAY} skipKerb={skipBay} />
      <Beds />
      <Arcade />
      <Vegetation />
      <Palms />
      <Props />
    </>
  )
}
