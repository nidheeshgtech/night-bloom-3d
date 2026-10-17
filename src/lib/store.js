import { create } from 'zustand'

const coarse = window.matchMedia('(pointer: coarse)').matches
const small = window.innerWidth < 768

export const useGarden = create((set) => ({
  mode: 'intro', // intro | aerial | flying | walk | inspect
  selected: null, // { kind: 'sculpture' | 'zone', id } | { kind: 'flower', index, species }
  focus: null, // zone id the aerial camera is framing
  discovered: [], // species indices the visitor has clicked
  discoveredButterflies: [], // butterfly species indices identified
  night: 0, // 0 = golden hour, 1 = night
  quality: coarse || small ? 'low' : 'high',
  isTouch: coarse,
  audio: false,
  photo: false,
  set,
}))

export const usePerf = create(() => ({ fps: 0, calls: 0, triangles: 0 }))
