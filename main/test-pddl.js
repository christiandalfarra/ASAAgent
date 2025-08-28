import { requestPlanutilsPlan } from '../planning/planutilsClient.js';

console.log("🧪 Running Deliveroo PDDL advanced test...");

const serverUrl = 'http://192.168.178.151:5001'; // Or your actual address

const domain = await (await import('fs/promises')).readFile(
  new URL('../planning/domain.pddl', import.meta.url),
  'utf8'
);

const problem = `(define (problem deliveroo-advanced)
  (:domain default)
  (:objects
    tile1 tile2 tile3 - tile
    p1 p2 - parcel
  )
  (:init
    (right tile1 tile2)
    (left tile2 tile1)
    (right tile2 tile3)
    (left tile3 tile2)

    (at tile1)
    (parcel_at p1 tile1)
    (parcel_at p2 tile1)
    (delivery tile3)
  )
  (:goal (and
    (parcel_at p1 tile3)
    (parcel_at p2 tile3)
  ))
)`;

(async () => {
  try {
    const result = await requestPlanutilsPlan({ domain, problem, serverUrl });
    const sasPlan = result?.result?.output?.sas_plan || "";
    const planFound = !!sasPlan && sasPlan.includes("(");

    if (planFound) {
      console.log("\n✅ Solution found!\nPlan:\n" + sasPlan);
    } else {
      console.log("\n❌ No plan found! Output details:");
      console.dir(result, { depth: null });
    }
  } catch (err) {
    console.error('❌ Error:', err.message || err);
  }
})();