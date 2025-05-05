import { agentData, mapData } from "../belief/agentBelief.js";
import { readFile, findPathAStar, timeout, findMovesAStar } from "../main/utils.js";
import { Intention } from "../intention/intention.js";
import { client } from "../config.js";
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
  static isApplicable(goal) {
    return goal.type === "go_to" && goal.pos !== undefined;
  }
  async execute(goal) {
    var path = findMovesAStar(mapData.map, agentData.pos, goal.pos);

    while (agentData.pos.x !== goal.pos.x || agentData.pos.y !== goal.pos.y) {
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      let next_step = path.shift();
      // log if the path is empty
      if (next_step == null) {
        this.log("No path found to goal", goal.pos);
        break;
      }
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
        path = findMovesAStar(mapData.map, agentData.pos, goal.pos);
        // if the path is empty then we need to stop the plan
        if (path.length == 0) {
          this.log("No path found to goal", goal.pos);
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
    // Check if the agent is on the parcel position and pick it up
    if (agentData.pos.x == goal.x && agentData.pos.y == goal.y) {
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      await client.emitPickup();
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      return true;
    }

    // Move the agent to the parcel position and pick it up
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    await this.subIntention(["go_to", goal.x, goal.y]);
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    await client.emitPickup();
    if (this.stopped) throw ["stopped"]; // if stopped then quit

    return true;
  }
}

/**
 * PddlPutDown class that extends Plan, used to put down a parcel
 */
class PddlPutDown extends Plan {
  static isApplicableTo(go_put_down) {
    return go_put_down == "go_put_down";
  }

  async execute(goal) {
    // Check if the agent is on the delivery point and put down the parcel
    if (agentData.pos.x == goal.x && agentData.pos.y == goal.y) {
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      await client.emitPutdown();
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      return true;
    }

    // Move the agent to the delivery point and put down the parcel
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    await this.subIntention(["go_to", goal.x, goal.y]);
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    await client.emitPutdown();
    if (this.stopped) throw ["stopped"]; // if stopped then quit

    return true;
  }
}

/**
 * GoRandomDelivery class that extends Plan, used to move the agent to a random spawn point or delivery point
 */
class GoRandomDelivery extends Plan {
  static isApplicableTo(go_random_delivery, x, y, id, utility) {
    return go_random_delivery == "go_random_delivery";
  }

  async execute(go_random_delivery, x, y) {
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    await this.subIntention(["go_to", x, y]);
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    return true;
  }
}

const plans = [];

plans.push(AStarGoTo);
plans.push(PickUp);
plans.push(PddlPutDown);
plans.push(GoRandomDelivery);

export { plans };
