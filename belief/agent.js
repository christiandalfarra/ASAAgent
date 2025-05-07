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
  }

  // Calculate cumulative score of all targeted parcels
  getParcelToPickScore() {
    let score = 0;
    for (let parceltoPick of this.parcelsCarried) {
      for (let parcel of this.parcels) {
        if (parceltoPick.id === parcel.id) {
          // If parcel is invalid, remove from target list
          if (parcel.reward < 1) {
            this.parcelsCarried = this.parcelsCarried.filter(
              (p) => p.id !== parceltoPick.id
            );
          } else {
            // Add parcel reward to score
            score += parcel.reward;
            break;
          }
        }
      }
    }
    return score;
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

  /**
   * Print all known parcels for debugging
   */
  printParcels() {
    for (let elem of this.parcels) {
      console.log(elem);
    }
  }
  getPickedScore() {
    let score = 0;
    if (this.parcelsCarried.length == 0) return 0;
    for (let parcel of this.parcelsCarried) {
      if (parcel.reward > 0) {
        score += parcel.reward;
      }
    }
    return score;
  }

  /**
   * Print important agent state info for debugging
   */
  toString() {
    console.log("name: ", this.name);
    console.log("id: ", this.id);
    console.log("role: ", this.role);
    console.log("pos: ", this.pos);
    console.log("best_option: ", this.best_option);
    console.log("");
  }
}
