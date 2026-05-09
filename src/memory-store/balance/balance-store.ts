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

export default BALANCE_STORE;