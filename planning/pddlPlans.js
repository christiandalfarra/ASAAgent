import { Plan } from "./Plan.js";
import { readFile } from "../main/utils.js";
import { client } from "../conf.js";
import { mapData, agentData, envData } from "../belief/belief.js";
import { PddlProblem, onlineSolver } from "@unitn-asa/pddl-client";

class PddlPickUp extends Plan {
  static isApplicableTo(type) {
    return type === "pddl_pick_up";
  }

  async execute(predicate) {
    if (this.stopped) throw ["stopped"];

    const domain = await readFile("planning/domain.pddl");
    const problem = this.generateProblem();

    const pddl = new PddlProblem("default", domain, problem);
    const plan = await onlineSolver(pddl);

    for (const step of plan) {
      if (this.stopped) throw ["stopped"];
      await executeStep(step);
    }

    return true;
  }

  generateProblem() {
    const tiles = Object.values(mapData.tiles);
    const parcels = Object.entries(envData.parcels);
    const agentPos = agentData.myTile;

    const objects = [
      ...tiles.map((t) => `${t.name} - tile`),
      ...parcels.map(([id]) => `${id} - parcel`),
    ].join(" ");

    const init = [
      `(at ${agentPos})`,
      ...tiles.flatMap((tile) =>
        Object.entries(tile.adjacent).map(
          ([dir, dest]) => `(${dir} ${tile.name} ${dest})`
        )
      ),
      ...tiles
        .filter((t) => t.blocked)
        .map((t) => `(blocked ${t.name})`),
      ...agentData.enemies.map((e) => `(occupied ${e.tile})`),
      ...tiles
        .filter((t) => mapData.deliverCoordinates.some((d) => d.x === t.x && d.y === t.y))
        .map((t) => `(delivery ${t.name})`),
      ...parcels.map(([id, p]) => `(parcel_at ${id} ${p.tile})`),
    ].join("\n");

    const goals = parcels
      .map(([id, p]) => `(parcel_at ${id} ${p.delivery})`)
      .join("\n");

    return `(define (problem deliveroo)
  (:domain default)
  (:objects
    ${objects}
  )
  (:init
    ${init}
  )
  (:goal
    (and
      ${goals}
    )
  )
)`;
  }
}

class PddlPutDown extends Plan {
  static isApplicableTo(type) {
    return type === "pddl_put_down";
  }

  async execute(predicate) {
    if (this.stopped) throw ["stopped"];

    const domain = await readFile("planning/domain.pddl");
    const problem = this.generateProblem();

    const pddl = new PddlProblem("default", domain, problem);
    const plan = await onlineSolver(pddl);

    for (const step of plan) {
      if (this.stopped) throw ["stopped"];
      await executeStep(step);
    }

    return true;
  }

  generateProblem() {
    const tiles = Object.values(mapData.tiles);
    const parcels = Object.entries(agentData.parcelsCarried);
    const agentPos = agentData.myTile;

    const objects = [
      ...tiles.map((t) => `${t.name} - tile`),
      ...parcels.map(([id]) => `${id} - parcel`),
    ].join(" ");

    const init = [
      `(at ${agentPos})`,
      ...tiles.flatMap((tile) =>
        Object.entries(tile.adjacent).map(
          ([dir, dest]) => `(${dir} ${tile.name} ${dest})`
        )
      ),
      ...tiles
        .filter((t) => t.blocked)
        .map((t) => `(blocked ${t.name})`),
      ...agentData.enemies.map((e) => `(occupied ${e.tile})`),
      ...tiles
        .filter((t) => mapData.deliverCoordinates.some((d) => d.x === t.x && d.y === t.y))
        .map((t) => `(delivery ${t.name})`),
      ...parcels.map(([id, p]) => `(carrying ${id})`),
    ].join("\n");

    const goals = parcels
      .map(([id, p]) => `(parcel_at ${id} ${p.delivery})`)
      .join("\n");

    return `(define (problem deliveroo-putdown)
  (:domain default)
  (:objects
    ${objects}
  )
  (:init
    ${init}
  )
  (:goal
    (and
      ${goals}
    )
  )
)`;
  }
}

async function executeStep(step) {
  if (step.includes("move-right")) await client.emitMove("right");
  else if (step.includes("move-left")) await client.emitMove("left");
  else if (step.includes("move-up")) await client.emitMove("up");
  else if (step.includes("move-down")) await client.emitMove("down");
  else if (step.includes("pick-up")) await client.emitPickup();
  else if (step.includes("put-down")) await client.emitPutdown();
}

export const pddlPlans = [PddlPickUp, PddlPutDown];