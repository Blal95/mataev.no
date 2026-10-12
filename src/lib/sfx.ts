// Procedural UI / interaction sound cues, synthesized with the Web Audio API
// so they need zero audio assets. Soft, Nordic, never arcade — short sine
// blips with a quick exponential decay. Respects the global audio toggle via
// `setSfxMuted`. The AudioContext is created lazily on first use (by which
// point the player has already gestured by entering the cabin).

let ctx: AudioContext | null = null
let muted = false

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {})
  return ctx
}

export function setSfxMuted(m: boolean) {
  muted = m
}

/** One enveloped tone. `start` is an offset (s) from now, for tiny melodies. */
function tone(
  freq: number,
  start: number,
  dur: number,
  gain: number,
  type: OscillatorType = "sine",
) {
  const ac = getCtx()
  if (!ac) return
  const t0 = ac.currentTime + start
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.03)
}

export const sfx = {
  /** A station came into range — tiny soft pip. */
  available() {
    if (muted) return
    tone(880, 0, 0.1, 0.035)
  },
  /** A panel opened (E) — gentle two-note rise. */
  open() {
    if (muted) return
    tone(620, 0, 0.16, 0.06)
    tone(932, 0.075, 0.18, 0.05)
  },
  /** A panel closed (Esc) — gentle two-note fall. */
  close() {
    if (muted) return
    tone(740, 0, 0.13, 0.05)
    tone(494, 0.065, 0.18, 0.05)
  },
  /** Needle dropping onto the record — soft low thunk + a quick crackle burst
      that settles. Plays when the diegetic vinyl starts. */
  needleDrop() {
    if (muted) return
    const ac = getCtx()
    if (!ac) return
    const t0 = ac.currentTime
    tone(120, 0, 0.13, 0.05, "sine") // arm thunk
    // Crackle burst: sparse highpassed noise with a fast decay.
    const dur = 0.2
    const len = Math.floor(ac.sampleRate * dur)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      const decay = Math.pow(1 - i / len, 2)
      d[i] = (Math.random() * 2 - 1) * decay * (Math.random() < 0.06 ? 1 : 0.25)
    }
    const src = ac.createBufferSource()
    src.buffer = buf
    const hp = ac.createBiquadFilter()
    hp.type = "highpass"
    hp.frequency.value = 1800
    const g = ac.createGain()
    g.gain.value = 0.09
    src.connect(hp)
    hp.connect(g)
    g.connect(ac.destination)
    src.start(t0)
  },
  /** Needle lifting off — a short upward tick, quick fade. Plays on vinyl stop. */
  needleLift() {
    if (muted) return
    tone(520, 0, 0.07, 0.04, "sine")
    tone(300, 0.05, 0.12, 0.03, "sine")
  },
  /** Mailbox door — two crisp metallic latch clicks + a faint ring. */
  mailLatch() {
    if (muted) return
    const ac = getCtx()
    if (!ac) return
    const t0 = ac.currentTime
    const click = (off: number) => {
      const dur = 0.04
      const len = Math.floor(ac.sampleRate * dur)
      const buf = ac.createBuffer(1, len, ac.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
      }
      const src = ac.createBufferSource()
      src.buffer = buf
      const hp = ac.createBiquadFilter()
      hp.type = "highpass"
      hp.frequency.value = 2600
      const g = ac.createGain()
      g.gain.value = 0.1
      src.connect(hp)
      hp.connect(g)
      g.connect(ac.destination)
      src.start(t0 + off)
    }
    click(0)
    click(0.07)
    tone(1900, 0.07, 0.12, 0.02, "triangle") // tiny metallic ring
  },
  /** Borzik's chat opened — a quick hamster squeak. */
  squeak() {
    if (muted) return
    tone(1650, 0, 0.05, 0.04, "triangle")
    tone(2150, 0.045, 0.07, 0.035, "triangle")
  },
  /** Jump take-off — soft upward whoosh. */
  jump() {
    if (muted) return
    const ac = getCtx()
    if (!ac) return
    const t0 = ac.currentTime
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(300, t0)
    osc.frequency.exponentialRampToValueAtTime(640, t0 + 0.16)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(0.05, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22)
    osc.connect(g)
    g.connect(ac.destination)
    osc.start(t0)
    osc.stop(t0 + 0.26)
  },
  /** Book pulled off the shelf and opened — a soft paper riffle (filtered
      noise swell) plus a low "thunk" of the cover. Synthesized, so no asset
      or licence. Swap the body for a real open-book sample later if you like. */
  bookOpen() {
    if (muted) return
    const ac = getCtx()
    if (!ac) return
    const t0 = ac.currentTime
    // Paper riffle: short noise burst pushed through a sweeping bandpass.
    const dur = 0.42
    const len = Math.floor(ac.sampleRate * dur)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      const env = Math.sin((Math.PI * i) / len) // swell in and out
      d[i] = (Math.random() * 2 - 1) * env * 0.5
    }
    const src = ac.createBufferSource()
    src.buffer = buf
    const bp = ac.createBiquadFilter()
    bp.type = "bandpass"
    bp.frequency.setValueAtTime(1200, t0)
    bp.frequency.exponentialRampToValueAtTime(3200, t0 + dur)
    bp.Q.value = 0.7
    const g = ac.createGain()
    g.gain.value = 0.12
    src.connect(bp)
    bp.connect(g)
    g.connect(ac.destination)
    src.start(t0)
    // Cover thunk — soft low sine.
    tone(150, 0.02, 0.18, 0.05, "sine")
  },
  /** Footstep on ice — crisp high tick with a faint ring (vs the recorded
      snow crunch). Synthesized so it needs no asset/licence. */
  iceStep() {
    if (muted) return
    const ac = getCtx()
    if (!ac) return
    const t0 = ac.currentTime
    const dur = 0.09
    const len = Math.floor(ac.sampleRate * dur)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5)
    }
    const src = ac.createBufferSource()
    src.buffer = buf
    const hp = ac.createBiquadFilter()
    hp.type = "highpass"
    hp.frequency.value = 3200
    const g = ac.createGain()
    g.gain.value = 0.05
    src.connect(hp)
    hp.connect(g)
    g.connect(ac.destination)
    src.start(t0)
    // tiny crystalline ring
    const o = ac.createOscillator()
    const og = ac.createGain()
    o.type = "triangle"
    o.frequency.value = 2600
    og.gain.setValueAtTime(0.0001, t0)
    og.gain.linearRampToValueAtTime(0.012, t0 + 0.005)
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12)
    o.connect(og)
    og.connect(ac.destination)
    o.start(t0)
    o.stop(t0 + 0.14)
  },
}
