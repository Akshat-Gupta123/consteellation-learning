// Tiny Web Audio synthesizer for lesson feedback sounds.
// Lazy-creates an AudioContext on first use (must be inside a user gesture).

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.18) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Cheerful "ta-ding" chime on a correct answer. */
export function playCorrect() {
  tone(880, 0, 0.18, "sine", 0.2); // A5
  tone(1318.5, 0.09, 0.32, "sine", 0.22); // E6
  tone(1760, 0.18, 0.45, "triangle", 0.14); // A6 sparkle
}

/** Low buzz on a wrong answer. */
export function playWrong() {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, t0);
  osc.frequency.exponentialRampToValueAtTime(110, t0 + 0.35);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.18, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + 0.42);
}
