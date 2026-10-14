/**
 * ATLAS 2.0 - Web Audio API Synthesized Sound Effects
 * Provides high-fidelity, zero-dependency procedural audio chimes and voice greetings.
 */

// Global AudioContext singleton
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a rich, celebratory, ascending multi-chord chime for user login.
 * C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz) + harmonious shimmer overtone.
 */
export function playWelcomeSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Musical notes: C5, E5, G5, C6, with micro-delays
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.55, gain: 0.22 }, // C5
      { freq: 659.25, time: 0.10, dur: 0.60, gain: 0.25 }, // E5
      { freq: 783.99, time: 0.20, dur: 0.70, gain: 0.28 }, // G5
      { freq: 1046.50, time: 0.32, dur: 1.10, gain: 0.32 }, // C6
      { freq: 1318.51, time: 0.36, dur: 1.20, gain: 0.18 }, // E6 shimmer
      { freq: 1567.98, time: 0.40, dur: 1.30, gain: 0.15 }, // G6 shimmer
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Sine wave with soft harmonic blend
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      // Smooth attack and exponential decay envelope
      const startTime = now + note.time;
      const endTime = startTime + note.dur;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(note.gain, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(endTime);
    });

    // Add a secondary subtle warm bell oscillator on root note for extra body
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = 'triangle';
    bellOsc.frequency.setValueAtTime(523.25, now);
    bellGain.gain.setValueAtTime(0.0001, now);
    bellGain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    bellOsc.connect(bellGain);
    bellGain.connect(ctx.destination);
    bellOsc.start(now);
    bellOsc.stop(now + 0.8);
    notifySound('Celebratory Welcome Chime', '🎵');
  } catch (err) {
    console.warn('Welcome sound synthesis error (safe fallback):', err);
  }
}

/**
 * Plays a quick subtle celebratory success pip (for actions / quiz / copy).
 */
export function playSuccessChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12); // E6

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
    notifySound('Success Audio Tone', '✨');
  } catch (err) {
    console.warn('Audio chime error:', err);
  }
}

/**
 * Plays a modern dual-tone futuristic activation chime when Voice Access is triggered.
 * D5 (587Hz) -> A5 (880Hz) + D6 harmonic sheen.
 */
export function playVoiceAccessChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Primary prompt chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.09); // A5

    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.38);

    // Harmonic sparkle overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now + 0.03); // D6
    gain2.gain.setValueAtTime(0.0001, now + 0.03);
    gain2.gain.linearRampToValueAtTime(0.09, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.03);
    osc2.stop(now + 0.34);
    notifySound('Voice Input Activated', '🎙️');
  } catch (err) {
    console.warn('Voice access chime synthesis error:', err);
  }
}

/**
 * Spoken personalized voice greeting using speech synthesis.
 */
export function speakWelcomeGreeting(userName: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();
    const cleanName = userName ? userName.split(' ')[0] : 'Scholar';
    const text = `Welcome to Atlas, ${cleanName}!`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        v.name.includes('Natural') ||
        v.name.includes('Google') ||
        v.name.includes('Samantha') ||
        v.name.includes('Zira')
    );
    if (naturalVoice) utterance.voice = naturalVoice;

    window.speechSynthesis.speak(utterance);
    notifySound('Spoken Voice Greeting', '🗣️');
  } catch (err) {
    console.warn('Speech greeting error:', err);
  }
}

// =========================================================================
// Visual Sound Alerts for Deaf & Hard-of-Hearing Users
// =========================================================================

export type SoundAlertInfo = {
  id: number;
  title: string;
  icon: string;
  timestamp: number;
};

type SoundAlertListener = (alert: SoundAlertInfo) => void;
const soundListeners: Set<SoundAlertListener> = new Set();

export function addSoundAlertListener(listener: SoundAlertListener): () => void {
  soundListeners.add(listener);
  return () => {
    soundListeners.delete(listener);
  };
}

export function notifySound(title: string, icon: string = '🔔'): void {
  const alert: SoundAlertInfo = {
    id: Date.now() + Math.random(),
    title,
    icon,
    timestamp: Date.now(),
  };
  soundListeners.forEach((l) => {
    try {
      l(alert);
    } catch {}
  });
}

// =========================================================================
// Audio Earcons (Sound Cues for Blind & Visually Impaired Users)
// =========================================================================

export type EarconType = 'focus' | 'select' | 'nav' | 'error' | 'success' | 'alert';

/**
 * Plays short, distinct non-verbal procedural sound cues (Earcons)
 * to confirm focus, navigation, selection, and error states without screen sight.
 */
export function playEarcon(type: EarconType): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'focus') {
      // Soft short ping (440Hz -> 500Hz, 35ms)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(520, now + 0.035);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } else if (type === 'select') {
      // Crisp confirmation pop (600Hz -> 950Hz, 60ms)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.06);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
      notifySound('Button / Switch Selected', '👆');
    } else if (type === 'nav') {
      // Upward navigational chirp (480Hz -> 720Hz, 80ms)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.08);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
      notifySound('Navigation Switched', '🧭');
    } else if (type === 'error') {
      // Dual-tone low warning (360Hz -> 240Hz, 150ms)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.15);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.10, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
      notifySound('Accessibility Alert / Error', '⚠️');
    } else if (type === 'success') {
      playSuccessChime();
    }
  } catch (err) {
    console.warn('Earcon audio synthesis error:', err);
  }
}

