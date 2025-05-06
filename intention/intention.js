import { plans } from "../planning/plans.js";
import { agentData } from "../belief/agentBelief.js";
import { optionsLoop } from "./options.js";

/**
 * Intention class
 * Represents a goal the agent is trying to achieve.
 * It handles the selection and execution of appropriate plans.
 */
class Intention {
  // Currently active plan instance
  #current_plan;

  // Flag to indicate if the intention is stopped
  #stopped = false;
  get stopped() {
    return this.#stopped;
  }
  stop() {
    // Stop current plan and mark intention as stopped
    this.#stopped = true;
    if (this.#current_plan) this.#current_plan.stop();
  }

  // Reference to the parent object (typically another plan or agent)
  #parent;

  // The goal/predicate associated with this intention (e.g., ['go_to', x, y])
  get predicate() {
    return this.#predicate;
  }
  #predicate;

  constructor(parent, predicate) {
    this.#parent = parent;
    this.#predicate = predicate;
  }

  // Log function, using parent logger if available
  log(...args) {
    if (this.#parent && this.#parent.log) this.#parent.log("\t", ...args);
    else console.log(...args);
  }

  #started = false;
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
      console.log(
        "checking plan",
        planClass.name,
        "for intention",
        this.#predicate
      );
      if (
        planClass &&
        this.#predicate &&
        planClass.isApplicableTo(this.#predicate[0])
      ) {
        // Instantiate and execute the plan
        this.#current_plan = new planClass(this.#predicate);
        this.log(
          "achieving intention",
          this.#predicate,
          "with plan",
          planClass.name
        );

        try {
          const plan_res = await this.#current_plan.execute(this.#predicate);
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
            error
          );
        }
      }
    }

    // Final check if the intention was stopped
    if (this.stopped) throw ["stopped intention", ...this.predicate];

    // No plan could satisfy the intention
    this.log("no plan satisfied the intention ", this.predicate);
    throw ["no plan satisfied the intention ", this.predicate];
  }
}
class IntentionRevision {
  #intentions_queue = new Array();
  get intentions_queue() {
    return this.#intentions_queue;
  }
  async loop() {
    while (true) {
      // Update agent options
      if (this.#intentions_queue.length > 0) {
        const intention = this.#intentions_queue[0];
        agentData.currentIntention = intention;
        await intention.achieve();
        this.#intentions_queue.shift();
      }
      await new Promise((resolve) => setImmediate(resolve)); // Wait for 1 second before checking again
    }
  }
}
class IntentionReplace extends IntentionRevision {
  async push(predicate) {
    console.log("DEBUG push predicate:", predicate);
    if (
      this.intentions_queue.some(
        (intention) =>
          predicate[0] === intention.predicate[0] &&
          predicate[1] === intention.predicate[1] &&
          predicate[2] === intention.predicate[2]
      )
    )
      return;
    const intention = new Intention(this, predicate);
    this.intentions_queue.push(intention);

    const best = this.intentions_queue[0];
    if (
      best &&
      agentData.currentIntention !== best &&
      agentData.currentIntention
    ) {
      agentData.currentIntention.stop(); // Stop the current intention if it's not the best one
    }
  }
}

export { IntentionReplace, Intention };
