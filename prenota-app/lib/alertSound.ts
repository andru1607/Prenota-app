let audioCtx: AudioContext | null = null;
let unlocked = false;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

export function unlockAlertSound() {
  const ctx = getContext();
  if (!ctx || unlocked) return;
  if (ctx.state === "suspended") ctx.resume();
  unlocked = true;
}

export function playAlertSound() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  [880, 1175].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.15);
    gain.gain.linearRampToValueAtTime(0.25, now + i * 0.15 + 0.02);
    gain.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.2);
  });
}
