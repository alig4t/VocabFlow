/**
 * English pronunciation playback.
 *
 * Primary method: play a real pronunciation audio clip through an <audio>
 * element — either a server-provided file (`pronunciationAudio`) or, when none
 * exists, the Google Translate TTS audio endpoint for the word. This works the
 * same on web and inside the Android WebView and does NOT depend on a device
 * TTS engine (which proved unreliable).
 *
 * Fallback (only if the audio can't load, e.g. offline): the native TTS engine
 * on Android, or the browser's speechSynthesis on the web.
 */
import { isNative } from './platform'

let currentAudio: HTMLAudioElement | null = null

/** Google Translate TTS audio (MP3) for a short English text. */
function ttsAudioUrl(text: string): string {
  const q = encodeURIComponent(text.slice(0, 200))
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${q}`
}

function nativeTts() {
  return import('@capacitor-community/text-to-speech').then((m) => m.TextToSpeech)
}

/** Kept for backwards-compat (used to warm the native engine); now a no-op. */
export function warmUpPronunciation(): void {}

export function stopPronunciation(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
  if (isNative()) {
    nativeTts()
      .then((tts) => tts.stop())
      .catch(() => {})
  }
}

/** Last-resort speech when the audio clip can't be fetched/played. */
function fallbackSpeak(text: string): void {
  if (!text) return
  if (isNative()) {
    nativeTts()
      .then((tts) => tts.speak({ text, lang: 'en-US', rate: 1.0 }))
      .catch(() => {})
    return
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.9
    window.speechSynthesis.speak(u)
  }
}

export function playPronunciation(word: {
  eng: string
  pronunciationAudio?: string | null
}): void {
  stopPronunciation()
  if (!word.eng) return

  const src = word.pronunciationAudio || ttsAudioUrl(word.eng)
  const audio = new Audio(src)
  currentAudio = audio

  const onFail = () => {
    if (currentAudio === audio) currentAudio = null
    fallbackSpeak(word.eng)
  }
  audio.onerror = onFail
  audio.play().catch(onFail)
}
