/**
 * Import all JSON files from /books into the database.
 * Handles both scraper formats automatically.
 * Run: npm run db:seed-all-datas
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// ── Book/volume title overrides ───────────────────────────────────────────────

// When multiple volumes of the same slug form one book series, map slug → parent book title.
// All files with that slug are imported as volumes of that single book.
const BOOK_TITLE_MAP: Record<string, string> = {
  '4000-essential-english-words':            '4000 Essential English Words',
  'oxford-word-skills-basic':                'Oxford Word Skills',      // v1=Basic v2=Intermediate v3=Advanced
  '1000-english-collocations':               '1000 English Collocations',
  'english-phrasal-verbs-in-use':            'English Phrasal Verbs in Use',
  'barron-essential-words-for-the-gre':      "Barron's Essential Words for the GRE",
  'barron-s-essential-words-for-the-ielts':  "Barron's Essential Words for the IELTS",
  'barron-s-essential-words-for-the-toefl':  "Barron's Essential Words for the TOEFL",
  'street-talk-1':                           'Street Talk 1',
  '504-absolutely-essential-words':          '504 Absolutely Essential Words',
  'barron-1100-words-you-need-to-know':      "Barron's 1100 Words You Need to Know",
}

// Override the generated "Volume N" title per slug + volume number.
const VOLUME_TITLE_MAP: Record<string, Record<number, string>> = {
  'oxford-word-skills-basic': {
    1: 'Basic',
    2: 'Intermediate',
    3: 'Advanced',
  },
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScrapedExample { eng: string; per: string }
interface ScrapedPhrase  { patternEng: string; patternPer?: string; examples: ScrapedExample[] }
interface ScrapedMeaning {
  per:       string
  examples:  ScrapedExample[]
  phrases?:  ScrapedPhrase[]
  synonyms?: string[]
  antonyms?: string[]
}
interface ScrapedWord {
  eng:            string
  pronunciation?: string
  partOfSpeech?:  string
  meanings:       ScrapedMeaning[]
  wordForms?:     { label: string; forms: string }
}

// Old format: scraper.js (4000 Essential English Words)
interface OldUnit   { unit: number; unitId: string; url: string; words: ScrapedWord[] }
interface OldFormat { volume: number; totalUnits: number; totalWords: number; units: OldUnit[] }

// New format: book-scraper.js
interface NewLesson { lessonNumber: number; title?: string; unitId: string; url: string; words: ScrapedWord[] }
interface NewFormat { bookSlug: string; volumeNumber: number; totalLessons: number; totalWords: number; lessons: NewLesson[] }

type BookFile = OldFormat | NewFormat

// ── Helpers ───────────────────────────────────────────────────────────────────

function isOldFormat(d: BookFile): d is OldFormat { return 'units' in d }

function slugFromFilename(filename: string): string {
  // "4000-essential-english-words-1.json" → "4000-essential-english-words"
  // "oxford-word-skills-basic-v1.json"    → "oxford-word-skills-basic"
  return filename.replace(/\.json$/, '').replace(/-v?\d+$/, '')
}

function titleFromSlug(slug: string): string {
  return BOOK_TITLE_MAP[slug]
    ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Word import (shared for both formats) ─────────────────────────────────────

async function importWord(
  w: ScrapedWord,
  lessonId: string,
  moduleId: string,
  chapterNum: number,
  unitNum: number,
) {
  const per         = w.meanings.map(m => m.per).filter(Boolean).join(' / ')
  const synonyms    = [...new Set(w.meanings.flatMap(m => m.synonyms ?? []))]
  const antonyms    = [...new Set(w.meanings.flatMap(m => m.antonyms ?? []))]
  const allPhrases  = w.meanings.flatMap(m => m.phrases ?? [])
  const allExamples = w.meanings.flatMap(m => m.examples ?? [])
  const wordForms   = w.wordForms
    ? `${w.wordForms.label}: ${w.wordForms.forms}`
    : undefined
  const firstEx = allExamples[0]

  const word = await prisma.word.create({
    data: {
      eng:               w.eng.trim(),
      per:               per || w.eng,
      pronunciation:     w.pronunciation  || undefined,
      partOfSpeech:      w.partOfSpeech   || undefined,
      wordForms,
      synonyms,
      antonyms,
      primaryExample:    firstEx?.eng ?? undefined,
      primaryExampleTrs: firstEx?.per ?? undefined,
      chapter:  chapterNum,
      unit:     unitNum,
      lessonId,
      moduleId,
    },
  })

  const extraExamples = allExamples.slice(1)
  if (extraExamples.length > 0) {
    await prisma.wordExample.createMany({
      data: extraExamples.map((ex, i) => ({
        wordId:         word.id,
        engSentence:    ex.eng,
        perTranslation: ex.per ?? '',
        order:          i,
      })),
    })
  }

  for (let pi = 0; pi < allPhrases.length; pi++) {
    const p = allPhrases[pi]
    const phrase = await prisma.wordPhrase.create({
      data: {
        wordId:     word.id,
        patternEng: p.patternEng,
        patternPer: p.patternPer ?? '',
        order:      pi,
      },
    })
    if (p.examples?.length) {
      await prisma.wordPhraseExample.createMany({
        data: p.examples.map((ex, ei) => ({
          phraseId:       phrase.id,
          engSentence:    ex.eng,
          perTranslation: ex.per ?? '',
          order:          ei,
        })),
      })
    }
  }
}

// ── File importer ─────────────────────────────────────────────────────────────

async function importFile(
  filePath: string,
  moduleId: string,
): Promise<{ ok: number; fail: number }> {
  const filename = path.basename(filePath)
  let data: BookFile
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch (e) {
    console.error(`  ❌  JSON parse error — skipping. Run repair or re-scrape this file.`)
    console.error(`      ${(e as Error).message}`)
    return { ok: 0, fail: 0 }
  }

  let bookSlug: string
  let volumeNumber: number
  let lessons: Array<{ lessonNumber: number; title?: string; words: ScrapedWord[] }>

  if (isOldFormat(data)) {
    bookSlug     = slugFromFilename(filename)
    volumeNumber = data.volume
    lessons      = data.units.map(u => ({
      lessonNumber: u.unit,
      title:        `Unit ${u.unit}`,
      words:        u.words,
    }))
  } else {
    bookSlug     = data.bookSlug
    volumeNumber = data.volumeNumber
    lessons      = data.lessons
  }

  const bookTitle = titleFromSlug(bookSlug)

  // Book — find or create (title is not @unique in schema, so no upsert)
  let book = await prisma.book.findFirst({ where: { title: bookTitle } })
  if (!book) {
    book = await prisma.book.create({ data: { title: bookTitle } })
    console.log(`  📚 Created book: "${bookTitle}"`)
  }

  // Volume — upsert (has @@unique([bookId, volumeNumber]))
  const volumeTitle = VOLUME_TITLE_MAP[bookSlug]?.[volumeNumber] ?? `Volume ${volumeNumber}`
  const volume = await prisma.volume.upsert({
    where:  { bookId_volumeNumber: { bookId: book.id, volumeNumber } },
    update: { title: volumeTitle },
    create: { bookId: book.id, volumeNumber, title: volumeTitle },
  })

  let ok = 0; let fail = 0

  for (const les of lessons) {
    // Lesson — upsert (has @@unique([volumeId, lessonNumber]))
    const lesson = await prisma.lesson.upsert({
      where:  { volumeId_lessonNumber: { volumeId: volume.id, lessonNumber: les.lessonNumber } },
      update: les.title ? { title: les.title } : {},
      create: { volumeId: volume.id, lessonNumber: les.lessonNumber, title: les.title },
    })

    process.stdout.write(
      `    Lesson ${String(les.lessonNumber).padStart(3, '0')}/${lessons.length}  `,
    )

    for (const w of les.words) {
      try {
        await importWord(w, lesson.id, moduleId, volumeNumber, les.lessonNumber)
        ok++
      } catch {
        fail++
      }
    }

    console.log(`${les.words.length} words`)
  }

  return { ok, fail }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const booksDir = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, '../../books')

  if (!fs.existsSync(booksDir)) {
    console.error(`❌  Directory not found: ${booksDir}`)
    console.error('    Pass a custom path: npm run db:seed-all-datas -- /path/to/books')
    process.exit(1)
  }

  // Require vocabulary module (created by db:seed)
  const module = await prisma.learningModule.findFirst({ where: { slug: 'vocabulary' } })
  if (!module) {
    console.error('❌  Vocabulary module not found. Run: npm run db:seed')
    process.exit(1)
  }

  const files = fs.readdirSync(booksDir)
    .filter(f => f.endsWith('.json'))
    .sort()

  if (files.length === 0) {
    console.error(`❌  No JSON files found in: ${booksDir}`)
    process.exit(1)
  }

  console.log(`\n📚  Importing ${files.length} file(s) from: ${booksDir}\n`)

  let totalOk = 0
  let totalFail = 0

  for (const file of files) {
    console.log(`\n📖  ${file}`)
    const { ok, fail } = await importFile(path.join(booksDir, file), module.id)
    totalOk   += ok
    totalFail += fail
    console.log(`   ✅  ${ok} words imported${fail > 0 ? `  ❌  ${fail} failed` : ''}`)
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅  Total words imported : ${totalOk}`)
  if (totalFail > 0) {
    console.log(`❌  Total failed         : ${totalFail}`)
  }
  console.log()
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
