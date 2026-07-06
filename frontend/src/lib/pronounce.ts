/**
 * English pronunciation — fully offline (uses the on-device speech engine).
 *
 * Native (Android): talk DIRECTLY to the device Text-to-Speech engine via the
 * Capacitor plugin (the WebView's speechSynthesis often exposes no voices, which
 * is why easy-speech/speechSynthesis stayed silent). The engine initialises
 * asynchronously, so we retry across its init window. Language is `en` (not
 * `en-US`) — many engines report the country variant as unsupported.
 *
 * Web: use the browser voices through easy-speech (falls back to raw
 * speechSynthesis). No network / Google services involved.
 */
import { isNative } from './platform'

let currentAudio: HTMLAudioElement | null = null
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── Native (device engine) ────────────────────────────────────────────────────
async function nativeSpeak(text: string): Promise<void> {
  try {
    // ایمپورت داینامیک پلاگین
    const { TextToSpeech } = await import('@capacitor-community/text-to-speech')
    
    // موتور TTS ممکن است در اولین فراخوانی‌ها آماده نباشد
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        // مستقیماً متد speak را فراخوانی می‌کنیم
        await TextToSpeech.speak({
          text,
          lang: 'en',
          rate: 1.0,
          volume: 1.0,
          pitch: 1.0,
        })
        return // موفقیت‌آمیز بود، خارج می‌شویم
      } catch (error) {
        console.warn(`TTS attempt ${attempt + 1} failed:`, error)
        // اگر خطا مربوط به عدم آمادگی موتور باشد، صبر می‌کنیم و دوباره تلاش می‌کنیم
        await wait(300)
      }
    }
    throw new Error('Failed to initialize TextToSpeech after multiple attempts')
  } catch (error) {
    console.error('TextToSpeech error:', error)
    // در صورت شکست کامل، می‌توانید fallback داشته باشید یا فقط لاگ کنید
  }
}

// ── Web (browser voices) ──────────────────────────────────────────────────────
let webInit: Promise<boolean> | null = null

async function webSpeak(text: string): Promise<void> {
  try {
    const EasySpeech = (await import('easy-speech')).default
    if (!webInit) {
      webInit = EasySpeech.init({ maxTimeout: 5000, interval: 250 })
        .then(() => true)
        .catch(() => false)
    }
    if (await webInit) {
      const voices = EasySpeech.voices() || []
      const voice = voices.find((v) => /^en/i.test(v.lang))
      await EasySpeech.speak({ text, voice, rate: 0.9, pitch: 1, volume: 1 })
      return
    }
  } catch {
    /* fall through to raw speechSynthesis */
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en'
    u.rate = 0.9
    window.speechSynthesis.speak(u)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
/** Warm up the speech engine so the first play isn't dropped/delayed. */
export function warmUpPronunciation(): void {
  if (isNative()) {
    // لود کردن پلاگین و بررسی زبان‌های پشتیبانی شده
    import('@capacitor-community/text-to-speech')
      .then(({ TextToSpeech }) => {
        TextToSpeech.getSupportedLanguages()
          .then((languages) => {
            console.log('Supported TTS languages:', languages)
          })
          .catch((err) => {
            console.warn('Could not get supported languages:', err)
          })
      })
      .catch((err) => {
        console.error('Failed to load TTS plugin:', err)
      })
  } else {
    void webSpeak('') // triggers easy-speech init without speaking
  }
}

export function stopPronunciation(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if (isNative()) {
    import('@capacitor-community/text-to-speech')
      .then(({ TextToSpeech }) => TextToSpeech.stop())
      .catch(() => {})
    return
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

function speak(text: string): void {
  if (!text) return
  if (isNative()) void nativeSpeak(text)
  else void webSpeak(text)
}

export function playPronunciation(word: {
  eng: string
  pronunciationAudio?: string | null
}): void {
  stopPronunciation()
  if (!word.eng) return

  if (word.pronunciationAudio) {
    const audio = new Audio(word.pronunciationAudio)
    currentAudio = audio
    audio.play().catch(() => {
      if (currentAudio === audio) currentAudio = null
      speak(word.eng)
    })
    return
  }
  speak(word.eng)
}