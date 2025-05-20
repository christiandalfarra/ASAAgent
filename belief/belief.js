import { AgentData } from "./agent.js";
import { MapData } from "./map.js";
import { EnvData } from "./env.js";
import { client } from "../config.js";
import { optionsLoop, optionsRevision } from "../intention/options.js";
import { convertToMatrix } from "../main/utils.js";
import { DEBUG } from "../debug.js"; // added

export const agentData = new AgentData();
export const mapData = new MapData();
export const envData = new EnvData();
export const startTime = Date.now(); // start time of the game
let flag = true; // flag to check if the map is set

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
  if (DEBUG.agentBelief)
    console.log("DEBUG [agentBelief] Self updated:", agentData);
  if (flag) {
    optionsLoop(); // update the options
    flag = false; // set the flag to false
  }
  agentData.parcelsCarried.filter((parcel) => parcel.carriedBy === agentData.id && !mapData.deliverCoordinates.some(parcel.x === pos.x && parcel.x === pos.x))
});

//set the map, delivery and spawning coordinates
client.onMap((width, height, tiles) => {
  mapData.width = width;
  mapData.height = height;
  mapData.map = convertToMatrix(width, height, tiles);
  mapData.utilityMap = convertToMatrix(width, height, tiles);
  mapData.setSpawnCoordinates(tiles);
  mapData.setDeliverCoordinates(tiles);
  if (DEBUG.agentBelief) console.log("DEBUG [agentBelief] Map initialized");
});

// set other values of the map from the config
client.onConfig((config) => {
  agentData.parcels = [];
  agentData.parcelsCarried = [];
  envData.parcel_reward_avg = config.PARCEL_REWARD_AVG;
  envData.parcel_observation_distance = config.PARCEL_OBSERVATION_DISTANCE;
  envData.agents_observation_distance = config.AGENTS_OBSERVATION_DISTANCE;

  let parcel_decading_interval = 0;
  if (config.PARCEL_DECADING_INTERVAL == "infinite") {
    parcel_decading_interval = Number.MAX_VALUE;
  } else {
    parcel_decading_interval =
      config.PARCEL_DECADING_INTERVAL.slice(0, -1) * 1000;
  }
  envData.movement_duration = config.MOVEMENT_DURATION;
  envData.decade_frequency =
    config.MOVEMENT_DURATION / parcel_decading_interval;
  envData.parcel_reward_variance = config.PARCEL_REWARD_VARIANCE;
});
// update the parcel data in the agent belief
client.onParcelsSensing((parcels_sensed) => {
  // update the parcels in the agent data
  let updateParcels = [];
  let timestamp = Date.now() - startTime;
  // push sensed parcels with new timmestamp
  for (let parcel of parcels_sensed) {
    parcel.timestamp = timestamp;
    updateParcels.push(parcel);
  }
  // look in what i see before and update the rewards of the parcels that i don't see anymore
  /* for (let parcel of agentData.parcels) {
    if (!updateParcels.some((p) => p.id == parcel.id)) {
      let deltat = timestamp - parcel.timestamp;
      //if i don't see the parcel anymore, update the reward in my belief
      parcel.reward = Math.round(
        parcel.reward - Math.round(deltat * envData.decade_frequency) / 1000
      );
      //if the reward is greater than 10, push it to the updateParcels array
      if (parcel.reward > 1) {
        updateParcels.push(parcel);
      }
    }
  } */
  //reset to empty array and update the parcels
  agentData.parcels.splice(0,agentData.parcels.length)
  agentData.parcels = JSON.parse(JSON.stringify(updateParcels));
});

function updateEnemies(agents_sensed, timestamp) {
  mapData.utilityMap = JSON.parse(JSON.stringify(mapData.map));
  // push sensed agents with new timestamp
  for (let index in agents_sensed) {
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
}
// update the agents in the agent belief
client.onAgentsSensing((agents_sensed) => {
  // reset to the original map
  let timestamp = Date.now() - startTime;
  updateEnemies(agents_sensed, timestamp);
});
