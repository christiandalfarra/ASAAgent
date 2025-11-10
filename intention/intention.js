import { plans } from "../planning/plans.js";
import { agentData } from "../belief/belief.js";
import { sayIntention } from "../coordination/coordination.js";
import { checkOption } from "../main/utils.js";
import {
  findNearestDelivery,
  distanceAStar,
  countCloseParcels,
  utilityDistanceAStar,
  pickUpUtility,
} from "../main/utils.js";

/**
 * Intention class
 * Represents a goal the agent is trying to achieve.
 * It handles the selection and execution of appropriate plans.
 */
export class Intention {
  // Currently active plan instance
  #current_plan; // The plan currently being executed
  #parent; // Reference to the parent object (typically another plan or agent)
  #stopped = false; // Flag to indicate if the intention is stopped
  #started = false; // Flag to indicate if the intention has started
  #predicate; // The goal/predicate associated with this intention (e.g., ['go_to', x, y])
  #sub_intentions = []; // Array to hold sub-intentions

  constructor(parent, predicate) {
    this.#parent = parent;
    this.#predicate = predicate;
  }

  stop() {
    // Stop current plan and mark intention as stopped
    this.#stopped = true;
    if (this.#current_plan) this.#current_plan.stop();
  }

  // Log function, using parent logger if available
  log(...args) {
    if (this.#parent && this.#parent.log) this.#parent.log("\t", ...args);
    else console.log(...args);
  }

  /**
   * Attempt to achieve the intention using available plans
   */
  async achieve() {
    // Prevent re-execution if already started
    if (this.#started) return this;
    else this.#started = true;

    // Iterate through all available plans
    for (const planClass of plans) {
      // Abort if intention was stopped
      if (this.stopped) throw ["stopped intention", this.#predicate];

      // Check if the plan is applicable
      if (
        this.#predicate &&
        planClass.isApplicableTo(this.#predicate.type)
      ) {
        // Instantiate and execute the plan
        this.#current_plan = new planClass(this.#predicate);
        this.log(
          "achieving intention",
          this.#predicate,
          "with plan",
          planClass.name
        );
        if (agentData.mateId !== agentData.id) {
          await sayIntention(this.predicate);
        }

        try {
          const plan_res = await this.#current_plan.execute(this.predicate);
          this.log(
            "succesful intention",
            this.#predicate,
            "with plan",
            planClass.name,
            "with result:",
            plan_res
          );
          return plan_res;
        } catch (error) {
          this.log(
            "failed intention",
            this.predicate,
            "with plan",
            planClass.name,
            "with error:",
            error instanceof Error ? error.message : JSON.stringify(error)
          );
          return false;
        }
      }
    }

    // Final check if the intention was stopped
    if (this.stopped) throw ["stopped intention", this.predicate];
  }

  get stopped() {
    return this.#stopped;
  }

  get predicate() {
    return this.#predicate;
  }

  async subIntention(predicate) {
    const sub_intention = new Intention(this, predicate);
    this.#sub_intentions.push(sub_intention);
    return sub_intention.achieve();
  }
}
export class IntentionRevision {
  intentions_queue = [];

  async loop() {
    while (true) {
      if (this.intentions_queue.length > 0) {
        // sort intentions by their utility (fix: return comparator value)
        this.intentions_queue.forEach((intention, _ ) => {
          if (intention.predicate.type === "go_pick_up") {
            intention.predicate.utility = pickUpUtility(
              intention.predicate.goal
            );
          }
        });
        this.intentions_queue.sort(
          (a, b) => b.predicate.utility - a.predicate.utility
        );
        const intention = this.intentions_queue[0];

        if (
          agentData.currentIntention &&
          !checkOption(
            intention.predicate,
            agentData.currentIntention.predicate
          )
        ) {
          agentData.currentIntention.stop();
        }
        // Se già stoppata, scarta e continua
        if (intention.stopped) {
          this.intentions_queue.shift();
          continue;
        }
        // Esegui la migliore
        agentData.currentIntention = intention;
        console.log("[intention.js] my current intention", agentData.currentIntention);
        console.log("[intention.js] mate intention", agentData.mateIntention);
        // comunica l'intenzione al mate
        sayIntention(intention.predicate);
        await intention.achieve();
        this.intentions_queue.shift();
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  async push(predicate) {
    if (!predicate) return;

    // Aggiorna utilità se già presente
    if (this.intentions_queue.length > 0) {
      const temp = this.intentions_queue.find((intention) =>
        checkOption(intention?.predicate, predicate)
      );
      if (temp) {
        temp.predicate.utility = predicate.utility;
        return;
      }
    }

    // Evita conflitto con mia/mate intention
    if (
      agentData.currentIntention &&
      checkOption(predicate, agentData.currentIntention.predicate)
    ) {
      return;
    }
    if (
      agentData.mateId !== agentData.id &&
      agentData.mateIntention &&
      checkOption(predicate, agentData.mateIntention.predicate)
    ) {
      return;
    }

    console.log("pushing intention controls passed", predicate);
    const intention = new Intention(this, predicate);
    this.intentions_queue.push(intention);

    // Preemption se entra qualcosa di più importante
    const best_intention = this.intentions_queue.reduce(
      (a, b) => (a.predicate.utility > b.predicate.utility ? a : b),
      this.intentions_queue[0]
    );
    if (
      agentData.currentIntention &&
      !checkOption(
        best_intention.predicate,
        agentData.currentIntention.predicate
      )
    ) {
      agentData.currentIntention.stop();
    }
  }
}
