-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_video_scripts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "videoType" TEXT NOT NULL,
    "duration" INTEGER,
    "topic" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "storyboard" TEXT,
    "coverTitle" TEXT,
    "source_article_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "video_scripts_source_article_id_fkey" FOREIGN KEY ("source_article_id") REFERENCES "articles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_video_scripts" ("content", "coverTitle", "created_at", "duration", "id", "platform", "storyboard", "title", "topic", "updated_at", "videoType") SELECT "content", "coverTitle", "created_at", "duration", "id", "platform", "storyboard", "title", "topic", "updated_at", "videoType" FROM "video_scripts";
DROP TABLE "video_scripts";
ALTER TABLE "new_video_scripts" RENAME TO "video_scripts";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
