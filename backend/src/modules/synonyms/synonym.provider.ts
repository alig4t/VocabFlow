export interface SynonymResult {
  word: string
  similarity: number
  source: string
}

export interface SynonymProvider {
  getSynonyms(word: string, meaning: string): Promise<SynonymResult[]>
  readonly name: string
}
