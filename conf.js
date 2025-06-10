// Import the Deliveroo API client
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { default as argsParser } from "args-parser";
const args = argsParser(process.argv);

const host = args["host"];
const token = args["token"];
// Client initialization with chosen server and authentication token
export const client = new DeliverooApi(host, token);
export const teamAgentId = args["teamId"];
