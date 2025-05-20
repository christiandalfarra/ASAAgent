// Import agent belief state and map state
import { agentData, mapData, envData } from "../belief/belief.js";
// Import utility function to evaluate parcel pickup
import {
  findNearestDelivery,
  distanceAStar,
  countCloseParcels,
  utilityDistanceAStar,
  pickUpUtility,
} from "../main/utils.js";
import { intentionReplace } from "../main/main.js";
import { DEBUG } from "../debug.js";

/**
 * Function that evaluates and fills agent options for picking parcels
 * Intended to be called in a loop to keep updating choices
 */
export async function optionsLoop() {
  //generateOptions(); // generate options based on current state
  optionsGen(); // generate options based on current state
  optionsRevision();
  agentData.best_option = findBestOption(); // find the best option
  await intentionReplace.push(agentData.best_option); // push the best option to intentionReplace
}

// Populate the agentData.options array with possible options
// option generation nuovo
function optionsGen() {
  let viableParcels = agentData.parcels.filter((parcel) => {
    if (parcel.carriedBy != null || mapData.utilityMap[parcel.x][parcel.y] == 0)
      return false;
    const distance = utilityDistanceAStar(agentData.pos, parcel);
    const rewardDrop = envData.decade_frequency * distance;
    return parcel.reward - Math.round(rewardDrop) > 0; // ignore parcel if it will decay too much before pickup
  });
  console.log("DEBUG [options.js] Viable parcels:", viableParcels);
  viableParcels.sort((a, b) => {
    const distA = utilityDistanceAStar(agentData.pos, a);
    const distB = utilityDistanceAStar(agentData.pos, b);
    const rewardA = a.reward - Math.round(envData.decade_frequency * distA);
    const rewardB = b.reward - Math.round(envData.decade_frequency * distB);
    return rewardB - rewardA; // sort by reward
  });
  viableParcels.forEach((parcel) => {
    if (
      !agentData.options.some(
        (option) =>
          option.type == "go_pick_up" &&
          option.goal.x === parcel.x &&
          option.goal.y === parcel.y
      )
    ) {
      agentData.options.push({
        type: "go_pick_up",
        goal: parcel,
        utility: pickUpUtility(parcel),
      });
    }
  });
  console.log("DEBUG [options.js] parcels: ", agentData.parcels);
  if (agentData.parcelsCarried.length > 0 && viableParcels.length === 0) {
    console.log(
      "DEBUG [options.js] picked score: ",
      agentData.getPickedScore()
    );
    let nearestDelivery = findNearestDelivery(agentData.pos);
    if (!agentData.options.some((option) => option.type == "go_put_down")) {
      agentData.options.push({
        type: "go_put_down",
        goal: nearestDelivery,
        utility:
          (envData.parcel_reward_avg + envData.parcel_reward_variance) * 2,
      });
      agentData.best_option = {
        type: "go_put_down",
        goal: nearestDelivery,
        utility:
          (envData.parcel_reward_avg + envData.parcel_reward_variance) * 2,
      };
    }
    return;
  }
  if (agentData.options.length === 0) {
    console.log("DEBUG [options.js] No options found, exploring spawn point.");
    const randomIndex = Math.floor(
      Math.random() * mapData.spawningCoordinates.length
    );
    const target = mapData.spawningCoordinates[randomIndex];
    agentData.options.push({
      type: "go_to",
      goal: { x: target.x, y: target.y },
      utility: 1,
    });
  }
  // print the options
  console.log("DEBUG [options.js] Options:", agentData.options);
}
// optioon generation vcchio
function generateOptions() {
  const viableParcels = agentData.parcels.filter((parcel) => {
    if (parcel.carriedBy != null || mapData.map[parcel.x][parcel.y] <= 0)
      return false;
    const distance = distanceAStar(agentData.pos, parcel);
    const rewardDrop =
      mapData.decade_frequency * distance * envData.movement_duration;
    return parcel.reward - rewardDrop > 1; // ignore parcel if it will decay too much before pickup
  });
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
export function optionsRevision() {
  // re evaluate the utility score and resort the options
  agentData.options.forEach((option) => {
    if (option.type === "go_pick_up") {
      option.utility = pickUpUtility(option.goal);
    }
  });
  agentData.options.sort((a, b) => {
    return b.utility - a.utility;
  });
}
function findBestOption() {
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
