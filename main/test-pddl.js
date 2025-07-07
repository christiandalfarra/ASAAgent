// main/test-pddl.js
import { requestPlanutilsPlan } from '../planning/planutilsClient.js';

console.log("🧪 Running Blocks World test...");

const serverUrl = 'http://192.168.178.138:5001'; // Local planutils server

// Classic blocks world domain
const domain = `(define (domain blocks)
  (:requirements :strips :typing)
  (:types block)
  (:predicates
    (on ?x - block ?y - block)
    (ontable ?x - block)
    (clear ?x - block)
    (handempty)
    (holding ?x - block)
  )

  (:action pickup
    :parameters (?x - block)
    :precondition (and (clear ?x) (ontable ?x) (handempty))
    :effect (and (holding ?x) (not (ontable ?x)) (not (clear ?x)) (not (handempty)))
  )

  (:action putdown
    :parameters (?x - block)
    :precondition (holding ?x)
    :effect (and (ontable ?x) (clear ?x) (handempty) (not (holding ?x)))
  )

  (:action stack
    :parameters (?x - block ?y - block)
    :precondition (and (holding ?x) (clear ?y))
    :effect (and (on ?x ?y) (clear ?x) (handempty) (not (holding ?x)) (not (clear ?y)))
  )

  (:action unstack
    :parameters (?x - block ?y - block)
    :precondition (and (on ?x ?y) (clear ?x) (handempty))
    :effect (and (holding ?x) (clear ?y) (not (on ?x ?y)) (not (clear ?x)) (not (handempty)))
  )
)`;

const problem = `(define (problem simple-stack)
  (:domain blocks)
  (:objects A B C - block)
  (:init
    (ontable A) (ontable B) (ontable C)
    (clear A) (clear B) (clear C)
    (handempty)
  )
  (:goal (and
    (on A B) (on B C)
  ))
)`;

(async () => {
  try {
    const result = await requestPlanutilsPlan({ domain, problem, serverUrl });

    // Interpret the result to see if a plan was found
    const sasPlan = result?.result?.output?.sas_plan || "";
    const planFound = !!sasPlan && sasPlan.includes("(");

    if (planFound) {
      console.log("\n✅ Solution found!\nPlan:\n" + sasPlan);
    } else {
      console.log("\n❌ No plan found! Output details:");
      console.dir(result, { depth: null });
    }
  } catch (err) {
    console.error('❌ Error:', err.message || err);
  }
})();