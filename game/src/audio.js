// Vaultbreaker: Midnight Heist — tiny synthesized sounds (WebAudio, no files).
// A blip for loot, a rising two-tone for the alarm, a low sting for getting
// caught, and a little arpeggio for clearing a level. Nothing is fetched.
export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, seconds, type = 'sine', volume = 0.08, when = 0) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  return {
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    unlock() {
      ensure();
    },
    pickup() {
      tone(880, 0.12, 'sine', 0.07);
      tone(1318, 0.16, 'sine', 0.06, 0.07);
    },
    vault() {
      tone(523, 0.12, 'triangle', 0.08);
      tone(659, 0.12, 'triangle', 0.08, 0.1);
      tone(784, 0.2, 'triangle', 0.08, 0.2);
    },
    coin() {
      tone(1568, 0.08, 'square', 0.04);
    },
    alarm() {
      tone(440, 0.14, 'sawtooth', 0.05);
      tone(587, 0.14, 'sawtooth', 0.05, 0.14);
    },
    caught() {
      tone(196, 0.5, 'sawtooth', 0.09);
      tone(147, 0.7, 'sawtooth', 0.09, 0.15);
    },
    clear() {
      tone(523, 0.14, 'triangle', 0.08);
      tone(659, 0.14, 'triangle', 0.08, 0.12);
      tone(784, 0.14, 'triangle', 0.08, 0.24);
      tone(1047, 0.3, 'triangle', 0.08, 0.36);
    },
  };
}
