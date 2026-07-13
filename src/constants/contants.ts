import nconf from "nconf"
nconf.file({ file : './config.json'})

//MINIO CONSTANTS 
export const BUCKET_NAME = nconf.get("bucket_name");

//DEFAULT USER BALANCE
export const DEFAULT_USER_BALANCE = nconf.get("user_balances:default_user:balance") ?? 1000
export const DEFAULT_USER_STOCKS = nconf.get("user_balances:default_user:stocks") ?? 10

//ADMIN USER BALANCES
export const ADMIN_USER_BALANCE = nconf.get("user_balances:admin_user:balance") ?? 100000
export const ADMIN_USER_STOCKS = nconf.get("user_balances:admin_user:stocks") ?? 1000

//STOCKS IN MARKETS
export const SPOT_MARKET_STOCKS : Array<Record<string, string>> = nconf.get("markets:spot") ?? [{}]
export const PERP_MARKET_STOCKS : Array<Record<string, string>> = nconf.get("markets:perp") ?? [{}]