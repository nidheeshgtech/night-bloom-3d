import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Sky drawn from the HDRI with its brightness capped. The raw sun disc is ~10^5 times
// brighter than the sky and bloom would smear it across the screen; lighting still uses
// the uncapped HDRI.
export const skyUniforms = { uMap: { value: null }, uIntensity: { value: 1 } }

export default function SkyBackdrop({ texture }) {
  const material = useMemo(() => {
    skyUniforms.uMap.value = texture
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: skyUniforms,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = position;
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uIntensity;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
          vec3 c = texture2D(uMap, uv).rgb * uIntensity;
          // Soft knee instead of a hard clip so the sun keeps a gentle glow.
          c = c / (1.0 + max(vec3(0.0), c - 1.2) * 0.6);
          gl_FragColor = vec4(min(c, vec3(2.2)), 1.0);
          #include <colorspace_fragment>
        }`,
    })
  }, [texture])
  return (
    <mesh material={material} scale={900} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[1, 48, 24]} />
    </mesh>
  )
}
