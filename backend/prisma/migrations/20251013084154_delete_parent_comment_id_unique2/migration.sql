-- DropIndex
DROP INDEX "public"."comments_parent_comment_id_key";

-- CreateIndex
CREATE INDEX "comments_parent_comment_id_idx" ON "public"."comments"("parent_comment_id");
