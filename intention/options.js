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
  agentData.best_option = agentData.options.shift(); // find the best option
  await intentionReplace.push(agentData.best_option); // push the best option to intentionReplace
}

// Populate the agentData.options array with possible options
export function optionsGen() {
  let viableParcels = generatePickUps(); // generate pickup options
  if (mapData.utilityMap[agentData.pos.x][agentData.pos.y] !== 2 &&(
    (agentData.parcelsCarried.length > 0 &&
      viableParcels.length === 0 &&
      checkDelivery()) ||
    agentData.getPickedScore() > 1.5 * envData.parcel_reward_avg)
  ) {
    generateDeliveries(); // generate delivery options if carrying parcels or no viable pickups
  }
  if (agentData.options.length === 0) {
    generateRandomWalk(); // if no options available, generate a random walk
  }
}
function generateRandomWalk() {
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
function generatePickUps() {
  let viableParcels = agentData.parcels?.filter((parcel) => {
    if (parcel.carriedBy || mapData?.utilityMap[parcel?.x][parcel?.y] == 0)
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
      let utility = pickUpUtility(parcel);
      if (utility > 10) {
        agentData.options.push({
          type: "go_pick_up",
          goal: parcel,
          utility: pickUpUtility(parcel),
        });
      }
    }
  });
  return viableParcels; // return the viable parcels for further processing if needed
}
function generateDeliveries() {
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
