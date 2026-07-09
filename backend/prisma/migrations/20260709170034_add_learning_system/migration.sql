-- CreateEnum
CREATE TYPE "CardOrder" AS ENUM ('SEQUENTIAL', 'RANDOM');

-- AlterTable
ALTER TABLE "user_word_progress" ADD COLUMN     "correct_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
ADD COLUMN     "interval_days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "introduced_at" TIMESTAMP(3),
ADD COLUMN     "last_reviewed_at" TIMESTAMP(3),
ADD COLUMN     "next_review_at" TIMESTAMP(3),
ADD COLUMN     "repetitions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wrong_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "learning_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "volume_id" TEXT NOT NULL,
    "daily_new_words" INTEGER NOT NULL DEFAULT 10,
    "daily_goal" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "duration_sec" INTEGER NOT NULL DEFAULT 0,
    "reviewed_count" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,
    "hard_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "new_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" TEXT NOT NULL,
    "study_direction" "ReviewMode" NOT NULL DEFAULT 'EN_TO_FA',
    "auto_play_audio" BOOLEAN NOT NULL DEFAULT true,
    "show_phonetics" BOOLEAN NOT NULL DEFAULT true,
    "show_examples" BOOLEAN NOT NULL DEFAULT true,
    "card_order" "CardOrder" NOT NULL DEFAULT 'SEQUENTIAL',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "learning_plans_user_id_idx" ON "learning_plans"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "learning_plans_user_id_volume_id_key" ON "learning_plans"("user_id", "volume_id");

-- CreateIndex
CREATE INDEX "study_sessions_user_id_started_at_idx" ON "study_sessions"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "user_word_progress_user_id_review_mode_next_review_at_idx" ON "user_word_progress"("user_id", "review_mode", "next_review_at");

-- AddForeignKey
ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_volume_id_fkey" FOREIGN KEY ("volume_id") REFERENCES "volumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
