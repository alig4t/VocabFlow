/**
 * English pronunciation playback for review cards.
 *
 * Prefers a recorded audio file (`word.pronunciationAudio`) when available.
 * Otherwise: on native (Android) it uses the native Text-to-Speech engine
 * (WebView speechSynthesis is unreliable there); on web it uses the browser's
 * Speech Synthesis (Web Speech API) reading the English word.
 */
import { isNative } from './platform'

let currentAudio: HTMLAudioElement | null = null

function nativeTts() {
  return import('@capacitor-community/text-to-speech').then((m) => m.TextToSpeech)
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
    nativeTts()
      .then((tts) => tts.speak({ text, lang: 'en-US', rate: 1.0 }))
      .catch(() => {})
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
  stopPronunciation()

  if (word.pronunciationAudio) {
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
