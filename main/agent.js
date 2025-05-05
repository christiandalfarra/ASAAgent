import { client } from "../config.js";
import { pickUpUtility, mapToMatrix, distanceAStar } from "./utils.js";
import { mapData, agentData } from "../belief/agentBelief.js";

client.onParcelsSensing((parcels) => {
  for (let parcel of parcels) {
    console.log("utility", pickUpUtility(parcel));
  }
});
