import { agentData, mapData } from "../belief/agentBelief.js";
import { readFile, findPath, timeout } from "./utils.js";
import { Intention } from "../intention/intention.js";
import { client } from "../config.js";
import { PddlProblem, onlineSolver } from "@unitn-asa/pddl-client";

// Read the domain file for the PDDL planner
let domain = await readFile("./planners/domain.pddl");
// flag to use PDDL planner or not
let usePDDL = false;

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
    var path = findPath(mapData.map, agentData.pos, goal.pos);

    while (agentData.pos.x !== goal.pos.x || agentData.pos.y !== goal.pos.y) {
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      let next_step = path.shift();
      // log if the path is empty
      if (next_step == null) {
        this.log("No path found to goal", goal.pos);
        break;
      }

      // moved_x and moved_y are useful to check if the agent is stucked in his movement
      // the emitMove function return false if the agent cannot make that move
      // or the new position of the agent if the move is successful
      let moved_x = false;
      let moved_y = false;

      if (next_step.x > agentData.pos.x)
        moved_x = await client.emitMove("right");
      else if (next_step.x < agentData.pos.x)
        moved_x = await client.emitMove("left");

      if (state_x) {
        agentData.pos.x = moved_x.x;
        agentData.pos.y = moved_x.y;
      }

      if (this.stopped) throw ["stopped"]; // if stopped then quit

      if (next_step.y > agentData.pos.y) 
        moved_y = await client.emitMove("up");
      else if (next_step.y < agentData.pos.y)
        moved_y = await client.emitMove("down");
      if (moved_y) {
        agentData.pos.x = moved_y.x;
        agentData.pos.y = moved_y.y;
      }
      if (this.stopped) throw ["stopped"]; // if stopped then quit

      if (!moved_x && !moved_y) {
        this.log("stucked: ", countStacked);
        await timeout(500);
        if (countStacked <= 0) {
          throw ["stopped"];
        } else {
          countStacked--;
        }
      }
    }
  }
}

const plans = [];

plans.push(GoToBFS);

export { plans };
