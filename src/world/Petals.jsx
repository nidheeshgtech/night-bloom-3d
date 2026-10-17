import { useMemo } from 'react'
import { Builder } from '../zone/botany/builder'
import { hedgeAlong } from '../zone/foliage'
import LodInstances, { PLANT_FAR } from '../zone/LodInstances'
import { getLibrary } from '../zone/library'
import { plantMaterial, plantDepthMaterial } from '../zone/materials'
import { useGarden } from '../lib/store'
import { ZONES } from './plan'
import { petalBeds } from './petalPlanting'

// Petal outlines: a tall clipped hedge along every petal edge, lined with flower borders.
function petalHedges() {
  const b = new Builder()
  let seed = 100
  for (const z of ZONES) {
    for (const { path, inward } of z.sides) {
      hedgeAlong(b, path, { d0: inward * 0.35, d1: -inward * 0.35, H: 1.1, runs: [[0, path.length]], seed: seed++, step: 0.3 })
    }
  }
  return b.toGeometry()
}

export default function Petals() {
  const hedges = useMemo(petalHedges, [])
  const high = useGarden((s) => s.quality === 'high')
  const lib = getLibrary()
  const props = { near: high ? 7 : 4, far: PLANT_FAR[high ? 'high' : 'low'], shadow: 'none', stride: high ? 1 : 2 }
  return (
    <>
      <mesh geometry={hedges} material={plantMaterial()} castShadow={high} receiveShadow customDepthMaterial={plantDepthMaterial()} />
      <LodInstances variants={lib.petunia} items={petalBeds.petunia} {...props} />
      <LodInstances variants={lib.marigold} items={petalBeds.marigold} {...props} />
      <LodInstances variants={lib.daisy} items={petalBeds.daisy} {...props} />
    </>
  )
}
