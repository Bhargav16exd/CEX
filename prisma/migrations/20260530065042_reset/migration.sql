/*
  Warnings:

  - Added the required column `symbol` to the `Fill` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Fill_market_idx";

-- AlterTable
ALTER TABLE "Fill" ADD COLUMN     "symbol" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Fill_market_idx" ON "Fill"("symbol");
