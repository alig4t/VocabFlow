import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/api";
import { isNative } from "@/lib/platform";
import { subscriptionService } from "./subscription.service";
import type {
  StudyAnswer,
  StudyAnswerResult,
  StudyToday,
  SessionSummary,
  DailyStudyTotals,
  TodayNewWords,
  TodayHardWords,
} from "@/types";

const off = () => import("@/offline/repo");

/**
 * Daily study session data layer. Web → `/api/study`; native → offline SQLite.
 */
export const studyService = {
  getToday(): Promise<StudyToday> {
    if (isNative())
      return off().then(async (o) => {
        const data = await o.getStudyToday();
        const access = await subscriptionService.getSnapshot();
        // Home still needs queue counts/plans; locked content cannot receive words.
        return access.hasPremiumAccess ? data : { ...data, due: [], new: [] };
      });
    return api.get<StudyToday>(API_ENDPOINTS.study.today).then((r) => r.data);
  },

  /** Today's newly-introduced words, for the free practice reviewer. */
  getTodayNew(): Promise<TodayNewWords> {
    if (isNative())
      return subscriptionService
        .assertAccess()
        .then(() => off())
        .then((o) => o.getTodayNewWords());
    return api
      .get<TodayNewWords>(API_ENDPOINTS.study.todayNew)
      .then((r) => r.data);
  },

  /** Today's difficult words, unlocked after completing today's queue. */
  getTodayHard(): Promise<TodayHardWords> {
    if (isNative())
      return subscriptionService
        .assertAccess()
        .then(() => off())
        .then((o) => o.getTodayHardWords());
    return api
      .get<TodayHardWords>(API_ENDPOINTS.study.todayHard)
      .then((r) => r.data);
  },

  answer(wordId: string, answer: StudyAnswer): Promise<StudyAnswerResult> {
    if (isNative())
      return subscriptionService
        .assertAccess()
        .then(() => off())
        .then((o) => o.answerStudy(wordId, answer));
    return api
      .post<StudyAnswerResult>(API_ENDPOINTS.study.answer, { wordId, answer })
      .then((r) => r.data);
  },

  recordSession(
    summary: SessionSummary,
  ): Promise<{ id: string; today: DailyStudyTotals }> {
    if (isNative()) return off().then((o) => o.recordStudySession(summary));
    return api
      .post<{ id: string; today: DailyStudyTotals }>(
        API_ENDPOINTS.study.session,
        summary,
      )
      .then((r) => r.data);
  },
};
