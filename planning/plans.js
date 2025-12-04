import { agentData, mapData } from "../belief/belief.js";
import {
  findNearestDelivery,
  findNearestFrom,
  findAStar,
} from "../main/utils.js";
import { Intention } from "../intention/intention.js";
import { client } from "../conf.js";
import { askPickUp, askMove } from "../coordination/coordination.js";

//import { PddlProblem, onlineSolver } from "@unitn-asa/pddl-client";

// Read the domain file for the PDDL planner
//let domain = await readFile("./planners/domain.pddl");

/**
 * Plan class
 */
class Plan {
  // This is used to stop the plan
  #stopped = false;
  #parent;
  #sub_intentions = []; // sub intentions of this plan

  constructor(parent) {
    this.#parent = parent;
  }
  stop() {
    this.#stopped = true;
    this.#stopped = true;
    for (const i of this.#sub_intentions) {
      i.stop();
    }
  }
  log(...args) {
    if (this.#parent && this.#parent.log) this.#parent.log("\t", ...args);
    else console.log(...args);
  }

  async subIntention(predicate) {
    const sub_intention = new Intention(this, predicate);
    this.#sub_intentions.push(sub_intention);
    return sub_intention.achieve();
  }
  get stopped() {
    return this.#stopped;
  }
}
class GoTo extends Plan {
  static isApplicableTo(type) {
    return type === "go_to";
  }

  async execute(predicate) {
    if (this.stopped) throw ["stopped"];

    let goal = predicate.goal;
    const maxMoveRetries = 3;
    const atGoal = () =>
      agentData.pos.x === goal.x && agentData.pos.y === goal.y;
    if (atGoal()) {
      return true;
    }

    let path = findAStar(mapData.utilityMap, agentData.pos, goal);
    if (!path || path.length === 0) {
      return false;
    }
    let moveRetries = 0;

    while (!atGoal()) {
      if (this.stopped) throw ["stopped"];

      if (!path || path.length === 0) {
        path = findAStar(mapData.utilityMap, agentData.pos, goal);
        if (!path || path.length === 0) {
          return false;
        }
      }

      const nextMove = path[0];
      if (!nextMove) {
        path.shift();
        continue;
      }

      const success = await client.emitMove(nextMove.action);
      if (!success) {
        console.log("[plans.js] Move failed", nextMove.action);
        moveRetries += 1;
        const blockedX = nextMove.x;
        const blockedY = nextMove.y;
        const blockedByEnemy = agentData.enemies.some(
          (enemy) => enemy.x === blockedX && enemy.y === blockedY
        );
        const blockedByMate =
          agentData.mateId !== agentData.id &&
          agentData.matePosition?.x === blockedX &&
          agentData.matePosition?.y === blockedY;
        if (blockedByEnemy) {
          console.log("[plans.js] Enemy blocking at", blockedX, blockedY);
          if (
            agentData.currentIntention?.predicate?.type === "go_put_down" &&
            agentData.currentIntention.predicate.goal.x === blockedX &&
            agentData.currentIntention.predicate.goal.y === blockedY
          ) {
            console.log("[plans.js] Enemy blocking at delivery point, trying new delivery point...");
            // if an enemy is blocking me at the delivery point, try to find a new delivery point
            const newGoal = checkNewDelivery(goal);
            if (newGoal) {
              console.log(
                `[plans.js] Switching delivery goal to (${newGoal.x}, ${newGoal.y})`
              );
              goal = predicate.goal = newGoal;
            }
          } else {
            mapData.updateTileValue(blockedX, blockedY, 0);
          }
        } else if (blockedByMate) {
          console.log("[plans.js] Mate blocking at", blockedX, blockedY);
          if (agentData.currentIntention?.predicate?.type === "go_put_down") {
            //blocked xy are coorrd of the positon tha the deliverer cant reach
            // so is the position of the other mate
            console.log(
              "[plans.js] Mate blocking at delivery point, waiting...",
              blockedX,
              blockedY
            );
            // try to communicate an exchange intention
            const exchangePredicate = {
              type: "exchange",
              goal: { x: blockedX, y: blockedY },
              utility: 10000,
            };
            console.log("[plans.js] Pushing exchange intention to mate", exchangePredicate);
            //agentData.currentIntention.stop();
            await new Promise((res) => setTimeout(res, 200));
            await agentData.myIntentions.push(exchangePredicate);
            return false;
          }
        }
        if (moveRetries < maxMoveRetries) {
          continue;
        }
        path = findAStar(mapData.utilityMap, agentData.pos, goal);
        moveRetries = 0;
        if (path && path.length > 0) {
          continue;
        }
        if (path.length === 0) {
          await new Promise((res) => setTimeout(res, envConfig.clock));
        }
      }
      path.shift();
      moveRetries = 0;
    }
    return true;
  }
}
function checkNewDelivery(goal) {
  return findNearestFrom(
    agentData.pos,
    mapData.deliverCoordinates.filter(
      (coord) => coord.x !== goal.x || coord.y !== goal.y
    )
  );
}
/**
 * PddlPickUp class that extends GoTo, used to pick up a parcel
 */
class PickUp extends GoTo {
  static isApplicableTo(type) {
    return type == "go_pick_up";
  }

  async execute(predicate) {
    // Move the agent to the parcel position and pick it up
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    await super.execute(predicate);
    if (this.stopped) throw ["stopped"]; // if stopped then quit

    var status = await client.emitPickup();
    if (status) {
      agentData.parcelsCarried.push(predicate.goal)
      console.log("[plans.js] parcels on my head   : ", agentData.parcelsCarried);
      return true;
    } else {
      return false;
    }
  }
}

/**
 * PddlPutDown class that extends GoTo, used to put down a parcel
 */
class PutDown extends GoTo {
  static isApplicableTo(type) {
    return type == "go_put_down";
  }

  async execute(predicate) {
    let goal = predicate.goal;
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    console.log("[plans.js] Putting down parcel at", goal);
    await super.execute(predicate);
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    if (await client.emitPutdown()) {
      agentData.parcels = agentData.parcels.filter(
        (parcel) => !agentData.parcelsCarried.includes(parcel)
      );
      agentData.parcelsCarried.length = 0;
      return true;
    } else {
      return false;
    }
  }
}
class Exchange1 extends Plan {
  static isApplicableTo(type) { 
    return type == "exchange"
  }

  async execute(predicate) {
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    console.log("[plans.js] Executing exchange at", predicate.goal);
    // The agent is not carrying parcels and is blocking the mate.
    // Just move out of the way.
    const directions = [
        { x: 0, y: -1, action: "down" },
        { x: 0, y: 1, action: "up" },
        { x: -1, y: 0, action: "left" },
        { x: 1, y: 0, action: "right" },
    ];

    for (const dir of directions) {
        const newPos = { x: agentData.pos.x + dir.x, y: agentData.pos.y + dir.y };
        if (mapData.utilityMap[newPos.x][newPos.y] !== 0 &&
            (newPos.x !== agentData.matePosition.x || newPos.y !== agentData.matePosition.y)) {
            await client.emitMove(dir.action);
            return true; // Moved successfully
        }
    }
    return false; // Could not find a place to move
  }
}
class Exchange extends Plan {
  static isApplicableTo(type) { 
    return type == "exchange";
  }

  async execute(predicate) {
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    console.log("[plans.js] Executing exchange at", predicate.goal);
    // leave the parcels on the ground
    if (agentData.parcelsCarried.length > 0) {
        const putDownSuccess = await client.emitPutdown();
        if (putDownSuccess) {
            // Update parcels from being carried to being on the ground
            agentData.parcelsCarried.forEach(p => {
                const parcelIndex = agentData.parcels.findIndex(parcel => parcel.id === p.id);
                if (parcelIndex !== -1) {
                    agentData.parcels[parcelIndex].carriedBy = null;
                    agentData.parcels[parcelIndex].x = agentData.pos.x;
                    agentData.parcels[parcelIndex].y = agentData.pos.y;
                }
            });
            const droppedParcels = [...agentData.parcelsCarried];
            agentData.parcelsCarried = [];

            // move away so the mate can pick them up
            // so in the opposite direction of the mate or in a random direction that is free different from the mate
            const directions = [
                { x: 0, y: -1, action: "down" },
                { x: 0, y: 1, action: "up" },
                { x: -1, y: 0, action: "left" },
                { x: 1, y: 0, action: "right" },
            ];
            let moved = false;
            for (const dir of directions) {
                const newPos = { x: agentData.pos.x + dir.x, y: agentData.pos.y + dir.y };
                if (mapData.utilityMap[newPos.x][newPos.y] !== 0 &&
                    (newPos.x !== agentData.matePosition.x || newPos.y !== agentData.matePosition.y)) {
                    await client.emitMove(dir.action);
                    moved = true;
                    break;
                }
            }
            if (!moved) {
                // if I can't move away, ask the mate to move
                const mateDirections = [
                    { x: 0, y: -1, action: "down" },
                    { x: 0, y: 1, action: "up" },
                    { x: -1, y: 0, action: "left" },
                    { x: 1, y: 0, action: "right" },
                ];
                let targetForMate = null;
                for (const dir of mateDirections) {
                    const newMatePos = { x: agentData.matePosition.x + dir.x, y: agentData.matePosition.y + dir.y };
                    if (mapData.utilityMap[newMatePos.x][newMatePos.y] !== 0 &&
                        (newMatePos.x !== agentData.pos.x || newMatePos.y !== agentData.pos.y)) {
                        targetForMate = newMatePos;
                        break;
                    }
                }

                if (targetForMate) {
                    const response = await askMove(targetForMate);
                    if (response) { // if the mate agrees to move
                        // wait for the mate to move
                        const originalMatePosition = {x: agentData.matePosition.x, y: agentData.matePosition.y};
                        while(agentData.matePosition.x === originalMatePosition.x && agentData.matePosition.y === originalMatePosition.y) {
                            await new Promise(res => setTimeout(res, 200));
                        }
                        // now I can move
                        for (const dir of directions) {
                            const newPos = { x: agentData.pos.x + dir.x, y: agentData.pos.y + dir.y };
                            if (mapData.utilityMap[newPos.x][newPos.y] !== 0) {
                                await client.emitMove(dir.action);
                                moved = true;
                                break;
                            }
                        }
                    }
                }
            }

            if (moved) {
                // then ask to the mate to pick up in the position of the exchange
                for (const parcel of droppedParcels) {
                    await askPickUp(parcel);
                }

                // wait until the mate has picked up the parcels
                let allParcelsPickedUp = false;
                while (!allParcelsPickedUp) {
                    await new Promise(res => setTimeout(res, 200)); // wait a bit
                    allParcelsPickedUp = true;
                    for (const droppedParcel of droppedParcels) {
                        const parcelInWorld = agentData.parcels.find(p => p.id === droppedParcel.id);
                        if (!parcelInWorld || parcelInWorld.carriedBy !== agentData.mateId) {
                            allParcelsPickedUp = false;
                            break;
                        }
                    }
                }
            }
        }
    }
    return true;
  }
}
const plans = [];

plans.push(PickUp);
plans.push(GoTo);
plans.push(PutDown);
plans.push(Exchange);

export { plans };
