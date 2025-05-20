import { plans } from "../planning/plans.js";
import { agentData } from "../belief/belief.js";
import { optionsLoop } from "./options.js";

/**
 * Intention class
 * Represents a goal the agent is trying to achieve.
 * It handles the selection and execution of appropriate plans.
 */
class Intention {
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
      console.log(
        "checking plan",
        planClass.name,
        "for intention",
        this.#predicate
      );
      if (
        planClass &&
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

        try {
          const plan_res = await this.#current_plan.execute(
            this.#predicate.goal
          );
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
class IntentionRevision {
  #intentions_queue = new Array();
  async loop() {
    while (true) {
      if (this.#intentions_queue.length > 0) {
        const intention = this.#intentions_queue[0];
        agentData.currentIntention = intention;
        let achieve = await intention.achieve();
        console.log("DEBUG [intention.js] Intention achieved:", achieve);
        this.#intentions_queue.shift();
        optionsLoop(); // Update options after achieving the intention
      }
      await new Promise((resolve) => setImmediate(resolve)); // Wait for 1 second before checking again
    }
  }
  get intentions_queue() {
    return this.#intentions_queue;
  }
}
class IntentionReplace extends IntentionRevision {
  async push(predicate) {
    console.log(
      "DEBUG [intention.js] Intention queue before push:",
      this.intentions_queue.map((i) => i.predicate)
    );
    console.log("DEBUG [intention.js] Pushing new intention:", predicate);

    if (
      this.intentions_queue.some(
        (intention) =>
          predicate.type === intention.predicate.type &&
          predicate.goal === intention.predicate.goal
      )
    )
      return;

    const intention = new Intention(this, predicate);
    this.intentions_queue.push(intention);

    const best = this.intentions_queue[0];
    if (
      best &&
      agentData.currentIntention &&
      agentData.currentIntention !== best
    ) {
      console.log(
        "DEBUG [intention.js] Stopping current intention for better one."
      );
      agentData.currentIntention.stop();
    }
  }
}

export { IntentionReplace, Intention, IntentionRevision };
