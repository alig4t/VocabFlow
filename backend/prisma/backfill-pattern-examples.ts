/**
 * One-off backfill: some already-imported words have ZERO examples anywhere
 * (no primaryExample, no WordExample rows, and every WordPhrase has zero
 * WordPhraseExample rows) but DO have a phrase pattern (patternEng/patternPer)
 * sitting unused. Set that pattern as the word's primaryExample so the app
 * shows something instead of "no examples".
 *
 * Only touches words with primaryExample === null (import-all.ts guarantees
 * that implies zero top-level WordExample rows too — see importWord()) whose
 * every phrase also has zero nested examples. Words that already have any
 * example anywhere (including phrase-level) are left untouched.
 *
 * Run: npm run db:backfill-pattern-examples
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const candidates = await prisma.word.findMany({
    where: { primaryExample: null },
    select: {
      id: true,
      eng: true,
      phrases: {
        orderBy: { order: 'asc' },
        select: {
          patternEng: true,
          patternPer: true,
          examples: { select: { id: true }, take: 1 },
        },
      },
    },
  })

  const toFix = candidates.filter(
    (w) => w.phrases.length > 0 && w.phrases.every((p) => p.examples.length === 0),
  )

  console.log(`📋  ${candidates.length} words with no top-level example, ${toFix.length} have zero examples anywhere and a usable phrase pattern.`)

  let updated = 0
  for (const w of toFix) {
    const phrase = w.phrases[0]
    await prisma.word.update({
      where: { id: w.id },
      data: {
        primaryExample: phrase.patternEng,
        primaryExampleTrs: phrase.patternPer || null,
      },
    })
    updated++
  }

  console.log(`✅  Backfilled primaryExample from phrase pattern for ${updated} words.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
