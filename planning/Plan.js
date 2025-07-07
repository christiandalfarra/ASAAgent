// plans/Plan.js
import { Intention } from "../intention/intention.js";

class Plan {
  #stopped = false;
  #parent;
  #sub_intentions = [];

  constructor(parent) {
    this.#parent = parent;
  }

  stop() {
    this.#stopped = true;
    for (const i of this.#sub_intentions) i.stop();
  }

  log(...args) {
    if (this.#parent?.log) this.#parent.log("\t", ...args);
    else console.log(...args);
  }

  async subIntention(predicate) {
    const sub = new Intention(this, predicate);
    this.#sub_intentions.push(sub);
    return sub.achieve();
  }

  get stopped() {
    return this.#stopped;
  }
}

export { Plan };