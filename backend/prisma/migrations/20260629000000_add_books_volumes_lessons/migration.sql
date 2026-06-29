-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cover_image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volumes" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "volume_number" INTEGER NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "volume_id" TEXT NOT NULL,
    "lesson_number" INTEGER NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add lesson_id and pronunciation_audio to words
ALTER TABLE "words" ADD COLUMN "lesson_id" TEXT;
ALTER TABLE "words" ADD COLUMN "pronunciation_audio" TEXT;

-- CreateUniqueIndex
CREATE UNIQUE INDEX "volumes_book_id_volume_number_key" ON "volumes"("book_id", "volume_number");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "lessons_volume_id_lesson_number_key" ON "lessons"("volume_id", "lesson_number");

-- CreateIndex
CREATE INDEX "words_lesson_id_idx" ON "words"("lesson_id");

-- AddForeignKey
ALTER TABLE "volumes" ADD CONSTRAINT "volumes_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_volume_id_fkey" FOREIGN KEY ("volume_id") REFERENCES "volumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "words" ADD CONSTRAINT "words_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
