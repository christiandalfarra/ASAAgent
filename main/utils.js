import fs from "fs";
import { agentData, mapData, envData, startTime } from "../belief/belief.js";
import { client, teamAgentId } from "../conf.js";

/**
 * function to convert the tiles array to a matrix
 *
 * @param {number} width - The width of the matrix
 * @param {number} height - The height of the matrix
 * @param {Array} tiles - The array of tiles
 * @returns {Array} - The matrix of tiles
 */
export function convertToMatrix(width, height, tiles) {
  // Initialize matrix with null or another default value
  const matrix = Array.from({ length: width }, () => Array(height).fill(0));
  // Populate matrix
  for (let index in tiles)
    matrix[tiles[index].x][tiles[index].y] = tiles[index].type;
  return matrix;
}
/**
 * function to read a file
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
export async function initEnv(time = 2000) {
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

  await new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (agentData.id != null && mapData.map.length !== 0) {
        clearInterval(interval);
        clearTimeout(timeout);
        resolve();
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      reject(new Error("Initialization timeout"));
    }, time);
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
export function findAStar(map, start, goal) {
  const cols = map.length;
  const rows = map[0].length;

  const isWalkable = (x, y) => {
    return x >= 0 && x < cols && y >= 0 && y < rows && map[x][y] !== 0;
  };

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
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();

    if (current.x === goal.x && current.y === goal.y) {
      const path = [];
      let key = nodeKey(current.x, current.y);
      while (cameFrom.has(key)) {
        const [cx, cy] = key.split(",").map(Number);
        const [px, py] = cameFrom.get(key).split(",").map(Number);

        const dx = cx - px;
        const dy = cy - py;

        const dir = directions.find((d) => d.x === dx && d.y === dy);
        if (dir) {
          path.unshift({
            action: dir.action,
            x: cx,
            y: cy,
          });
        }

        key = nodeKey(px, py);
      }
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

  return null; // No path found
}
/**
 * A* pathfinding algorithm to find the distance from start to goal
 *
 * @param {{x:number , y:number}} start - The starting position of the agent
 * @param {{x:number, y:number}} goal - The goal position of the agent
 * @returns {number} - The distance from start to goal
 */
export function distanceAStar(start, end) {
  const path = findAStar(mapData.map, start, end);
  return path != null ? path.length : path;
}
export function utilityDistanceAStar(start, end) {
  const path = findAStar(mapData.utilityMap, start, end);
  return path != null ? path.length : path;
}
export function samePosition(pos1, pos2) {
  return pos1.x === pos2.x && pos1.y === pos2.y;
}

/**
 * function to find the nearest coordinate from a set of coordinates
 *
 * @param {{x:number , y:number}} pos - The position to find the nearest coordinate from
 * @returns {{x:number , y:number}} - The nearest coordinate from the set of coordinates
 */
export function findNearestDelivery(pos) {
  let nearest;
  let minDistance = 2000;
  for (let coordinate of mapData.deliverCoordinates) {
    if (!(coordinate.x === pos.x && coordinate.y === pos.y)) {
      let distance = distanceAStar(pos, coordinate);
      if (distance != null && distance < minDistance) {
        minDistance = distance;
        nearest = { x: coordinate.x, y: coordinate.y };
      }
    }
  }
  return nearest;
}

/**
 *
 * @param {{x: number, y: number}} pos
 * @returns {{id: string, x: number, y: number}}
 */
export function findNearestEnemyFromPos(pos) {
  let nearest;
  let distance = 2000;
  for (let enemy of agentData.enemies) {
    // set the enemy position to wall
    if (!samePosition(enemy, pos)) {
      let dist = distanceAStar(pos, enemy);
      if (dist != null && dist < distance) {
        distance = dist;
        nearest = { x: enemy.x, y: enemy.y };
      }
    }
  }
  return nearest;
}
export function findNearestFrom(pos, setOfCoordinates) {
  let nearest;
  let distance = 2000;
  for (let coord of setOfCoordinates) {
    // set the enemy position to wall
    if (!samePosition(coord, pos)) {
      let dist = distanceAStar(pos, coord);
      if (dist != null && dist < distance) {
        distance = dist;
        nearest = { x: coord.x, y: coord.y };
      }
    }
  }
  return nearest;
}
export function validPosition(pos) {
  return (
    pos.x > 0 && pos.x < mapData.width && pos.y > 0 && pos.y < mapData.height
  );
}

/**
 *
 * @param {{x: number, y: number}} pos
 * position that we want to evaluate
 * @param {number} r
 * radius within we want to check
 * @returns {number}
 * numbers of parcels within the circle of center (x,y) and radius r
 */
export function countCloseParcels(pos, r) {
  let count = 0;
  //pos posizione attuale ex: x=2,y=3
  for (let i = pos.x - r + 1; i < pos.x + r - 1; i++) {
    for (let j = pos.y - r + 1; j < pos.y + r - 1; j++) {
      //if the position is valid (inside the map), and is different form the position where i am look
      // if in that position there is a parcel
      if (validPosition({ x: i, y: j }) && i !== pos.x && j !== pos.y) {
        for (let parcel of agentData.parcels) {
          if (parcel.x == i && parcel.y == j && parcel.carriedBy == null) {
            count++;
          }
        }
      }
    }
  }
  //check the positions (posx + r,posy), (posx - r,posy), (posx,posy + r), (posx,posy - r)
  for (let parcel of agentData.parcels) {
    count += pos.x + r == parcel.x && pos.y == parcel.y ? 1 : 0;
    count += pos.x - r == parcel.x && pos.y == parcel.y ? 1 : 0;

    count += pos.x == parcel.x && pos.y + r == parcel.y ? 1 : 0;
    count += pos.x == parcel.x && pos.y - r == parcel.y ? 1 : 0;
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
 * @param {{ id:string, x:number, y:number, carriedBy:string, reward:number, timestamp:number}} parcel
 * @returns {number} utility of the parcel
 */
export function pickUpUtility(parcel) {
  // if is an old perceived parcel have a lower score
  let timestampNow = Date.now() - startTime;
  let deltaStamp = timestampNow - parcel.timestamp;
  // min 2 max 12 if i have seen the parcel prevuois then 300 ms before
  let timeScore = (deltaStamp < 500) * 10 + 2;

  // value of the parcel at the pickup considering the path
  let score = parcel.reward;
  let distanceMeParcel = distanceAStar(agentData.pos, parcel);
  if (distanceMeParcel == null) {
    return 0;
  }
  let decade_frequency = envData.decade_frequency;
  let scoreAtPickUp = Math.round(
    score -
      (distanceMeParcel ? distanceMeParcel : mapData.width + mapData.height) *
        decade_frequency
  );

  // if there is an agent nearest to the parcel, if it is near then
  // me should have a lower score
  let nearestEnemy = findNearestEnemyFromPos(parcel);
  let distanceEnemyParcel =
    agentData.enemies.length > 0 && nearestEnemy != null
      ? distanceAStar(parcel, nearestEnemy)
      : mapData.width + mapData.height;
  // min 0 if the enemy is near than me , max 5 if i am near to the parcel respect to the enemies
  let scoreEnemyParcel = (distanceEnemyParcel - distanceMeParcel > 0) * 5;

  // how far we are from the nearest delivery point
  let distanceDeliveryParcel = distanceAStar(
    parcel,
    findNearestDelivery(parcel)
  );

  // consider if near the parcel there are other parcels
  let parcelsNear = countCloseParcels({ x: parcel.x, y: parcel.y }, 1);
  let nearParcelScore = parcelsNear * 10;

  let utility = timeScore + scoreAtPickUp + scoreEnemyParcel + nearParcelScore;
  // design a utility function
  if (distanceAStar(agentData.pos, parcel) == null) {
    return 0;
  } else {
    return utility ? utility : 5;
  }
}

export function checkOption(pred1, pred2) {
  return pred1 && pred2 && pred1.type === pred2.type && pred1.goal.x === pred2.goal.x && pred1.goal.y === pred2.goal.y;
}
export function checkPathWithMate(pos) {
  // create a utility map excluding the mate position
  let utilityMap = JSON.parse(JSON.stringify(mapData.utilityMap));
  if (agentData.matePosition && validPosition(agentData.matePosition)) {
    utilityMap[agentData.matePosition.x][agentData.matePosition.y] = 0;
    let path = findAStar(utilityMap, agentData.pos, pos);
    if (!path) {
      return true;
    }
  }
  return false;
}

