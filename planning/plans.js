import { agentData, mapData } from "../belief/belief.js";
import {
  findMovesAStar,
  findNearestDelivery,
  findNearestFrom,
  findAStar,
} from "../main/utils.js";
import { Intention } from "../intention/intention.js";
import { client } from "../conf.js";

import { optionsGen, optionsLoop } from "../intention/options.js";

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
class AStarGoTo extends Plan {
  static isApplicableTo(type) {
    return type === "go_to";
  }

  async execute(predicate) {
    let goal = predicate.goal;
    let utility = predicate.utility;
    let path = null;
    if (this.stopped) throw ["stopped"]; // if stopped then quit

    if (mapData.utilityMap[goal.x][goal.y] === 0) {
      if (utility == 2) {
        goal = checkNewDelivery(goal);
        if (!goal) {
          return false;
        }
      } else {
        return false;
      }
    }
    if (!(path = findAStar(mapData.utilityMap, agentData.pos, goal))) {
      return false;
    }
    // execute the moves in the path
    while (!(agentData.pos.x === goal.x && agentData.pos.y === goal.y)) {
      let next_move = path.shift();
      let suc = await client.emitMove(next_move.action);
      if (!suc) {
        if (
          agentData.enemies.some(
            (enemy) => enemy.x === next_move.x && enemy.y === next_move.y
          )
        ) {
          console.log("DEBUG: enemy is body blocking");
          path = findAStar(mapData.utilityMap, agentData.pos, goal);
          if (!path) {
            console.log("DEBUG: no path found, stopping plan");
            return false; // if no path found then stop the plan
          }
        }
      }
      // if im moving randomly every move check if there are better options
      switch (utility) {
        // if there is something better to do then wlak randomly
        case 0:
          optionsGen();
          if (
            agentData.options.some((option) => option.type === "go_pick_up")
          ) {
            return false; // if there are better options then stop the plan
          }
          break;
        case 1:
          // if the tile that i want to reach for the pickup is not free go for something else
          if (mapData.utilityMap[goal.x][goal.y] === 0) {
            console.log("DEBUG: goal tile is occupied");
            return false; // if the goal tile is occupied then stop the plan
          }
          break;
        case 2:
          // if i have no parcels to deliver then stop the plan
          if (agentData.parcelsCarried.length == 0) {
            return false;
          }
          // if the tile for the delivery is not free then check for a new delivery
          if (mapData.utilityMap[goal.x][goal.y] === 0) {
            console.log("DEBUG: goal tile is occupied");
            goal = checkNewDelivery(goal);
            path = findAStar(mapData.utilityMap, agentData.pos, goal);
            if (!goal || !path) {
              return false;
            }
          }
          break;
      }
    }
    return true;
  }
}
function checkNewDelivery(goal) {
  let deliveryCoord = mapData.deliverCoordinates.filter((coord) => {
    coord.x !== goal.x && coord.y !== goal.y;
  });
  return findNearestFrom(agentData.pos, deliveryCoord);
}
/**
 * PddlPickUp class that extends Plan, used to pick up a parcel
 */
class PickUp extends Plan {
  static isApplicableTo(type) {
    return type == "go_pick_up";
  }

  async execute(predicate) {
    let goal = predicate.goal;
    // Move the agent to the parcel position and pick it up
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    await this.subIntention({
      type: "go_to",
      goal: goal,
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
    if (!(await this.subIntention({ type: "go_to", goal: goal, utility: 2 }))) {
      return false;
    }
    if (await client.emitPutdown()) {
      agentData.parcelsCarried.length = 0;
      return true;
    } else {
      return false;
    }
  }
}
/* class TeamPutDown extends Plan{
  static isApplicableTo(type) {
    return type === "team_put_down";
  }
  async execute(predicate) {
    
  }
} */

const plans = [];

plans.push(PickUp);
plans.push(AStarGoTo);
plans.push(PutDown);

export { plans };
