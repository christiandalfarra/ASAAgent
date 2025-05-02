import fs from "fs";
import { agentData, mapData } from "../belief/agentBelief.js";

/**
 * function to read the pddl domain file
 *
 * @param {string} path
 * @returns {Promise<string>}
 */
export function readFile(path) {
  return new Promise((res, rej) => {
    fs.readFile(path, "utf8", (err, data) => {
      if (err) rej(err);
      else res(data);
    });
  });
}
/**
 * function to find the path from start to goal using A* algorithm
 *
 * @param {Array} map - The map of the game
 * @param {{x:number , y:number}} start - The starting position of the agent
 * @param {{x:number, y:number}} goal - The goal position of the agent
 * @returns {Array{x:number, y:number}} - The path from start to goal
 */
export function findPathAStar(map, start, goal) {
  const cols = map.length;
  const rows = map[0].length;

  const isWalkable = (x, y) => {
    return x >= 0 && x < cols && y >= 0 && y < rows && map[x][y] !== 0;
  };

  const heuristic = (a, b) =>
    Math.abs(Math.round(a.x) - Math.round(b.x)) +
    Math.abs(Math.round(a.y) - Math.round(b.y));

  const directions = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  const openSet = [{ x: start.x, y: start.y, f: 0 }];
  const cameFrom = new Map();

  const gScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const fScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));

  gScore[start.y][start.x] = 0;
  fScore[start.y][start.x] = heuristic(start, goal);

  const nodeKey = (x, y) => `${x},${y}`;

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();

    if (current.x === goal.x && current.y === goal.y) {
      const path = [];
      let key = nodeKey(current.x, current.y);
      while (cameFrom.has(key)) {
        const [x, y] = key.split(",").map(Number);
        path.unshift({ x, y });
        key = cameFrom.get(key);
      }
      path.unshift({ x: start.x, y: start.y }); // include start point
      return path;
    }

    for (const dir of directions) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      if (!isWalkable(nx, ny)) continue;

      const tentativeG = gScore[current.y][current.x] + 1;
      if (tentativeG < gScore[ny][nx]) {
        const neighborKey = nodeKey(nx, ny);
        cameFrom.set(neighborKey, nodeKey(current.x, current.y));
        gScore[ny][nx] = tentativeG;
        fScore[ny][nx] = tentativeG + heuristic({ x: nx, y: ny }, goal);

        if (!openSet.some((n) => n.x === nx && n.y === ny)) {
          openSet.push({ x: nx, y: ny, f: fScore[ny][nx] });
        }
      }
    }
  }
  return null;
}

/**
 * A* pathfinding algorithm to find the moves from start to goal
 *
 * @param {Array} map - The map of the game
 * @param {{x:number , y:number}} start - The starting position of the agent
 * @param {{x:number, y:number}} goal - The goal position of the agent
 * @returns {Array{string}} - The moves from start to goal
 */
export function findMovesAStar(map, start, goal) {
  const cols = map.length;
  const rows = map[0].length;

  // Check if a tile is walkable
  // 0 = wall, 1 = spawnable, 2 = delivery, 3 = walkable not spawnable
  const isWalkable = (x, y) => {
    return x >= 0 && x < cols && y >= 0 && y < rows && map[x][y] !== 0;
  };

  // Heuristic function for A* (Manhattan distance)
  const heuristic = (a, b) =>
    Math.abs(Math.round(a.x) - Math.round(b.x)) +
    Math.abs(Math.round(a.y) - Math.round(b.y));

  const directions = [
    { x: 0, y: -1, action: "down" },
    { x: 0, y: 1, action: "up" },
    { x: -1, y: 0, action: "left" },
    { x: 1, y: 0, action: "right" },
  ];

  const openSet = [{ x: start.x, y: start.y, f: 0 }];
  const cameFrom = new Map();

  const gScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const fScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));

  gScore[start.y][start.x] = 0;
  fScore[start.y][start.x] = heuristic(start, goal);

  const nodeKey = (x, y) => `${x},${y}`;

  while (openSet.length > 0) {
    // Get node with lowest fScore
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();

    if (current.x === goal.x && current.y === goal.y) {
      // Reconstruct action path
      const actions = [];
      let key = nodeKey(current.x, current.y);
      while (cameFrom.has(key)) {
        const [cx, cy] = key.split(",").map(Number);
        const [px, py] = cameFrom.get(key).split(",").map(Number);

        const dx = cx - px;
        const dy = cy - py;

        const dir = directions.find((d) => d.x === dx && d.y === dy);
        if (dir) actions.unshift(dir.action);

        key = nodeKey(px, py);
      }
      return actions;
    }

    for (const dir of directions) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      if (!isWalkable(nx, ny)) continue;

      const tentativeG = gScore[current.y][current.x] + 1;
      if (tentativeG < gScore[ny][nx]) {
        const neighborKey = nodeKey(nx, ny);
        cameFrom.set(neighborKey, nodeKey(current.x, current.y));
        gScore[ny][nx] = tentativeG;
        fScore[ny][nx] = tentativeG + heuristic({ x: nx, y: ny }, goal);

        if (!openSet.some((n) => n.x === nx && n.y === ny)) {
          openSet.push({ x: nx, y: ny, f: fScore[ny][nx] });
        }
      }
    }
  }
  return null;
}

/**
 * A* pathfinding algorithm to find the distance from start to goal
 *
 * @param {Array} map - The map of the game
 * @param {{x:number , y:number}} start - The starting position of the agent
 * @param {{x:number, y:number}} goal - The goal position of the agent
 * @returns {number} - The distance from start to goal
 */
export function distanceAStar(start, end) {
  const path = findPathAStar(start, end);
  return path != null ? path.length : path;
}

/**
 * function to find the nearest coordinate from a set of coordinates
 *
 * @param {Array} setOfCoordinates - The set of coordinates to search from
 * @param {{x:number , y:number}} pos - The position to find the nearest coordinate from
 * @returns {{x:number , y:number}} - The nearest coordinate from the set of coordinates
 */
export function findNearestFromPos(setOfCoordinates, pos) {
  let nearest = null;
  let minDistance = Infinity;

  for (const coordinate of setOfCoordinates) {
    if (coordinate.x === pos.x && coordinate.y === pos.y) continue; // skip the same coordinate
    const distance = distanceAStar(pos, coordinate);
    if (distance == null) continue; // skip if no path found
    if (distance < minDistance) {
      minDistance = distance;
      nearest = coordinate;
    }
  }
  return nearest;
}

export function countCloseParcels(pos, r){
  let count = 0;
  for(let i = pos.x-r+1; i < pos.x+r-1 ; i++){
    for(let j = pos.y -r+1; j < pos.y+r-1 ; j++){
      if(i !== pos.x && j !== pos.y){
        for(let parcel of agentData.parcels){
          if(parcel.x == i && parcel.y == j && parcel.carriedBy == null){
            count++;
          }
        }
      }
    }
  }
  for(let parcel of agentData.parcels){
    if(parcel.x == pos.x+2 && parcel.y == pos.y && parcel.carriedBy == null){
    }

  }

  return count;
}
export function timeout(mseconds) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, mseconds);
  });
}
/**
 *
 * @param {{ id:string, x:number, y:number, carriedBy:string, reward:number }} parcel
 * @returns {number} utility of the parcel
 */
export function pickUpUtility(parcel) {
  let score = parcel.reward;
  let parcelsInMind = agentData.parcelsToPick;
  let parcels = agentData.parcels;

  //valuta quanto distante è da me 
  let distance = distanceAStar(agentData.pos, parcel);
  //valuta quanto è distante dal nemico più vicino alla parcel
  let distanceEnemyParcel = distanceAStar(parcel, findNearestFromPos(agentData.enemies, parcel));
  //valuta quanto distante è dal delivery point
  let distanceDeliveryParcel = distanceAStar(parcel, findNearestFromPos(mapData.deliverCoordinates, parcel));
  //valuta se ha parcel vicino a meno di 2 tile che non sia quella che sto valutando
  

  // in base alla distanza tra parcel e delivery, se la distanza è tale che la parcel perde tutto il valore toglie punti
  // più è lontana più toglie punti

  //se la parcel più vicina al nemico di almeno due tile rispetto a me perdo punti
  return 2;
}
