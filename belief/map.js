export class MapData {
  // Primary game map and utility overlay
  map = []; // static map of the game
  utilityMap = []; // dynamic map considering agents as obstacles

  // Key coordinate sets
  deliverCoordinates = []; // delivery tile positions
  spawnCoordinates = []; // spawning tile positions

  // Map dimensions
  width = 0;
  height = 0;

  constructor() {
    // Initialize all properties
    this.map = [];
    this.utilityMap = [];
    this.deliverCoordinates = [];
    this.spawningCoordinates = [];
    this.width = 0;
    this.height = 0;
  }

  /**
   * Set spawn coordinates from tile array
   * @param {Array} tiles - Array of tile objects
   */
  setSpawnCoordinates(tiles) {
    this.spawningCoordinates = tiles
      .filter((t) => t.type == 1)
      .map((t) => ({ x: t.x, y: t.y }));
  }

  /**
   * Set delivery coordinates from tile array
   * @param {Array} tiles - Array of tile objects
   */
  setDeliverCoordinates(tiles) {
    this.deliverCoordinates = tiles
      .filter((t) => t.type == 2)
      .map((t) => ({ x: t.x, y: t.y }));
  }

  /**
   * Modify a specific tile's utility value
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} value - New value to assign in the utility map
   */
  updateTileValue(x, y, value) {
    x = Math.round(x);
    y = Math.round(y);

    // Ensure coordinates are within bounds
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.utilityMap[x][y] = value;
    }
  }
}