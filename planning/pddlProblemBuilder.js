// planning/pddlProblemBuilder.js
import { mapData, agentData } from "../belief/belief.js";

/**
 * Build a PDDL problem consistent with domain "deliveroo-bdi".
 * Adjacency facts use (pred FROM TO) with:
 *   up:    (x, y) -> (x, y+1)
 *   down:  (x, y) -> (x, y-1)
 *   left:  (x, y) -> (x-1, y)
 *   right: (x, y) -> (x+1, y)
 * We do NOT emit unsupported predicates like (blocked) or (occupied).
 *
 * mode = "pickup": goal is to be (carrying <any ground parcel>).
 * mode = "putdown": goal is to have (delivered <each carried parcel>).
 */
export function buildProblem(mode = "pickup", cfg = {}) {
  const width = mapData.width;
  const height = mapData.height;

  const tileName = (x, y) => `tile_${x}_${y}`;
  const inBounds = (x, y) => x >= 0 && x < width && y >= 0 && y < height;
  const isWalkable = (x, y) => inBounds(x, y) && mapData.map[x][y] !== 0;

  // Objects
  const tileObjs = [];
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) tileObjs.push(`${tileName(x, y)} - tile`);
  }

  // Parcels
  let groundParcels = [];
  let carriedParcels = [];
  if (mode === "pickup") {
    groundParcels = (agentData.parcels || []).filter(p => !p.carriedBy);
  } else {
    carriedParcels = agentData.parcelsCarried || [];
  }
  if (cfg.onlyParcelIds) {
    groundParcels = groundParcels.filter(p => cfg.onlyParcelIds.has(p.id));
    carriedParcels = carriedParcels.filter(p => cfg.onlyParcelIds.has(p.id));
  }
  const parcelObjs = [
    ...groundParcels.map(p => `${p.id} - parcel`),
    ...carriedParcels.map(p => `${p.id} - parcel`),
  ];

  // Init: agent position
  const atFacts = [`(at ${tileName(agentData.pos.x, agentData.pos.y)})`];

  // Init: adjacency (FROM -> TO)
  const adjFacts = [];
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (!isWalkable(x, y)) continue;
      const here = tileName(x, y);
      const addIf = (nx, ny, pred) => {
        if (isWalkable(nx, ny)) adjFacts.push(`(${pred} ${here} ${tileName(nx, ny)})`);
      };
      addIf(x, y + 1, "up");
      addIf(x, y - 1, "down");
      addIf(x - 1, y, "left");
      addIf(x + 1, y, "right");
    }
  }

  // Init: delivery tiles
  const deliveries = (mapData.deliverCoordinates || []).map(d => `(delivery ${tileName(d.x, d.y)})`);

  // Init: parcels on ground / carried
  const parcelFacts = [
    ...groundParcels.map(p => `(parcel_at ${p.id} ${tileName(p.x, p.y)})`),
    ...carriedParcels.map(p => `(carrying ${p.id})`),
  ];

  // (Optional) mark current tile explored; domain will add explored on moves
  const exploredFacts = [`(explored ${tileName(agentData.pos.x, agentData.pos.y)})`];

  // Goal
  let goal;
  if (mode === "pickup") {
    if (groundParcels.length === 0) goal = "(and)"; // trivial
    else if (groundParcels.length === 1) goal = `(carrying ${groundParcels[0].id})`;
    else goal = `(or ${groundParcels.map(p => `(carrying ${p.id})`).join(" ")})`;
  } else {
    // Deliver all currently carried parcels
    if (carriedParcels.length === 0) goal = "(and)";
    else goal = `(and ${carriedParcels.map(p => `(delivered ${p.id})`).join(" ")})`;
  }

  const objects = [...tileObjs, ...parcelObjs].join("\n    ");
  const init = [
    ...atFacts, ...adjFacts, ...deliveries, ...parcelFacts, ...exploredFacts
  ].join("\n    ");

  return `(define (problem deliveroo-problem)
  (:domain deliveroo-bdi)
  (:objects
    ${objects}
  )
  (:init
    ${init}
  )
  (:goal
    ${goal}
  )
)`;
}