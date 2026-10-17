import LodInstances, { PLANT_FAR } from './LodInstances'
import { getLibrary } from './library'
import { beds } from './planting'
import { useGarden } from '../lib/store'

export default function Beds() {
  const high = useGarden((s) => s.quality === 'high')
  const near = high ? 7 : 4
  const stride = high ? 1 : 2
  const far = PLANT_FAR[high ? 'high' : 'low']
  const lib = getLibrary()
  return (
    <>
      <LodInstances variants={lib.marigold} items={beds.marigold} near={near} far={far} shadow="none" stride={stride} />
      <LodInstances variants={lib.petunia} items={beds.petunia} near={near} far={far} shadow="none" stride={stride} />
      <LodInstances variants={lib.daisy} items={beds.daisy} near={near} far={far} shadow="none" stride={stride} />
    </>
  )
}
