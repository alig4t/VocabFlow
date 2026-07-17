import type { Word } from '@/types'

/** A sentence + its translation, flattened from any of a word's example sources. */
export interface FlatExample {
  eng: string
  per?: string
}

/**
 * Every example sentence attached to a word, in display order:
 * the primary example, then extra examples, then examples nested under phrases.
 *
 * Phrase examples matter: in the scraped books ~14% of words carry ALL of their
 * examples inside `phrases[].examples` and none at the top level, so reading only
 * `primaryExample`/`examples` leaves those words looking example-less. The phrase
 * patterns themselves (patternEng/patternPer) are deliberately not surfaced —
 * only the sentences.
 */
export function collectExamples(word: Pick<Word, 'primaryExample' | 'primaryExampleTrs' | 'examples' | 'phrases'>): FlatExample[] {
  const out: FlatExample[] = []

  if (word.primaryExample) {
    out.push({ eng: word.primaryExample, per: word.primaryExampleTrs || undefined })
  }
  for (const ex of word.examples ?? []) {
    out.push({ eng: ex.engSentence, per: ex.perTranslation || undefined })
  }
  for (const phrase of word.phrases ?? []) {
    for (const ex of phrase.examples ?? []) {
      out.push({ eng: ex.engSentence, per: ex.perTranslation || undefined })
    }
  }

  // An edited word can repeat a sentence across sources; show each only once.
  const seen = new Set<string>()
  return out.filter((ex) => {
    const key = ex.eng.trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** True when a word has any example at all (including phrase-nested ones). */
export function hasExamples(word: Pick<Word, 'primaryExample' | 'primaryExampleTrs' | 'examples' | 'phrases'>): boolean {
  return collectExamples(word).length > 0
}
