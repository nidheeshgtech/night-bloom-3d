// Procedural ambience: wind, daytime birds, night crickets. No audio files.
class GardenAudio {
  ctx = null
  master = null
  night = 0
  timer = null

  build() {
    const ctx = (this.ctx = new AudioContext())
    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(ctx.destination)

    // Brown noise -> lowpass, slowly swelling = wind.
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      data[i] = last * 3.5
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 500
    const wind = ctx.createGain()
    wind.gain.value = 0.25
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.08
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.12
    lfo.connect(lfoGain).connect(wind.gain)
    src.connect(lp).connect(wind).connect(this.master)
    src.start()
    lfo.start()
  }

  start() {
    if (!this.ctx) this.build()
    this.ctx.resume()
    this.master.gain.setTargetAtTime(0.6, this.ctx.currentTime, 0.5)
    clearTimeout(this.timer)
    const loop = () => {
      if (Math.random() < 1 - this.night) this.chirp()
      if (this.night > 0.3) this.cricket()
      this.timer = setTimeout(loop, 600 + Math.random() * 1800)
    }
    loop()
  }

  stop() {
    clearTimeout(this.timer)
    if (this.ctx) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2)
  }

  setNight(n) {
    this.night = n
  }

  voice(type, freq, t, length, peak, pan, sweep = 1) {
    const ctx = this.ctx
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (sweep !== 1) o.frequency.exponentialRampToValueAtTime(freq * sweep, t + length * 0.8)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + length)
    o.connect(g).connect(pan)
    o.start(t)
    o.stop(t + length + 0.02)
  }

  panner() {
    const pan = this.ctx.createStereoPanner()
    pan.pan.value = Math.random() * 2 - 1
    pan.connect(this.master)
    return pan
  }

  chirp() {
    const peak = 0.05 * (1 - this.night)
    if (peak < 0.005) return
    const pan = this.panner()
    const t0 = this.ctx.currentTime
    const base = 2600 + Math.random() * 1400
    const notes = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < notes; i++) this.voice('sine', base, t0 + i * 0.11, 0.09, peak, pan, 1.5)
  }

  cricket() {
    const pan = this.panner()
    const t0 = this.ctx.currentTime
    for (let i = 0; i < 4; i++) this.voice('sine', 4400, t0 + i * 0.05, 0.03, 0.025 * this.night, pan)
  }
}

export const audio = new GardenAudio()
