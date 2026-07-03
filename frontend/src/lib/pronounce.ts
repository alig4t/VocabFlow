/**
 * English pronunciation playback for review cards.
 *
 * Prefers a recorded audio file (`word.pronunciationAudio`) when available and
 * falls back to the browser's Speech Synthesis (Web Speech API) reading the
 * English word — so pronunciation works even when no audio file is stored.
 */

let currentAudio: HTMLAudioElement | null = null

export function stopPronunciation(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

function speak(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  if (!text) return
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
