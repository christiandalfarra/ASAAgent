export class AgentData {

  constructor() {
    // Initialize attributes
    this.name = "";
    this.id = "";
    this.pos = { x: 0, y: 0 };
    this.parcels = new Map();
    this.parcelsCarried = new Map();
    this.options = [];
    this.best_option = [];
    this.enemies = [];
    this.currentIntention = null;
    this.mateId = "";
    this.mateIntention = null;
    this.matePosition = {x:0, y:0};
    this.myIntentions = null;
    this.usePddl = false;
  }
  getPickedScore() {
    let score = 0;
    if (this.parcelsCarried.size == 0) return 0;
    for (let parcel of this.parcelsCarried.values()) {
      if (parcel && parcel.reward > 0) {
        score += parcel.reward;
      }
    }
    return score;
  }
}
