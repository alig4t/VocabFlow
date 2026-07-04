/**
 * English pronunciation playback for review cards.
 *
 * Prefers a recorded audio file (`word.pronunciationAudio`) when available.
 * Otherwise: on native (Android) it uses the native Text-to-Speech engine;
 * on web it uses the browser's Speech Synthesis (Web Speech API).
 *
 * Native gotcha: the TTS engine initialises asynchronously after app start, so
 * an early `speak` is rejected with ERROR_UNSUPPORTED_LANGUAGE (the language
 * check reads `false` until the engine is ready). We warm the engine up and
 * retry a few times so the first taps/auto-plays aren't silently dropped.
 */
import { isNative } from './platform'

let currentAudio: HTMLAudioElement | null = null
let warmedUp = false

function nativeTts() {
  return import('@capacitor-community/text-to-speech').then((m) => m.TextToSpeech)
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Kick off native TTS engine initialisation early (idempotent). */
export function warmUpPronunciation(): void {
  if (!isNative() || warmedUp) return
  warmedUp = true
  nativeTts()
    .then((tts) => tts.getSupportedLanguages())
    .catch(() => {})
}

async function nativeSpeak(text: string): Promise<void> {
  const tts = await nativeTts()
  // Retry across the engine's async init window (~1s on a cold start).
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await tts.speak({ text, lang: 'en-US', rate: 1.0 })
      return
    } catch {
      await wait(300)
    }
  }
}

export function stopPronunciation(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if (isNative()) {
    nativeTts()
      .then((tts) => tts.stop())
      .catch(() => {})
    return
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

function speak(text: string): void {
  if (!text) return

  if (isNative()) {
    // speak() itself flushes the queue natively, so no explicit stop needed.
    void nativeSpeak(text)
    return
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.9
  window.speechSynthesis.speak(utterance)
}

export function playPronunciation(word: {
  eng: string
  pronunciationAudio?: string | null
}): void {
  if (word.pronunciationAudio) {
    stopPronunciation()
    const audio = new Audio(word.pronunciationAudio)
    currentAudio = audio
    audio.play().catch(() => {
      // Audio file couldn't play (missing/blocked) — fall back to TTS.
      if (currentAudio === audio) currentAudio = null
      speak(word.eng)
    })
    return
  }

  speak(word.eng)
}
