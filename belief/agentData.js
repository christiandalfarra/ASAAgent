export class AgentData {
  // Agent identifying info and current state
  name = "";
  id = "";
  pos = { x: -1, y: -1 }; // agent's position
  score = 0; // agent's score

  // Parcel-related memory
  parcels = []; // all known parcels
  parcelsCarried = []; // parcels targeted for pickup

  // Decision-making
  options = []; // potential plans/options
  best_option = []; // best calculated option

  // Perceived enemies
  enemies = [];

  currentIntention = null; // current intention being pursued
  mateId = "";
  mateIntention = null; // current intention of the mate agent

  constructor() {
    // Initialize attributes
    this.name = "";
    this.id = "";
    this.pos = { x: 0, y: 0 };
    this.parcels = [];
    this.parcelsCarried = [];
    this.options = [];
    this.best_option = [];
    this.enemies = [];
    this.currentIntention = null;
    this.mateId = "";
    this.mateIntention = null;
  }

  /**
   * Search for a parcel by its ID
   * @param {string} id - The ID of the parcel to find
   * @returns {Parcel | undefined} - The parcel with the given ID, if any
   */
  getParcelById(id) {
    for (let parcel of this.parcels) {
      if (id == parcel.id) {
        return parcel;
      }
    }
    return undefined;
  }

  getPickedScore() {
    let score = 0;
    if (this.parcelsCarried.length == 0) return 0;
    for (let parcel of this.parcelsCarried) {
      if (parcel && parcel.reward > 0) {
        score += parcel.reward;
      }
    }
    return score;
  }
}
