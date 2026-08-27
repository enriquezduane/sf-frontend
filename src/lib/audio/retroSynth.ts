/**
 * Zero-dependency 8-bit sound effects for the "Battle to Delete" easter egg,
 * synthesized with plain Web Audio oscillators — no samples, no libraries.
 *
 * The AudioContext is created lazily on the first play call, which always
 * happens inside a click handler, so autoplay policies never block it.
 * Browsers without Web Audio (and jsdom) simply stay silent.
 */

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Constructor =
    window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!Constructor) return null;
  try {
    sharedContext ??= new Constructor();
    if (sharedContext.state === "suspended") void sharedContext.resume();
    return sharedContext;
  } catch {
    return null;
  }
}

/** One oscillator note; `slideTo` bends the pitch across the note for impacts. */
interface Tone {
  wave: OscillatorType;
  frequency: number;
  startAt: number;
  duration: number;
  peak: number;
  slideTo?: number;
}

function schedule(tones: readonly Tone[]): void {
  const context = getContext();
  if (!context) return;
  const now = context.currentTime;
  for (const tone of tones) {
    const start = now + tone.startAt;
    const end = start + tone.duration;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = tone.wave;
    oscillator.frequency.setValueAtTime(tone.frequency, start);
    if (tone.slideTo !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(tone.slideTo, end);
    }
    gain.gain.setValueAtTime(tone.peak, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end);
  }
}

function square(
  frequency: number,
  startAt: number,
  duration = 0.12,
  peak = 0.05,
): Tone {
  return { wave: "square", frequency, startAt, duration, peak };
}

/** Rising encounter arpeggio — "a wild contact appeared". */
export function playBattleStartSound(): void {
  schedule([
    { wave: "sawtooth", frequency: 55, startAt: 0, duration: 0.5, peak: 0.05, slideTo: 110 },
    square(220, 0),
    square(294, 0.08),
    square(370, 0.16),
    square(440, 0.24),
    square(587, 0.32),
    square(740, 0.4, 0.22, 0.06),
  ]);
}

/** Short pitch-crunched impact for a landed hit. */
export function playAttackSound(): void {
  schedule([
    { wave: "sawtooth", frequency: 320, startAt: 0, duration: 0.16, peak: 0.1, slideTo: 40 },
    square(110, 0, 0.08, 0.07),
  ]);
}

/** Descending faint chime — the boss is down. */
export function playVictorySound(): void {
  schedule([
    square(880, 0, 0.14, 0.06),
    square(659, 0.1, 0.14, 0.06),
    square(523, 0.2, 0.14, 0.06),
    square(392, 0.3, 0.3, 0.06),
    { wave: "sawtooth", frequency: 196, startAt: 0.3, duration: 0.4, peak: 0.04, slideTo: 49 },
  ]);
}
