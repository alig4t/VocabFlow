-- Add new columns to words
ALTER TABLE "words" ADD COLUMN "pronunciation"   TEXT;
ALTER TABLE "words" ADD COLUMN "part_of_speech"  TEXT;
ALTER TABLE "words" ADD COLUMN "word_forms"      TEXT;
ALTER TABLE "words" ADD COLUMN "synonyms"        TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "words" ADD COLUMN "antonyms"        TEXT[] NOT NULL DEFAULT '{}';

-- Word phrases (collocations / patterns)
CREATE TABLE "word_phrases" (
    "id"          TEXT         NOT NULL,
    "word_id"     TEXT         NOT NULL,
    "pattern_eng" TEXT         NOT NULL,
    "pattern_per" TEXT         NOT NULL,
    "order"       INTEGER      NOT NULL DEFAULT 0,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "word_phrases_pkey" PRIMARY KEY ("id")
);

-- Examples for each phrase pattern
CREATE TABLE "word_phrase_examples" (
    "id"             TEXT    NOT NULL,
    "phrase_id"      TEXT    NOT NULL,
    "eng_sentence"   TEXT    NOT NULL,
    "per_translation" TEXT   NOT NULL,
    "order"          INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "word_phrase_examples_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "word_phrases_word_id_idx"          ON "word_phrases"("word_id");
CREATE INDEX "word_phrase_examples_phrase_id_idx" ON "word_phrase_examples"("phrase_id");

ALTER TABLE "word_phrases"
    ADD CONSTRAINT "word_phrases_word_id_fkey"
    FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "word_phrase_examples"
    ADD CONSTRAINT "word_phrase_examples_phrase_id_fkey"
    FOREIGN KEY ("phrase_id") REFERENCES "word_phrases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
