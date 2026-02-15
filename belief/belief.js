import { AgentData } from "./agentData.js";
import { MapData } from "./mapData.js";
import { EnvData } from "./envData.js";
import { client, teamAgentId } from "../conf.js";
import { Intention } from "../intention/intention.js";
import {
  sayAgents,
  sayPositionToMate,
} from "../coordination/coordination.js";

export const agentData = new AgentData();
export const mapData = new MapData();
export const envData = new EnvData();
export const startTime = Date.now(); // start time of the game

//Set first time the agent data or update
client.onYou(({ id, name, x, y, score }) => {
  // if first time, set the id and name
  if (agentData.id == "" || agentData.id == "") {
    agentData.id = id;
    agentData.name = name;
  }
  agentData.pos.x = Math.round(x);
  agentData.pos.y = Math.round(y);
  agentData.score = Math.round(score);
  sayPositionToMate(); // communicate the position to the team agent
});

// update the parcel data in the agent belief
client.onParcelsSensing((parcels_sensed) => {
  let timestamp = Date.now() - startTime;
  for (let index in parcels_sensed) {
    let p = parcels_sensed[index];
    if (agentData.parcels.has(p.id) && p.carriedBy == null) {
      // if i have seen it before, update the parcel data
      p.timestamp = timestamp;
      agentData.parcels.set(p.id, p);
    }else if (!agentData.parcels.has(p.id)) {
      // if i never seen it before, push it to the array
      p.timestamp = timestamp;
      agentData.parcels.set(p.id, p);
    }
    if (agentData.parcels.has(p.id) && p.carriedBy != null) {
      if (p.carriedBy == agentData.id) {
        // update the carried parcels
        agentData.parcelsCarried.set(p.id, p);
      } else {
        agentData.parcelsCarried.delete(p.id);
      }
      // if i have seen it before but now is carried, remove it from the array
      agentData.parcels.delete(p.id);
    }
  }
});

// update the agents in the agent belief
client.onAgentsSensing((agents_sensed) => {
  // reset to the original map
  let timestamp = Date.now() - startTime;
  mapData.utilityMap = JSON.parse(JSON.stringify(mapData.map));
  // push sensed agents with new timestamp
  for (let index in agents_sensed) {
    let a = agents_sensed[index]
    if (a.id === teamAgentId) continue;
    // if i never seen it before, push it to the array
    if (!agentData.enemies.some((enemy) => enemy.id == a.id)) {
      a.timestamp = timestamp;
      agentData.enemies.push(a);
    } else {
      // if i have seen it before, update the timestamp, check if i see it
      // more than 10 movements ago, if so, remove it from the array
      let deltat =
        timestamp -
        agentData.enemies.find((enemy) => enemy.id == a.id).timestamp;
      if (deltat > envData.movement_duration * 10) {
        agentData.enemies = JSON.parse(
          JSON.stringify(agentData.enemies.filter((enemy) => enemy.id !== a.id))
        );
      }
    }
  }
  for (let a of agentData.enemies) {
    mapData.updateTileValue(a.x, a.y, 0);
  }
  sayAgents(agentData.enemies); // communicate the agents to the team agent
});

client.onMsg(async (id, name, msg, reply) => {
  switch (msg.type) {
    case "say_agents":
      msg.data.forEach((agent) => {
        if (!agentData.enemies.some((a) => a.id === agent.id)) {
          agentData.enemies.push(agent);
          mapData.updateTileValue(agent.x, agent.y, 0);
        }
      });
      break;
    case "say_position":
      agentData.matePosition = msg.data;
      break;
    case "say_intention":
      agentData.mateIntention = new Intention(null, msg.data);
      break;
    case "ask_pick_up":
      const posPickUp = msg.data
      console.log("[belief.js] Pick up request at position:", posPickUp);
      // block the intention that i am currently doing
      await agentData.currentIntention?.stop();
      // go to the position and pick up the parcel
      try {
        const pickUpIntention = new Intention(null, {
          type: "go_pick_up",
          goal: posPickUp,
          utility: 1000,
        });
        await agentData.myIntentions.push(pickUpIntention);
      } catch (error) {
        console.log(
          "[belief.js] Failed to achieve pick up intention",
          error
        );
      }
      break;
    default:
      console.log("[belief.js] Unknown message type:", msg.type);
  }
});
