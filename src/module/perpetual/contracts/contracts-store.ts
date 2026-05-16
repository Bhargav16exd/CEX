import type { ContractsStoreType } from "./contracts-types.js";

export const CONTRACT_STORE:ContractsStoreType = {
	"11":{
		"sol":{
			contract_quantity:0,
			avg_price:0,
			collateral:0,
			unrealizedPnL:0
		}
	},
	"12":{
		"sol":{
			contract_quantity:0,
			avg_price:0,
			collateral:0,
			unrealizedPnL:0
		}
	},
	"13":{
		"sol":{
			contract_quantity:0,
			avg_price:0,
			collateral:0,
			unrealizedPnL:0
		}
	},
	"14":{
		"sol":{
			contract_quantity:0,
			avg_price:0,
			collateral:0,
			unrealizedPnL:0
		}
	}
}

// ----- CONTRACTS VALUES READ ----

export const readBalanceStoreUserActiveContractQuantity = (userId:string, stockSymbol:string) => {
	//@ts-ignore
	return CONTRACT_STORE[userId][stockSymbol].contract_quantity
}
export const readBalanceStoreUserActiveContractAvgPrice = (userId:string, stockSymbol:string) => {
	//@ts-ignore
	return CONTRACT_STORE[userId][stockSymbol].avg_price
}
export const readBalanceStoreUserActiveContractCollateral = (userId:string, stockSymbol:string) => {
	//@ts-ignore
	return CONTRACT_STORE[userId][stockSymbol].collateral
}
export const readBalanceStoreUserActiveContractUnrealizedPnL = (userId:string, stockSymbol:string) => {
	//@ts-ignore
	return CONTRACT_STORE[userId][stockSymbol].unrealizedPnL
}

// ----- CONTRACTS VALUES READ ----

// ----- CONTRACTS VALUES UPDATE ----

export const updateBalanceStoreUserActiveContractQuantity = (userId:string, stockSymbol:string, value:number) => {
	//@ts-ignore
	CONTRACT_STORE[userId][stockSymbol].contract_quantity = value
}
export const updateBalanceStoreUserActiveContractAvgPrice = (userId:string, stockSymbol:string, value:number) => {
	//@ts-ignore
	CONTRACT_STORE[userId][stockSymbol].avg_price = value
}
export const updateBalanceStoreUserActiveContractCollateral = (userId:string, stockSymbol:string, value:number) => {
	//@ts-ignore
	CONTRACT_STORE[userId][stockSymbol].collateral = value
}
export const updateBalanceStoreUserActiveContractUnrealizedPnL = (userId:string, stockSymbol:string, value:number) => {
	//@ts-ignore
	CONTRACT_STORE[userId][stockSymbol].unrealizedPnL = value
}
// ----- CONTRACTS VALUES UPDATE ----