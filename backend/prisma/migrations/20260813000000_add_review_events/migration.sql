-- CreateEnum
CREATE TYPE "ReviewAnswer" AS ENUM ('EASY', 'HARD', 'AGAIN');

-- CreateTable
CREATE TABLE "review_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "review_mode" "ReviewMode" NOT NULL,
    "answer" "ReviewAnswer" NOT NULL,
    "repetitions" INTEGER NOT NULL,
    "interval_days" INTEGER NOT NULL,
    "ease_factor" DOUBLE PRECISION NOT NULL,
    "is_first" BOOLEAN NOT NULL DEFAULT false,
    "is_lapse" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_events_user_id_review_mode_reviewed_at_idx" ON "review_events"("user_id", "review_mode", "reviewed_at");

-- CreateIndex
CREATE INDEX "review_events_user_id_word_id_review_mode_idx" ON "review_events"("user_id", "word_id", "review_mode");

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;
