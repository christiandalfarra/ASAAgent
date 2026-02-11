import { agentData } from "../belief/belief.js";
import { client } from "../conf.js";
// shared belief on other agents and parcels
// communicate to achieve intentions/ options
// case of hallway one send a massage  that cant deliver and the other can help it
/**
 * say Message format/protocol:
 * {
 *  type: "say_agents" | "say_intention" | "say_position",
 *  data: {
 *    agents: [ { id, name, x, y, score } ] or
 *    intention: { type, goal, utility, parent } or
 *    position: { x, y }
 *  }
 * }
 */

export async function sayAgents(agents) {
  await client.emitSay(agentData.mateId, {
    type: "say_agents",
    data: agents,
  });
}
export async function sayIntention(predicate) {
  await client.emitSay(agentData.mateId, {
    type: "say_intention",
    data: predicate,
  });
}
export async function sayPositionToMate(){
  await client.emitSay(agentData.mateId, {
    type: "say_position",
    data: agentData.pos,
  });
}

/**
 * ask message format/protocol:
 * {
 * type: "ask_pick_up",
 * data: {
 *   pos: { x, y }
 * }
 */
export async function askPickUp(pos) {
  await client.emitAsk(agentData.mateId, {
    type: "ask_pick_up",
    data: { pos },
  });
}