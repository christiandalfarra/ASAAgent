import { Beliefset, PddlAction } from "@unitn-asa/pddl-client";
import { readFile } from "node:fs/promises";
import { mapData, agentData } from "../belief/belief.js";
import { client } from "../conf.js";

export const domain = await readFile(
  new URL("./domain.pddl", import.meta.url),
  "utf8",
);

/**
 * Creates a PDDL problem definition based on the current belief state and a given predicate.
  * The predicate should have a type (e.g., "go_pick_up", "go_put_down", "go_to") and a goal with necessary details.
  * The function constructs the objects, initial state, and goal conditions for the PDDL problem, which can then be used by a planner to generate a plan for the agent to achieve the specified predicate.
 * @param {Object} predicate - The predicate representing the goal the agent wants to achieve. It should have a 'type' and a 'goal' property.
 * @returns {Object} An object containing the name, objects, initial state, and goals for the PDDL problem.
 */
export function createPddlProblem(predicate) {
  if (!predicate || !predicate.goal) {
    throw new Error("createPddlProblem: missing predicate or predicate.goal");
  }

  const beliefset = new Beliefset();
  const objects = new Set();
  const tile = (x, y) => `tile_${x}_${y}`;
  const addObject = (name) => {
    if (!objects.has(name)) {
      objects.add(name);
      beliefset.addObject(name);
    }
  };
  const isWalkable = (x, y) =>
    mapData.utilityMap?.[x]?.[y] != null && mapData.utilityMap[x][y] !== 0;

  const directions = [
    { name: "up", dx: 0, dy: 1 },
    { name: "down", dx: 0, dy: -1 },
    { name: "left", dx: -1, dy: 0 },
    { name: "right", dx: 1, dy: 0 },
  ];

  // add walkable tiles and adjacency relations
  for (let x = 0; x < mapData.width; x++) {
    for (let y = 0; y < mapData.height; y++) {
      if (!isWalkable(x, y)) continue;

      const from = tile(x, y);
      addObject(from);

      for (const dir of directions) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (!isWalkable(nx, ny)) continue;
        const to = tile(nx, ny);
        addObject(to);
        beliefset.declare(`${dir.name} ${to} ${from}`);
      }
    }
  }

  // add agent position
  const agentTile = tile(agentData.pos.x, agentData.pos.y);
  addObject(agentTile);
  beliefset.declare(`at ${agentTile}`);

  // add deliveries
  for (const delivery of mapData.deliverCoordinates) {
    const deliveryTile = tile(delivery.x, delivery.y);
    addObject(deliveryTile);
    beliefset.declare(`delivery ${deliveryTile}`);
  }

  // create the goals and initial state based on the predicate type
  let goals = "";
  if (predicate.type === "go_pick_up") {
    const parcelId = predicate.goal.id;
    if (!parcelId) throw new Error("go_pick_up requires predicate.goal.id");
    const parcelTile = tile(predicate.goal.x, predicate.goal.y);
    addObject(parcelId);
    addObject(parcelTile);
    beliefset.declare(`parcel_at ${parcelId} ${parcelTile}`);
    goals = `carrying ${parcelId}`;
  } else if (predicate.type === "go_put_down") {
    const parcelId = predicate.goal.id ?? agentData.parcelsCarried.keys().next().value;
    if (!parcelId) throw new Error("go_put_down requires a carried parcel id");
    addObject(parcelId);
    beliefset.declare(`carrying ${parcelId}`);
    goals = `delivered ${parcelId}`;
  } else if (predicate.type === "go_to") {
    const targetTile = tile(predicate.goal.x, predicate.goal.y);
    addObject(targetTile);
    goals = `at ${targetTile}`;
  } else {
    throw new Error(`Unsupported predicate type for PDDL: ${predicate.type}`);
  }

  return {
    name: `problem_${predicate.type}_${predicate.goal.x}_${predicate.goal.y}`,
    objects: Array.from(objects).join(" "),
    inits: beliefset.toPddlString(),
    goals,
  };
}

/**
 * Helper function to create move actions for the PDDL domain, with an optional check to prevent execution if the intention has been stopped.
 * @param {string} name - The name of the action (e.g., "move-left").
 * @param {string} direction - The direction of movement (e.g., "left", "right", "up", "down").
 * @param {function} checkStopped - An optional function to check if the intention has been stopped.
 * @return {PddlAction} A PddlAction object representing the move action.
 */
function createMoveAction(name, direction, checkStopped) {
  return new PddlAction(
    name,
    "?tile1 ?tile2",
    `(and (at ?tile1) (${direction} ?tile1 ?tile2))`,
    `(and (at ?tile2) (not (at ?tile1)))`,
    async () => {
      if (checkStopped && checkStopped()) {
        return false;
      }
      return Boolean(await client.emitMove(direction));
    },
  );
}

/**
 * Creates a set of PDDL actions for the domain, including movement in four directions, picking up parcels, and putting down parcels. Each action includes an optional check to prevent execution if the intention has been stopped.
 * @param {function} checkStopped - An optional function that returns true if the intention has been stopped, which will prevent the actions from executing.
 * @return {Object} An object containing the PDDL actions for movement, picking up, and putting down.
 */
export function createPddlActions(checkStopped) {
  return {
    moveLeft: createMoveAction("move-left", "left", checkStopped),
    moveRight: createMoveAction("move-right", "right", checkStopped),
    moveUp: createMoveAction("move-up", "up", checkStopped),
    moveDown: createMoveAction("move-down", "down", checkStopped),

    // The pick-up action allows the agent to pick up a parcel from its current location, given that the parcel is at the same tile as the agent and the agent is not already carrying it. The action's effect is to make the agent carry the parcel and remove it from the tile.
    pickUp: new PddlAction(
      "pick-up",
      "?p ?tile",
      "(and (parcel_at ?p ?tile) (at ?tile) (not (carrying ?p)))",
      "(and (carrying ?p) (not (parcel_at ?p ?tile)))",
      async () => {
        if (checkStopped && checkStopped()) return false;
        return Boolean(await client.emitPickup());
      },
    ),

    // The put-down action allows the agent to put down a parcel it is currently carrying onto its current tile, given that the tile is a delivery location. The action's effect is to mark the parcel as delivered and no longer carried by the agent.
    putDown: new PddlAction(
      "put-down",
      "?p ?tile",
      "(and (carrying ?p) (at ?tile) (delivery ?tile))",
      "(and (delivered ?p) (not (carrying ?p)))",
      async () => {
        if (checkStopped && checkStopped()) return false;
        return Boolean(await client.emitPutdown());
      },
    ),
  };
}
