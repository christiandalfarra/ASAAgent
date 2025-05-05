import { AgentData } from "../belief/agentData.js";
import { Map } from "../belief/map.js";
import { client } from "../config.js";
import { optionsLoop } from "../intention/options.js";
import { mapToMatrix } from "../main/utils.js";

const agentData = new AgentData();
const mapData = new Map();
const startTime = Date.now(); // start time of the game
let flag = true;

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
});

//set the map, delivery and spawning coordinates
client.onMap((width, height, tiles) => {
  mapData.width = width;
  mapData.height = height;
  mapData.map = mapToMatrix(width, height, tiles);
  mapData.utilityMap = mapToMatrix(width, height, tiles);
  mapData.setSpawnCoordinates(tiles);
  mapData.setDeliverCoordinates(tiles);
});

// set other values of the map from the config
client.onConfig((config) => {
  mapData.parcel_reward_avg = config.PARCEL_REWARD_AVG;
  mapData.parcel_observation_distance = config.AGENTS_OBSERVATION_DISTANCE;

  let parcel_decading_interval = "";
  if (config.PARCEL_DECADING_INTERVAL == "infinite") {
    parcel_decading_interval = Number.MAX_VALUE;
  } else {
    parcel_decading_interval =
      config.PARCEL_DECADING_INTERVAL.slice(0, -1) * 1000;
  }
  mapData.movement_duration = config.MOVEMENT_DURATION;
  mapData.decade_frequency =
    config.MOVEMENT_DURATION / parcel_decading_interval;
});

// update the parcel data in the agent belief
client.onParcelsSensing((parcels_sensed) => {
  // update the parcels in the agent data
  let updateParcels = [];
  // push sensed parcels with new timmestamp
  for (let parcel of parcels_sensed) {
    parcel.timestamp = Date.now();
    updateParcels.push(parcel);
  }
  // look in what i see before and update the rewards of the parcels that i don't see anymore
  for (let parcel of agentData.parcels) {
    if (!updateParcels.some((p) => p.id == parcel.id)) {
      let deltat = Date.now() - parcel.timestamp;
      //if i don't see the parcel anymore, update the reward in my belief
      parcel.reward = Math.round(
        parcel.reward - Math.round(deltat / mapData.decade_frequency) / 1000
      );
      //if the reward is greater than 0, push it to the updateParcels array
      if (parcel.reward > 0) {
        updateParcels.push(parcel);
      }
    }
  }
  //reset to empty array and update the parcels
  agentData.parcels = [];
  agentData.parcels = JSON.parse(JSON.stringify(updateParcels));
  if (flag){
    optionsLoop();
    flag = false;
  }
});

// update the agents in the agent belief
client.onAgentsSensing((agents_sensed) => {
  // reset to the original map
  mapData.utilityMap = JSON.parse(JSON.stringify(mapData.map));
  let timestamp = Date.now() - startTime;
  for (let index in agents_sensed) {
    let a = agents_sensed[index];
    a.timestamp = timestamp;
    // if i have not perveived the agent before, add it to my belief
    if (!agentData.enemies.some((agent) => a.id === agent.id)) {
      a.direction = "none";
      agentData.enemies.push(a);
    } else {
      // else, update the agent in my belief
      let previousIndex = agentData.enemies.findIndex(
        (agent) => a.id === agent.id
      );
      let previous = agentData.enemies[previousIndex];
      /* try to predict is possible direction and set the tile in the map to 0
       like a wall, so the agent will not go there, the control is done by look at the timestamp and see if the agent moved 
       in a range of time for three movements
      */
      /* if (timestamp - previous.timestamp < mapData.movement_duration * 3) {
        if (previous.x < a.x) {
          a.direction = "right";
          mapData.updateTileValue(a.x + 1, a.y, 0);
        } else if (previous.x > a.x) {
          a.direction = "left";
          mapData.updateTileValue(a.x - 1, a.y, 0);
        } else if (previous.y < a.y) {
          a.direction = "up";
          mapData.updateTileValue(a.x, a.y + 1, 0);
        } else if (previous.y > a.y) {
          a.direction = "down";
          mapData.updateTileValue(a.x, a.y - 1, 0);
        } else {
          a.direction = "none";
        }
      } */
      agentData.enemies.splice(previousIndex, 1, a);
    }
    for (let a of agentData.enemies) {
      mapData.updateTileValue(a.x, a.y, 0);
    }
  }
});

export { agentData, mapData };
