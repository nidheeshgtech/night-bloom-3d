import { useMemo } from 'react'
import * as THREE from 'three'

// Gradient dome with a soft sun glow. Colour uniforms drive day/night later.
export default function SkyDome({ sun, top = '#3a5f9e', horizon = '#f6c48f', bottom = '#e8a87c' }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color(top) },
          uHorizon: { value: new THREE.Color(horizon) },
          uBottom: { value: new THREE.Color(bottom) },
          uSunDir: { value: new THREE.Vector3(...sun).normalize() },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uBottom;
          uniform vec3 uSunDir;
          varying vec3 vDir;
          void main() {
            float y = vDir.y;
            vec3 col = y > 0.0
              ? mix(uHorizon, uTop, pow(smoothstep(0.0, 0.6, y), 0.7))
              : mix(uHorizon, uBottom, smoothstep(0.0, -0.3, y));
            float sun = max(dot(normalize(vDir), uSunDir), 0.0);
            col += vec3(1.0, 0.75, 0.45) * (pow(sun, 8.0) * 0.35 + pow(sun, 400.0) * 1.5);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [sun, top, horizon, bottom],
  )

  return (
    <mesh material={material} scale={400} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  )
}
