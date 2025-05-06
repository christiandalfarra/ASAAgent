import { agentData, mapData } from "../belief/agentBelief.js";
import {
  readFile,
  findPathAStar,
  timeout,
  findMovesAStar,
} from "../main/utils.js";
import { Intention } from "../intention/intention.js";
import { client } from "../config.js";
import { DEBUG } from "../debug.js"; // added

//import { PddlProblem, onlineSolver } from "@unitn-asa/pddl-client";

// Read the domain file for the PDDL planner
//let domain = await readFile("./planners/domain.pddl");

/**
 * Plan class
 */
class Plan {
  // This is used to stop the plan
  #stopped = false;
  stop() {
    this.#stopped = true;
    for (const i of this.#sub_intentions) {
      i.stop();
    }
  }
  get stopped() {
    return this.#stopped;
  }

  #parent;

  constructor(parent) {
    this.#parent = parent;
  }

  log(...args) {
    if (this.#parent && this.#parent.log) this.#parent.log("\t", ...args);
    else console.log(...args);
  }

  #sub_intentions = [];

  async subIntention(predicate) {
    const sub_intention = new Intention(this, predicate);
    this.#sub_intentions.push(sub_intention);
    return await sub_intention.achieve();
  }
}

// goal have {
//   type: "go_to" | "pick" | "put" ,
//   pos: { x: number, y: number } | undefined
//   }
class AStarGoTo extends Plan {
  static isApplicableTo(go_to) {
    return go_to === "go_to";
  }
  async execute(goal) {
    if (DEBUG.planExecution)
      this.log("DEBUG [AStarGoTo] Starting with goal:", goal);

    var path = findMovesAStar(mapData.map, agentData.pos, {
      x: goal[1],
      y: goal[2],
    });
    if (path == null) {
      this.log("No path found to goal", { x: goal[1], y: goal[2] });
      return false;
    }
    while (agentData.pos.x !== goal[1] || agentData.pos.y !== goal[2]) {
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      let next_step = path.shift();
      // log if the path is empty
      if (next_step == null) {
        this.log("No path found to goal", { x: goal[1], y: goal[2] });
        break;
      }
      if (DEBUG.planExecution)
        this.log("DEBUG [AStarGoTo] Moving to:", next_step);
      // the emitMove function return false if the agent cannot make that move
      // or the new position of the agent if the move is successful
      // successful set to true if the move is successful
      let successful = true;
      successful = await client.emitMove(next_step);
      if (this.stopped) throw ["stopped"];

      // if the move is not successful then we need to find a new path

      let stuckCounter = 0;
      if (!successful) {
        stuckCounter++;
        //if it get stucked more than 2 times then we need to stop the plan
        if (stuckCounter > 2) {
          this.log("Agent is stucked, stopping plan");
          throw ["stopped"];
        }
        // if the agent is stuck then we need to find a new path
        // we need to find a new path from the current position to the goal
        path = findMovesAStar(mapData.map, agentData.pos, {
          x: goal[1],
          y: goal[2],
        });
        // if the path is null then we need to stop the plan
        if (path.length == 0) {
          this.log("No path found to goal", { x: goal[1], y: goal[2] });
          throw ["stopped"];
        }
      }
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
    let actions = findMovesAStar(mapData.map, agentData.pos, {
      x: goal[1],
      y: goal[2],
    });
    for (let a in actions) {
      if (DEBUG.planExecution) this.log("DEBUG [PickUp] Moving:", actions[a]);
      await client.emitMove(actions[a]);
    }
    // Check if the agent is on the parcel position and pick it up
    if (agentData.pos.x == goal[1] && agentData.pos.y == goal[2]) {
      if (this.stopped) throw ["stopped"];
      if (DEBUG.planExecution)
        this.log("DEBUG [PickUp] At target, picking up.");
      await client.emitPickup();
      if (this.stopped) throw ["stopped"];
      return true;
    }
    /* // Move the agent to the parcel position and pick it up
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    await this.subIntention(["go_to", goal[1], goal[2]]);
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    await client.emitPickup();
    if (this.stopped) throw ["stopped"]; // if stopped then quit */

    return true;
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

    let actions = findMovesAStar(mapData.map, agentData.pos, {
      x: goal[1],
      y: goal[2],
    });

    if (!actions || actions.length === 0) {
      if (DEBUG.planExecution)
        console.log("DEBUG [PutDown] No path to delivery point.");
      throw ["no path"];
    }

    for (let a in actions) {
      if (DEBUG.planExecution)
        console.log("DEBUG [PutDown] Moving:", actions[a]);
      await client.emitMove(actions[a]);
      if (this.stopped) throw ["stopped"];
    }

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
      return true;
    } else {
      if (DEBUG.planExecution)
        console.log("DEBUG [PutDown] Didn't reach delivery point.");
    }

    return true;
  }
}

/**
 * GoRandomDelivery class that extends Plan, used to move the agent to a random spawn point or delivery point
 */
class GoRandomDelivery extends Plan {
  static isApplicableTo(go_random_delivery) {
    return go_random_delivery == "go_random_delivery";
  }

  async execute(x, y) {
    if (this.stopped) throw ["stopped"];
    if (DEBUG.planExecution)
      this.log("DEBUG [GoRandomDelivery] Moving to:", x, y);
    await this.subIntention(["go_to", x, y]);
    if (this.stopped) throw ["stopped"];
    return true;
  }
}

const plans = [];

plans.push(PickUp);
plans.push(AStarGoTo);
plans.push(PutDown);
//plans.push(GoRandomDelivery);

export { plans };
