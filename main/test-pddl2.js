// main/test-pddl.js
// Static, no CLI args. It tests YOUR existing builder + domain against your Planutils endpoint.
// It mocks a tiny world directly into mapData/agentData, so no Deliveroo connection is needed.

import { readFile } from "fs/promises";
import { requestPlanutilsPlan } from "../planning/planutilsClient.js";
import { mapData, agentData } from "../belief/belief.js";
import { buildProblem } from "../planning/pddlProblemBuilder.js";

// ---------- static settings ----------
const SERVER_URL = "http://192.168.178.151:5001"; // your Planutils server
const TESTS = ["pickup", "putdown"]; // run both modes, sequentially
// ------------------------------------

// Minimal mock world that matches your builder’s expectations
function seedMockWorld() {
  // 1x3 corridor: tile_0_0, tile_1_0, tile_2_0
  mapData.width = 3;
  mapData.height = 1;

  // map[x][y] with 0=wall, 1/2/3 walkable (you use 2 for delivery)
  mapData.map = [
    [1], // x=0,y=0 walkable
    [1], // x=1,y=0 walkable
    [2], // x=2,y=0 delivery
  ];

  // utilityMap mirrors map by default
  mapData.utilityMap = JSON.parse(JSON.stringify(mapData.map));

  // delivery tile set
  mapData.deliverCoordinates = [{ x: 2, y: 0 }];

  // agent at tile_0_0
  agentData.pos = { x: 0, y: 0 };

  // visible ground parcels for pickup test
  agentData.parcels = [
    { id: "p1", x: 0, y: 0, carriedBy: null, reward: 10, timestamp: 0 },
    { id: "p2", x: 1, y: 0, carriedBy: null, reward: 10, timestamp: 0 },
  ];

  // carried parcels for putdown test (filled later)
  agentData.parcelsCarried = [];
  agentData.enemies = []; // none
}

async function run(mode) {
  console.log(`\n🧪 PDDL test: ${mode.toUpperCase()}`);

  const domain = await readFile(new URL("../planning/domain.pddl", import.meta.url), "utf8");

  // Adjust mocked beliefs per mode
  if (mode === "pickup") {
    // already seeded above
  } else if (mode === "putdown") {
    // simulate carrying two parcels; no ground parcels
    agentData.parcels = [];
    agentData.parcelsCarried = [
      { id: "p1", x: 0, y: 0, reward: 10 },
      { id: "p2", x: 0, y: 0, reward: 10 },
    ];
  }

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

(async () => {
  seedMockWorld();
  for (const mode of TESTS) {
    await run(mode);
  }
  console.log("\nDone.");
})();