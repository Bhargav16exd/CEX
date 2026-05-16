import { WebSocket } from "node:http";
import type { EngineResponseType } from "../types/engine.js";
import { ENGINE_RESPONSE_QUEUE, subscriber } from "./engine-client.js";

interface PendingResponse {
  resolve: (response: EngineResponseType) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

const RESPONSE_CALLBACK_STORE = new Map<string,PendingResponse>();

export const registerResponseCallBack = (
    transactionId:string,
    engineTimeout:number
) : Promise<EngineResponseType> => {

	return new Promise((resolve,reject)=>{

		const timeout = setTimeout(()=>{
			RESPONSE_CALLBACK_STORE.delete(transactionId);
			reject(new Error("Engine response timed out"));
		},engineTimeout)

		RESPONSE_CALLBACK_STORE.set(
			transactionId,
			{
				resolve,
				reject,
				timeout
			}
		);
	})
}

export const listenEngineResponses = async ():Promise<void> => {
	for(;;){
		const response = await subscriber.brPop(ENGINE_RESPONSE_QUEUE,10);
		if(!response) continue

		try {
			const parsedResponse = JSON.parse(response.element) as EngineResponseType;	
			resolveEngineResponse(parsedResponse);
		} catch (error) {
			console.log(error)	
		}
	}
}

const resolveEngineResponse = (response: EngineResponseType) => {
	const unresolvedResponse = RESPONSE_CALLBACK_STORE.get(response.transactionId);
	if(!unresolvedResponse) return;

	clearTimeout(unresolvedResponse.timeout);
	RESPONSE_CALLBACK_STORE.delete(response.transactionId);
	unresolvedResponse.resolve(response);
}

export const listenIndexPrices = async () => {
	const ws = new WebSocket(
	"wss://dstream.binance.com/ws/solusd@indexPrice"
	);

	ws.onmessage = (event) => {
	const data = JSON.parse(event.data);
	console.log(data);
	console.log("PRICE:", data.p);
	};
} 
