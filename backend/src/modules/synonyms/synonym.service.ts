import { PrismaClient } from '@prisma/client'
import { SynonymProvider, SynonymResult } from './synonym.provider'
import { NotFoundError } from '../../shared/errors'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Built-in development provider: returns hardcoded synonyms for common words
// ---------------------------------------------------------------------------

const MOCK_SYNONYMS: Record<string, Array<{ word: string; similarity: number }>> = {
  happy: [
    { word: 'joyful', similarity: 0.9 },
    { word: 'cheerful', similarity: 0.85 },
    { word: 'content', similarity: 0.8 },
    { word: 'pleased', similarity: 0.75 },
    { word: 'elated', similarity: 0.7 },
  ],
  sad: [
    { word: 'unhappy', similarity: 0.9 },
    { word: 'sorrowful', similarity: 0.85 },
    { word: 'melancholy', similarity: 0.8 },
    { word: 'depressed', similarity: 0.75 },
    { word: 'gloomy', similarity: 0.7 },
  ],
  big: [
    { word: 'large', similarity: 0.95 },
    { word: 'huge', similarity: 0.85 },
    { word: 'enormous', similarity: 0.8 },
    { word: 'vast', similarity: 0.75 },
    { word: 'gigantic', similarity: 0.7 },
  ],
  small: [
    { word: 'little', similarity: 0.95 },
    { word: 'tiny', similarity: 0.9 },
    { word: 'miniature', similarity: 0.8 },
    { word: 'petite', similarity: 0.75 },
    { word: 'diminutive', similarity: 0.7 },
  ],
  fast: [
    { word: 'quick', similarity: 0.95 },
    { word: 'swift', similarity: 0.9 },
    { word: 'rapid', similarity: 0.85 },
    { word: 'speedy', similarity: 0.8 },
    { word: 'hasty', similarity: 0.7 },
  ],
  slow: [
    { word: 'sluggish', similarity: 0.85 },
    { word: 'leisurely', similarity: 0.8 },
    { word: 'unhurried', similarity: 0.75 },
    { word: 'gradual', similarity: 0.7 },
    { word: 'plodding', similarity: 0.65 },
  ],
  good: [
    { word: 'excellent', similarity: 0.85 },
    { word: 'fine', similarity: 0.8 },
    { word: 'superb', similarity: 0.78 },
    { word: 'great', similarity: 0.75 },
    { word: 'wonderful', similarity: 0.7 },
  ],
  bad: [
    { word: 'terrible', similarity: 0.85 },
    { word: 'awful', similarity: 0.83 },
    { word: 'poor', similarity: 0.78 },
    { word: 'dreadful', similarity: 0.75 },
    { word: 'horrible', similarity: 0.72 },
  ],
  beautiful: [
    { word: 'gorgeous', similarity: 0.9 },
    { word: 'lovely', similarity: 0.88 },
    { word: 'attractive', similarity: 0.82 },
    { word: 'stunning', similarity: 0.8 },
    { word: 'elegant', similarity: 0.75 },
  ],
  smart: [
    { word: 'intelligent', similarity: 0.9 },
    { word: 'clever', similarity: 0.88 },
    { word: 'bright', similarity: 0.82 },
    { word: 'brilliant', similarity: 0.8 },
    { word: 'sharp', similarity: 0.75 },
  ],
}

export class MockSynonymProvider implements SynonymProvider {
  readonly name = 'mock'

  async getSynonyms(word: string, _meaning: string): Promise<SynonymResult[]> {
    const key = word.toLowerCase()
    const matches = MOCK_SYNONYMS[key] ?? []
    return matches.map((m) => ({ ...m, source: this.name }))
  }
}

// ---------------------------------------------------------------------------
// Main service
// ---------------------------------------------------------------------------

export class SynonymService {
  private readonly providers: SynonymProvider[]

  constructor(providers: SynonymProvider[] = [new MockSynonymProvider()]) {
    this.providers = providers
  }

  async getSynonyms(wordId: string): Promise<SynonymResult[]> {
    const word = await prisma.word.findUnique({ where: { id: wordId } })
    if (!word) throw new NotFoundError('Word')

    const meaning = word.per ?? ''

    const allResults = await Promise.all(
      this.providers.map((p) => p.getSynonyms(word.eng, meaning)),
    )

    const flat = allResults.flat()

    // Deduplicate: keep highest similarity per unique word
    const seen = new Map<string, SynonymResult>()
    for (const result of flat) {
      const key = result.word.toLowerCase()
      const existing = seen.get(key)
      if (!existing || result.similarity > existing.similarity) {
        seen.set(key, result)
      }
    }

    return Array.from(seen.values()).sort((a, b) => b.similarity - a.similarity)
  }
}
