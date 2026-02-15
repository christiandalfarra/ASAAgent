import { agentData, mapData, envData } from "../belief/belief.js";
import { onlineSolver, PddlExecutor, PddlProblem } from "@unitn-asa/pddl-client";
import {
  findNearestDelivery,
  findAStar,
} from "../main/utils.js";
import { Intention } from "../intention/intention.js";
import { client } from "../conf.js";
import { askPickUp } from "../coordination/coordination.js";
import { createPddlProblem, createPddlActions, domain} from "./pddlUtils.js";

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
    if (!path) {
      throw ["stopped"]; // stop the intention if there is no path to the goal
    }
    let moveRetries = 0;

    while (!atGoal()) {
      if (this.stopped) throw ["stopped"];
      let nextMove = path[0];
      if (!nextMove) {
        throw ["stopped"];
      }
      const success = await client.emitMove(nextMove.action);
      if (!success) {
        moveRetries += 1;
        const blockedX = nextMove.x;
        const blockedY = nextMove.y;
        // if blocked by an enemy, update the map to set that tile as blocked
        if (
          agentData.enemies.some(
            (enemy) => enemy.x === blockedX && enemy.y === blockedY,
          )
        ) {
          mapData.updateTileValue(blockedX, blockedY, 0);
          // if the current goal is a delivery point, check for alternative delivery points
          if (predicate.parent && predicate.parent === "go_put_down") {
            const newGoal = findNearestDelivery(agentData.pos);
            if (newGoal) {
              goal = newGoal;
            }
          }
        }
        if (
          agentData.mateId !== agentData.id &&
          agentData.matePosition?.x === blockedX &&
          agentData.matePosition?.y === blockedY
        ) {
          console.log("[plans.js] Move blocked by mate at", blockedX, blockedY);
          // if i am moving go to or pickup, update tile to 0 and avoid the mate
          if (
            predicate.parent == "random_walk" ||
            predicate.parent == "go_pick_up"
          ) {
            mapData.updateTileValue(blockedX, blockedY, 0);
            if (!findAStar(mapData.utilityMap, agentData.pos, goal)){
              throw ["stopped"]; // stop the intention to replan, because there is no path to the goal, maybe the mate will move and free the path
            }
          } else if (predicate.parent === "go_put_down") {
            // check if there is another path to avoid the mate, if not, drop the parcels move way and ask to mate to pickup
            mapData.updateTileValue(blockedX, blockedY, 0)
            // before drop the parcel, i have to check if am able to move away
            // if not i will ask the mate to move away one position and i will wait in the current position, 
            // after few seconds i will try to go in the prev pos of the mate, drop the parcel and wait again
            await client.emitPutdown();
            let myPos = { x: agentData.pos.x, y: agentData.pos.y };
            agentData.parcelsCarried.clear();
            // i move away from the mate checking the possible directions in utility map
            const directions = [
              { x: agentData.pos.x + 1, y: agentData.pos.y, action: "right" },
              { x: agentData.pos.x - 1, y: agentData.pos.y, action: "left" },
              { x: agentData.pos.x, y: agentData.pos.y + 1, action: "up" },
              { x: agentData.pos.x, y: agentData.pos.y - 1, action: "down" },
            ];
            let movedAway = false;
            for (const dir of directions) {
              if (mapData.utilityMap[dir.x][dir.y] !== 0) {
                const moveSuccess = await client.emitMove(dir.action);
                if (moveSuccess) {
                  movedAway = true;
                  break;
                }
              }
            }
            
            console.log("[plans.js] stopping that intention", agentData.currentIntention.predicate);
            await agentData.currentIntention?.stop(); // stop current intention to replan
            
            await askPickUp(myPos);
            const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
            await wait(envData.clock * 10); // wait for mate to pick up
            return false; // return false to indicate that the original go_put_down intention was not completed and needs to be replanned
            //}
          }
        }
        // if one is delivering and there are no other paths, drop the parcel move away and ask to mate to pick up
        if (moveRetries < maxMoveRetries) {
          continue;
        }
        path = findAStar(mapData.utilityMap, agentData.pos, goal);
        moveRetries = 0;
        if (path && path.length > 0) {
          continue;
        }
        if (!path) {
          await new Promise((res) => setTimeout(res, envData.clock * 2));
        }
      }
      path.shift();
      moveRetries = 0;
    }
    return true;
  }
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
      goal: { x: predicate.goal.x, y: predicate.goal.y },
      utility: predicate.utility,
      parent: predicate.type,
    });
    if (this.stopped) throw ["stopped"]; // if stopped then quit

    var status = await client.emitPickup();
    if (status) {
      agentData.parcelsCarried.set(predicate.goal.id, predicate.goal);
      agentData.parcels.delete(predicate.goal.id);
      console.log(
        "[plans.js] parcels on my head: ",
        agentData.parcelsCarried,
      );
      return true;
    } else {
      return false;
    }
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
    console.log("[plans.js] Putting down parcel at", goal);
    let result = await this.subIntention({
      type: "go_to",
      goal: { x: goal.x, y: goal.y },
      utility: predicate.utility,
      parent: predicate.type,
    });
    if (!result) {
      // remove option of putdwon and replan
      agentData.options = agentData.options.filter((option) => option.type !== "go_put_down");
      throw ["stopped"]; // if failed to reach the goal, stop the intention to replan
    }
    if (this.stopped) throw ["stopped"]; // if stopped then quit
    if (await client.emitPutdown()) {
      agentData.parcelsCarried.clear();
      return true;
    } else {
      return false;
    }
  }
}

/**
 * PddlGoTo class that extends Plan, used to move the agent to a specific location
 */
class PddlGoTo extends Plan {
  static isApplicableTo(type) {
    return type === 'go_to';
  }

  async execute(predicate) {
    if (this.stopped) throw ['stopped'];
    let retries = 3;

    while (retries > 0) {
      if (this.stopped) throw ['stopped'];

      const { name, objects, inits, goals } = createPddlProblem(predicate);
      const pddlProblem = new PddlProblem(name, objects, inits, goals);
      const problemStr = pddlProblem.toPddlString();

      const plan = await onlineSolver(domain, problemStr);

      if (!plan || plan.length === 0) {
        console.log(`[plans.js] PDDL planner failed to find a plan for go_to (${predicate.goal.x}, ${predicate.goal.y}). Retrying...`);
        await new Promise(res => setTimeout(res, envData.clock));
        retries--;
        continue;
      }

      const pddlActions = createPddlActions(() => this.stopped);
      const pddlExecutor = new PddlExecutor(...Object.values(pddlActions));

      await pddlExecutor.exec(plan);

      const reachedGoal =
        agentData.pos.x === predicate.goal.x && agentData.pos.y === predicate.goal.y;
      if (reachedGoal) {
        return true;
      }

      console.log(
        `[plans.js] PDDL plan executed but goal (${predicate.goal.x}, ${predicate.goal.y}) not reached yet. Retrying...`
      );
      await new Promise((res) => setTimeout(res, envData.clock));
      retries--;
    }
    console.log(`[plans.js] Failed to execute go_to (${predicate.goal.x}, ${predicate.goal.y}) after multiple attempts.`);
    return false;
  }
}
/**
 * PddlPickUp class that extends Plan, used to pick up a parcel using PDDL-based planning
 */
class PddlPickUp extends Plan {
  static isApplicableTo(type) {
    return type === 'go_pick_up';
  }

  async execute(predicate) {
    if (this.stopped) throw ['stopped'];

    const parcel = agentData.parcels.get(predicate.goal.id);

    const { name, objects, inits, goals } = createPddlProblem(predicate);
    const pddlProblem = new PddlProblem(name, objects, inits, goals);
    const problemStr = pddlProblem.toPddlString();

    const plan = await onlineSolver(domain, problemStr);
    if (!plan || plan.length === 0) return false;

    const pddlActions = createPddlActions(() => this.stopped);
    const pddlExecutor = new PddlExecutor(...Object.values(pddlActions));
    await pddlExecutor.exec(plan);

    // If I see the parcel or I dont't reach the target, I don't pick it up
    const parcelNow = agentData.parcels.get(predicate.goal.id);
    if (parcelNow || agentData.pos.x !== predicate.goal.x || agentData.pos.y !== predicate.goal.y) {
      console.warn(
        `[plans.js] Parcel ${predicate.goal.id} not picked at target (${predicate.goal.x}, ${predicate.goal.y}).`
      );
      return false;
    }

    const now = Date.now();
    agentData.parcelsCarried.set(parcel.id, { ...parcel, lastTimestamp: now, estimated: false, estimatedReward: parcel.reward });
    agentData.parcels.delete(parcel.id);
    return true;
  }
}

/**
 * PddlPutDown class that extends Plan, used to put down a parcel using PDDL-based planning
 */
class PddlPutDown extends Plan {
  static isApplicableTo(type) {
    return type === 'go_put_down';
  }

  async execute(predicate) {
    if (this.stopped) throw ['stopped'];
    predicate.goal.id = agentData.parcelsCarried.keys().next().value; // get the id of the parcel carried to put down

    const { name, objects, inits, goals } = createPddlProblem(predicate);
    const pddlProblem = new PddlProblem(name, objects, inits, goals);
    const problemStr = pddlProblem.toPddlString();

    const plan = await onlineSolver(domain, problemStr);
    if (!plan || plan.length === 0) return false;

    const pddlActions = createPddlActions(() => this.stopped);
    const pddlExecutor = new PddlExecutor(...Object.values(pddlActions));
    await pddlExecutor.exec(plan);

    if (agentData.pos.x !== predicate.goal.x || agentData.pos.y !== predicate.goal.y) {
      console.warn(
        `[plans.js] Agent ${agentData.id} did not reach target (${predicate.goal.x}, ${predicate.goal.y}).`
      );
      return false;
    }

    agentData.parcelsCarried.clear();
    return true;
  }
}

// Export the plans and a function to configure which plans to use based on whether PDDL is enabled or not
export const plans = [];
export function configurePlans(usePddl) {
  plans.length = 0;
  if (usePddl) {
    console.log("[plans.js] Using PDDL-based plans");
    plans.push(PddlGoTo, PddlPickUp, PddlPutDown);
  } else {
    console.log("[plans.js] Using non-PDDL-based plans");
    plans.push(GoTo, PickUp, PutDown);
  }
}
