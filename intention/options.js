// Import agent belief state and map state
import { agentData, mapData, envData } from "../belief/belief.js";
// Import utility function to evaluate parcel pickup
import {
  findNearestDelivery,
  distanceAStar,
  countCloseParcels,
  utilityDistanceAStar,
  pickUpUtility,
  findAStar,
} from "../main/utils.js";

/**
 * Function that evaluates and fills agent options for picking parcels
 * Intended to be called in a loop to keep updating choices
 */
export async function optionsLoop() {
  // Evita crash se la mappa non è pronta
  if (!mapData.map || mapData.map.length === 0) return;

  optionsGen();
  optionsRevision();

  if (!agentData.options || agentData.options.length === 0) return;

  agentData.best_option = agentData.options.shift();
  //console.log(`Best option: ${agentData.best_option.type} at (${agentData.best_option.goal.x}, ${agentData.best_option.goal.y}) with utility ${agentData.best_option.utility}`);
  if (!agentData.best_option) return;

  await agentData.myIntentions.push(agentData.best_option);
}

// Populate the agentData.options array with possible options
export function optionsGen() {
  agentData.options = [];
  let viableParcels = generatePickUps();

  if (
    agentData.currentIntention?.predicate.type !== "go_put_down" &&
    (agentData.parcelsCarried.length > 0 &&
      (viableParcels.length === 0 ||
      checkDelivery()))
    ) {
    generateDeliveries();
  }
  if (
    agentData.options.length === 0 &&
    agentData.myIntentions.intentions_queue.length === 0
  ) {
    generateRandomWalk();
  }
}
function generateRandomWalk() {
  if (!mapData.spawningCoordinates || mapData.spawningCoordinates.length === 0)
    return;
  const randomIndex = Math.floor(
    Math.random() * mapData.spawningCoordinates.length
  );
  const target = mapData.spawningCoordinates[randomIndex];
  // if the target is not reachable, return
  if (mapData.utilityMap[target.x][target.y] === 0) return;
  if (agentData.mateId !== agentData.id) {
    mapData.updateTileValue(
      agentData.matePosition.x,
      agentData.matePosition.y,
      0
    );
    if (findAStar(mapData.utilityMap, agentData.pos, target) === null) return;
    mapData.updateTileValue(
      agentData.matePosition.x,
      agentData.matePosition.y,
      mapData.map[agentData.matePosition.x][agentData.matePosition.y].type
    );
  }
  // add the random
  agentData.options.push({
    type: "go_to",
    goal: { x: target.x, y: target.y },
    utility: 0,
  });
}
function generatePickUps() {
  const delivering =
    agentData.currentIntention?.predicate.type === "go_put_down";

  const canPickWhileDelivering = (() => {
    if (!delivering) {
      return () => true;
    }
    const deliveryGoal =
      agentData.currentIntention?.predicate.goal ??
      findNearestDelivery(agentData.pos);
    if (!deliveryGoal) {
      return () => true;
    }
    const deliveryDistance = utilityDistanceAStar(agentData.pos, deliveryGoal);
    if (deliveryDistance == null) {
      return () => true;
    }

    return (parcel, distanceToParcel) => {
      if (distanceToParcel == null) return false;
      const parcelToDelivery = utilityDistanceAStar(parcel, deliveryGoal);
      if (parcelToDelivery == null) return false;

      const routeWithPickup = distanceToParcel + parcelToDelivery;
      const detour = Math.max(routeWithPickup - deliveryDistance, 0);
      if (detour === 0) return true;

      const carriedCount = Math.max(agentData.parcelsCarried.length, 1);
      const delayCost = detour * envData.decade_frequency * carriedCount;
      const parcelNetReward =
        parcel.reward - envData.decade_frequency * routeWithPickup;
      return parcelNetReward > delayCost;
    };
  })();

  let viableParcels =
    agentData.parcels?.filter((parcel) => {
      if (!parcel) return false;
      if (
        parcel.carriedBy ||
        mapData?.utilityMap?.[parcel?.x]?.[parcel?.y] == 0
      )
        return false;
      const distance = utilityDistanceAStar(agentData.pos, parcel);
      if (distance == null) return false;
      if (delivering && !canPickWhileDelivering(parcel, distance)) {
        return false;
      }
      const rewardDrop = envData.decade_frequency * distance;
      return parcel.reward - Math.round(rewardDrop) > 0;
    }) ?? [];

/*   viableParcels.sort((a, b) => {
    const distA = utilityDistanceAStar(agentData.pos, a) ?? Infinity;
    const distB = utilityDistanceAStar(agentData.pos, b) ?? Infinity;
    const rewardA = a.reward - Math.round(envData.decade_frequency * distA);
    const rewardB = b.reward - Math.round(envData.decade_frequency * distB);
    return rewardB - rewardA;
  }); */

  viableParcels.forEach((parcel) => {
    if (
      !agentData.options.some(
        (option) =>
          option.type == "go_pick_up" &&
          option.goal.x === parcel.x &&
          option.goal.y === parcel.y
      )
    ) {
      const utility = pickUpUtility(parcel);
      if (utility > 20) {
        agentData.options.push({
          type: "go_pick_up",
          goal: parcel,
          utility,
        });
      }
    }
  });
  return viableParcels;
}
function generateDeliveries() {
  const nearestDelivery = findNearestDelivery(agentData.pos);
  if (!nearestDelivery) return;

  if (!agentData.options.some((option) => option.type == "go_put_down")) {
    agentData.options.push({
      type: "go_put_down",
      goal: nearestDelivery,
      utility: 1000,
    });
    agentData.best_option = {
      type: "go_put_down",
      goal: nearestDelivery,
      utility: 1000,
    };
  }
}
export function optionsRevision() {
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
  return scoreAtDelivery > 1.5 * envData.parcel_reward_avg;
}
