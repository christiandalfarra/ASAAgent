import { agentData, mapData } from "../belief/agentBelief";
import { pickUpUtility } from "../main/utils";

export async function optionsLoop() {
  var begin = new Date().getTime();
  agentData.options = [];

  for (let parcel of agentData.parcels) {
    if(parcel.carriedBy == null && mapData.map[parcel.x][parcel.y] > 0){
      let utility = pickUpUtility(parcel);
    }
  }
}
