// Import agent belief state and map state
import { agentData, mapData } from "../belief/agentBelief.js";
// Import utility function to evaluate parcel pickup
import { findNearestDelivery, pickUpUtility } from "../main/utils.js";
import { intentionReplace } from "../main/agent.js";

/**
 * Function that evaluates and fills agent options for picking parcels
 * Intended to be called in a loop to keep updating choices
 */
export async function optionsLoop() {
  var begin = new Date().getTime();
  agentData.options = []; // reset available options
  generateOptions(); // generate options based on current state
  let best_option = findBestOption(); // find the best option
  await intentionReplace.push(best_option); // push the best option to intentionReplace
}
//populate the agentData.options array with possible options
function generateOptions() {
  for (let parcel of agentData.parcels) {
    // Consider only parcels not carried and on a walkable tile
    if (parcel.carriedBy == null && mapData.map[parcel.x][parcel.y] > 0) {
      //let utility = pickUpUtility(parcel);
      // utility is computed but not stored yet (likely incomplete)
      agentData.options.push(['go_pick_up', parcel.x, parcel.y]);
    }
  }
  let threshold = 2;
  if (agentData.getPickedScore() > mapData.parcel_reward_avg * threshold) {
    let nearestDelivery = findNearestDelivery()
    agentData.best_option = ['go_put_down', nearestDelivery.x, nearestDelivery.y]
  }
  if (agentData.options.length == 0) {
    let randomX, randomY
    do {
       randomX= Math.floor(Math.random() * mapData.width);
       randomY= Math.floor(Math.random() * mapData.height);
    } while (mapData.map[randomX][randomY] < 0);
    if (mapData.map[randomX][randomY] > 0) {
      agentData.options.push(['go_to', randomX, randomY]);
    }
  }
  console.log("Option generated: ", agentData.options);
  // Generate options based on agent's current state and environment
  // This function should be implemented to create options for the agent
  // For now, it returns an empty array as a placeholder
}
function findBestOption() {
  // Find the best option based on the generated options
  // This function should be implemented to evaluate and select the best option
  // For now, it returns an empty array as a placeholder
  return agentData.options[0];
}

