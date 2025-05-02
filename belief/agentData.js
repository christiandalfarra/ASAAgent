class AgentData {
  name = "";
  id = "";
  pos = { x: -1, y: -1 };
  score = 0;
  parcels = [];
  parcelsToPick = [];
  options = [];
  best_option = [];
  enemies = [];

  constructor() {
    this.name = "";
    this.id = "";
    this.pos = { x: 0, y: 0 };
    this.parcels = [];
    this.parcelsToPick = [];
    this.options = [];
    this.best_option = [];
    this.enemies = [];
  }

  getParcelToPickScore() {
    let score = 0;
    for (let parceltoPick of this.parcelsToPick) {
      for (let parcel of this.parcels) {
        if (parceltoPick.id === parcel.id) {
          if (parcel.reward < 1) {
            this.parcelsToPick = this.parcelsToPick.filter(
              (p) => p.id !== parceltoPick.id
            );
          } else {
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
   *
   * @param {string} id - The ID of the parcel to find
   * @returns {Parcel} - The parcel with the given ID
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
export { AgentData };
