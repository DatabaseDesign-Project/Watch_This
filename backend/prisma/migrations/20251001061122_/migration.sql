-- CreateEnum
CREATE TYPE "public"."Visibility" AS ENUM ('public', 'friends', 'private');

-- CreateEnum
CREATE TYPE "public"."MediaType" AS ENUM ('image', 'video', 'audio', 'file');

-- CreateEnum
CREATE TYPE "public"."NotiType" AS ENUM ('friend_request', 'comment', 'like', 'system', 'custom');

-- CreateEnum
CREATE TYPE "public"."FriendStatus" AS ENUM ('pending', 'accepted');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "nickname" VARCHAR(20) NOT NULL,
    "profile_image" VARCHAR(2048),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movies" (
    "id" BIGSERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "original_title" VARCHAR(255) NOT NULL,
    "release_date" TIMESTAMP(3) NOT NULL,
    "director" VARCHAR(255) NOT NULL,
    "runtime_minutes" INTEGER NOT NULL,
    "poster_image" VARCHAR(2048),
    "is_series" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."genres" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."emojis" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "emoji_image" VARCHAR(2048) NOT NULL,

    CONSTRAINT "emojis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."posts" (
    "post_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "movie_id" BIGINT NOT NULL,
    "title" VARCHAR(150),
    "body" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "emojis_id" BIGINT,
    "visibility" "public"."Visibility" NOT NULL,
    "like_cnt" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("post_id")
);

-- CreateTable
CREATE TABLE "public"."comments" (
    "id" BIGSERIAL NOT NULL,
    "post_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."medias" (
    "id" BIGSERIAL NOT NULL,
    "post_id" BIGINT NOT NULL,
    "media_type" "public"."MediaType" NOT NULL,
    "file_path" VARCHAR(2048) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questions" (
    "id" BIGSERIAL NOT NULL,
    "content" VARCHAR(255) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" BIGSERIAL NOT NULL,
    "sender_id" BIGINT,
    "reciver_id" BIGINT NOT NULL,
    "type" "public"."NotiType" NOT NULL DEFAULT 'system',
    "message" VARCHAR(255),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ratings" (
    "user_id" BIGINT NOT NULL,
    "movie_id" BIGINT NOT NULL,
    "rating" DECIMAL(2,1) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("user_id","movie_id")
);

-- CreateTable
CREATE TABLE "public"."likes" (
    "user_id" BIGINT NOT NULL,
    "post_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("user_id","post_id")
);

-- CreateTable
CREATE TABLE "public"."friends" (
    "requester_id" BIGINT NOT NULL,
    "addressee_id" BIGINT NOT NULL,
    "status" "public"."FriendStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "friends_pkey" PRIMARY KEY ("requester_id","addressee_id")
);

-- CreateTable
CREATE TABLE "public"."movie_genres" (
    "movie_id" BIGINT NOT NULL,
    "genre_id" BIGINT NOT NULL,

    CONSTRAINT "movie_genres_pkey" PRIMARY KEY ("movie_id","genre_id")
);

-- CreateTable
CREATE TABLE "public"."answers" (
    "post_id" BIGINT NOT NULL,
    "question_id" BIGINT NOT NULL,
    "answer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("post_id","question_id")
);

-- CreateTable
CREATE TABLE "public"."question_medias" (
    "id" BIGSERIAL NOT NULL,
    "post_id" BIGINT NOT NULL,
    "question_id" BIGINT NOT NULL,
    "media_type" "public"."MediaType" NOT NULL,
    "file_path" VARCHAR(2048) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_medias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "public"."users"("nickname");

-- CreateIndex
CREATE INDEX "users_nickname_idx" ON "public"."users"("nickname");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "public"."users"("created_at");

-- CreateIndex
CREATE INDEX "movies_title_idx" ON "public"."movies"("title");

-- CreateIndex
CREATE INDEX "movies_release_date_idx" ON "public"."movies"("release_date");

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "public"."genres"("name");

-- CreateIndex
CREATE UNIQUE INDEX "emojis_name_key" ON "public"."emojis"("name");

-- CreateIndex
CREATE UNIQUE INDEX "emojis_emoji_image_key" ON "public"."emojis"("emoji_image");

-- CreateIndex
CREATE INDEX "posts_user_id_idx" ON "public"."posts"("user_id");

-- CreateIndex
CREATE INDEX "posts_movie_id_idx" ON "public"."posts"("movie_id");

-- CreateIndex
CREATE INDEX "posts_created_at_idx" ON "public"."posts"("created_at");

-- CreateIndex
CREATE INDEX "posts_visibility_idx" ON "public"."posts"("visibility");

-- CreateIndex
CREATE INDEX "comments_post_id_idx" ON "public"."comments"("post_id");

-- CreateIndex
CREATE INDEX "comments_user_id_idx" ON "public"."comments"("user_id");

-- CreateIndex
CREATE INDEX "comments_created_at_idx" ON "public"."comments"("created_at");

-- CreateIndex
CREATE INDEX "medias_post_id_idx" ON "public"."medias"("post_id");

-- CreateIndex
CREATE INDEX "medias_created_at_idx" ON "public"."medias"("created_at");

-- CreateIndex
CREATE INDEX "notifications_reciver_id_idx" ON "public"."notifications"("reciver_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "public"."notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "public"."notifications"("created_at");

-- CreateIndex
CREATE INDEX "ratings_movie_id_idx" ON "public"."ratings"("movie_id");

-- CreateIndex
CREATE INDEX "likes_post_id_idx" ON "public"."likes"("post_id");

-- CreateIndex
CREATE INDEX "likes_created_at_idx" ON "public"."likes"("created_at");

-- CreateIndex
CREATE INDEX "friends_status_idx" ON "public"."friends"("status");

-- CreateIndex
CREATE INDEX "question_medias_post_id_idx" ON "public"."question_medias"("post_id");

-- CreateIndex
CREATE INDEX "question_medias_question_id_idx" ON "public"."question_medias"("question_id");

-- AddForeignKey
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_emojis_id_fkey" FOREIGN KEY ("emojis_id") REFERENCES "public"."emojis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."medias" ADD CONSTRAINT "medias_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_reciver_id_fkey" FOREIGN KEY ("reciver_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ratings" ADD CONSTRAINT "ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ratings" ADD CONSTRAINT "ratings_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."likes" ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."likes" ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."friends" ADD CONSTRAINT "friends_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."friends" ADD CONSTRAINT "friends_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_genres" ADD CONSTRAINT "movie_genres_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_genres" ADD CONSTRAINT "movie_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."answers" ADD CONSTRAINT "answers_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."question_medias" ADD CONSTRAINT "question_medias_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("post_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."question_medias" ADD CONSTRAINT "question_medias_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
