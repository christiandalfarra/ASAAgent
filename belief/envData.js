export class EnvData {
  parcel_reward_avg = 0;
  parcel_observation_distance = 0;
  agents_observation_distance = 0; // distance to observe other agents
  decade_frequency = 0.0; // frequency used for parcel reward decay
  movement_duration = 0; // time to move between tiles
  parcel_reward_variance = 0;
  clock = 0;

  constructor() {
    // Initialize all properties
    this.parcel_reward_avg = 0;
    this.parcel_observation_distance = 0;
    this.agents_observation_distance = 0;
    this.decade_frequency = 0.0;
    this.movement_duration = 0;
    this.parcel_reward_variance = 0;
  }
}
