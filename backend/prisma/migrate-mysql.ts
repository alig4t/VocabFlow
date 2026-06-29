/**
 * One-time migration from old MySQL (4000 Essential Words) dump to new PostgreSQL schema.
 * Run: npm run db:migrate-mysql
 *
 * Creates: Book → 5 Volumes (one per chapter) → Lessons (one per unit) → Words
 * Safe to re-run for book/volume/lesson creation (uses upsert).
 * Words are inserted fresh — run only once, or clear the words table first.
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// ── Parser ────────────────────────────────────────────────────────────────────

function parseMySQLRow(line: string): string[] | null {
  const start = line.indexOf('(')
  const end = line.lastIndexOf(')')
  if (start === -1 || end === -1) return null

  const content = line.slice(start + 1, end)
  const values: string[] = []
  let i = 0

  while (i < content.length) {
    while (i < content.length && content[i] === ' ') i++
    if (i >= content.length) break

    if (content[i] === "'") {
      i++ // skip opening quote
      let s = ''
      while (i < content.length) {
        if (content[i] === '\\' && i + 1 < content.length) {
          const next = content[i + 1]
          if (next === "'") s += "'"
          else if (next === 'r') { /* strip \r */ }
          else if (next === 'n') s += '\n'
          else if (next === '\\') s += '\\'
          else s += next
          i += 2
        } else if (content[i] === "'" && content[i + 1] === "'") {
          s += "'"
          i += 2
        } else if (content[i] === "'") {
          i++
          break
        } else {
          s += content[i++]
        }
      }
      values.push(s.trim())
    } else if (content.substring(i, i + 4) === 'NULL') {
      values.push('')
      i += 4
    } else {
      let s = ''
      while (i < content.length && content[i] !== ',' && content[i] !== ' ') {
        s += content[i++]
      }
      values.push(s)
    }

    while (i < content.length && (content[i] === ',' || content[i] === ' ')) i++
  }

  return values
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const sqlPath = path.resolve(__dirname, '../../words-new.sql')
  if (!fs.existsSync(sqlPath)) {
    console.error('❌  SQL file not found at:', sqlPath)
    process.exit(1)
  }

  // ── Parse SQL ──────────────────────────────────────────────────────────────
  console.log('📖  Parsing SQL file...')
  const lines = fs.readFileSync(sqlPath, 'utf-8').split('\n')

  interface Row {
    eng: string; per: string; chapter: number; unit: number
    description: string; example: string; exampleTrs: string
  }

  const rows: Row[] = []
  let inInsert = false

  for (const line of lines) {
    const t = line.trim()
    if (t.startsWith('INSERT INTO `words`')) { inInsert = true; continue }
    if (!inInsert) continue
    if (!t.startsWith('(')) { if (t === '' || t.startsWith('--') || t.startsWith('/*')) inInsert = false; continue }

    const v = parseMySQLRow(t)
    // columns: id, eng, per, chapter, unit, test_tik, fa_test_tik, description, example, example_trs, created_at, updated_at
    if (!v || v.length < 10) continue
    const [, eng, per, chapter, unit, , , description, example, exampleTrs] = v
    if (eng && per) {
      rows.push({
        eng, per,
        chapter: Number(chapter), unit: Number(unit),
        description: description || '',
        example: example || '',
        exampleTrs: exampleTrs || '',
      })
    }
  }

  console.log(`✅  Parsed ${rows.length} words`)

  // ── Learning module ────────────────────────────────────────────────────────
  const module = await prisma.learningModule.upsert({
    where: { slug: 'vocabulary' },
    update: {},
    create: {
      name: '4000 Essential English Words',
      slug: 'vocabulary',
      description: 'Core vocabulary for English learners',
      isActive: true,
      order: 1,
    },
  })

  // ── Book ──────────────────────────────────────────────────────────────────
  let book = await prisma.book.findFirst({ where: { title: '4000 Essential English Words' } })
  if (!book) {
    book = await prisma.book.create({
      data: {
        title: '4000 Essential English Words',
        description: 'A series of 5 books covering 4000 essential English vocabulary words.',
      },
    })
  }
  console.log(`📚  Book: "${book.title}" (${book.id})`)

  // ── Volumes (one per chapter 1–5) ─────────────────────────────────────────
  const chapters = [...new Set(rows.map(r => r.chapter))].sort((a, b) => a - b)
  const volumeMap = new Map<number, string>()

  for (const chap of chapters) {
    const vol = await prisma.volume.upsert({
      where: { bookId_volumeNumber: { bookId: book.id, volumeNumber: chap } },
      update: {},
      create: { bookId: book.id, volumeNumber: chap, title: `Book ${chap}` },
    })
    volumeMap.set(chap, vol.id)
  }
  console.log(`📖  Volumes created: ${chapters.join(', ')}`)

  // ── Lessons (one per chapter+unit) ────────────────────────────────────────
  const lessonKeys = [...new Set(rows.map(r => `${r.chapter}-${r.unit}`))].sort()
  const lessonMap = new Map<string, string>()

  for (const key of lessonKeys) {
    const [chap, unit] = key.split('-').map(Number)
    const volumeId = volumeMap.get(chap)!
    const lesson = await prisma.lesson.upsert({
      where: { volumeId_lessonNumber: { volumeId, lessonNumber: unit } },
      update: {},
      create: { volumeId, lessonNumber: unit },
    })
    lessonMap.set(key, lesson.id)
  }
  console.log(`📝  Lessons created: ${lessonMap.size}`)

  // ── Words ─────────────────────────────────────────────────────────────────
  console.log(`\n⏳  Importing ${rows.length} words...`)
  let ok = 0, fail = 0
  const BATCH = 50

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (w) => {
        const lessonId = lessonMap.get(`${w.chapter}-${w.unit}`)!
        try {
          await prisma.word.create({
            data: {
              eng: w.eng,
              per: w.per,
              chapter: w.chapter,
              unit: w.unit,
              description: w.description,
              primaryExample: w.example,
              primaryExampleTrs: w.exampleTrs || undefined,
              lessonId,
              moduleId: module.id,
            },
          })
          ok++
        } catch (e) {
          fail++
          console.error(`  ✗ "${w.eng}" ch${w.chapter}/unit${w.unit}: ${(e as Error).message}`)
        }
      }),
    )

    const pct = Math.round(((i + batch.length) / rows.length) * 100)
    process.stdout.write(`\r  ${i + batch.length}/${rows.length} (${pct}%)`)
  }

  console.log(`\n\n✅  Done. Imported: ${ok}  Failed: ${fail}`)
  console.log(`\n💡  Book structure:`)
  for (const chap of chapters) {
    const lessons = rows.filter(r => r.chapter === chap)
    const units = [...new Set(lessons.map(r => r.unit))].length
    console.log(`   Book ${chap}: ${units} lessons, ${lessons.length} words`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
