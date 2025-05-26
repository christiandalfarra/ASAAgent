import { agentData, mapData } from "../belief/belief.js";
import {
  findMovesAStar,
  findNearestDelivery,
  findNearestFrom,
} from "../main/utils.js";
import { Intention } from "../intention/intention.js";
import { client } from "../main/agent.js";

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

// goal have {
//   type: "go_to" | "go_pick_up" | "go_put_down" ,
//   pos: { x: number, y: number } | undefined
//   }
class AStarGoTo extends Plan {
  static isApplicableTo(type) {
    return type === "go_to";
  }
  async execute(predicate) {
    let goal = predicate.goal;
    let utility = predicate.utility;
    let path = null;
    do {
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      if (mapData.utilityMap[goal.x][goal.y] === 0) {
        switch (utility) {
          // moving randowly
          case 0:
            const randomIndex = Math.floor(
              Math.random() * mapData.spawningCoordinates.length
            );
            const target = mapData.spawningCoordinates[randomIndex];
            goal = { x: target.x, y: target.y };
            path = findMovesAStar(mapData.utilityMap, agentData.pos, goal);
            break;
          // moving to pickup
          case 1:
            optionsLoop();
            return false;
          // moving to putdown
          // if the delivery point is occupated, i have to change it
          case 2:
            try {
              // if there are more than one delivery i try with another
              // else i do the option loop and do something else
              if (mapData.deliverCoordinates.length > 1) {
                goal = checkNewDelivery(goal);
                path = findMovesAStar(mapData.utilityMap, agentData.pos, goal);
              } else {
                optionsLoop();
                return false;
              }
            } catch (error) {
              optionsLoop();
            }
            break;
        }
      } else {
        path = findMovesAStar(mapData.utilityMap, agentData.pos, goal);
      }
    } while (!path);

    // execute the moves in the path
    while (!(agentData.pos.x === goal.x && agentData.pos.y === goal.y)) {
      // if im moving randomly every move check if there are better options
      if (utility === 0) {
        optionsLoop();
        if (agentData.options.some((option) => option.type === "go_pick_up")) {
          return false;
        }
      }
      let suc = await client.emitMove(path?.shift());
      if (!suc) {
        console.log("DEBUG [plans.js] move blocked redefine path");
        if (utility === 1) {
          // if i am going to pickup, check if that tile is free then redefine the path
          if (mapData.utilityMap[goal.x][goal.y] !== 0) {
            console.log("DEBUG [plans.js] redefine path to pick up");
            path = findMovesAStar(mapData.utilityMap, agentData.pos, goal);
          } else {
            optionsLoop();
            return false;
          }
        }
        else if (utility === 2) {
          // i am going to putdown, check if that tile is free, then redefine the path,
          // else if there are no path change the delivery point
          if (mapData.utilityMap[goal.x][goal.y] !== 0) {
            console.log("DEBUG [plans.js] redefine path to putdown");
            path = findMovesAStar(mapData.utilityMap, agentData.pos, goal);
          }
          if (!path) {
            try {
              // if there are more than one delivery i try with another
              // else i do the option loop and do something else
              if (mapData.deliverCoordinates.length > 1) {
                goal = checkNewDelivery(goal);
                path = findMovesAStar(mapData.utilityMap, agentData.pos, goal);
              } else {
                optionsLoop();
                return false;
              }
            } catch (error) {
              optionsLoop();
              return false;
            }
          }
        } else {
          goal = checkNewDelivery(goal);
          path = findMovesAStar(mapData.utilityMap, agentData.pos, goal)
        }
      }
    }
    return true;
  }
}
/* class AStarGoTo extends Plan {
  async execute(predicate) {
    let goal = predicate.goal;
    let utility = predicate.utility;
    let path = null;
    while (!path) {
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      if (mapData.utilityMap[goal.x][goal.y] !== 0)
        path = findMovesAStar(mapData.utilityMap, agentData.pos, goal);
      else if (utility == 0) {
        const randomIndex = Math.floor(
          Math.random() * mapData.spawningCoordinates.length
        );
        const target = mapData.spawningCoordinates[randomIndex];
        goal = { x: target.x, y: target.y };
        path = findMovesAStar(mapData.utilityMap, agentData.pos, goal);
      } else if (mapData.utilityMap[goal.x][goal.y] === 0 && utility === 1) {
        optionsLoop();
      } else if (mapData.utilityMap[goal.x][goal.y] === 0 && utility === 2) {
        try {
          goal = checkNewDelivery(goal);
          path = findMovesAStar(mapData.utilityMap, agentData.pos, goal);
        } catch (error) {
          optionsLoop();
        }
      }
    }

    while (!(agentData.pos.x === goal.x && agentData.pos.y === goal.y)) {
      // utility = 0 menas that is going randomly
      // utility = 1 means that is going to pick up
      // utility = 2 means that is going to putdown
      if (utility == 0) {
        optionsGen();
        if (agentData.options.some((option) => option.type === "go_pick_up")) {
          return false;
        }
      }
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      // log if the path is empty
      if (!path) {
        this.log("No path found to goal", goal);
      }
      let suc = await client.emitMove(path?.shift());
      if (!suc) {
        this.log("[plan.js] Move failed, redefine the path.");
        // if i am redefining the path while going for a putdown, i can check if there is a delivery
        // if the one that i want to reach is blocked i can go in another
        // if going to that point a i have to dodge an enemy maybe could be better delivery point
        if (utility == 2) {
          // if all the path to the delivery are blocked
          if (!findMovesAStar(mapData.utilityMap, agentData.pos, goal)) {
            // consider a new delivery point
            try {
              goal = checkNewDelivery(goal);
              path = findMovesAStar(mapData.utilityMap, agentData.pos, goal);
            } catch (error) {
              optionsLoop();
            }
          } else {
            // the point is reachable but i evaluate to go in the best one
            path = findMovesAStar(
              mapData.utilityMap,
              agentData.pos,
              findNearestDelivery(agentData.pos)
            );
          }
        } else {
          path = findMovesAStar(mapData.utilityMap, agentData.pos, goal);
        }
      }
      if (this.stopped) throw ["stopped"];
    }
    return true;
  }
} */
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
  static isApplicableTo(go_pick_up) {
    return go_pick_up == "go_pick_up";
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
    if (await client.emitPickup()) {
      agentData.parcelsCarried.push(goal);
    }
    if (this.stopped) throw ["stopped"];
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

  async execute(predicate) {
    let goal = predicate.goal;
    if (agentData.pos.x == goal.x && agentData.pos.y == goal.y) {
      await client.emitPutdown();
      return true;
    } else {
      if (this.stopped) throw ["stopped"]; // if stopped then quit
      await this.subIntention({ type: "go_to", goal: goal, utility: 2 });
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
