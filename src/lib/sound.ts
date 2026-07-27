// Feedback suara scan diterima/ditolak — Web Audio API murni, tanpa file
// audio eksternal, supaya ringan & tetap jalan walau PWA offline.
//
// Versi Optimasi Gudang (COOL SYSTEM V3):
// - accepted: 3 nada naik cepat (do-mi-sol), ceria, jelas beda arah dengan rejected.
// - rejected: 3 pulsa alarm turun, gelombang sawtooth (lebih kasar/tajam dari square),
//             durasi total lebih panjang & berulang, biar operator sadar tanpa lihat layar.

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

    // Fade-in super cepat untuk menghilangkan bunyi klik statis digital
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(volume, startAt + 0.01);

    // Kurva rampa linear agar sustain suara penuh sepanjang durasi (tidak langsung drop)
    gain.gain.setValueAtTime(volume, startAt + duration - 0.02);
    gain.gain.linearRampToValueAtTime(0.0001, startAt + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startAt);
    osc.stop(startAt + duration + 0.01);
  } catch {
    // Silent fail jika web audio diblokir browser
  }
}

/**
 * Resi diterima / match
 * 3 nada naik cepat (C6 - E6 - G6), arah melodi NAIK.
 * Total durasi pendek (~0.22s) — kesan cepat, ringan, positif.
 */
export function playAcceptedSound() {
  beep(880.00,  0.06, 'sine', 0.25, 0);     // A5
  beep(1108.73, 0.06, 'sine', 0.25, 0.05);  // C#6
  beep(1318.51, 0.06, 'sine', 0.25, 0.10);  // E6
  beep(1760.00, 0.16, 'sine', 0.30, 0.15);  // A6 — penutup lebih panjang
}

/**
 * Resi ditolak / duplikat / salah
 * 3 pulsa turun (arah melodi TURUN, kebalikan dari accepted), gelombang 'sawtooth'
 * yang lebih tajam/kasar dari 'square' — beda karakter timbre, bukan cuma beda nada.
 * Total durasi lebih panjang (~0.9s) supaya jelas "ini alarm, bukan konfirmasi".
 */
export function playRejectedSound() {
  beep(220, 0.18, 'sawtooth', 0.35, 0);
  beep(180, 0.18, 'sawtooth', 0.35, 0.24);
  beep(130, 0.30, 'sawtooth', 0.38, 0.48); // pulsa terakhir paling rendah & panjang, kesan "berat/final"
}