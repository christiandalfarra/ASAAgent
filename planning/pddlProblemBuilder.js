// planning/pddlProblemBuilder.js
import { mapData, agentData } from "../belief/belief.js";

/**
 * Build a minimal PDDL problem snapshot from your current beliefs.
 * - Tiles: tile_X_Y for every in-bounds cell
 * - Adjacency: up/down/left/right with the SAME convention used by your A*:
 *   up => y+1, down => y-1, left => x-1, right => x+1
 * - Blocked: map value 0
 * - Occupied: enemy tiles
 * - Delivery: from mapData.deliverCoordinates
 * - Parcels:
 *    * mode === "pickup": use agentData.parcels as lying on the ground
 *    * mode === "putdown": use agentData.parcelsCarried as carried
 *
 * @param {"pickup"|"putdown"} mode
 * @param {Object} cfg optional filters, e.g. { onlyParcelIds: Set<string> }
 * @returns {string} a full PDDL problem string
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
    // parcels seen and not carried by anyone
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

  // Init: adjacency with your current convention
  const adjFacts = [];
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (!isWalkable(x, y)) continue;
      const here = tileName(x, y);
      const maybe = (dx, dy, pred) => {
        const nx = x + dx, ny = y + dy;
        if (isWalkable(nx, ny)) adjFacts.push(`(${pred} ${tileName(nx, ny)} ${here})`);
      };
      // IMPORTANT: matches your domain preconditions (down ?to ?from) etc.
      maybe( 0, -1, "down");   // target is y-1, from is current
      maybe( 0,  1, "up");     // target is y+1
      maybe(-1,  0, "left");   // target is x-1
      maybe( 1,  0, "right");  // target is x+1
    }
  }

  // Init: blocked tiles (walls)
  const blocked = [];
  for (let x = 0; x < width; x++)
    for (let y = 0; y < height; y++)
      if (mapData.map[x][y] === 0) blocked.push(`(blocked ${tileName(x, y)})`);

  // Init: occupied tiles (enemies)
  const occupied = (agentData.enemies || []).map(e => `(occupied ${tileName(Math.round(e.x), Math.round(e.y))})`);

  // Init: deliveries
  const deliveries = (mapData.deliverCoordinates || []).map(d => `(delivery ${tileName(d.x, d.y)})`);

  // Init: parcels
  const parcelFacts = [
    ...groundParcels.map(p => `(parcel_at ${p.id} ${tileName(p.x, p.y)})`),
    ...carriedParcels.map(p => `(carrying ${p.id})`),
  ];

  // Goal
  let goal;
  if (mode === "pickup") {
    // default: pick up ANY one of the ground parcels
    if (groundParcels.length === 0) goal = "(and)"; // trivial
    else if (groundParcels.length === 1) goal = `(carrying ${groundParcels[0].id})`;
    else goal = `(or ${groundParcels.map(p => `(carrying ${p.id})`).join(" ")})`;
  } else {
    // put down all carried parcels on any delivery tile
    // Simple version: at least one carried parcel is put down on ANY delivery tile.
    // If you want all, replace with (and ...) over specific tiles.
    if (carriedParcels.length === 0) goal = "(and)";
    else goal = `(or ${carriedParcels.map(p => `(parcel_at ${p.id} ${nearestDeliveryTileName(p)})`).join(" ")})`;
  }

  function nearestDeliveryTileName(p) {
    // Pick the first delivery as a stable target; your A* already picks nearest.
    const d = mapData.deliverCoordinates?.[0];
    if (!d) return tileName(agentData.pos.x, agentData.pos.y);
    return tileName(d.x, d.y);
  }

  const objects = [...tileObjs, ...parcelObjs].join("\n    ");
  const init = [
    ...atFacts, ...adjFacts, ...blocked, ...occupied, ...deliveries, ...parcelFacts
  ].join("\n    ");

  return `(define (problem deliveroo-problem)
  (:domain default)
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