// A royalty-free, generative "vinyl" loop synthesized with the Web Audio API
// — a soft sine drone, a slow A-minor-pentatonic arpeggio, and faint surface
// crackle. No audio asset, no licensing. Replace with a real file later if
// you want, but this works out of the box and can't infringe anything.

export interface VinylLoop {
  start: () => void
  stop: () => void
  dispose: () => void
  setMuted: (m: boolean) => void
}

const ARP = [220, 261.63, 293.66, 329.63, 392, 440, 523.25] // A minor pentatonic
const DRONE = [110, 164.81] // A2 + E3

export function createVinylLoop(): VinylLoop {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let timer: number | null = null
  let crackle: AudioBufferSourceNode | null = null
  let step = 0
  let muted = false

  const ensure = (): AudioContext => {
    if (ctx && master) return ctx
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.0001
    master.connect(ctx.destination)
    return ctx
  }

  const note = (
    freq: number,
    dur: number,
    gain: number,
    type: OscillatorType = "triangle",
  ) => {
    if (!ctx || !master) return
    const t0 = ctx.currentTime
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(gain, t0 + 0.04)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g)
    g.connect(master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  }

  const startCrackle = (ac: AudioContext) => {
    const len = Math.floor(ac.sampleRate * 2)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      // sparse pops over a faint hiss
      data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.0009 ? 0.5 : 0.012)
    }
    const src = ac.createBufferSource()
    src.buffer = buf
    src.loop = true
    const hp = ac.createBiquadFilter()
    hp.type = "highpass"
    hp.frequency.value = 1400
    const g = ac.createGain()
    g.gain.value = 0.07
    src.connect(hp)
    hp.connect(g)
    g.connect(master!)
    src.start()
    crackle = src
  }

  const tick = () => {
    note(ARP[step % ARP.length], 1.2, 0.11)
    if (step % 4 === 0) DRONE.forEach((f) => note(f, 3.4, 0.05, "sine"))
    step++
  }

  return {
    start() {
      const ac = ensure()
      if (ac.state === "suspended") void ac.resume().catch(() => {})
      const t0 = ac.currentTime
      master!.gain.cancelScheduledValues(t0)
      master!.gain.setValueAtTime(Math.max(0.0001, master!.gain.value), t0)
      master!.gain.linearRampToValueAtTime(muted ? 0.0001 : 0.32, t0 + 0.45)
      if (!crackle) startCrackle(ac)
      if (timer == null) {
        tick()
        timer = window.setInterval(tick, 520)
      }
    },
    stop() {
      if (timer != null) {
        window.clearInterval(timer)
        timer = null
      }
      if (ctx && master) {
        const t0 = ctx.currentTime
        master.gain.cancelScheduledValues(t0)
        master.gain.setValueAtTime(master.gain.value, t0)
        master.gain.linearRampToValueAtTime(0.0001, t0 + 0.4)
      }
      if (crackle) {
        try {
          // Stop immediately — scheduling +0.45s means a rapid start()
          // call within that window creates a second overlapping source.
          crackle.stop()
        } catch {
          /* already stopped */
        }
        crackle = null
      }
      step = 0
    },
    setMuted(m: boolean) {
      muted = m
      if (!ctx || !master) return
      const t0 = ctx.currentTime
      master.gain.cancelScheduledValues(t0)
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t0)
      master.gain.linearRampToValueAtTime(m ? 0.0001 : 0.32, t0 + 0.25)
    },
    dispose() {
      this.stop()
      if (ctx) {
        void ctx.close().catch(() => {})
        ctx = null
        master = null
      }
    },
  }
}

// Process-wide singleton so the loop keeps playing after the RecordPanel
// unmounts (closing the panel must NOT stop the music). The panel only
// toggles start/stop and mirrors the playing state into the game store.
let shared: VinylLoop | null = null
export function getSharedVinylLoop(): VinylLoop {
  if (!shared) shared = createVinylLoop()
  return shared
}
