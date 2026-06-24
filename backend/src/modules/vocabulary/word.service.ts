import { WordFilters } from '../../shared/types'
import { NotFoundError } from '../../shared/errors'
import { CreateWordDto } from './dto/create-word.dto'
import { CreateExampleDto, UpdateWordDto } from './dto/update-word.dto'
import { WordRepository } from './word.repository'

export class WordService {
  constructor(private readonly wordRepository: WordRepository) {}

  async getWords(filters: WordFilters, userId?: string) {
    return this.wordRepository.findAll(filters, userId)
  }

  async getWord(id: string) {
    const word = await this.wordRepository.findById(id)
    if (!word) {
      throw new NotFoundError('Word')
    }
    return word
  }

  async createWord(dto: CreateWordDto) {
    return this.wordRepository.create(dto)
  }

  async updateWord(id: string, dto: UpdateWordDto) {
    const existing = await this.wordRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Word')
    }
    return this.wordRepository.update(id, dto)
  }

  async deleteWord(id: string) {
    const existing = await this.wordRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Word')
    }
    return this.wordRepository.delete(id)
  }

  async addExample(wordId: string, dto: CreateExampleDto) {
    const word = await this.wordRepository.findById(wordId)
    if (!word) {
      throw new NotFoundError('Word')
    }
    return this.wordRepository.addExample(wordId, dto)
  }

  async updateExample(exampleId: string, dto: Partial<CreateExampleDto>) {
    return this.wordRepository.updateExample(exampleId, dto)
  }

  async deleteExample(exampleId: string) {
    return this.wordRepository.deleteExample(exampleId)
  }

  async getModules() {
    return this.wordRepository.findModules()
  }
}
