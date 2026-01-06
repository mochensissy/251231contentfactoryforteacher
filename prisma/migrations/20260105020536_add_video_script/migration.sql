/*
  Warnings:

  - Added the required column `raw_articles` to the `insight_reports` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "video_scripts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "videoType" TEXT NOT NULL,
    "duration" INTEGER,
    "topic" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "storyboard" TEXT,
    "coverTitle" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_insight_reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "task_id" INTEGER NOT NULL,
    "top_likes_articles" TEXT NOT NULL,
    "top_engagement_articles" TEXT NOT NULL,
    "word_cloud" TEXT NOT NULL,
    "insights" TEXT NOT NULL,
    "raw_articles" TEXT NOT NULL,
    "article_summaries" TEXT,
    "enhanced_insights" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "insight_reports_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "analysis_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_insight_reports" ("created_at", "id", "insights", "task_id", "top_engagement_articles", "top_likes_articles", "word_cloud") SELECT "created_at", "id", "insights", "task_id", "top_engagement_articles", "top_likes_articles", "word_cloud" FROM "insight_reports";
DROP TABLE "insight_reports";
ALTER TABLE "new_insight_reports" RENAME TO "insight_reports";
CREATE UNIQUE INDEX "insight_reports_task_id_key" ON "insight_reports"("task_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
