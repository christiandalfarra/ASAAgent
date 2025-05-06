// Import agent belief state and map state
import { agentData, mapData } from "../belief/agentBelief.js";
// Import utility function to evaluate parcel pickup
import { findNearestDelivery, pickUpUtility } from "../main/utils.js";
import { intentionReplace } from "../main/agent.js";
import { distanceAStar, countCloseParcels } from "../main/utils.js";

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
    if (parcel.carriedBy == null && mapData.map[parcel.x][parcel.y] > 0) {
      agentData.options.push(["go_pick_up", parcel.x, parcel.y]);
    }
  }

  const pickedScore = agentData.getPickedScore();
  const adaptiveThreshold = computeAdaptiveThreshold();
  const scoreThreshold = mapData.parcel_reward_avg * adaptiveThreshold;

  console.log("DEBUG [options.js] Picked Score:", pickedScore);
  console.log("DEBUG [options.js] Adaptive Threshold:", adaptiveThreshold);
  console.log("DEBUG [options.js] Score Threshold:", scoreThreshold);

  if (pickedScore > scoreThreshold) {
    const nearestDelivery = findNearestDelivery(agentData.pos);
    if (nearestDelivery) {
      console.log(
        "DEBUG [options.js] Adding delivery option:",
        nearestDelivery
      );
      agentData.options.push([
        "go_put_down",
        nearestDelivery.x,
        nearestDelivery.y,
      ]);
      agentData.best_option = [
        "go_put_down",
        nearestDelivery.x,
        nearestDelivery.y,
      ];
    } else {
      console.log("DEBUG [options.js] No delivery point found");
    }
  }

  if (agentData.options.length == 0) {
    let randomX, randomY;
    do {
      randomX = Math.floor(Math.random() * mapData.width);
      randomY = Math.floor(Math.random() * mapData.height);
    } while (mapData.map[randomX][randomY] < 0);
    agentData.options.push(["go_to", randomX, randomY]);
  }

  console.log("DEBUG [options.js] Options generated:", agentData.options);
}

function findBestOption() {
  const best = agentData.options[0];
  console.log("DEBUG [options.js] Best option selected:", best);
  return agentData.options.shift();
}
function computeAdaptiveThreshold() {
  const base = 1;

  const deliveryDistance = distanceAStar(
    agentData.pos,
    findNearestDelivery(agentData.pos)
  );
  const parcelsNear = countCloseParcels(agentData.pos, 2);

  const decayFactor = mapData.decade_frequency || 0;
  const decayPenalty =
    decayFactor > 0 ? (deliveryDistance * decayFactor) / 10 : 0;

  // Strong bonus for proximity to delivery, reduced if parcels are nearby
  let deliveryProximityBonus = 0;
  if (deliveryDistance <= 4) {
    deliveryProximityBonus = -1.5;
  }

  // Adjust multiplier down to account for lower actual parcel value
  const conservativeFactor = 0.5; // Assume parcels yield 50% of map average

  const adaptiveMultiplier =
    base + deliveryDistance / 10 + decayPenalty + deliveryProximityBonus;

  return Math.max(1, adaptiveMultiplier * conservativeFactor);
}
