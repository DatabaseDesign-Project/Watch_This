/*
  Warnings:

  - The values [audio,file] on the enum `MediaType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."MediaType_new" AS ENUM ('image', 'video');
ALTER TABLE "public"."medias" ALTER COLUMN "media_type" TYPE "public"."MediaType_new" USING ("media_type"::text::"public"."MediaType_new");
ALTER TYPE "public"."MediaType" RENAME TO "MediaType_old";
ALTER TYPE "public"."MediaType_new" RENAME TO "MediaType";
DROP TYPE "public"."MediaType_old";
COMMIT;

-- DropIndex
DROP INDEX "public"."users_nickname_key";
