// Import agent belief state and map state
import { agentData, mapData } from "../belief/agentBelief";
// Import utility function to evaluate parcel pickup
import { pickUpUtility } from "../main/utils";

/**
 * Function that evaluates and fills agent options for picking parcels
 * Intended to be called in a loop to keep updating choices
 */
export async function optionsLoop() {
  var begin = new Date().getTime();
  agentData.options = []; // reset available options

  for (let parcel of agentData.parcels) {
    // Consider only parcels not carried and on a walkable tile
    if (parcel.carriedBy == null && mapData.map[parcel.x][parcel.y] > 0) {
      let utility = pickUpUtility(parcel);
      // utility is computed but not stored yet (likely incomplete)
    }
  }
}
