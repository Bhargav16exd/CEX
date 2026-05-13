import { createClient } from "redis";
import type { EngineCommandType, EngineRequestType } from "../types/engine.js";
import { randomUUID } from "crypto";
import { registerResponseCallBack } from "./enginer-responses-orchestrator.js";
import { SERVER_INSTANCE_ID } from "../config.js";


const REDIS_URL = process.env.REDIS_URL || ""

const publisher = createClient({url:REDIS_URL}).on("error", (error)=>{
    console.log("ERORR WHILE CREATING REDIS PUBLISHER CLIENT");
})

export const subscriber = createClient({url:REDIS_URL}).on("error", (error)=>{
    console.log("ERORR WHILE CREATING REDIS SUBSCRIBER CLIENT");
})

export const connectRedis = async () => {
    await Promise.all([publisher.connect(),subscriber.connect()]);
}

export const pingRedis = async () => {
    return publisher.ping();
}

const ENGINE_REQUEST_QUEUE = `engine-request-queue`;
export const ENGINE_RESPONSE_QUEUE = `engine-response-queue-${SERVER_INSTANCE_ID}`;

export const pushToQueue = async (
    type : EngineCommandType,
    payload: Record<string,any>
) => {

    /*
     THE TRANSACTION ID HELPS TO UNIQUELY IDENTIY USER ORDER REQUEST 
    */
    const transactionId = randomUUID();

	//Register a callBack in the orchestrator to wait further
	const recieveResponseFromEngine = registerResponseCallBack(transactionId, 1000000);

	const message : EngineRequestType = {
		transactionId,
		responseQueue:ENGINE_RESPONSE_QUEUE,
		type,
		payload
	}

	//push to queue
	publisher.lPush(ENGINE_REQUEST_QUEUE, JSON.stringify(message));

	return recieveResponseFromEngine;
};


