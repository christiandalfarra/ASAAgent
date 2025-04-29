import { client } from "../config.js";
var ciao = await client.emitMove("up")
console.log(ciao ? "true":"false");