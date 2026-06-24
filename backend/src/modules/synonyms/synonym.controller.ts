import { Request, Response } from 'express'
import { SynonymService } from './synonym.service'

const synonymService = new SynonymService()

export async function getSynonyms(
  req: Request,
  res: Response,
): Promise<void> {
  const { wordId } = req.params

  const synonyms = await synonymService.getSynonyms(wordId)

  res.json({ success: true, data: synonyms })
}
