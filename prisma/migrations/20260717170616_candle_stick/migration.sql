-- CreateTable
CREATE TABLE "CandleStick" (
    "id" TEXT NOT NULL,
    "open" INTEGER NOT NULL,
    "close" INTEGER NOT NULL,
    "high" INTEGER NOT NULL,
    "low" INTEGER NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandleStick_pkey" PRIMARY KEY ("id")
);
