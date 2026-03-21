let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, type, gainVal, startTime, duration, ctx) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

export function playBowl(volume = 0.8) {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const v = volume;
  playTone(220,  'sine', 0.35 * v, now,        4.5, ctx);
  playTone(440,  'sine', 0.18 * v, now + 0.01, 3.8, ctx);
  playTone(660,  'sine', 0.10 * v, now + 0.02, 3.2, ctx);
  playTone(880,  'sine', 0.06 * v, now + 0.03, 2.5, ctx);
  playTone(1100, 'sine', 0.03 * v, now + 0.03, 2.0, ctx);
}

export function playNewStep(volume = 0.8) {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const v = volume;
  playTone(523.25, 'sine', 0.25 * v, now,        1.8, ctx);
  playTone(783.99, 'sine', 0.12 * v, now + 0.01, 1.6, ctx);
  playTone(659.25, 'sine', 0.22 * v, now + 0.45, 1.8, ctx);
  playTone(987.77, 'sine', 0.10 * v, now + 0.46, 1.5, ctx);
}

export function playRestChime(volume = 0.8) {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const v = volume;
  playTone(392, 'sine', 0.20 * v, now,       2.5, ctx);
  playTone(349, 'sine', 0.16 * v, now + 0.3, 2.5, ctx);
  playTone(330, 'sine', 0.14 * v, now + 0.6, 3.0, ctx);
  playTone(293, 'sine', 0.10 * v, now + 0.9, 3.5, ctx);
}

export function playTick(volume = 0.8) {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const v = volume;
  playTone(880, 'sine', 0.12 * v, now,       0.08, ctx);
  playTone(880, 'sine', 0.12 * v, now + 0.1, 0.08, ctx);
}

export function playSessionDone(volume = 0.8) {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const v = volume;
  playTone(110,    'sine', 0.45 * v, now,        6.0, ctx);
  playTone(220,    'sine', 0.25 * v, now + 0.01, 5.5, ctx);
  playTone(330,    'sine', 0.15 * v, now + 0.02, 4.5, ctx);
  playTone(146.83, 'sine', 0.20 * v, now + 0.8,  5.0, ctx);
  playTone(293.66, 'sine', 0.12 * v, now + 0.81, 4.2, ctx);
}
