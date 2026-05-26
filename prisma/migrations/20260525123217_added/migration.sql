-- CreateTable
CREATE TABLE "Contracts" (
    "id" TEXT NOT NULL,
    "contract_quantity" INTEGER NOT NULL,
    "avg_price" INTEGER NOT NULL,
    "collateral" INTEGER NOT NULL,
    "realizedProfit" INTEGER NOT NULL,
    "realizedLoss" INTEGER NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "Contracts_pkey" PRIMARY KEY ("id")
);
