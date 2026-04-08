-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "AllocationRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceFileName" TEXT NOT NULL,
    "sourceSheetName" TEXT,
    "roomCount" INTEGER NOT NULL,
    "strategy" TEXT NOT NULL,
    "totalStudents" INTEGER NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "rosterFingerprint" TEXT NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "resultSnapshot" JSONB NOT NULL,
    "summary" JSONB NOT NULL,

    CONSTRAINT "AllocationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AllocationRun_createdAt_idx" ON "AllocationRun"("createdAt");

-- CreateIndex
CREATE INDEX "AllocationRun_strategy_idx" ON "AllocationRun"("strategy");
