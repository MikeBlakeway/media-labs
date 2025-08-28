-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "lane" TEXT NOT NULL DEFAULT 'VIDEO',
    "params" JSONB NOT NULL,
    "inputs" JSONB,
    "sampleRate" INTEGER,
    "channels" INTEGER,
    "processing" JSONB,
    "metadata" JSONB,
    "podId" TEXT,
    "progressPct" INTEGER,
    "outputKey" TEXT,
    "outputUrl" TEXT,
    "resultPaths" JSONB,
    "failureReason" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
