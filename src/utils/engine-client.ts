import { createClient } from "redis";
import { EngineType, type EngineCommandType, type EngineRequestType } from "../types/engine.js";
import { randomUUID } from "crypto";
import { registerResponseCallBack } from "./enginer-responses-orchestrator.js";
import { SERVER_INSTANCE_ID } from "../config.js";

const REDIS_URL = process.env.REDIS_URL || ""

const publisher = createClient({url:REDIS_URL}).on("error", (error)=>{
  console.log("ERORR WHILE CREATING REDIS PUBLISHER CLIENT");
})

export const spotSubscriber = createClient({url:REDIS_URL}).on("error", (error)=>{
  console.log("ERORR WHILE CREATING REDIS SUBSCRIBER CLIENT");
})

export const perpSubscriber = createClient({url:REDIS_URL}).on("error", (error)=>{
  console.log("ERORR WHILE CREATING REDIS SUBSCRIBER CLIENT");
})

export const connectRedis = async () => {
  await Promise.all([publisher.connect(),spotSubscriber.connect(), perpSubscriber.connect()]);
}

export const pingRedis = async () => {
  return publisher.ping();
}

const SPOT_ENGINE_REQUEST_QUEUE = `spot-engine-request-queue`;
export const SPOT_ENGINE_RESPONSE_QUEUE = `spot-engine-response-queue-${SERVER_INSTANCE_ID}`;

const PERP_ENGINE_REQUEST_QUEUE = `perp-engine-request-queue`;
export const PERP_ENGINE_RESPONSE_QUEUE = `perp-engine-response-queue-${SERVER_INSTANCE_ID}`;

export const pushToQueue = async (
  type : EngineCommandType,
  payload: Record<string,any>,
  engineType: EngineType
) => {

  /*
    THE TRANSACTION ID HELPS TO UNIQUELY IDENTIY USER ORDER REQUEST 
  */
  const transactionId = randomUUID();

  //Fetch Queue Based on Engine Type
  const ENGINE_REQUEST_QUEUE = fetchEngineRequestQueueType(engineType)!;
  const ENGINE_RESPONSE_QUEUE = fetchEngineResponseQueueType(engineType)!;

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


const fetchEngineRequestQueueType  = (type:EngineType) => {
  if(type == EngineType.SPOT){
    return SPOT_ENGINE_REQUEST_QUEUE
  }
  else if(type == EngineType.PERP){
    return PERP_ENGINE_REQUEST_QUEUE
  }
}

const fetchEngineResponseQueueType  = (type:EngineType) => {
  if(type == EngineType.SPOT){
    return SPOT_ENGINE_RESPONSE_QUEUE
  }
  else if(type == EngineType.PERP){
    return PERP_ENGINE_RESPONSE_QUEUE
  }
}

