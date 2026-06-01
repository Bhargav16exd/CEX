import { initRedis, pingRedis } from "./engine-client.js";
import { listenPerpEngineResponses, listenSpotEngineResponses } from "./enginer-responses-orchestrator.js";
import { pingMinIO } from "./minio-client.js";

export const initSupportingServices = () => {
  initRedis();

  pingRedis().then(()=>{
    console.log("Redis Connected")
  });

  pingMinIO();

  listenSpotEngineResponses();
  listenPerpEngineResponses();
}