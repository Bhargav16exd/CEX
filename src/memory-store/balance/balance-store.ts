import type { BalanceStoreType } from "./balance-type.js";

const BALANCE_STORE:BalanceStoreType = {};

interface User {
    username: string;
    password: string;
    balance: number;
    id: number;
}

export const initUserInBalanceStore = (user:User) => {  
    BALANCE_STORE[user.id] = {
        balance:{
            "inr":{
                total:user.balance,
                locked:0,
            },
            
        },
        stock:{
            "sol":{
                total:20,
                locked:0
            }
        }
    }
}

//@ts-ignore
export const putBackupInBalanceStore = (data) => {
    // clear existing keys
    Object.keys(BALANCE_STORE).forEach(key => {
        delete BALANCE_STORE[key]
    })

    Object.assign(BALANCE_STORE, data)
}



export const updateBalanceStoreUserTotalBalance = (userId:string, value:number) => {
    //@ts-ignore
    BALANCE_STORE[userId].balance["inr"].total = value
}

export const updateBalanceStoreUserLockedBalance = () => {
    
}

// ----- STOCK READ ----
export const readBalanceStoreUserTotalStocks = (userId:string, stockSymbol:string) => {
    return BALANCE_STORE[userId]?.stock[stockSymbol]?.total
}
export const readBalanceStoreUserLockedStocks = (userId:string, stockSymbol:string) => {
    return BALANCE_STORE[userId]?.stock[stockSymbol]?.locked
}
// ----- STOCK READ ----

// ----- STOCK UPDATE ----
export const updateBalanceStoreUserTotalStocks = (userId:string, stockSymbol:string, value:number) => {
    //@ts-ignore
    BALANCE_STORE[userId].stock[stockSymbol].total = value
}

export const updateBalanceStoreUserLockedStocks = (userId:string, stockSymbol:string, value:number) => {
    //@ts-ignore
    BALANCE_STORE[userId].stock[stockSymbol].locked = value;
}
// ----- STOCK UPDATE ----

export default BALANCE_STORE;