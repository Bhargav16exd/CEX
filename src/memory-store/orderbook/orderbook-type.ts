
export interface OrderbookStoreType {
    [stockName: string]: StockSpecificOrderbookStoreType
}

export interface StockSpecificOrderbookStoreType {
    ask:AskType,
    bid:BidType
}

interface AskType {
    [price :number]:TransactionEntityType
}

interface BidType {
    [price :number]:TransactionEntityType
}

interface TransactionEntityType {
    totalQuantity:number;
    remainingQuantity:number;
    orders:[{
        userId:string
        quantity:number
        filledQuantity:number
        orderId:string
        createdAt:Date
    }]
}