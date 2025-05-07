// Import agent belief state and map state
import { agentData, mapData, envData } from "../belief/belief.js";
// Import utility function to evaluate parcel pickup
import {
  findNearestDelivery,
  pickUpUtility,
  distanceAStar,
  countCloseParcels,
} from "../main/utils.js";
import { intentionReplace } from "../main/main.js";
import { DEBUG } from "../debug.js";

/**
 * Function that evaluates and fills agent options for picking parcels
 * Intended to be called in a loop to keep updating choices
 */
export async function optionsLoop() {
  agentData.options = []; // reset available options
  generateOptions(); // generate options based on current state
  console.log("DEBUG [options.js] Options generated:", agentData.options);
  let best_option = findBestOption(); // find the best option
  await intentionReplace.push(best_option); // push the best option to intentionReplace
}

// Populate the agentData.options array with possible options
function generateOptions() {
  const viableParcels = agentData.parcels.filter((parcel) => {
    if (parcel.carriedBy != null || mapData.map[parcel.x][parcel.y] <= 0)
      return false;
    const distance = distanceAStar(agentData.pos, parcel);
    const rewardDrop = mapData.decade_frequency * distance;
    return parcel.reward - rewardDrop > 1; // ignore parcel if it will decay too much before pickup
  });
  console.log("DEBUG [options.js] Viable parcels:", viableParcels);

  for (let parcel of viableParcels) {
    if (DEBUG.optionScoring) {
      console.log(
        "DEBUG [options.js] Scoring parcel:",
        parcel.id,
        "| Reward:",
        parcel.reward,
        "| Pos:",
        parcel.x,
        parcel.y
      );
    }
    agentData.options.push(["go_pick_up", parcel.x, parcel.y]);
  }

  const nearestParcel =
    viableParcels.length > 0
      ? viableParcels.reduce((a, b) => {
          const distA = distanceAStar(agentData.pos, a);
          const distB = distanceAStar(agentData.pos, b);
          return distA < distB ? a : b;
        })
      : null;

  const deliveryDistance = distanceAStar(
    agentData.pos,
    findNearestDelivery(agentData.pos)
  );
  const nearestParcelDistance = nearestParcel
    ? distanceAStar(agentData.pos, nearestParcel)
    : Infinity;

  const pickedScore = agentData.getPickedScore();
  const adaptiveThreshold = computeAdaptiveThreshold();
  const scoreThreshold = envData.parcel_reward_avg * adaptiveThreshold;

  if (DEBUG.deliveryCheck) {
    console.log("DEBUG [options.js] Picked Score:", pickedScore);
    console.log("DEBUG [options.js] Adaptive Threshold:", adaptiveThreshold);
    console.log("DEBUG [options.js] Score Threshold:", scoreThreshold);
  }

  const shouldDeliver =
    agentData.parcelsCarried.length > 0 &&
    (pickedScore > scoreThreshold || deliveryDistance < nearestParcelDistance);

  if (shouldDeliver) {
    const nearestDelivery = findNearestDelivery(agentData.pos);
    if (nearestDelivery) {
      if (DEBUG.deliveryCheck) {
        console.log(
          "DEBUG [options.js] Adding delivery option:",
          nearestDelivery
        );
      }
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
    } else if (DEBUG.deliveryCheck) {
      console.log("DEBUG [options.js] No delivery point found");
    }
  }

  if (
    agentData.options.length === 0 &&
    mapData.spawningCoordinates.length > 0
  ) {
    const randomIndex = Math.floor(
      Math.random() * mapData.spawningCoordinates.length
    );
    const target = mapData.spawningCoordinates[randomIndex];
    if (DEBUG.explorationFallback) {
      console.log("DEBUG [options.js] Exploring spawn point:", target);
    }
    agentData.options.push(["go_pick_up", target.x, target.y]);
  }

  if (agentData.options.length === 0) {
    let randomX, randomY;
    do {
      randomX = Math.floor(Math.random() * mapData.width);
      randomY = Math.floor(Math.random() * mapData.height);
    } while (mapData.map[randomX][randomY] < 0);
    if (DEBUG.explorationFallback) {
      console.log(
        "DEBUG [options.js] Fallback: random exploration:",
        randomX,
        randomY
      );
    }
    agentData.options.push(["go_to", randomX, randomY]);
  }

  if (DEBUG.rankedList) {
    console.log("DEBUG [options.js] Options generated:", agentData.options);
  }
}

function findBestOption() {
  const best = agentData.options[0];
  if (DEBUG.rankedList) {
    console.log("DEBUG [options.js] Best option selected:", best);
  }
  return agentData.options.shift();
}

function computeAdaptiveThreshold() {
  const base = 1;
  const deliveryDistance = distanceAStar(
    agentData.pos,
    findNearestDelivery(agentData.pos)
  );
  const parcelsNear = countCloseParcels(agentData.pos, 2);

  const decayFactor = envData.decade_frequency || 0;
  const decayPenalty =
    decayFactor > 0 ? (deliveryDistance * decayFactor) / 10 : 0;

  let deliveryProximityBonus = 0;
  if (deliveryDistance <= 4) {
    deliveryProximityBonus = -1.5 + parcelsNear * 0.4;
  }

  const conservativeFactor = 0.5;

  const adaptiveMultiplier =
    base + deliveryDistance / 10 + decayPenalty + deliveryProximityBonus;

  return Math.max(1, adaptiveMultiplier * conservativeFactor);
}
