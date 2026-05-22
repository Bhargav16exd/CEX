/*
  Warnings:

  - The primary key for the `Order` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Fill" DROP CONSTRAINT "Fill_makerOrderID_fkey";

-- DropForeignKey
ALTER TABLE "Fill" DROP CONSTRAINT "Fill_takerOrderID_fkey";

-- AlterTable
ALTER TABLE "Fill" ALTER COLUMN "makerOrderID" SET DATA TYPE TEXT,
ALTER COLUMN "takerOrderID" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Order" DROP CONSTRAINT "Order_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Order_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Order_id_seq";

-- AddForeignKey
ALTER TABLE "Fill" ADD CONSTRAINT "Fill_makerOrderID_fkey" FOREIGN KEY ("makerOrderID") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fill" ADD CONSTRAINT "Fill_takerOrderID_fkey" FOREIGN KEY ("takerOrderID") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
