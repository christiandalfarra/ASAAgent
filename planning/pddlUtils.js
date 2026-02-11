import { Beliefset, PddlAction } from "@unitn-asa/pddl-client";
import { readFile } from "node:fs/promises";
import { mapData, agentData } from "../belief/belief.js";
import { client } from "../conf.js";

export const domain = await readFile(
  new URL("./domain.pddl", import.meta.url),
  "utf8",
);

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

function createMoveAction(name, direction, isStoppedFn) {
  return new PddlAction(
    name,
    "?tile1 ?tile2",
    `(and (at ?tile1) (${direction} ?tile1 ?tile2))`,
    `(and (at ?tile2) (not (at ?tile1)))`,
    async () => {
      if (isStoppedFn && isStoppedFn()) {
        return false;
      }
      return Boolean(await client.emitMove(direction));
    },
  );
}

export function createPddlActions(isStoppedFn) {
  return {
    moveLeft: createMoveAction("move-left", "left", isStoppedFn),
    moveRight: createMoveAction("move-right", "right", isStoppedFn),
    moveUp: createMoveAction("move-up", "up", isStoppedFn),
    moveDown: createMoveAction("move-down", "down", isStoppedFn),

    pickUp: new PddlAction(
      "pick-up",
      "?p ?tile",
      "(and (parcel_at ?p ?tile) (at ?tile) (not (carrying ?p)))",
      "(and (carrying ?p) (not (parcel_at ?p ?tile)))",
      async () => {
        if (isStoppedFn && isStoppedFn()) return false;
        return Boolean(await client.emitPickup());
      },
    ),

    putDown: new PddlAction(
      "put-down",
      "?p ?tile",
      "(and (carrying ?p) (at ?tile) (delivery ?tile))",
      "(and (delivered ?p) (not (carrying ?p)))",
      async () => {
        if (isStoppedFn && isStoppedFn()) return false;
        return Boolean(await client.emitPutdown());
      },
    ),
  };
}
