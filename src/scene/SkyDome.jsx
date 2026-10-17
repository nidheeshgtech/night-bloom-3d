import * as THREE from 'three'
import { shared } from '../lib/flowerMaterial'

export const SUN = new THREE.Vector3(-60, 22, -40)

// Gradient dome with sun/moon glow and night stars. Colours are lerped by Atmosphere.
export const skyMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uBottom: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() },
    uSunDir: { value: SUN.clone().normalize() },
    uTime: shared.uTime,
    uNight: shared.uNight,
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
    uniform vec3 uGlow;
    uniform vec3 uSunDir;
    uniform float uTime;
    uniform float uNight;
    varying vec3 vDir;

    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    void main() {
      vec3 dir = normalize(vDir);
      float y = dir.y;
      vec3 col = y > 0.0
        ? mix(uHorizon, uTop, pow(smoothstep(0.0, 0.6, y), 0.7))
        : mix(uHorizon, uBottom, smoothstep(0.0, -0.3, y));

      float sun = max(dot(dir, uSunDir), 0.0);
      float halo = mix(0.35, 0.12, uNight);
      col += uGlow * (pow(sun, 8.0) * halo + pow(sun, mix(400.0, 1800.0, uNight)) * 1.5);

      // One candidate star per grid cell, drawn as a tiny disc around the cell's direction.
      vec3 cell = floor(dir * 220.0);
      float core = smoothstep(5e-7, 0.0, 1.0 - dot(dir, normalize(cell + 0.5)));
      float star = step(0.996, hash(cell)) * core * smoothstep(0.05, 0.3, y) * uNight;
      col += star * (0.6 + 0.4 * sin(uTime * 3.0 + hash(cell + 3.1) * 20.0)) * 1.4;

      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }
  `,
})

export default function SkyDome() {
  return (
    <mesh material={skyMaterial} scale={400} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  )
}
