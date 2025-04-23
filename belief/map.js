class Map {
  map = []; // map of the game
  utilityMap = []; //map but with walls where there are other agents
  deliverCoordinates = [];
  spawnCoordinates = [];
  width = 0;
  height = 0;
  parcel_reward_avg = 0;
  parcel_observation_distance = 0; //how far the agent can see
  decade_frequency = 0.0; //we use it to update the belief of the parcels

  constructor() {
    this.map = [];
    this.utilityMap = []; //map with the utility of each tile
    this.deliveryCoordinates = [];
    this.spawningCoordinates = [];
    this.width = 0;
    this.height = 0;
    this.parcel_reward_avg = 0;
    this.parcel_observation_distance = 0;
    this.decade_frequency = 0;
  }
  /**
   * Fill the spawning coordinates
   *
   * @param {Array} tiles - The tiles of the map
   */
  setSpawnCoordinates(tiles) {
    this.spawningCoordinates = tiles
      .filter((t) => t.type == 1)
      .map((t) => ({ x: t.x, y: t.y }));
  }
  /**
   * Fill the delivery coordinates
   *
   * @param {Array} tiles - The tiles of the map
   */
  setDeliverCoordinates(tiles) {
    this.deliveryCoordinates = tiles
      .filter((t) => t.type == 2)
      .map((t) => ({ x: t.x, y: t.y }));
  }
  /**
   * Update a tile value in the map
   *
   * @param {number} x - x of the tile
   * @param {number} y - y of the tile
   * @param {number} value - new value to set
   */
  updateTileValue(x, y, value) {
    x = Math.round(x);
    y = Math.round(y);
    // Check if the coordinates are within the bounds of the map
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.map[x][y] = value;
    }
  }
}
export { Map };
