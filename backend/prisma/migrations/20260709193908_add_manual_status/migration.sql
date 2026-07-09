-- AlterTable
ALTER TABLE "user_word_progress" ADD COLUMN     "manual_status" "WordStatus" NOT NULL DEFAULT 'NOT_READ';

-- Backfill: manual marks were previously stored in `status` (before the SM-2
-- program was introduced), so carry them into the new manual track.
UPDATE "user_word_progress" SET "manual_status" = "status";
