-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Presentation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "prompt" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'modern',
    "primaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "secondaryColor" TEXT NOT NULL DEFAULT '#1e40af',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
    "backgroundStyle" TEXT NOT NULL DEFAULT 'gradient',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Presentation" ("createdAt", "description", "id", "prompt", "title", "updatedAt") SELECT "createdAt", "description", "id", "prompt", "title", "updatedAt" FROM "Presentation";
DROP TABLE "Presentation";
ALTER TABLE "new_Presentation" RENAME TO "Presentation";
CREATE TABLE "new_Slide" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "slideType" TEXT NOT NULL,
    "layout" TEXT NOT NULL DEFAULT 'TEXT_ONLY',
    "order" INTEGER NOT NULL,
    "presentationId" TEXT NOT NULL,
    "backgroundColor" TEXT,
    "backgroundImage" TEXT,
    "imageUrl" TEXT,
    "imagePrompt" TEXT,
    "imagePosition" TEXT NOT NULL DEFAULT 'RIGHT',
    "textAlign" TEXT NOT NULL DEFAULT 'LEFT',
    "customStyles" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Slide_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Slide" ("content", "createdAt", "id", "order", "presentationId", "slideType", "title", "updatedAt") SELECT "content", "createdAt", "id", "order", "presentationId", "slideType", "title", "updatedAt" FROM "Slide";
DROP TABLE "Slide";
ALTER TABLE "new_Slide" RENAME TO "Slide";
CREATE UNIQUE INDEX "Slide_presentationId_order_key" ON "Slide"("presentationId", "order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
