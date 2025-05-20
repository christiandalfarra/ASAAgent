import { agentData, mapData } from "../belief/belief.js";
import { findMovesAStar } from "../main/utils.js";
import { Intention } from "../intention/intention.js";
import { client } from "../config.js";

import { intentionReplace } from "../main/main.js";

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

// goal have {
//   type: "go_to" | "go_pick_up" | "go_put_down" ,
//   pos: { x: number, y: number } | undefined
//   }
class AStarGoTo extends Plan {
  static isApplicableTo(go_to) {
    return go_to === "go_to";
  }
  async execute(goal) {
    let path = null;
    while (!path) {
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      if (mapData.utilityMap[goal.x][goal.y] !== 0)
        path = findMovesAStar(mapData.utilityMap, agentData.pos, goal);
    }
    while (!(agentData.pos.x === goal.x && agentData.pos.y === goal.y)) {
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      let next_step = null;
      // log if the path is empty
      if (!path) {
        this.log("No path found to goal", goal);
      } else {
        next_step = path.shift();
      }
      let suc = await client.emitMove(next_step);
      if (!suc || !path) {
        this.log("[plan.js] Move failed, redefine the path.");
        path = findMovesAStar(mapData.utilityMap, agentData.pos, goal);
      }
      if (this.stopped) throw ["stopped"];
    }
    return true;
  }
}
/**
 * PddlPickUp class that extends Plan, used to pick up a parcel
 */
class PickUp extends Plan {
  static isApplicableTo(go_pick_up) {
    return go_pick_up == "go_pick_up";
  }

  async execute(goal) {
    // Check if the agent is on the parcel position and pick it up
    if (agentData.pos.x == goal.x && agentData.pos.y == goal.y) {
      if (this.stopped) throw ["stopped"];
      console.log(agentData.options);
      if (await client.emitPickup()) {
        agentData.parcelsCarried.push(goal);
      }
      if (this.stopped) throw ["stopped"];
      return true;
    } else {
      // Move the agent to the parcel position and pick it up
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      await this.subIntention({
        type: "go_to",
        goal: { x: goal.x, y: goal.y },
      });
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      if (await client.emitPickup()) {
        agentData.parcelsCarried.push(goal);
      }
      if (this.stopped) throw ["stopped"];
      return true;
    }
  }
}

/**
 * PddlPutDown class that extends Plan, used to put down a parcel
 */
class PutDown extends Plan {
  static isApplicableTo(go_put_down) {
    return go_put_down == "go_put_down";
  }

  async execute(goal) {
    if (agentData.pos.x == goal.x && agentData.pos.y == goal.y) {
      await client.emitPutdown();
      return true;
    } else {
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      await this.subIntention({ type: "go_to", goal: goal });
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      await client.emitPutdown();
      agentData.parcelsCarried.length = 0;
      if (this.stopped) throw ["stopped"]; // if stopped then quit
    }
    return true;
  }
}

const plans = [];

plans.push(PickUp);
plans.push(AStarGoTo);
plans.push(PutDown);

export { plans };
