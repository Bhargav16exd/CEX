import { EnvironmentType } from "@bhargav16exdd/cex";
import { initRedis, pingRedis } from "./engine-client.js";
import { listenPerpEngineResponses, listenSpotEngineResponses } from "./enginer-responses-orchestrator.js";
import { initAdminUser, initAskBotUser, initBidBotUser, initMarketListed, initMigrations, initSeederUser } from "./init-services.js";
import { pingMinIO } from "./minio-client.js";
import runHealthChecks from "./health-check-services.js";

export const initSupportingServices = async () => {

  //redis checks
  await initRedis();

  pingRedis().then(()=>{
    console.log("Redis Connected")
  });

  pingMinIO();

  //listen engines
  listenSpotEngineResponses();
  listenPerpEngineResponses();

  //perform health checks on supporting services 
  await runHealthChecks();

  //IF DEV ENV THEN RUN MIGRATIONS
  if(process.env.DEV === EnvironmentType.DEV){
    initMigrations();
  }  

  await initMarketListed();
  await initAdminUser();
  await initSeederUser();
  await initAskBotUser();
  await initBidBotUser();
}