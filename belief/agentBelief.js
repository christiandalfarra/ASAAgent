class AgentBelief {
  // INFORMATION ABOUT THE AGENT
  name = "";
  id = "";
  pos = { x: -1, y: -1 }; // Agent coordinates on the map
  parcels = []; // List of parcels known to the agent
  parcelsPlanned = []; // Parcels that the agent is currently had in mind
  options = []; // List of possible options for the agent
  best_option = [];
  enemies = [];

  constructor() {
    // Initialize all the properties of the agent
    this.name = "";
    this.id = "";
    this.pos = { x: -1, y: -1 };
    this.parcels = [];
    this.parcelsPlanned = [];
    this.options = [];
    this.best_option = [];
    this.enemies = [];
  }
  /**
   * Search for a parcel by its ID
   *
   * @param {string} id - The ID of the parcel to find
   * @returns {Parcel} - The parcel with the given ID
   */
  getParcelById(id) {
    for (let parcel of this.parcels) {
      // Iterate over all parcels
      if (id == parcel.id) {
        // If the parcel ID matches the one we're looking for
        return parcel; // Return the parcel
      }
    }
    return undefined; // If not found, return undefined
  }

  /**
   * Get the IDs of parcels that are in the agent's mind
   *
   * @returns {Array} - The list of parcel IDs in the agent's mind
   */
  getParcelsPlannedIds() {
    var ids = [];
    for (let parcelPlanned of this.parcelsPlanned) {
      for (let parcel of this.parcels) {
        if (parcelPlanned === parcel.id) {
          ids.push(parcel);
        }
      }
    }
    return ids; 
  }

  /**
   * print stored parcels in the agent's memory
   * This method is used for debugging and logging purposes
   */
  printParcels() {
    for (let elem of this.parcels) {
      console.log(elem);
    }
  }

  /**
   * Print relvant information about the agent
   * This method is used for debugging and logging purposes
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
export { AgentBelief };