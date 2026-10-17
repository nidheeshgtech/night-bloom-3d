import { Bloom, EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

// Ambient occlusion grounds plants and props; bloom only catches lamps at night.
export default function ZoneEffects() {
  return (
    <EffectComposer multisampling={4}>
      <N8AO aoRadius={0.6} distanceFalloff={0.6} intensity={2.2} quality="performance" halfRes />
      <Bloom mipmapBlur luminanceThreshold={1.4} intensity={0.45} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
