export interface PerpetualOrderbookStoreType {
    [stockName: string]: StockSpecificOrderbookStoreType
}

export interface PerpetualOrderbookIndexStoreType {
    [stockName: string]: StockSpecificOrderbookIndexStoreType
}

interface StockSpecificOrderbookIndexStoreType {
    short:number[],
    long:number[]
}

interface StockSpecificOrderbookStoreType {
    short:ShortType,
    long:LongType
}

interface ShortType {
    [price :string]:TransactionEntityType
}

interface LongType {
    [price :string]:TransactionEntityType
}

interface TransactionEntityType {
    totalQuantity:number;
    remainingQuantity:number;
    orders:{
        userId:string
        quantity:number
        filledQuantity:number
        orderId:string
        createdAt:string
    }[]
}