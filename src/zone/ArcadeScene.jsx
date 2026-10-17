import ZoneLighting from './ZoneLighting'
import Ground from './Ground'
import Path from './Path'
import Grass from './Grass'
import Beds from './Beds'
import Arcade from './Arcade'
import Vegetation from './Vegetation'
import Palms from './Palms'
import Props from './Props'

export default function ArcadeScene() {
  return (
    <>
      <ZoneLighting />
      <Ground />
      <Path />
      <Grass />
      <Beds />
      <Arcade />
      <Vegetation />
      <Palms />
      <Props />
    </>
  )
}
