import fs from "fs";
import { agentData, mapData } from "../belief/agentBelief.js";

export function mapToMatrix(width, height, tiles) {
  // map updated 0 = wall, 1 = spawnable, 2 = delivery, 3 = walkable not spawnable
  let map = [];
  let grid = [...tiles];
  for (let i = 0; i < width; i++) {
    map[i] = [];
    for (let j = 0; j < height; j++) {
      map[i][j] = grid[i * width + j].type;
    }
  }
  return map;
}
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
function isWalkable(x, y) {
  return (
    x >= 0 &&
    x < mapData.width &&
    y >= 0 &&
    y < mapData.height &&
    mapData.map[x][y] !== 0
  );
}
function manhattanDistance(a, b) {
  return Math.round(Math.abs(a.x - b.x) + Math.abs(a.y - b.y));
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
  fScore[start.y][start.x] = manhattanDistance(start, goal);

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
        fScore[ny][nx] = tentativeG + manhattanDistance({ x: nx, y: ny }, goal);

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
 * @param {{x:number , y:number}} start - The starting position of the agent
 * @param {{x:number, y:number}} goal - The goal position of the agent
 * @returns {number} - The distance from start to goal
 */
export function distanceAStar(start, end) {
  const path = findMovesAStar(mapData.map, start, end);
  return path != null ? path.length : path;
}
export function utilityDistanceAStar(start, end) {
  const path = findMovesAStar(mapData.utilityMap, start, end);
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
export function validPosition(pos) {
  return (
    pos.x > 0 && pos.x < mapData.width && pos.y > 0 && pos.y < mapData.height
  );
}

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
 * @param {{ id:string, x:number, y:number, carriedBy:string, reward:number }} parcel
 * @returns {number} utility of the parcel
 */
export function pickUpUtility(parcel) {
  let score = parcel.reward;
  //valuta quanto distante è da me
  let distance = distanceAStar(agentData.pos, parcel);
  //valuta quanto è distante dal nemico più vicino alla parcel
  // prima controlla la ci sono nemici nel belief
  let nearestEnemy = findNearestEnemyFromPos(parcel);
  let distanceEnemyParcel =
    agentData.enemies.length > 0 && nearestEnemy != null
      ? distanceAStar(parcel, nearestEnemy)
      : mapData.width + mapData.height;
  //valuta quanto distante è dal delivery point
  let distanceDeliveryParcel = distanceAStar(
    parcel,
    findNearestDelivery(parcel)
  );

  //valuta se ha parcel vicino a meno di 2 tile che non sia quella che sto valutando
  let parcelsNear = countCloseParcels({ x: parcel.x, y: parcel.y }, 2);
  //valuta se nel tempo per raggiungere la parcel col migliore percoroso la parcel perde valore
  // freq dice ogni quanti movimenti la parcel perde 1 punto
  // freq = mov duration / interval decading
  let decade_frequency = mapData.decade_frequency;
  // valore quando la raggiungo dovrebbere essere
  // score - (distance * decade_frequency)
  let scoreAtPickUp = Math.round(score - distance * decade_frequency);

  //devo settare a,b,c,d,e parametri per calcolo della utility
  let a,
    b,
    c,
    d,
    e = 1;
  let utility =
    scoreAtPickUp +
    distance +
    distanceEnemyParcel +
    distanceDeliveryParcel +
    parcelsNear;
  return utility;
}
export function putDownUtility(parcel) {
  let utility = 0;
  return utility;
}
