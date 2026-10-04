// Tiny synthesized sound effects with the WebAudio API, so there are no audio
// files to download. Browsers only allow audio after a user gesture; the first
// sound is always the player's own move, which is one.

const mutedKey = 'soundMuted';
let context = null;
let muted = readMuted();

function readMuted() {
  try {
    return localStorage.getItem(mutedKey) === '1';
  } catch {
    return false;
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  try {
    localStorage.setItem(mutedKey, value ? '1' : '0');
  } catch {
    // storage blocked: the setting just won't stick
  }
}

function audio() {
  if (!context) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
  }
  if (context.state === 'suspended') context.resume();
  return context;
}

function tone(ctx, { freq, start = 0, length = 0.08, type = 'sine', volume = 0.2, slideTo }) {
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + length);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

const sounds = {
  move: (ctx) => tone(ctx, { freq: 420, slideTo: 300, length: 0.07, type: 'triangle', volume: 0.25 }),
  capture: (ctx) => {
    tone(ctx, { freq: 220, slideTo: 120, length: 0.12, type: 'square', volume: 0.12 });
    tone(ctx, { freq: 520, slideTo: 260, length: 0.06, type: 'triangle', volume: 0.2 });
  },
  check: (ctx) => {
    tone(ctx, { freq: 660, length: 0.09, type: 'sine', volume: 0.2 });
    tone(ctx, { freq: 880, start: 0.1, length: 0.12, type: 'sine', volume: 0.2 });
  },
  gameOver: (ctx) => {
    tone(ctx, { freq: 523, length: 0.18, volume: 0.18 });
    tone(ctx, { freq: 392, start: 0.18, length: 0.18, volume: 0.18 });
    tone(ctx, { freq: 262, start: 0.36, length: 0.4, volume: 0.18 });
  },
};

export function playSound(name) {
  if (muted || !sounds[name]) return;
  try {
    const ctx = audio();
    if (ctx) sounds[name](ctx);
  } catch {
    // no audio available; the game works fine without it
  }
}
