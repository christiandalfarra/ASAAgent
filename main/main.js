import { IntentionReplace } from "../intention/intention.js";
export const SINGLE_AGENT = true
export const MULTI_AGENT = false

let intentionReplace = new IntentionReplace();
intentionReplace.loop();
export { intentionReplace };
