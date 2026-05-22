-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "imageurl" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "side" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "filledQuantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "stockId" INTEGER NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fill" (
    "id" SERIAL NOT NULL,
    "makerID" TEXT NOT NULL,
    "takerID" TEXT NOT NULL,
    "makerOrderID" INTEGER NOT NULL,
    "takerOrderID" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "market" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_stockId_idx" ON "Order"("stockId");

-- CreateIndex
CREATE INDEX "Fill_makerOrderID_idx" ON "Fill"("makerOrderID");

-- CreateIndex
CREATE INDEX "Fill_takerOrderID_idx" ON "Fill"("takerOrderID");

-- CreateIndex
CREATE INDEX "Fill_market_idx" ON "Fill"("market");

-- CreateIndex
CREATE INDEX "Fill_createdAt_idx" ON "Fill"("createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fill" ADD CONSTRAINT "Fill_makerOrderID_fkey" FOREIGN KEY ("makerOrderID") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fill" ADD CONSTRAINT "Fill_takerOrderID_fkey" FOREIGN KEY ("takerOrderID") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
