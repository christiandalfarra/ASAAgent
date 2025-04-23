class Map {
  map = []; // map updated 0 = wall, 1 = spawnable, 2 = delivery, 3 = walkable
  deliverCoordinates = []; // delivery coordinates in the map used for go deliver
  spawnCoordinates = []; // spawning coordinates in the map used for go spawn
  width = 0; // width of the map
  height = 0; // height of the map
  parcel_reward_avg = 0; // average reward of the parcels
  parcel_observation_distance = 0; // distance of the parcels observable by the agent
  decade_frequency = 0.0; // frequency of the parcels decading for the agent (movement_speed/decading_interval)

  constructor() {
    this.map = [];
    this.deliveryCoordinates = [];
    this.spawningCoordinates = []; // spawning coordinates {x,y}
    this.width = 0;
    this.height = 0;
    this.parcel_reward_avg = 0;
    this.parcel_observation_distance = 0;
    this.decade_frequency = 0;
  }


  /**
   * Fill the spawning coordinates and assign the score to each spawning coordinates
   *
   * @param {Array} tiles - The tiles of the map
   */
  setSpawnCoordinates(tiles) {
    this.spawningCoordinates = tiles
      .filter((t) => t.type == 1)
      .map((t) => ({ x: t.x, y: t.y })); // Spawning coordinates
  }

  /**
   * Fill the delivery coordinates
   *
   * @param {Array} tiles - The tiles of the map
   */
  setDeliverCoordinates(tiles) {
    this.deliveryCoordinates = tiles
      .filter((t) => t.type == 2)
      .map((t) => ({ x: t.x, y: t.y })); // Delivery coordinates
  }
}
export { Map };