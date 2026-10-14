/**
 * ATLAS 2.0 Speech & Voice Utilities
 * Provides bulletproof TTS audio playback across mobile devices (Android/iOS) and desktop browsers.
 * Handles:
 *  - Mobile user-activation pre-unlocking (avoids NotAllowedError after async network fetches)
 *  - Odia (Unicode 0x0B00-0x0B7F) phonetic transliteration to Devanagari for Indian speech engines
 *  - Markdown & LaTeX formatting cleanup for natural speech prosody
 *  - Browser SpeechSynthesis fallback with smart voice discovery
 */

// Special mappings for Odia specific letters, signs, and digits to Devanagari
export const ODIA_DEV_MAP: Record<number, number> = {
  0x0b5c: 0x095c, // ଡ଼ -> ड़
  0x0b5d: 0x095d, // ଢ଼ -> ढ़
  0x0b5f: 0x092f, // ୟ -> य
  0x0b71: 0x0935, // ୱ -> व
  0x0b33: 0x0933, // ଳ -> ळ
  0x0b3d: 0x093d, // ଽ -> ऽ
  0x0b02: 0x0902, // ଂ -> ं
  0x0b03: 0x0903, // ଃ -> ः
  0x0b01: 0x0901, // ଁ -> ँ
  0x0b4d: 0x094d, // ୍ -> ्
};

/**
 * Phonetically transliterates Odia Unicode characters to Devanagari
 * so standard Indic voice engines (Google, Microsoft, Android TTS) pronounce it naturally.
 */
export function odiaToDevanagari(text: string): string {
  if (!text) return '';
  const chars: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const cp = text.charCodeAt(i);
    if (ODIA_DEV_MAP[cp]) {
      chars.push(String.fromCharCode(ODIA_DEV_MAP[cp]));
    } else if (cp >= 0x0b66 && cp <= 0x0b6f) {
      // Odia digits (୦-୯) -> Devanagari digits (०-९)
      chars.push(String.fromCharCode(0x0966 + (cp - 0x0b66)));
    } else if (cp >= 0x0b00 && cp <= 0x0b7f) {
      // Direct block shift from Odia to Devanagari
      chars.push(String.fromCharCode(cp - 0x0b00 + 0x0900));
    } else {
      chars.push(text[i]);
    }
  }
  return chars.join('');
}

/**
 * Clean markdown, code blocks, LaTeX, and special symbols so speech synthesizers
 * speak natural human sentences rather than punctuation characters.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  let t = text;

  // Remove code blocks ```...```
  t = t.replace(/```[\s\S]*?```/g, '');
  // Remove inline code `...`
  t = t.replace(/`([^`]+)`/g, '$1');
  // Remove markdown images and links ![alt](url) or [text](url)
  t = t.replace(/!\[([^\]]*)\]\([^)]*\)/g, '');
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  // Remove markdown bold and italic: **bold**, *italic*, __bold__
  t = t.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');
  // Remove headers: # Header -> Header
  t = t.replace(/^#+\s+/gm, '');
  // Remove bullet points: - item, * item, • item
  t = t.replace(/^\s*[-*•]\s+/gm, '');
  // Remove LaTeX delimiters $$ ... $$, $ ... $, \( ... \), \[ ... \]
  t = t.replace(/\$\$[\s\S]*?\$\$/g, '');
  t = t.replace(/\\\[[\s\S]*?\\\]/g, '');
  t = t.replace(/\\\((.*?)\\\)/g, '$1');
  t = t.replace(/\$([^\$]+)\$/g, '$1');
  // Replace simple LaTeX \frac{a}{b} with a / b
  t = t.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 by $2');
  // Strip remaining backslashes from LaTeX commands
  t = t.replace(/\\[a-zA-Z]+/g, ' ');

  // Normalize step markers (e.g., "Step 1:" or "1.")
  t = t.replace(/^\s*(\d+)[\.\)]\s*/gm, '$1. ');

  // Normalize whitespace and newlines
  t = t.replace(/[ \t]+/g, ' ');
  t = t.replace(/\n{2,}/g, ' । ');
  t = t.replace(/\n/g, ' ');

  return t.trim();
}

// Silent 44-byte standard WAV file as base64 data URI
const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';

/**
 * Pre-unlocks an HTMLAudioElement synchronously inside the user's click event.
 * Modern mobile browsers (Android Chrome, iOS Safari) strictly require media playback
 * to be initiated during a user gesture. By playing a silent audio chunk immediately on tap,
 * subsequent async play() calls on this same element are granted permission.
 */
export function preUnlockAudio(existingAudio?: HTMLAudioElement | null): HTMLAudioElement {
  const audio = existingAudio || new Audio();
  try {
    audio.src = SILENT_WAV;
    audio.currentTime = 0;
    // Play synchronously during user gesture; catch silently if already playing
    audio.play().catch(() => {});
  } catch {
    // Ignore synchronous initialization warnings
  }
  return audio;
}

/**
 * Cached voices from speechSynthesis to avoid empty getVoices() on first load
 */
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && window.speechSynthesis) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

/**
 * Finds the best browser voice for the requested language
 */
export function getBestBrowserVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  const l = (lang || 'en').toLowerCase();

  const isIndic = l.includes('odia') || l.includes('hindi') || l === 'or' || l === 'hi';

  if (isIndic) {
    const indicVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith('hi') ||
        v.lang.toLowerCase().startsWith('or') ||
        v.name.toLowerCase().includes('hindi') ||
        v.name.toLowerCase().includes('odia') ||
        v.name.toLowerCase().includes('india') ||
        v.name.toLowerCase().includes('indic')
    );
    if (indicVoice) return indicVoice;
  }

  // English fallback or natural voice
  const enVoice = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith('en') &&
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
  ) || voices.find((v) => v.lang.toLowerCase().startsWith('en'));

  return enVoice || voices[0] || null;
}

/**
 * Speaks text using the browser's native SpeechSynthesis API as a fallback,
 * with automatic Odia -> Devanagari transliteration and formatting cleanup.
 */
export function speakWithBrowserFallback(
  rawText: string,
  lang: string,
  options?: {
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (options?.onError) options.onError(new Error('SpeechSynthesis not supported'));
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const clean = cleanTextForSpeech(rawText);
    if (!clean) {
      if (options?.onEnd) options.onEnd();
      return;
    }

    const l = (lang || 'English').toLowerCase();
    const isOdia = l.includes('odia') || l === 'or' || l === 'or-in';
    const isHindi = l.includes('hindi') || l === 'hi' || l === 'hi-in';

    // Transliterate Odia to Devanagari for Indian speech engines
    const textToSpeak = isOdia ? odiaToDevanagari(clean) : clean;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = options?.rate || 1.0;
    if (options?.pitch) utterance.pitch = options.pitch;

    const voice = getBestBrowserVoice(lang);
    if (voice) {
      utterance.voice = voice;
    }

    if (isOdia || isHindi) {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.onstart = () => {
      broadcastCaption(clean, true, 'Atlas Voice');
      if (options?.onStart) options.onStart();
    };

    utterance.onend = () => {
      broadcastCaption('', false);
      if (options?.onEnd) options.onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Browser SpeechSynthesis error:', e);
      broadcastCaption('', false);
      if (options?.onError) options.onError(e);
      else if (options?.onEnd) options.onEnd();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Failed to speak via SpeechSynthesis:', err);
    broadcastCaption('', false);
    if (options?.onError) options.onError(err);
  }
}

// =========================================================================
// Live Closed Captions (Subtitles) for Deaf & Hard-of-Hearing Users
// =========================================================================

export type CaptionEvent = {
  text: string;
  speaker?: string;
  active: boolean;
};

type CaptionListener = (event: CaptionEvent) => void;
const captionListeners: Set<CaptionListener> = new Set();

export function addCaptionListener(listener: CaptionListener): () => void {
  captionListeners.add(listener);
  return () => {
    captionListeners.delete(listener);
  };
}

export function broadcastCaption(text: string, active: boolean, speaker: string = 'Atlas Narrator'): void {
  captionListeners.forEach((l) => {
    try {
      l({ text, active, speaker });
    } catch {}
  });
}

