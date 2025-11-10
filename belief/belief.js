import { AgentData } from "./agentData.js";
import { MapData } from "./mapData.js";
import { EnvData } from "./envData.js";
import { client, teamAgentId } from "../conf.js";
import { sayParcels, sayAgents, sayPositionToMate } from "../coordination/coordination.js";

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
  if (agentData.mateId !== agentData.id) sayPositionToMate();
  agentData.score = Math.round(score);
  /* if (flag) {
   optionsLoop(); // update the options
    flag = false; // set the flag to false
  } */
  agentData.parcelsCarried.filter(
    (parcel) =>
      parcel.carriedBy === agentData.id &&
      !mapData.deliverCoordinates.some(
        (pos) => parcel.x === pos.x && parcel.x === pos.x
      )
  );
});

// update the parcel data in the agent belief
client.onParcelsSensing(async (parcels_sensed) => {
  // update the parcels in the agent data
  let updateParcels = [];
  let timestamp = Date.now() - startTime;
  // push sensed parcels with new timmestamp
  for (let parcel of parcels_sensed) {
    parcel.timestamp = timestamp;
    updateParcels.push(parcel);
  }
  // look in what i see before and update the rewards of the parcels that i don't see anymore
  for (let parcel of agentData.parcels) {
    if (!updateParcels.some((p) => p.id == parcel.id)) {
      let deltat = timestamp - parcel.timestamp;
      //if i don't see the parcel anymore, update the reward in my belief
      parcel.reward = Math.round(
        parcel.reward - Math.round(deltat * envData.decade_frequency) / 1000
      );
      //if the reward is greater than 5, push it to the updateParcels array
      if (parcel.reward > 5) {
        updateParcels.push(parcel);
      }
    }
  }
  if (agentData.mateId !== agentData.id) {
    await sayParcels(updateParcels); // communicate the parcels to the team agent
  }
  //reset to empty array and update the parcels
  agentData.parcels.splice(0, agentData.parcels.length);
  agentData.parcels = JSON.parse(JSON.stringify(updateParcels));
  // update the parcelsCarried array
  agentData.parcels.forEach((parcel) => {
    if (
      parcel.carriedBy === agentData.id &&
      !agentData.parcelsCarried.some((p) => parcel.id === p.id) &&
      !mapData.deliverCoordinates.some(
        (pos) => parcel.x === pos.x && parcel.x === pos.x
      )
    ) {
      agentData.parcelsCarried.push(parcel);
    }
  });
});

// update the agents in the agent belief
client.onAgentsSensing((agents_sensed) => {
  // reset to the original map
  let timestamp = Date.now() - startTime;
  mapData.utilityMap = JSON.parse(JSON.stringify(mapData.map));
  // push sensed agents with new timestamp
  for (let index in agents_sensed) {
    if (agents_sensed[index].id === teamAgentId) continue;
    let a = agents_sensed[index];
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
  let fromId, from = {id, name};
  switch (msg.type) {
    case "say_parcels":
      msg.data.forEach((parcel) => {
        if (!agentData.parcels.some((p) => p.id === parcel.id)) {
          agentData.parcels.push(parcel);
        }
      });
      break;
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
      mapData.updateTileValue(msg.data.x, msg.data.y, 0);
      break;
    case "say_intention":
      agentData.mateIntention = msg.data;
      console.log("DEBUG [belief.js] Mate intention:", agentData.mateIntention);
      break;
    default:
      console.log("DEBUG [belief.js] Unknown message type:", msg.type);
  }
});
