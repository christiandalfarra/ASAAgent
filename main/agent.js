import { IntentionRevision } from "../intention/intention.js";
import { agentData, mapData } from "../belief/belief.js";
import { envData } from "../belief/belief.js";
import { optionsLoop } from "../intention/options.js";
import { initEnv } from "./utils.js";
import { configurePlans } from "../planning/plans.js";
import argsParser from "args-parser";

const args = argsParser(process.argv);
let usePddl;
console.log("DEBUG [agent.js] Use PDDL:", args["usePddl"]);
if (args["usePddl"] === "true") {
  usePddl = true;
} else if (args["usePddl"] === "false") {
  usePddl = false;
} else {
  console.error(
    "Error: invalid parameter for pddl, u must use true (use pddl) or false (don't use pddl) as argument"
  );
  process.exit(1); // codice di uscita diverso da 0 indica un errore
}
configurePlans(usePddl);
await initEnv(500, usePddl);

agentData.myIntentions = new IntentionRevision();
setInterval(() => {
  optionsLoop();
}, envData.clock * (usePddl ? 2.5 : 1.5));

agentData.myIntentions.loop();
