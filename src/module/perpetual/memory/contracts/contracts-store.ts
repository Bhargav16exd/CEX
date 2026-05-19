import type { ContractsStoreType } from "./contracts-types.js";

export const CONTRACT_STORE:ContractsStoreType = {
	"11":{
		"sol":{
			contract_quantity:0,
			avg_price:0,
			collateral:0,
			unrealizedPnL:0,
			counterPartId:[]
		}
	},
	"12":{
		"sol":{
			contract_quantity:0,
			avg_price:0,
			collateral:0,
			unrealizedPnL:0,
			counterPartId:[]
		}
	},
	"13":{
		"sol":{
			contract_quantity:0,
			avg_price:0,
			collateral:0,
			unrealizedPnL:0,
			counterPartId:[]
		}
	},
	"14":{
		"sol":{
			contract_quantity:0,
			avg_price:0,
			collateral:0,
			unrealizedPnL:0,
			counterPartId:[]
		}
	}
}

// ----- CONTRACTS VALUES READ ----

export const readContractStoreUserContractQuantity = (userId:string, stockSymbol:string) => {
	//@ts-ignore
	return CONTRACT_STORE[userId][stockSymbol].contract_quantity
}
export const readContractStoreUserContractAvgPrice = (userId:string, stockSymbol:string) => {
	//@ts-ignore
	return CONTRACT_STORE[userId][stockSymbol].avg_price
}
export const readContractStoreUserContractCollateral = (userId:string, stockSymbol:string) => {
	//@ts-ignore
	return CONTRACT_STORE[userId][stockSymbol].collateral
}
export const readContractStoreUserContractUnrealizedPnL = (userId:string, stockSymbol:string) => {
	//@ts-ignore
	return CONTRACT_STORE[userId][stockSymbol].unrealizedPnL
}
export const readContractStoreUserContractCounterPartId = (userId:string, stockSymbol:string) => {
	//@ts-ignore
	return CONTRACT_STORE[userId][stockSymbol].counterPartId
}

// ----- CONTRACTS VALUES READ ----

// ----- CONTRACTS VALUES UPDATE ----

export const updateContractStoreUserContractQuantity = (userId:string, stockSymbol:string, value:number) => {
	//@ts-ignore
	CONTRACT_STORE[userId][stockSymbol].contract_quantity = value
}
export const updateContractStoreUserContractAvgPrice = (userId:string, stockSymbol:string, value:number) => {
	//@ts-ignore
	CONTRACT_STORE[userId][stockSymbol].avg_price = value
}
export const updateContractStoreUserContractCollateral = (userId:string, stockSymbol:string, value:number) => {
	//@ts-ignore
	CONTRACT_STORE[userId][stockSymbol].collateral = value
}
export const updateContractStoreUserContractUnrealizedPnL = (userId:string, stockSymbol:string, value:number) => {
	//@ts-ignore
	CONTRACT_STORE[userId][stockSymbol].unrealizedPnL = value
}
export const updateContractStoreUserContractCounterPartId = (userId:string, stockSymbol:string, value:string) => {
  //@ts-ignore
  if(!CONTRACT_STORE[userId][stockSymbol].counterPartId.includes(value)){
    //@ts-ignore
    CONTRACT_STORE[userId][stockSymbol].counterPartId.push(value)
  }
}
export const removeUserIdFromCounterPartId = (userId:string, stockSymbol:string, value:string) => {	
	//@ts-ignore
	//@ts-ignore
	CONTRACT_STORE[userId][stockSymbol].counterPartId = CONTRACT_STORE[userId][stockSymbol]?.counterPartId?.filter(
			(id: string) => id !== value
		);
}

// ----- CONTRACTS VALUES UPDATE ----