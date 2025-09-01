// main/test-pddl.js
// Static, no CLI args. Tests your PDDL domain+problem builder against a Planutils server.
// It seeds beliefs (mapData/agentData) locally. No Deliveroo connection is required.

import { readFile } from "fs/promises";
import { requestPlanutilsPlan } from "../planning/planutilsClient.js";
import { mapData, agentData } from "../belief/belief.js";
import { buildProblem } from "../planning/pddlProblemBuilder.js";

// ---------- settings ----------
const SERVER_URL = "http://192.168.178.151:5001"; // your Planutils server
// --------------------------------

// Inline big map (0=wall, 1/3=walkable, 2=delivery)
const bigMatrix = [
  [0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,2,1,1,0,0,0],
  [0,0,1,1,2,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,2,1,1,0,0,0],
  [0,0,1,1,2,1,1,1,1,0,0,0,1,1,0,0,1,1,1,1,1,1,1,0,0,1,1,1,1,1],
  [0,0,1,1,0,0,1,1,1,0,0,0,1,1,0,0,1,1,1,1,1,1,1,0,0,1,1,1,1,1],
  [0,0,1,1,0,0,1,1,1,1,0,0,1,1,0,0,1,1,1,0,0,0,0,0,0,0,0,0,1,1],
  [0,1,1,1,0,0,0,1,1,1,1,1,1,1,0,0,1,1,1,0,0,0,0,0,0,0,0,0,1,1],
  [1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1],
  [1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1],
  [1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1],
  [0,0,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,1,1,1,1,1,0,0,0,0,0,1,1],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,1,1,1,1,1,0,0,0,0,1,1],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,0,0,0,0,0,1,1],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,0,0,0,0,0,1,1,1],
  [0,0,1,1,0,0,0,0,0,1,1,1,1,1,1,1,0,1,1,1,1,0,0,0,0,0,1,1,1,1],
  [0,0,1,1,0,0,0,0,0,1,1,0,0,0,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,0],
  [0,0,1,1,0,0,0,0,0,1,1,0,0,0,1,1,1,1,1,0,0,0,0,0,1,1,1,1,0,0],
  [0,0,1,1,0,0,0,0,0,1,1,0,0,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,0,0],
  [1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,0,0,0,0,1,1],
  [2,2,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,0,0,0,0,1,1],
  [1,1,1,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,1,1],
  [1,1,1,1,0,0,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,0,1,1,0,0,0,0,2,2],
  [0,1,1,1,1,1,1,1,1,1,0,1,1,1,0,0,1,1,1,1,0,0,1,1,0,0,0,0,1,1],
  [0,0,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1],
  [0,0,0,1,1,1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1]
];

// --------- world seeding from matrix ---------
function loadMatrixAsWorld(matrix) {
  mapData.height = matrix.length;
  mapData.width = matrix[0].length;

  // Transpose into map[x][y] as required by your codebase
  mapData.map = Array.from({ length: mapData.width }, (_, x) =>
    Array.from({ length: mapData.height }, (_, y) => matrix[y][x])
  );
  mapData.utilityMap = JSON.parse(JSON.stringify(mapData.map));

  // Extract delivery tiles
  mapData.deliverCoordinates = [];
  for (let y = 0; y < mapData.height; y++) {
    for (let x = 0; x < mapData.width; x++) {
      if (mapData.map[x][y] === 2) mapData.deliverCoordinates.push({ x, y });
    }
  }
}

// Helpers over current map
function isWalkable(x, y) {
  if (x < 0 || y < 0 || x >= mapData.width || y >= mapData.height) return false;
  const v = mapData.map[x][y];
  return v === 1 || v === 2 || v === 3;
}
function listWalkables() {
  const out = [];
  for (let y = 0; y < mapData.height; y++) {
    for (let x = 0; x < mapData.width; x++) {
      if (isWalkable(x, y)) out.push({ x, y });
    }
  }
  return out;
}

// --------- scenarios ----------
function scenarioEasy() {
  const walkables = listWalkables();
  if (walkables.length === 0) throw new Error("No walkable tiles in map.");

  // Agent at first walkable
  const a0 = walkables[0];
  agentData.pos = { x: a0.x, y: a0.y };

  // Two ground parcels on nearby walkables (fallbacks if not enough)
  const pA = walkables[1] ?? a0;
  const pB = walkables[2] ?? a0;

  agentData.parcels = [
    { id: "p1", x: pA.x, y: pA.y, carriedBy: null, reward: 15, timestamp: 0 },
    { id: "p2", x: pB.x, y: pB.y, carriedBy: null, reward: 12, timestamp: 0 }
  ];
  agentData.parcelsCarried = [];
  agentData.enemies = [];
}

function scenarioHard() {
  const walkables = listWalkables();
  if (walkables.length < 4) throw new Error("Not enough walkable tiles for hard scenario.");

  // Agent at a distant walkable (end of list)
  const a0 = walkables[walkables.length - 1];
  agentData.pos = { x: a0.x, y: a0.y };

  // Two carried parcels to force delivery planning
  agentData.parcelsCarried = [
    { id: "c1", x: a0.x, y: a0.y, reward: 20 },
    { id: "c2", x: a0.x, y: a0.y, reward: 18 }
  ];

  // Three ground parcels spread across the map
  const i1 = Math.floor(walkables.length / 6);
  const i2 = Math.floor(walkables.length / 2);
  const i3 = Math.floor((5 * walkables.length) / 6);

  const g1 = walkables[i1];
  const g2 = walkables[i2];
  const g3 = walkables[i3];

  agentData.parcels = [
    { id: "g1", x: g1.x, y: g1.y, carriedBy: null, reward: 22, timestamp: 0 },
    { id: "g2", x: g2.x, y: g2.y, carriedBy: null, reward: 16, timestamp: 0 },
    { id: "g3", x: g3.x, y: g3.y, carriedBy: null, reward: 25, timestamp: 0 }
  ];

  agentData.enemies = []; // PDDL domain ignores enemies
}

// --------- helpers for pickup→deliver in one plan ---------
function replaceGoal(problemStr, goalExpr) {
  // Replace the entire (:goal ... ) block up to the final ')'
  return problemStr.replace(
    /\(:goal[\s\S]*?\)\s*\)\s*$/m,
    `(:goal\n    ${goalExpr}\n  )\n)`
  );
}

async function runPickupThenDeliver(parcelId, label = `PICKUP→DELIVER ${parcelId}`) {
  console.log(`\n🧪 PDDL test: ${label}`);

  const existsOnGround = (agentData.parcels || []).some(
    p => p.id === parcelId && !p.carriedBy
  );
  if (!existsOnGround) {
    throw new Error(`Parcel ${parcelId} not found on ground in agentData.parcels`);
  }

  const domain = await readFile(new URL("../planning/domain.pddl", import.meta.url), "utf8");
  const pickupProblem = buildProblem("pickup"); // objects/init with parcel on ground
  const problem = replaceGoal(pickupProblem, `(delivered ${parcelId})`);

  console.log("\n----- PROBLEM (pickup→deliver) -----\n" + problem);

  const result = await requestPlanutilsPlan({ domain, problem, serverUrl: SERVER_URL });
  const sasPlan = result?.result?.output?.sas_plan || "";
  const steps = sasPlan
    .split("\n")
    .map(s => s.trim())
    .filter(s => s.startsWith("("));

  if (steps.length) {
    console.log("\n✅ PLAN FOUND:");
    steps.forEach((s, i) => console.log(`${i + 1}. ${s}`));
  } else {
    console.log("\n❌ NO PLAN. Raw result follows:");
    console.dir(result, { depth: null });
  }
}

// --------- generic planner driver ---------
async function run(mode, label) {
  console.log(`\n🧪 PDDL test: ${label ?? mode.toUpperCase()}`);

  const domain = await readFile(new URL("../planning/domain.pddl", import.meta.url), "utf8");
  const problem = buildProblem(mode);

  console.log("\n----- PROBLEM -----\n" + problem);

  const result = await requestPlanutilsPlan({ domain, problem, serverUrl: SERVER_URL });
  const sasPlan = result?.result?.output?.sas_plan || "";
  const steps = sasPlan
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("("));

  if (steps.length) {
    console.log("\n✅ PLAN FOUND:");
    steps.forEach((s, i) => console.log(`${i + 1}. ${s}`));
  } else {
    console.log("\n❌ NO PLAN. Raw result follows:");
    console.dir(result, { depth: null });
  }
}

// --------- main ---------
(async () => {
  // Load big map
  loadMatrixAsWorld(bigMatrix);

  // Scenario A: easy pickup on the large map
  scenarioEasy();
  await run("pickup", "EASY / PICKUP");

  // Pickup→Deliver for a specific parcel in the same problem
  await runPickupThenDeliver("p1", "EASY / PICKUP→DELIVER p1");

  // Scenario B: deliver carried parcels across the map
  scenarioHard();
  await run("putdown", "HARD / PUTDOWN");

  // Optional: also test pickup on hard
  await run("pickup", "HARD / PICKUP");

  console.log("\nDone.");
})();