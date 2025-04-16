export default class AStar {
  static findPath(map, start, goal) {
    const rows = map.length;
    const cols = map[0].length;
  
    const isWalkable = (x, y) => {
      return (
        x >= 0 && x < cols &&
        y >= 0 && y < rows &&
        map[x][y] !== 0
      );
    };
  
    const heuristic = (a, b) =>
      Math.abs(Math.round(a.x) - Math.round(b.x)) + Math.abs(Math.round(a.y) - Math.round(b.y));
  
    const directions = [
      { x: 0, y: -1, action: "down" },
      { x: 0, y: 1, action: "up" },
      { x: -1, y: 0, action: "left" },
      { x: 1, y: 0, action: "right" },
    ];
  
    const openSet = [{ x: start.x, y: start.y, f: 0 }];
    const cameFrom = new Map();
  
    const gScore = Array.from({ length: rows }, () =>
      Array(cols).fill(Infinity)
    );
    const fScore = Array.from({ length: rows }, () =>
      Array(cols).fill(Infinity)
    );
  
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
  
          const dir = directions.find(d => d.x === dx && d.y === dy);
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
  
          if (!openSet.some(n => n.x === nx && n.y === ny)) {
            openSet.push({ x: nx, y: ny, f: fScore[ny][nx] });
          }
        }
      }
    }
    return null;
  }

}
