// Feedback suara scan diterima/ditolak — Web Audio API murni, tanpa file
// audio eksternal, supaya ringan & tetap jalan walau PWA offline.
//
// Versi Optimasi Gudang (COOL SYSTEM V3):
// - accepted: 1 nada tinggi ganda (ding-ding cepat), sangat bersih, ceria & tegas.
// - rejected: Pola alarm buzzer berat durasi panjang (tiiit-tiiit kasar), disonan & kontras.

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

/** * Resi diterima / match 
 * Menggunakan 2 nada harmonis cepat (C6 ke E6) dalam waktu singkat.
 * Menghasilkan bunyi "ding-ding" jernih khas kasir modern.
 */
export function playAcceptedSound() {
  beep(1046.50, 0.07, 'sine', 0.25, 0);    // C6 (Cepat)
  beep(1318.51, 0.12, 'sine', 0.25, 0.06); // E6 (Sustain sedikit)
}

/** * Resi ditolak / duplikat / salah 
 * Menggunakan 2 pulsa panjang gelombang 'square' frekuensi rendah-menengah (Buzzer Berat).
 * Pola ditiup panjang: "BZZZTT... BZZZTT..." dengan total durasi setengah detik lebih.
 * Disonan di telinga agar operator langsung sadar tanpa melihat layar HP.
 */
export function playRejectedSound() {
  // Pulsa Buzzer Pertama (Lebih panjang dan kasar)
  beep(180, 0.22, 'square', 0.35, 0);
  
  // Pulsa Buzzer Kedua (Sedikit lebih rendah, memberi efek turun/salah)
  beep(150, 0.28, 'square', 0.35, 0.26);
}