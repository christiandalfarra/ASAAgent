import { agentData, mapData } from "../belief/belief.js";
import {
  readFile,
  findPathAStar,
  timeout,
  findMovesAStar,
  findNearestDelivery,
} from "../main/utils.js";
import { Intention } from "../intention/intention.js";
import { client } from "../config.js";
import { DEBUG } from "../debug.js"; // added
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
    if (DEBUG.planExecution)
      this.log("DEBUG [AStarGoTo] Starting with goal:", goal);
    let path = null;
    while (!path) {
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      if (mapData.utilityMap[goal[1]][goal[2]] !== 0)
        path = findMovesAStar(mapData.utilityMap, agentData.pos, {
          x: goal[1],
          y: goal[2],
        });
    }
    while (!(agentData.pos.x === goal[1] && agentData.pos.y === goal[2])) {
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      let next_step = null;
      // log if the path is empty
      if (!path) {
        this.log("No path found to goal", { x: goal[1], y: goal[2] });
      } else {
        next_step = path.shift();
      }
      if (DEBUG.planExecution)
        this.log("DEBUG [AStarGoTo] Moving to:", next_step);
      let suc = await client.emitMove(next_step);
      if (!suc || !path) {
        this.log("DEBUG [AStarGoTo] Move failed, redefine the path.");
        path = findMovesAStar(mapData.utilityMap, agentData.pos, {
          x: goal[1],
          y: goal[2],
        });
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
    if (DEBUG.planExecution)
      this.log("DEBUG [PickUp] Starting with goal:", goal);
    // Check if the agent is on the parcel position and pick it up
    if (agentData.pos.x == goal[1] && agentData.pos.y == goal[2]) {
      if (this.stopped) throw ["stopped"];
      this.log("DEBUG [PickUp] At target, picking up (1).");
      console.log(agentData.options);
      let suc = await client.emitPickup();
      if (suc) {
        agentData.parcelsCarried.push(
          agentData.parcels.find((p) => p.x == goal[1] && p.y == goal[2])
        );
      }
      if (this.stopped) throw ["stopped"];
      return true;
    } else {
      // Move the agent to the parcel position and pick it up
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      console.log(agentData.options);
      await this.subIntention(["go_to", goal[1], goal[2]]);
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      let suc = await client.emitPickup();
      if (suc) {
        agentData.parcelsCarried.push(
          agentData.parcels.find((p) => p.x == goal[1] && p.y == goal[2])
        );
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
    if (DEBUG.planExecution)
      console.log(
        "DEBUG [PutDown] Starting plan to deliver to:",
        goal[1],
        goal[2]
      );

    if (agentData.pos.x == goal[1] && agentData.pos.y == goal[2]) {
      if (DEBUG.planExecution) {
        console.log(
          "DEBUG [PutDown] At delivery point:",
          agentData.pos,
          "| Carried parcels:",
          agentData.parcelsCarried.length
        );
      }
      if (agentData.parcelsCarried.length > 0) {
        await client.emitPutdown();
        if (DEBUG.planExecution)
          console.log("DEBUG [PutDown] Putdown executed.");
      } else {
        if (DEBUG.planExecution)
          console.log("DEBUG [PutDown] Nothing to deliver.");
      }
      agentData.parcelsCarried = [];
      return true;
    } else {
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      await this.subIntention(["go_to", goal[1], goal[2]]);
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      if (agentData.parcelsCarried.length > 0) {
        await client.emitPutdown();
        if (this.stopped) throw ["stopped"]; // if stopped then quit
        agentData.parcelsCarried = [];
      }
      return true;
    }
  }
}

/**
 * GoRandomDelivery class that extends Plan, used to move the agent to a random spawn point or delivery point
 */
class GoRandomSpawn extends Plan {
  static isApplicableTo(go_random_spawn) {
    return go_random_spawn == "go_random_spawn";
  }

  async execute(goal) {
    if (this.stopped) throw ["stopped"];
    if (DEBUG.planExecution)
      this.log("DEBUG [GoRandomDelivery] Moving to:", goal[1], goal[2]);
    await this.subIntention(["go_to", goal[1], goal[2]]);
    if (this.stopped) throw ["stopped"];
    return true;
  }
}

const plans = [];

plans.push(PickUp);
plans.push(AStarGoTo);
plans.push(PutDown);
//plans.push(GoRandomSpawn);

export { plans };
