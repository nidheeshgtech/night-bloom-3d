import * as THREE from 'three'
import { pbrSet } from '../zone/materials'
import { withNightLight } from '../zone/nightlight'

// Average linear luminance of each diffuse map, so a texture adds detail (grain, weave, tile
// joints) around the colour already set on the material or vertices, without shifting it.
const MEAN = { marble_01: 0.349, white_stucco: 0.656, wood_floor_deck: 0.06, rough_linen: 0.397, thatch_roof_angled: 0.082, wood_floor: 0.133 }

// Patch a standard material with world-space detail textures.
//   scale: texture repeats per metre.
//   mapping: 'box' projects each face along its dominant world axis (merged props of any size
//            get correctly scaled textures, no per-mesh UVs); 'uv' uses the geometry uv (metres).
//   detail: 0..1, how strongly the diffuse map modulates the base colour.
export function detailed(material, name, { scale = 1, mapping = 'box', detail = 0.7 } = {}) {
  const set = pbrSet(name, 1)
  material.map = set.map
  material.normalMap = set.normalMap
  material.roughnessMap = set.arm
  material.aoMap = set.arm
  material.aoMapIntensity = material.aoMapIntensity ?? 1
  const prev = material.onBeforeCompile
  const S = scale.toFixed(4)
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer)
    const uvExpr =
      mapping === 'uv'
        ? `uv * ${S}`
        : `(dmN.y > max(dmN.x, dmN.z) ? dmW.xz : (dmN.x > dmN.z ? dmW.zy : dmW.xy)) * ${S}`
    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      `#include <uv_vertex>
      vec4 dmP = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        dmP = instanceMatrix * dmP;
      #endif
      vec3 dmW = (modelMatrix * dmP).xyz;
      vec3 dmN = abs(normalize(mat3(modelMatrix) * normal));
      vec2 dmUv = ${uvExpr};
      #ifdef USE_MAP
        vMapUv = dmUv;
      #endif
      #ifdef USE_NORMALMAP
        vNormalMapUv = dmUv;
      #endif
      #ifdef USE_ROUGHNESSMAP
        vRoughnessMapUv = dmUv;
      #endif
      #ifdef USE_AOMAP
        vAoMapUv = dmUv;
      #endif`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#ifdef USE_MAP
        vec4 dmTex = texture2D(map, vMapUv);
        float dmL = dot(dmTex.rgb, vec3(0.2126, 0.7152, 0.0722)) / ${MEAN[name].toFixed(3)};
        diffuseColor.rgb *= mix(1.0, clamp(dmL, 0.0, 2.2), ${detail.toFixed(2)});
      #endif`,
    )
  }
  // Closure values (scale, mapping) are not in the function source, so key programs on them.
  const key = `detail:${name}:${S}:${mapping}:${detail}`
  const own = Object.prototype.hasOwnProperty.call(material, 'customProgramCacheKey') ? material.customProgramCacheKey.bind(material) : null
  material.customProgramCacheKey = () => (own ? own() : prev ? prev.toString() : '') + key
  return material
}

// Ready-made surface materials for the hotel (all opt into the night light map).
export function hotelMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial(o)
  return {
    // Painted vertex-coloured props: fine plaster grain, satin finish.
    paint: withNightLight(detailed(std({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), 'white_stucco', { scale: 0.6, detail: 0.35 })),
    // Teak decking for pier, restaurant and villa decks.
    wood: withNightLight(detailed(std({ vertexColors: true, roughness: 0.9, normalScale: new THREE.Vector2(0.8, 0.8) }), 'wood_floor_deck', { scale: 0.45, detail: 0.85 })),
    // Lounger cushions, canopies and umbrellas.
    fabric: withNightLight(detailed(std({ vertexColors: true, roughness: 1, side: THREE.DoubleSide, normalScale: new THREE.Vector2(0.6, 0.6) }), 'rough_linen', { scale: 1.6, detail: 0.3 })),
    // Palapa and restaurant roofs.
    thatch: withNightLight(detailed(std({ vertexColors: true, roughness: 1, side: THREE.DoubleSide, normalScale: new THREE.Vector2(1.2, 1.2) }), 'thatch_roof_angled', { scale: 0.5, detail: 0.9 })),
    // Pale stone: bar ring, fountain, coping.
    stone: withNightLight(detailed(std({ vertexColors: true, roughness: 0.6 }), 'marble_01', { scale: 0.5, detail: 0.5 })),
  }
}
