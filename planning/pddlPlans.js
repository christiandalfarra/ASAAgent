// planning/pddlPlans.js
import { Plan } from "./Plan.js";
import { readFile } from "../main/utils.js";
import { client } from "../conf.js";
import { buildProblem } from "./pddlProblemBuilder.js";
import { PddlProblem, onlineSolver } from "@unitn-asa/pddl-client";

class PddlPickUp extends Plan {
  static isApplicableTo(type) { return type === "pddl_pick_up"; }

  async execute(/* predicate */) {
    const domain = await readFile("planning/domain.pddl"); // deliveroo-bdi
    const problem = buildProblem("pickup");                // carry any ground parcel

    const plan = await onlineSolver(domain, problem);
    if (!Array.isArray(plan) || plan.length === 0) return false;

    for (const step of plan) {
      if (this.stopped) return false;
      const ok = await execStep(step);
      if (!ok) return false;
    }
    return true;
  }
}

class PddlPutDown extends Plan {
  static isApplicableTo(type) { return type === "pddl_put_down"; }

  async execute(/* predicate */) {
    const domain = await readFile("planning/domain.pddl"); // deliver on delivery tile
    const problem = buildProblem("putdown");

    const plan = await onlineSolver(domain, problem);
    if (!Array.isArray(plan) || plan.length === 0) return false;

    for (const step of plan) {
      if (this.stopped) return false;
      const ok = await execStep(step);
      if (!ok) return false;
    }
    return true;
  }
}

async function execStep(step) {
  const s = String(step).toLowerCase();
  if (s.includes("move-right")) return client.emitMove("right");
  if (s.includes("move-left"))  return client.emitMove("left");
  if (s.includes("move-up"))    return client.emitMove("up");
  if (s.includes("move-down"))  return client.emitMove("down");
  if (s.includes("pick-up"))    return client.emitPickup();

  // Domain has (:action deliver); runtime API performs "putdown" on delivery tiles.
  if (s.includes("deliver"))    return client.emitPutdown();

  // Optional: if you also kept (:action put-down) in the domain
  if (s.includes("put-down"))   return client.emitPutdown();

  return false; // unknown step
}

export const pddlPlans = [PddlPickUp, PddlPutDown];