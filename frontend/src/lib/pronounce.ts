/**
 * English pronunciation playback.
 *
 * Primary: the `easy-speech` package — a robust wrapper around the Web Speech
 * API that properly waits for the (async-loaded) voices and works around the
 * Android WebView init quirks that made raw speechSynthesis / the native plugin
 * stay silent. Runs on the device engine, offline.
 *
 * Fallbacks: a server-provided audio file, or the Google Translate TTS audio
 * clip played through <audio> (needs internet) if no voices are available.
 */
import EasySpeech from 'easy-speech'

let currentAudio: HTMLAudioElement | null = null
let initPromise: Promise<boolean> | null = null

function ensureInit(): Promise<boolean> {
  if (!initPromise) {
    initPromise = EasySpeech.init({ maxTimeout: 5000, interval: 250 })
      .then(() => true)
      .catch(() => false)
  }
  return initPromise
}

/** Warm up the speech engine (load voices) ahead of the first play. */
export function warmUpPronunciation(): void {
  void ensureInit()
}

function englishVoice(): SpeechSynthesisVoice | undefined {
  try {
    const vs = EasySpeech.voices() || []
    return vs.find((v) => /en[-_]us/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || undefined
  } catch {
    return undefined
  }
}

function ttsAudioUrl(text: string): string {
  const q = encodeURIComponent(text.slice(0, 200))
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${q}`
}

function playUrl(src: string, onFail?: () => void): void {
  const audio = new Audio(src)
  currentAudio = audio
  const fail = () => {
    if (currentAudio === audio) currentAudio = null
    onFail?.()
  }
  audio.onerror = fail
  audio.play().catch(fail)
}

export function stopPronunciation(): void {
  try {
    EasySpeech.cancel()
  } catch {
    /* not initialised yet */
  }
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
}

async function speak(text: string): Promise<void> {
  if (!text) return
  const ready = await ensureInit()
  if (ready) {
    try {
      await EasySpeech.speak({ text, voice: englishVoice(), rate: 0.9, pitch: 1, volume: 1 })
      return
    } catch {
      /* engine present but failed — fall back to an online clip */
    }
  }
  playUrl(ttsAudioUrl(text))
}

export function playPronunciation(word: {
  eng: string
  pronunciationAudio?: string | null
}): void {
  stopPronunciation()
  if (!word.eng) return

  if (word.pronunciationAudio) {
    playUrl(word.pronunciationAudio, () => void speak(word.eng))
    return
  }
  void speak(word.eng)
}
