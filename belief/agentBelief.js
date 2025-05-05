import { AgentData } from "../belief/agentData.js";
import { Map } from "../belief/map.js";
import { client } from "../config.js";
import { mapToMatrix } from "../main/utils.js";

const agentData = new AgentData();
const mapData = new Map();
const startTime = Date.now(); // Store the start time of the game

// Listener for agent-specific data
client.onYou(({ id, name, x, y, score }) => {
  // Set id and name if not already set
  if (agentData.id == "" || agentData.name == "") {
    agentData.id = id;
    agentData.name = name;
  }
  // Update position and score
  agentData.pos.x = Math.round(x);
  agentData.pos.y = Math.round(y);
  agentData.score = Math.round(score);
});

// Listener for map data
client.onMap((width, height, tiles) => {
  // Set dimensions and map matrix
  mapData.width = width;
  mapData.height = height;
  mapData.map = mapToMatrix(width, height, tiles);
  mapData.utilityMap = mapToMatrix(width, height, tiles);
  mapData.setSpawnCoordinates(tiles);
  mapData.setDeliverCoordinates(tiles);
});

// Listener for configuration parameters
client.onConfig((config) => {
  mapData.parcel_reward_avg = config.PARCEL_REWARD_AVG;
  mapData.parcel_observation_distance = config.AGENTS_OBSERVATION_DISTANCE;

  let parcel_decading_interval = "";
  if (config.PARCEL_DECADING_INTERVAL == "infinite") {
    parcel_decading_interval = Number.MAX_VALUE;
  } else {
    parcel_decading_interval =
      config.PARCEL_DECADING_INTERVAL.slice(0, -1) * 1000; // Convert from s to ms
  }
  mapData.movement_duration = config.MOVEMENT_DURATION;
  mapData.decade_frequency =
    config.MOVEMENT_DURATION / parcel_decading_interval;
});

// Listener for sensed parcels
client.onParcelsSensing((parcels_sensed) => {
  let updateParcels = [];

  // Add or update sensed parcels with timestamp
  for (let parcel of parcels_sensed) {
    parcel.timestamp = Date.now();
    updateParcels.push(parcel);
  }

  // Update parcels not currently visible by decaying reward
  for (let parcel of agentData.parcels) {
    if (!updateParcels.some((p) => p.id == parcel.id)) {
      let deltat = Date.now() - parcel.timestamp;
      parcel.reward = Math.round(
        parcel.reward - Math.round(deltat / mapData.decade_frequency) / 1000
      );
      if (parcel.reward > 0) {
        updateParcels.push(parcel);
      }
    }
  }

  // Update the agent's belief with refreshed parcels
  agentData.parcels = [];
  agentData.parcels = JSON.parse(JSON.stringify(updateParcels));
});

// Listener for sensed agents (enemies)
client.onAgentsSensing((agents_sensed) => {
  mapData.utilityMap = JSON.parse(JSON.stringify(mapData.map));
  let timestamp = Date.now() - startTime;

  for (let index in agents_sensed) {
    let a = agents_sensed[index];
    a.timestamp = timestamp;

    // If new enemy, add to belief
    if (!agentData.enemies.some((agent) => a.id === agent.id)) {
      a.direction = "none";
      agentData.enemies.push(a);
    } else {
      // Update existing enemy
      let previousIndex = agentData.enemies.findIndex(
        (agent) => a.id === agent.id
      );
      let previous = agentData.enemies[previousIndex];

      // Predict enemy direction (disabled logic)
      /*
      if (timestamp - previous.timestamp < mapData.movement_duration * 3) {
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
      }
      */

      // Replace old enemy data
      agentData.enemies.splice(previousIndex, 1, a);
    }

    // Update utility map to treat enemy location as wall
    for (let a of agentData.enemies) {
      mapData.updateTileValue(a.x, a.y, 0);
    }
  }
});

export { agentData, mapData };
