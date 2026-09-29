CREATE TABLE IF NOT EXISTS "Category" (
  "id"        TEXT    NOT NULL,
  "slug"      TEXT    NOT NULL,
  "name"      TEXT    NOT NULL,
  "name_ar"   TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");

ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "categoryId"   TEXT,
  ADD COLUMN IF NOT EXISTS "scale"        TEXT,
  ADD COLUMN IF NOT EXISTS "leadTimeDays" INTEGER,
  ADD COLUMN IF NOT EXISTS "clientName"   TEXT,
  ALTER COLUMN "category" DROP NOT NULL;

WITH legacy AS (
  SELECT regexp_replace(lower(trim("category")), '[^a-z0-9]+', '-', 'g') AS slug,
         "category_ar",
         "createdAt"
  FROM "Project"
  WHERE "category" IS NOT NULL
)
INSERT INTO "Category" ("id", "slug", "name", "name_ar", "sortOrder")
SELECT gen_random_uuid()::text,
       slug,
       initcap(replace(slug, '-', ' ')),
       max("category_ar"),
       (row_number() OVER (ORDER BY min("createdAt")) - 1)::int
FROM legacy
GROUP BY slug
ON CONFLICT ("slug") DO NOTHING;

UPDATE "Project" p
SET "categoryId" = c."id"
FROM "Category" c
WHERE p."categoryId" IS NULL
  AND c."slug" = regexp_replace(lower(trim(p."category")), '[^a-z0-9]+', '-', 'g');

ALTER TABLE "ContactSubmission" ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]';

UPDATE "Project"
SET "title_ar"       = NULLIF("title_ar", ''),
    "description_ar" = NULLIF("description_ar", ''),
    "badge_ar"       = NULLIF("badge_ar", ''),
    "title_ru"       = NULLIF("title_ru", ''),
    "description_ru" = NULLIF("description_ru", ''),
    "badge_ru"       = NULLIF("badge_ru", '');
