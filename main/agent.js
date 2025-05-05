// Import the Deliveroo client API
import { client } from "../config.js";

// Import utilities used for decision-making
import { pickUpUtility, mapToMatrix, distanceAStar } from "./utils.js";

// Import belief states
import { mapData, agentData } from "../belief/agentBelief.js";

// Listener that logs the utility of each sensed parcel
client.onParcelsSensing((parcels) => {
  for (let parcel of parcels) {
    console.log("utility", pickUpUtility(parcel));
  }
});
