import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { AgentBelief } from "../belief/agentBelief.js";
import {Map} from "../belief/map.js";
import { mapToMatrix } from "../belief/utils.js";

//import AStar from "../astar.js";
const localhost = "http://localhost:8080";
const serverProf = "https://deliveroojs2.rtibdi.disi.unitn.it/";
const server = "https://deliveroojs25.azurewebsites.net";
const client = new DeliverooApi(
  localhost,
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQwMzdmMiIsIm5hbWUiOiJtYXJjbyIsInRlYW1JZCI6IjQxOTMyYSIsInRlYW1OYW1lIjoiZGlzaSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzQ0Nzk1NjUyfQ.zPWRmZQ0gyR9af8KbuaTj2g9CHDudB8smFcEF2qv--8"
);
function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
  const dx = Math.abs(Math.round(x1) - Math.round(x2));
  const dy = Math.abs(Math.round(y1) - Math.round(y2));
  return dx + dy;
}
var agentData = new AgentBelief()     // Instance of AgentData for the agent itself
var mapData = new Map();        // Instance of Map for the agent itself
const start = Date.now();   // Start time of the agent used only in belief.js

//Set first time the agent data or update
client.onYou(({ id, name, x, y, score }) => {
  // if first time, set the id and name
  if (agentData.id == "" || agentData.id == "") {
    agentData.id = id;
    agentData.name = name;
  }
  agentData.pos.x = Math.round(x);
  agentData.pos.y = Math.round(y);
});

//set the map, delivry and spawning coordinates
client.onMap((width, height, tiles) => {
  mapData.width = width
  mapData.height = height
  mapData.map = mapToMatrix(width, height, tiles);
  mapData.setSpawnCoordinates(tiles);
  mapData.setDeliverCoordinates(tiles);
});
// set other values of the map from the config
client.onConfig((config) => {
  mapData.parcel_reward_avg = config.PARCEL_REWARD_AVG
  console.log("Parcel reward avg: ", mapData.parcel_reward_avg)
  mapData.parcel_observation_distance = config.AGENTS_OBSERVATION_DISTANCE
  console.log("Parcel observation distance: ", mapData.parcel_observation_distance)
  mapData.decade_frequency = config.decade_frequency
  //movement_duration = config.movement_duration
  //parcel_decading_interval = config.parcel_decading_interval
})