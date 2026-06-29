/**
 * Import scraped volume-6.json into the database.
 * Run: npm run db:import-volume6
 * Optional custom path: npm run db:import-volume6 -- /path/to/volume-6.json
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// ── Types matching the scraper output ────────────────────────────────────────

interface ScrapedExample { eng: string; per: string }
interface ScrapedPhrase  { patternEng: string; patternPer: string; examples: ScrapedExample[] }
interface ScrapedMeaning {
  per: string
  examples:  ScrapedExample[]
  phrases?:  ScrapedPhrase[]
  synonyms?: string[]
  antonyms?: string[]
}
interface ScrapedWord {
  eng:           string
  pronunciation: string
  partOfSpeech:  string
  meanings:      ScrapedMeaning[]
  wordForms?:    { label: string; forms: string }
}
interface ScrapedUnit  { unit: number; unitId: string; url: string; words: ScrapedWord[] }
interface ScrapedVolume { volume: number; totalUnits: number; totalWords: number; units: ScrapedUnit[] }

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Resolve JSON path (arg or default)
  const jsonPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, '../../scrap/output/volume-6.json')

  if (!fs.existsSync(jsonPath)) {
    console.error('❌  File not found:', jsonPath)
    console.error('    Pass a custom path: npm run db:import-volume6 -- /path/to/volume-6.json')
    process.exit(1)
  }

  const data: ScrapedVolume = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  console.log(`\n📂  Loaded: ${jsonPath}`)
  console.log(`    Volume ${data.volume} · ${data.totalUnits} units · ${data.totalWords} words\n`)

  // ── Module ────────────────────────────────────────────────────────────────
  const module = await prisma.learningModule.findFirst({ where: { slug: 'vocabulary' } })
  if (!module) {
    console.error('❌  Learning module not found. Run: npm run db:seed')
    process.exit(1)
  }

  // ── Book ──────────────────────────────────────────────────────────────────
  const book = await prisma.book.findFirst({ where: { title: '4000 Essential English Words' } })
  if (!book) {
    console.error('❌  Book not found. Run: npm run db:migrate-mysql  (to create volumes 1-5 and the book)')
    process.exit(1)
  }

  // ── Volume ────────────────────────────────────────────────────────────────
  const volume = await prisma.volume.upsert({
    where:  { bookId_volumeNumber: { bookId: book.id, volumeNumber: data.volume } },
    update: {},
    create: { bookId: book.id, volumeNumber: data.volume, title: `Book ${data.volume}` },
  })
  console.log(`📖  Volume ${data.volume} ready (id: ${volume.id})\n`)

  let ok = 0; let fail = 0

  for (const unit of data.units) {
    // ── Lesson ──────────────────────────────────────────────────────────────
    const lesson = await prisma.lesson.upsert({
      where:  { volumeId_lessonNumber: { volumeId: volume.id, lessonNumber: unit.unit } },
      update: {},
      create: { volumeId: volume.id, lessonNumber: unit.unit },
    })

    process.stdout.write(`  Unit ${String(unit.unit).padStart(2, '0')}  `)

    for (const w of unit.words) {
      // Flatten across meanings
      const per        = w.meanings.map(m => m.per).filter(Boolean).join(' / ')
      const synonyms   = [...new Set(w.meanings.flatMap(m => m.synonyms ?? []))]
      const antonyms   = [...new Set(w.meanings.flatMap(m => m.antonyms ?? []))]
      const allPhrases = w.meanings.flatMap(m => m.phrases ?? [])
      const allExamples = w.meanings.flatMap(m => m.examples ?? [])
      const wordForms   = w.wordForms
        ? `${w.wordForms.label}: ${w.wordForms.forms}`
        : undefined

      // primaryExample — use first direct example
      const firstEx = allExamples[0]

      try {
        const word = await prisma.word.create({
          data: {
            eng:              w.eng.trim(),
            per:              per || w.eng,
            pronunciation:    w.pronunciation || undefined,
            partOfSpeech:     w.partOfSpeech  || undefined,
            wordForms:        wordForms,
            synonyms,
            antonyms,
            primaryExample:    firstEx?.eng ?? undefined,
            primaryExampleTrs: firstEx?.per ?? undefined,
            chapter:  data.volume,
            unit:     unit.unit,
            lessonId: lesson.id,
            moduleId: module.id,
          },
        })

        // WordExample — remaining examples (skip first, already in primaryExample)
        const extraExamples = allExamples.slice(1)
        if (extraExamples.length > 0) {
          await prisma.wordExample.createMany({
            data: extraExamples.map((ex, i) => ({
              wordId:        word.id,
              engSentence:   ex.eng,
              perTranslation: ex.per ?? '',
              order:         i,
            })),
          })
        }

        // WordPhrase + WordPhraseExample
        for (let pi = 0; pi < allPhrases.length; pi++) {
          const p = allPhrases[pi]
          const phrase = await prisma.wordPhrase.create({
            data: {
              wordId:     word.id,
              patternEng: p.patternEng,
              patternPer: p.patternPer,
              order:      pi,
            },
          })
          if (p.examples?.length > 0) {
            await prisma.wordPhraseExample.createMany({
              data: p.examples.map((ex, ei) => ({
                phraseId:      phrase.id,
                engSentence:   ex.eng,
                perTranslation: ex.per ?? '',
                order:         ei,
              })),
            })
          }
        }

        ok++
      } catch (e) {
        fail++
        console.error(`\n    ✗ "${w.eng}": ${(e as Error).message}`)
      }
    }

    console.log(`✅  ${unit.words.length} words`)
  }

  console.log(`\n${'─'.repeat(40)}`)
  console.log(`✅  Imported: ${ok}   ❌  Failed: ${fail}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(()  => prisma.$disconnect())
