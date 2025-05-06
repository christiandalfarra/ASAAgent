// Import the Deliveroo API client
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

// Server URLs
const localhost = "http://localhost:8080";
const serverProf = "https://deliveroojs2.rtibdi.disi.unitn.it/";
const server = "https://deliveroojs25.azurewebsites.net";

// Client initialization with chosen server and authentication token
const client = new DeliverooApi(
  localhost,
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjgxMTE2NiIsIm5hbWUiOiJtYXJjbyIsInRlYW1JZCI6ImY1ZGYzMiIsInRlYW1OYW1lIjoiZGlzaSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzQ0MTA2NTAxfQ.37T54VcAanD5GTjM0VQZg5dwF7PsLVAOf12Dslb3zVc"
);

// Export the initialized client to be used across the agent system
export { client };
