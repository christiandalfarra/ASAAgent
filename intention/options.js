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
  agentData.options = [];
  await optionsGen();
  await optionsRevision();

  if (!agentData.options || agentData.options.length === 0) return;

  agentData.best_option = agentData.options.shift();
  //console.log(`Best option: ${agentData.best_option.type} at (${agentData.best_option.goal.x}, ${agentData.best_option.goal.y}) with utility ${agentData.best_option.utility}`);
  if (!agentData.best_option) return;

  await agentData.myIntentions.push(agentData.best_option);
}

// Populate the agentData.options array with possible options
export async function optionsGen() {
  agentData.options = [];
  await generatePickUps();

  if (
    agentData.currentIntention?.predicate.type !== "go_put_down" &&
    agentData.parcelsCarried.size > 0 &&
    (agentData.parcels.size === 0 || checkDelivery())
  ) {
    await generateDeliveries();
  }
  if (
    agentData.options.length === 0 &&
    agentData.myIntentions.intentions_queue.length === 0
  ) {
    await generateRandomWalk();
  }
}
async function generateRandomWalk() {
  mapData.updateTileValue(agentData.matePosition.x, agentData.matePosition.y, 0); // avoid to consider the mate position as walkable
  if (!mapData.spawningCoordinates || mapData.spawningCoordinates.length === 0)
    return;
  // check if there is a spawn point reachable
  const reachableSpawnPoints = mapData.spawningCoordinates.filter((spawn) => {
    const path = findAStar(mapData.utilityMap, agentData.pos, spawn);
    return path !== null;
  });
  // choose a random reachable spawn point or if there is none choose a random walkable tile
  if (reachableSpawnPoints.length > 0) {
    const target = reachableSpawnPoints[Math.floor(Math.random() * reachableSpawnPoints.length)];
    agentData.options.push({
      type: "go_to",
      goal: { x: target.x, y: target.y },
      utility: 0,
      parent: "random_walk",
    });
    return;
  }else{
    // if there is no reachable spawn point, choose a random walkable and reachable tile
    const reachableWalkable = mapData.walkableCoordinates.filter((tile) => {
      const path = findAStar(mapData.utilityMap, agentData.pos, tile);
      return path !== null;
    });
    if (reachableWalkable.length > 0) {
      const target = reachableWalkable[Math.floor(Math.random() * reachableWalkable.length)];
      agentData.options.push({
        type: "go_to",
        goal: { x: target.x, y: target.y },
        utility: 0,
        parent: "random_walk",
      });
      return;
    }else{
      // wait
      await new Promise((res) => setTimeout(res, envData.clock * 2));
    }
  }
}
async function generatePickUps() {
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
    Array.from(agentData.parcels.values()).filter((parcel) => {
      if (!parcel) return false;
      if (
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

  viableParcels.forEach((parcel) => {
    if (
      !agentData.options.some(
        (option) =>
          option.type == "go_pick_up" &&
          option.goal.x === parcel.x &&
          option.goal.y === parcel.y,
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
async function generateDeliveries() {
  const nearestDelivery = findNearestDelivery(agentData.pos);
  if (!nearestDelivery) return;

  if (!agentData.options.some((option) => option.type == "go_put_down")) {
    agentData.options.push({
      type: "go_put_down",
      goal: nearestDelivery,
      utility: 1000,
    });
  }
}
export async function optionsRevision() {
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
  agentData.parcelsCarried.values().forEach((parcel) => {
    let deliveryCoord = findNearestDelivery(agentData.pos);
    let distance = distanceAStar(agentData.pos, deliveryCoord);
    scoreAtDelivery += Math.round(
      parcel.reward - distance * envData.decade_frequency,
    );
  });
  return scoreAtDelivery > (envData.usePddl ? envData.parcel_reward_avg : 0);
}
