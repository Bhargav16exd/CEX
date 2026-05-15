export interface PerpetualBalanceStoreType {
  [userId:string]:BalanceStoreUserEntity;
}

interface BalanceStoreUserEntity {
	balance:{
		[currencyType:string]:currencyType;
	},
	active_contracts:{
		[stockType: string]: contractType;
	}
}

interface currencyType {
  total:number;
  locked:number;
}

interface contractType {
    amount:number;
    collateral:number;
}






