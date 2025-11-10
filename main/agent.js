import { IntentionRevision } from "../intention/intention.js";
import { agentData, mapData } from "../belief/belief.js";
import { envData } from "../belief/belief.js";
import { optionsLoop } from "../intention/options.js";
import { initEnv } from "./utils.js";

await initEnv(500);

agentData.myIntentions = new IntentionRevision();
setInterval(() => {
  optionsLoop();
}, envData.clock * 1.5);

agentData.myIntentions.loop();
