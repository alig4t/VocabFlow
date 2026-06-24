import { PrismaClient, Prisma } from '@prisma/client'
import { WordFilters } from '../../shared/types'
import { CreateWordDto } from './dto/create-word.dto'
import { CreateExampleDto, UpdateWordDto } from './dto/update-word.dto'

const prisma = new PrismaClient()

export class WordRepository {
  async findAll(filters: WordFilters, userId?: string) {
    const {
      page = 1,
      limit = 20,
      chapter,
      unit,
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
      ...(search && {
        OR: [
          { eng: { contains: search, mode: 'insensitive' } },
          { per: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status !== undefined &&
        userId !== undefined &&
        mode !== undefined && {
          progress: {
            some: {
              userId,
              reviewMode: mode,
              status,
            },
          },
        }),
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
          examples: {
            orderBy: { order: 'asc' },
          },
          progress:
            userId !== undefined && mode !== undefined
              ? {
                  where: { userId, reviewMode: mode },
                  select: { status: true, reviewMode: true },
                }
              : false,
          module: {
            select: { id: true, name: true, slug: true },
          },
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
        examples: {
          orderBy: { order: 'asc' },
        },
        module: {
          select: { id: true, name: true, slug: true },
        },
      },
    })
  }

  async create(data: CreateWordDto) {
    const { examples, ...wordData } = data

    return prisma.word.create({
      data: {
        ...wordData,
        ...(examples && examples.length > 0
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
      },
      include: {
        examples: {
          orderBy: { order: 'asc' },
        },
        module: {
          select: { id: true, name: true, slug: true },
        },
      },
    })
  }

  async update(id: string, data: UpdateWordDto) {
    return prisma.word.update({
      where: { id },
      data,
      include: {
        examples: {
          orderBy: { order: 'asc' },
        },
        module: {
          select: { id: true, name: true, slug: true },
        },
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
    return prisma.wordExample.update({
      where: { id: exampleId },
      data,
    })
  }

  async deleteExample(exampleId: string) {
    return prisma.wordExample.delete({ where: { id: exampleId } })
  }

  async findModules() {
    return prisma.learningModule.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        order: true,
      },
    })
  }
}
