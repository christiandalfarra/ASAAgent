export class AgentData {

  constructor() {
    // Initialize attributes
    this.name = "";
    this.id = "";
    this.pos = { x: 0, y: 0 };
    this.parcels = new Map();           // Map of parcels on the ground, key is parcel id, value is parcel object
    this.parcelsCarried = new Map();    // Map of parcels being carried, key is parcel id, value is parcel object
    this.options = [];
    this.best_option = null;
    this.enemies = [];
    this.currentIntention = null;
    this.mateId = "";
    this.mateIntention = null;
    this.matePosition = {x:0, y:0};
    this.myIntentions = null;
    this.usePddl = false;
  }
}
