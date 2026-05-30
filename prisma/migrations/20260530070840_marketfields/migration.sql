/*
  Warnings:

  - You are about to drop the column `stockSymbol` on the `Order` table. All the data in the column will be lost.
  - Added the required column `market` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `symbol` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "stockSymbol",
ADD COLUMN     "market" TEXT NOT NULL,
ADD COLUMN     "symbol" TEXT NOT NULL;
