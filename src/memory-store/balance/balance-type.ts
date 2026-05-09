
export interface BalanceStoreType {
  [userId:string]:BalanceStoreUserEntity;
}

export interface BalanceStoreUserEntity {
	balance:{
		[currencyType:string]:currencyType;
	},
	stock:{
		[stockHold: string]:number;
	}
}

export interface currencyType {
  total:number;
  locked:number;
}

