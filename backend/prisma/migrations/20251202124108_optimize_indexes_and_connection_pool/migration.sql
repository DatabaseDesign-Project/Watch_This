/*
  Warnings:

  - You are about to drop index `users_created_at_idx` on the `users` table. 
  - You are about to drop index `movies_release_date_idx` on the `movies` table.
  - You are about to drop index `comments_created_at_idx` on the `comments` table.
  - You are about to drop index `notifications_is_read_idx` on the `notifications` table.
  - You are about to drop index `notifications_created_at_idx` on the `notifications` table.
  - You are about to drop index `likes_created_at_idx` on the `likes` table.

*/

-- DropIndex (불필요한 인덱스 제거)
DROP INDEX IF EXISTS "users_created_at_idx";
DROP INDEX IF EXISTS "movies_release_date_idx";
DROP INDEX IF EXISTS "comments_created_at_idx";
DROP INDEX IF EXISTS "notifications_is_read_idx";
DROP INDEX IF EXISTS "notifications_created_at_idx";
DROP INDEX IF EXISTS "likes_created_at_idx";

-- CreateIndex (복합 인덱스 추가 - posts)
CREATE INDEX "posts_user_id_created_at_idx" ON "posts"("user_id", "created_at" DESC);
CREATE INDEX "posts_user_id_visibility_idx" ON "posts"("user_id", "visibility");
CREATE INDEX "posts_created_at_post_id_idx" ON "posts"("created_at" DESC, "post_id" DESC);

-- CreateIndex (복합 인덱스 추가 - notifications)
CREATE INDEX "notifications_reciver_id_is_read_created_at_idx" ON "notifications"("reciver_id", "is_read", "created_at" DESC);

-- CreateIndex (복합 인덱스 추가 - friends)
CREATE INDEX "friends_requester_id_status_idx" ON "friends"("requester_id", "status");
CREATE INDEX "friends_addressee_id_status_idx" ON "friends"("addressee_id", "status");
