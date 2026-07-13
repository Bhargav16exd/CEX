import { MarketType } from "@bhargav16exdd/cex";
import { handleQueueError, pushToQueue } from "./engine-client.js";

//perform health checks on supporting services and exit if any one them fails
export default async function runHealthChecks(){
  try {
    const queueResponseSpot = await pushToQueue("heart_beat", {}, MarketType.spot) as any
    handleQueueError(queueResponseSpot)
  
    const queueResponsePerp = await pushToQueue("heart_beat", {}, MarketType.perp) as any
    handleQueueError(queueResponsePerp)

    console.log(`[INIT-HEALTH-CHECK] Spot Engine Health : ${queueResponseSpot.data.health}`)
    console.log(`[INIT-HEALTH-CHECK] Perp Engine Health : ${queueResponsePerp.data.health}`)
  
  } catch (error: any) {
    if(error.message === "Engine response timed out"){
      console.log("Supporting Services Unreachable, Exiting ...");
      throw error
    } 
  }
}