// Feedback suara scan diterima/ditolak — Web Audio API murni, tanpa file
// audio eksternal, supaya ringan & tetap jalan walau PWA offline.
//
// Versi ini dibuat lebih JELAS terdengar dibanding sebelumnya:
// - accepted: 1 nada tunggal ceria, cukup panjang & lebih kencang
// - rejected: 2 nada rendah beruntun dengan jeda, pola "buzzer" yang lebih tegas

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function beep(freq: number, duration: number, type: OscillatorType, volume: number, delay = 0) {
  try {
    const ctx = getCtx();
    const startAt = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  } catch {
    // Suara bukan hal kritis -- kalau browser block/AudioContext gagal, diamkan saja.
  }
}

/** Resi diterima / match -- 1 nada bersih & cukup kencang supaya jelas kedengaran di lapangan */
export function playAcceptedSound() {
  beep(1046.5, 0.18, 'sine', 0.35); // C6, jernih & tegas
}

/** Resi ditolak / duplikat / salah -- 2 nada rendah beruntun, pola "buzzer" jelas berbeda dari accepted */
export function playRejectedSound() {
  beep(196, 0.16, 'sawtooth', 0.3, 0);
  beep(146.8, 0.22, 'sawtooth', 0.3, 0.18);
}
