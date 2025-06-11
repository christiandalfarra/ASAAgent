import { agentData } from "../belief/belief.js";
import { client } from "../conf.js";
// shared belief on other agents and parcels
// communicate to achieve intentions/ options
// case of hallway one send a massage  that cant deliver and the other can help it
/**
 * say Message format/protocol:
 * {
 *  type: "say_agents" | "say_parcels" | "say_intention",
 *  data: {
 *    agents: [ { id, name, x, y, score } ] or
 *    parcels: [ { id, x, y, reward, carriedBy } ]
 * }
 */

export async function sayAgents(agents) {
  await client.emitSay(agentData.mateId, {
    type: "say_agents",
    data: agents,
  });
}
export async function sayParcels(parcels) {
  await client.emitSay(agentData.mateId, {
    type: "say_parcels",
    data: parcels,
  });
}
export async function sayIntention(predicate) {
  await client.emitSay(agentData.mateId, {
    type: "say_intention",
    data: predicate,
  });
}

/**
 * ask message format/protocol:
 * {
 * type: "ask_pick_up" | "ask_put_down",
 * data: {
 *   parcel: { id, x, y, reward, carriedBy } or
 *   putdwon: { x, y }
 * * }
 */
export async function askPickUp(parcel) {
  client.emitAsk(agentData.mateId, {});
}
export async function askPutDown() {}
