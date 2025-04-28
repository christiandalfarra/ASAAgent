import { client } from "../socketConnection.js"
import { findPath_BFS } from "./utils_planner.js";
import { MyData, MyMap } from "../belief/belief.js";
import { readFile } from "./utils.js";
import { Intention } from '../intention/intention.js';
import { PddlProblem, onlineSolver } from "@unitn-asa/pddl-client";


// Read the domain file for the PDDL planner
let domain = await readFile('./planners/domain.pddl');
// flag to use PDDL planner or not
let usePDDL = false;

/**
 * Plan class
 */
class Plan {

    // This is used to stop the plan
    #stopped = false;
    stop() {
        this.#stopped = true;
        for (const i of this.#sub_intentions) {
            i.stop();
        }
    }
    get stopped() {
        return this.#stopped;
    }

    #parent;

    constructor(parent) {
        this.#parent = parent;
    }

    log(...args) {
        if (this.#parent && this.#parent.log)
            this.#parent.log('\t', ...args)
        else
            console.log(...args)
    }

    #sub_intentions = [];

    async subIntention(predicate) {
        const sub_intention = new Intention(this, predicate);
        this.#sub_intentions.push(sub_intention);
        return await sub_intention.achieve();
    }

}