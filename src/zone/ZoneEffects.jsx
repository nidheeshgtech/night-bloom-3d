import { Bloom, EffectComposer, HueSaturation, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

// Ambient occlusion grounds plants and props; bloom only catches lamps at night.
// SMAA instead of 4x MSAA and half-resolution bloom keep the per-pixel cost low.
export default function ZoneEffects() {
  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={0.6} distanceFalloff={0.6} intensity={2.2} quality="performance" halfRes />
      <Bloom mipmapBlur luminanceThreshold={1.4} intensity={0.45} resolutionScale={0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {/* ACES flattens saturation; restore some for a fresher garden look. */}
      <HueSaturation saturation={0.14} />
      <SMAA />
    </EffectComposer>
  )
}
