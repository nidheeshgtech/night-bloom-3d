import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, BrightnessContrast, DepthOfField, EffectComposer, HueSaturation, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useGarden } from '../lib/store'
import { rig } from '../lib/player'
import { ROUTE } from '../route'

// Cinematic grade for the hotel. Order: contact shadows (AO) on the HDR image, depth of field
// during the guided tour only, a restrained bloom that only lamps and the sun glint pass,
// ACES filmic tone mapping, then a light grade and vignette, then anti-aliasing.
export default function HotelEffects() {
  const touring = useGarden((s) => s.mode === 'tour') || ROUTE.tv
  const dof = useRef()
  // Focus follows what the tour camera looks at; the in-focus band widens with distance so
  // aerial shots stay sharp and interiors get a gentle background fall-off.
  useFrame(({ camera }) => {
    const e = dof.current
    if (!e) return
    e.target = rig.focus
    const d = camera.position.distanceTo(rig.focus)
    e.cocMaterial.focusRange = Math.max(4, d * 0.9)
    e.bokehScale = d > 120 ? 0.5 : 1.1
  })
  return (
    <EffectComposer multisampling={0}>
      {/* Scaled for architecture: wide radius for wall/floor contact, a tight one for props. */}
      <N8AO aoRadius={2.2} distanceFalloff={1.2} intensity={2.4} aoSamples={12} denoiseSamples={6} quality="medium" halfRes />
      {touring ? <DepthOfField ref={dof} target={[0, 0, 0]} focusRange={20} bokehScale={1.6} resolutionScale={0.5} /> : null}
      <Bloom mipmapBlur luminanceThreshold={1.35} luminanceSmoothing={0.2} intensity={0.32} resolutionScale={0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <HueSaturation saturation={0.1} />
      <BrightnessContrast brightness={-0.015} contrast={0.1} />
      <Vignette offset={0.32} darkness={0.42} />
      <SMAA />
    </EffectComposer>
  )
}
