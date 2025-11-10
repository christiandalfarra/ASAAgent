import { agentData, mapData } from "../belief/belief.js";
import {
  findNearestDelivery,
  findNearestFrom,
  findAStar,
} from "../main/utils.js";
import { Intention } from "../intention/intention.js";
import { client } from "../conf.js";
import { optionsLoop } from "../intention/options.js";

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
          agentData.mateId &&
          agentData.mateId !== agentData.id &&
          agentData.matePosition &&
          agentData.matePosition.x === blockedX &&
          agentData.matePosition.y === blockedY;
        if (blockedByEnemy || blockedByMate) {
          const blocker = blockedByEnemy ? "enemy agent" : "mate";
          console.log(
            `[plans.js] Move blocked by ${blocker} at (${blockedX}, ${blockedY}) 
            solving the intention ${agentData.currentIntention.predicate.type}`
          );
          console.log(`[plans.js] tile blocked value: ${mapData.utilityMap[blockedY][blockedX]}`);
          if (agentData.currentIntention?.predicate?.type === "go_put_down") {
            // TODO if i am delivering and my mate is blocking me, use the plan
            const newGoal = checkNewDelivery(goal);
            if (newGoal) {
              console.log(
                `[plans.js] Switching delivery goal to (${newGoal.x}, ${newGoal.y})`
              );
              goal = predicate.goal = newGoal;
              path = findAStar(mapData.utilityMap, agentData.pos, goal);
              moveRetries = 0;
              if (path && path.length > 0) {
                continue;
              }
            }
          }
        }
        if (moveRetries < maxMoveRetries) {
          continue;
        }
        path = findAStar(mapData.utilityMap, agentData.pos, goal);
        if (!path || path.length === 0) {
          return false;
        }
        continue;
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
 * PddlPickUp class that extends Plan, used to pick up a parcel
 */
class PickUp extends Plan {
  static isApplicableTo(type) {
    return type == "go_pick_up";
  }

  async execute(predicate) {
    // Move the agent to the parcel position and pick it up
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    await this.subIntention({
      type: "go_to",
      goal: predicate.goal,
      utility: 1,
    });
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    return (await client.emitPickup()) ? true : false;
  }
}

/**
 * PddlPutDown class that extends Plan, used to put down a parcel
 */
class PutDown extends Plan {
  static isApplicableTo(type) {
    return type == "go_put_down";
  }

  async execute(predicate) {
    let goal = predicate.goal;
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    let success = await this.subIntention({
      type: "go_to",
      goal: goal,
      utility: 2,
    });
    if (!success) {
      return success;
    }
    if (await client.emitPutdown()) {
      agentData.parcelsCarried.length = 0;
      return true;
    } else {
      return false;
    }
  }
}

const plans = [];

plans.push(PickUp);
plans.push(GoTo);
plans.push(PutDown);

export { plans };
