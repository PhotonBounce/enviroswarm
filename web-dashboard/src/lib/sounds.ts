/**
 * Sound effects using Web Audio API — no external assets needed.
 * Respects browser autoplay policy: only plays after user interaction.
 */

let audioCtx: AudioContext | null = null
let hasInteracted = false
let muted = false
let volume = 0.15

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioCtx
}

function resumeCtx() {
  const ctx = getCtx()
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
}

/** Mark that user has interacted — enables audio playback */
export function markInteraction() {
  hasInteracted = true
  resumeCtx()
}

/** Listen for first user interaction to unlock audio */
function initInteractionListener() {
  const handler = () => {
    markInteraction()
    document.removeEventListener('click', handler)
    document.removeEventListener('keydown', handler)
    document.removeEventListener('touchstart', handler)
  }
  document.addEventListener('click', handler, { once: true })
  document.addEventListener('keydown', handler, { once: true })
  document.addEventListener('touchstart', handler, { once: true })
}
initInteractionListener()

export function setMuted(value: boolean) {
  muted = value
}

export function isMuted(): boolean {
  return muted
}

export function setVolume(value: number) {
  volume = Math.max(0, Math.min(1, value))
}

export function getVolume(): number {
  return volume
}

function playOscillator(
  type: OscillatorType,
  frequency: number,
  duration: number,
  fadeOut = true
) {
  if (muted || !hasInteracted) return
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, ctx.currentTime)
  gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
  if (fadeOut) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  }
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

/** Short pleasant click — buttons, toggles */
export function playClick() {
  playOscillator('sine', 800, 0.08, true)
}

/** Softer hover feedback */
export function playHover() {
  playOscillator('sine', 600, 0.05, true)
}

/** Success chime — ascending */
export function playSuccess() {
  if (muted || !hasInteracted) return
  const ctx = getCtx()
  const notes = [523.25, 659.25, 783.99] // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08)
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08)
    gain.gain.linearRampToValueAtTime(volume * 0.25, ctx.currentTime + i * 0.08 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime + i * 0.08)
    osc.stop(ctx.currentTime + i * 0.08 + 0.3)
  })
}

/** Error buzz — descending */
export function playError() {
  if (muted || !hasInteracted) return
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(200, ctx.currentTime)
  osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.2)
  gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.25)
}

/** Notification ping */
export function playNotification() {
  playOscillator('sine', 880, 0.15, true)
  setTimeout(() => playOscillator('sine', 1100, 0.15, true), 120)
}

/** Toggle switch sound */
export function playToggle() {
  playOscillator('triangle', 440, 0.06, true)
}
