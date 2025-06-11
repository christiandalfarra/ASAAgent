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
import { intentionReplace } from "../main/agent.js";

/**
 * Function that evaluates and fills agent options for picking parcels
 * Intended to be called in a loop to keep updating choices
 */
export async function optionsLoop() {
  //generateOptions(); // generate options based on current state
  optionsGen(); // generate options based on current state
  optionsRevision();
  // print the options
  console.log("DEBUG [options.js] Options:", agentData.options);
  agentData.best_option = findBestOption(); // find the best option
  await intentionReplace.push(agentData.best_option); // push the best option to intentionReplace
}

// Populate the agentData.options array with possible options
// option generation nuovo
export function optionsGen() {
  let viableParcels = agentData.parcels?.filter((parcel) => {
    if (parcel.carriedBy || mapData.utilityMap[parcel.x][parcel.y] == 0)
      return false;
    const distance = utilityDistanceAStar(agentData.pos, parcel);
    const rewardDrop = envData.decade_frequency * distance;
    return parcel.reward - Math.round(rewardDrop) > 0; // ignore parcel if it will decay too much before pickup
  });
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
      agentData.options.filter((option) => {
        option.type !== "go_to";
      });
    }
  });
  if (
    agentData.getPickedScore() > envData.parcel_reward_avg * 0.75 ||
    (agentData.parcelsCarried.length > 0 &&
      viableParcels.length === 0 &&
      checkDelivery())
  ) {
    let nearestDelivery = findNearestDelivery(agentData.pos);
    if (!agentData.options.some((option) => option.type == "go_put_down")) {
      agentData.options.push({
        type: "go_put_down",
        goal: nearestDelivery,
        utility: 100,
      });
      agentData.best_option = {
        type: "go_put_down",
        goal: nearestDelivery,
        utility: 100,
      };
      agentData.options.filter((option) => {
        option.type !== "go_to";
      });
    }
    return;
  }
  if (agentData.options.length === 0) {
    const randomIndex = Math.floor(
      Math.random() * mapData.spawningCoordinates.length
    );
    const target = mapData.spawningCoordinates[randomIndex];
    agentData.options.push({
      type: "go_to",
      goal: { x: target.x, y: target.y },
      utility: 0,
    });
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
function checkDelivery() {
  let scoreAtDelivery = 0;
  agentData.parcelsCarried.forEach((parcel) => {
    let deliveryCoord = findNearestDelivery(agentData.pos);
    let distance = distanceAStar(agentData.pos, deliveryCoord);
    scoreAtDelivery += Math.round(
      parcel.reward - distance * envData.decade_frequency
    );
  });
  return scoreAtDelivery > 10;
}
