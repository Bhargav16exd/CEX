import { EnvironmentType } from "@bhargav16exdd/cex";
import { initRedis, pingRedis } from "./engine-client.js";
import { listenPerpEngineResponses, listenSpotEngineResponses } from "./enginer-responses-orchestrator.js";
import { initAdminUser, initMigrations } from "./init-services.js";
import { pingMinIO } from "./minio-client.js";

export const initSupportingServices = () => {

  //IF DEV ENV THEN RUN MIGRATIONS
  if(process.env.DEV === EnvironmentType.DEV){
    initMigrations();
  }

  initRedis();
  initAdminUser();
  
  pingRedis().then(()=>{
    console.log("Redis Connected")
  });

  pingMinIO();

  listenSpotEngineResponses();
  listenPerpEngineResponses();
}