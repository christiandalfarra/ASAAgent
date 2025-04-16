/**
 * A* Pathfinding Algorithm Implementation
 * 
 * This implementation finds the shortest path between two points on a 2D grid
 * considering obstacles and using the Manhattan distance as a heuristic.
 */

class PriorityQueue {
    constructor() {
      this.elements = [];
    }
  
    empty() {
      return this.elements.length === 0;
    }
  
    put(item, priority) {
      this.elements.push({ item, priority });
      this.elements.sort((a, b) => a.priority - b.priority);
    }
  
    get() {
      return this.elements.shift().item;
    }
  }
  
  class Node {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  
    equals(other) {
      return this.x === other.x && this.y === other.y;
    }
  
    toString() {
      return `(${this.x},${this.y})`;
    }
  }
  
  function aStar(grid, start, goal) {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // Define possible movements (up, right, down, left)
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 1, y: 0 },  // right
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }, // left
    ];
    
    // Create priority queue
    const openSet = new PriorityQueue();
    openSet.put(start, 0);
    
    // Create dictionaries to store path information
    const cameFrom = {};
    const gScore = {};
    const fScore = {};
    
    // Initialize scores
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const node = new Node(x, y);
        gScore[node.toString()] = Infinity;
        fScore[node.toString()] = Infinity;
      }
    }
    
    gScore[start.toString()] = 0;
    fScore[start.toString()] = heuristic(start, goal);
    
    // Set to track visited nodes (for visualization or debugging)
    const openSetHash = {};
    openSetHash[start.toString()] = true;
    
    // Main A* algorithm loop
    while (!openSet.empty()) {
      const current = openSet.get();
      delete openSetHash[current.toString()];
      
      // If we've reached the goal, reconstruct and return the path
      if (current.equals(goal)) {
        return reconstructPath(cameFrom, current);
      }
      
      // Check all neighbors
      for (const dir of directions) {
        const neighbor = new Node(current.x + dir.x, current.y + dir.y);
        
        // Skip if out of bounds
        if (neighbor.x < 0 || neighbor.x >= cols || neighbor.y < 0 || neighbor.y >= rows) {
          continue;
        }
        
        // Skip if this is an obstacle (1 represents obstacle)
        if (grid[neighbor.y][neighbor.x] === 1) {
          continue;
        }
        
        // Calculate tentative g score
        const tentativeGScore = gScore[current.toString()] + 1;
        
        // If we found a better path to this neighbor
        if (tentativeGScore < gScore[neighbor.toString()]) {
          // Update path and scores
          cameFrom[neighbor.toString()] = current;
          gScore[neighbor.toString()] = tentativeGScore;
          fScore[neighbor.toString()] = tentativeGScore + heuristic(neighbor, goal);
          
          // Add to open set if not already there
          if (!openSetHash[neighbor.toString()]) {
            openSet.put(neighbor, fScore[neighbor.toString()]);
            openSetHash[neighbor.toString()] = true;
          }
        }
      }
    }
    
    // No path found
    return null;
  }
  
  // Manhattan distance heuristic
  function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
  
  // Reconstruct path from start to goal
  function reconstructPath(cameFrom, current) {
    const path = [current];
    
    while (cameFrom[current.toString()]) {
      current = cameFrom[current.toString()];
      path.unshift(current);
    }
    
    return path;
  }
  
  // Example usage
  function runExample() {
    // 0 = open space, 1 = obstacle
    const grid = [
      [0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0]
    ];
    
    const start = new Node(0, 0);
    const goal = new Node(5, 4);
    
    console.log("Grid:");
    grid.forEach(row => console.log(row.join(" ")));
    
    const path = aStar(grid, start, goal);
    
    if (path) {
      console.log("\nPath found:");
      console.log(path.map(node => node.toString()).join(" -> "));
      
      // Visualize the path on the grid
      const visualGrid = grid.map(row => [...row]);
      path.forEach(node => {
        visualGrid[node.y][node.x] = 2; // Mark path with 2
      });
      visualGrid[start.y][start.x] = 'S'; // Mark start
      visualGrid[goal.y][goal.x] = 'G';   // Mark goal
      
      console.log("\nVisualized path (S=start, G=goal, 2=path, 1=obstacle, 0=open):");
      visualGrid.forEach(row => console.log(row.join(" ")));
    } else {
      console.log("No path found!");
    }
  }
  
  // Run the example
  runExample();