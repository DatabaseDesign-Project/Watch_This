/*
  Warnings:

  - You are about to drop the `genres` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `movie_genres` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `genre1` to the `movies` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "movie_genres" DROP CONSTRAINT "movie_genres_genre_id_fkey";

-- DropForeignKey
ALTER TABLE "movie_genres" DROP CONSTRAINT "movie_genres_movie_id_fkey";

-- AlterTable: Add genre columns with temporary default, then remove default
ALTER TABLE "movies" ADD COLUMN "genre1" VARCHAR(50) NOT NULL DEFAULT '미분류';
ALTER TABLE "movies" ADD COLUMN "genre2" VARCHAR(50);
ALTER TABLE "movies" ADD COLUMN "genre3" VARCHAR(50);
ALTER TABLE "movies" ADD COLUMN "genre4" VARCHAR(50);
ALTER TABLE "movies" ADD COLUMN "genre5" VARCHAR(50);

-- Update existing movies with genres from movie_genres table
UPDATE "movies" m
SET 
    genre1 = COALESCE((SELECT g.name FROM "movie_genres" mg JOIN "genres" g ON mg.genre_id = g.id WHERE mg.movie_id = m.id ORDER BY g.name LIMIT 1 OFFSET 0), '미분류'),
    genre2 = (SELECT g.name FROM "movie_genres" mg JOIN "genres" g ON mg.genre_id = g.id WHERE mg.movie_id = m.id ORDER BY g.name LIMIT 1 OFFSET 1),
    genre3 = (SELECT g.name FROM "movie_genres" mg JOIN "genres" g ON mg.genre_id = g.id WHERE mg.movie_id = m.id ORDER BY g.name LIMIT 1 OFFSET 2),
    genre4 = (SELECT g.name FROM "movie_genres" mg JOIN "genres" g ON mg.genre_id = g.id WHERE mg.movie_id = m.id ORDER BY g.name LIMIT 1 OFFSET 3),
    genre5 = (SELECT g.name FROM "movie_genres" mg JOIN "genres" g ON mg.genre_id = g.id WHERE mg.movie_id = m.id ORDER BY g.name LIMIT 1 OFFSET 4);

-- Remove default constraint from genre1
ALTER TABLE "movies" ALTER COLUMN "genre1" DROP DEFAULT;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN "watch_date" TIMESTAMP(3);

-- DropTable
DROP TABLE "movie_genres";

-- DropTable
DROP TABLE "genres";
