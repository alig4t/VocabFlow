import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import { isNative } from '@/lib/platform'
import type {
  StudyAnswer,
  StudyAnswerResult,
  StudyToday,
  SessionSummary,
  TodayNewWords,
} from '@/types'

const off = () => import('@/offline/repo')

/**
 * Daily study session data layer. Web → `/api/study`; native → offline SQLite.
 */
export const studyService = {
  getToday(): Promise<StudyToday> {
    if (isNative()) return off().then((o) => o.getStudyToday())
    return api.get<StudyToday>(API_ENDPOINTS.study.today).then((r) => r.data)
  },

  /** Today's newly-introduced words, for the free practice reviewer. */
  getTodayNew(): Promise<TodayNewWords> {
    if (isNative()) return off().then((o) => o.getTodayNewWords())
    return api.get<TodayNewWords>(API_ENDPOINTS.study.todayNew).then((r) => r.data)
  },

  answer(wordId: string, answer: StudyAnswer): Promise<StudyAnswerResult> {
    if (isNative()) return off().then((o) => o.answerStudy(wordId, answer))
    return api
      .post<StudyAnswerResult>(API_ENDPOINTS.study.answer, { wordId, answer })
      .then((r) => r.data)
  },

  recordSession(summary: SessionSummary): Promise<{ id: string }> {
    if (isNative()) return off().then((o) => o.recordStudySession(summary))
    return api.post<{ id: string }>(API_ENDPOINTS.study.session, summary).then((r) => r.data)
  },
}
