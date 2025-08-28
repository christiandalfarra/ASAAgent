import { Plan } from "./Plan.js";
import { readFile } from "../main/utils.js";
import { client } from "../conf.js";
import { buildProblem } from "./pddlProblemBuilder.js";
import { PddlProblem, onlineSolver } from "@unitn-asa/pddl-client";

class PddlPickUp extends Plan {
  static isApplicableTo(type) { return type === "pddl_pick_up"; }

  async execute(/* predicate */) {
    const domain = await readFile("planning/domain.pddl");
    const problem = buildProblem("pickup"); // uses agentData + mapData safely

    // Library usage: pass domain and problem strings
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
    const domain = await readFile("planning/domain.pddl");
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
  if (step.includes("move-right")) return client.emitMove("right");
  if (step.includes("move-left"))  return client.emitMove("left");
  if (step.includes("move-up"))    return client.emitMove("up");
  if (step.includes("move-down"))  return client.emitMove("down");
  if (step.includes("pick-up"))    return client.emitPickup();
  if (step.includes("put-down"))   return client.emitPutdown();
  // Unknown step: fail fast
  return false;
}

export const pddlPlans = [PddlPickUp, PddlPutDown];