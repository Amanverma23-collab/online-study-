-- AlterTable: add batch column to Test (existing rows default to NDA)
ALTER TABLE "Test" ADD COLUMN "batch" TEXT NOT NULL DEFAULT 'NDA';

-- AlterTable: add batch column to LiveClass (existing rows default to NDA)
ALTER TABLE "LiveClass" ADD COLUMN "batch" TEXT NOT NULL DEFAULT 'NDA';

-- AlterTable: add batch column to RecordedClass (existing rows default to NDA)
ALTER TABLE "RecordedClass" ADD COLUMN "batch" TEXT NOT NULL DEFAULT 'NDA';
