/*
  Warnings:

  - A unique constraint covering the columns `[parent_comment_id]` on the table `comments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."comments" ADD COLUMN     "parent_comment_id" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "comments_parent_comment_id_key" ON "public"."comments"("parent_comment_id");

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
