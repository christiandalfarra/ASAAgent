import { IntentionReplace } from "../intention/intention.js";
import { agentData } from "../belief/belief.js";
import { envData } from "../belief/belief.js";
import { optionsLoop } from "../intention/options.js";
import { client } from "../conf.js"

//set the map, delivery and spawning coordinates
client.onMap((width, height, tiles) => {
  mapData.width = width;
  mapData.height = height;
  mapData.map = convertToMatrix(width, height, tiles);
  mapData.utilityMap = convertToMatrix(width, height, tiles);
  mapData.setSpawnCoordinates(tiles);
  mapData.setDeliverCoordinates(tiles);
});

// set other values of the map from the config
client.onConfig((config) => {
  agentData.parcels = [];
  agentData.parcelsCarried = [];
  envData.parcel_reward_avg = config.PARCEL_REWARD_AVG;
  envData.parcel_observation_distance = config.PARCEL_OBSERVATION_DISTANCE;
  envData.agents_observation_distance = config.AGENTS_OBSERVATION_DISTANCE;
  envData.clock = config.CLOCK;

  agentData.mateId = teamAgentId; // set the team agent id
  console.log("DEBUG [belief.js] Team Agent ID:", agentData.mateId);

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

agentData.intentionReplace = new IntentionReplace();
setInterval(() => {
  optionsLoop();
}, envData.clock * 1);

agentData.intentionReplace.loop();
