-- AlterTable
ALTER TABLE "Job" ADD COLUMN "error" TEXT;
ALTER TABLE "Job" ADD COLUMN "fps" INTEGER;
ALTER TABLE "Job" ADD COLUMN "frames" INTEGER;
ALTER TABLE "Job" ADD COLUMN "height" INTEGER;
ALTER TABLE "Job" ADD COLUMN "width" INTEGER;

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE INDEX "Job_updatedAt_idx" ON "Job"("updatedAt");

-- CreateIndex
CREATE INDEX "Job_status_createdAt_idx" ON "Job"("status", "createdAt");
