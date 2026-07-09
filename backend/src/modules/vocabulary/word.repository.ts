import { PrismaClient, Prisma } from '@prisma/client'
import { WordFilters } from '../../shared/types'
import { CreateWordDto } from './dto/create-word.dto'
import { CreateExampleDto, UpdateWordDto } from './dto/update-word.dto'

const prisma = new PrismaClient()

const lessonSelect = {
  select: {
    id: true,
    lessonNumber: true,
    title: true,
    volume: {
      select: {
        id: true,
        volumeNumber: true,
        title: true,
        book: { select: { id: true, title: true } },
      },
    },
  },
}

const phrasesInclude = {
  orderBy: { order: 'asc' as const },
  include: { examples: { orderBy: { order: 'asc' as const } } },
}

export class WordRepository {
  async findAll(filters: WordFilters, userId?: string) {
    const {
      page = 1,
      limit = 20,
      chapter,
      unit,
      lessonId,
      volumeId,
      bookId,
      bookIds,
      status,
      mode,
      sort = 'chapter',
      order = 'asc',
      search,
    } = filters

    const skip = (page - 1) * limit

    const where: Prisma.WordWhereInput = {
      ...(chapter !== undefined && { chapter }),
      ...(unit !== undefined && { unit }),
      ...(lessonId !== undefined && { lessonId }),
      ...((volumeId !== undefined ||
        bookId !== undefined ||
        (bookIds !== undefined && bookIds.length > 0)) && {
        lesson: {
          ...(volumeId !== undefined && { volumeId }),
          ...(bookId !== undefined
            ? { volume: { bookId } }
            : bookIds !== undefined && bookIds.length > 0
              ? { volume: { bookId: { in: bookIds } } }
              : {}),
        },
      }),
      ...(search && {
        OR: [
          { eng: { contains: search, mode: 'insensitive' } },
          { per: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status !== undefined &&
        userId !== undefined &&
        mode !== undefined &&
        // The Words/Review pages filter by the MANUAL mark (manualStatus), which
        // is the separate free-review track — not the SM-2 program `status`.
        (status === 'NOT_READ'
          ? {
              // "نخوانده" = هیچ ردیف پیشرفتی با manualStatus برابر KNOWN/NOT_KNOWN وجود ندارد.
              // لغاتی که کاربر اصلاً با آن‌ها تعامل نداشته هیچ ردیف progress ندارند، پس یک
              // match ساده با `some` آن‌ها را از قلم می‌اندازد؛ به‌جای آن از حالت منفی استفاده می‌کنیم.
              NOT: {
                progress: {
                  some: {
                    userId,
                    reviewMode: mode,
                    manualStatus: { in: ['KNOWN', 'NOT_KNOWN'] },
                  },
                },
              },
            }
          : {
              progress: {
                some: {
                  userId,
                  reviewMode: mode,
                  manualStatus: status,
                },
              },
            })),
    }

    const orderBy: Prisma.WordOrderByWithRelationInput = {
      [sort]: order,
    }

    const [words, total] = await prisma.$transaction([
      prisma.word.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          examples: { orderBy: { order: 'asc' } },
          phrases: phrasesInclude,
          lesson: lessonSelect,
          progress:
            userId !== undefined && mode !== undefined
              ? {
                  where: { userId, reviewMode: mode },
                  select: { status: true, manualStatus: true, reviewMode: true },
                }
              : false,
          module: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.word.count({ where }),
    ])

    return { words, total, page, limit }
  }

  async findById(id: string) {
    return prisma.word.findUnique({
      where: { id },
      include: {
        examples: { orderBy: { order: 'asc' } },
        phrases: phrasesInclude,
        lesson: lessonSelect,
        module: { select: { id: true, name: true, slug: true } },
      },
    })
  }

  async create(data: CreateWordDto) {
    const { examples, phrases, ...wordData } = data

    return prisma.word.create({
      data: {
        ...wordData,
        ...(examples?.length
          ? {
              examples: {
                create: examples.map((ex) => ({
                  engSentence: ex.engSentence,
                  perTranslation: ex.perTranslation,
                  order: ex.order,
                })),
              },
            }
          : {}),
        ...(phrases?.length
          ? {
              phrases: {
                create: phrases.map((p) => ({
                  patternEng: p.patternEng,
                  patternPer: p.patternPer,
                  order: p.order,
                  ...(p.examples?.length
                    ? {
                        examples: {
                          create: p.examples.map((ex) => ({
                            engSentence: ex.engSentence,
                            perTranslation: ex.perTranslation,
                            order: ex.order,
                          })),
                        },
                      }
                    : {}),
                })),
              },
            }
          : {}),
      },
      include: {
        examples: { orderBy: { order: 'asc' } },
        phrases: phrasesInclude,
        lesson: lessonSelect,
        module: { select: { id: true, name: true, slug: true } },
      },
    })
  }

  async update(id: string, data: UpdateWordDto) {
    const { phrases, ...wordData } = data

    // Replace all phrases when provided
    if (phrases !== undefined) {
      await prisma.wordPhrase.deleteMany({ where: { wordId: id } })
    }

    return prisma.word.update({
      where: { id },
      data: {
        ...wordData,
        ...(phrases?.length
          ? {
              phrases: {
                create: phrases.map((p) => ({
                  patternEng: p.patternEng,
                  patternPer: p.patternPer,
                  order: p.order,
                  ...(p.examples?.length
                    ? {
                        examples: {
                          create: p.examples.map((ex) => ({
                            engSentence: ex.engSentence,
                            perTranslation: ex.perTranslation,
                            order: ex.order,
                          })),
                        },
                      }
                    : {}),
                })),
              },
            }
          : {}),
      },
      include: {
        examples: { orderBy: { order: 'asc' } },
        phrases: phrasesInclude,
        lesson: lessonSelect,
        module: { select: { id: true, name: true, slug: true } },
      },
    })
  }

  async delete(id: string) {
    return prisma.word.delete({ where: { id } })
  }

  async addExample(wordId: string, data: CreateExampleDto) {
    return prisma.wordExample.create({
      data: {
        wordId,
        engSentence: data.engSentence,
        perTranslation: data.perTranslation,
        order: data.order,
      },
    })
  }

  async updateExample(exampleId: string, data: Partial<CreateExampleDto>) {
    return prisma.wordExample.update({ where: { id: exampleId }, data })
  }

  async deleteExample(exampleId: string) {
    return prisma.wordExample.delete({ where: { id: exampleId } })
  }

  async findModules() {
    return prisma.learningModule.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, slug: true, description: true, order: true },
    })
  }
}
