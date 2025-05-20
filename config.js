// Import the Deliveroo API client
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

// Server URLs
const localhost = "http://localhost:8080";
const serverProf = "https://deliveroojs2.rtibdi.disi.unitn.it/";
const server = "https://deliveroojs25.azurewebsites.net";

// Client initialization with chosen server and authentication token
const client = new DeliverooApi(
  localhost,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJjNjJlMSIsIm5hbWUiOiJjaHJpc3NzIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NDc3NDE1MDV9.Ho6vpyGzWAb9hXXcqtNl7e0B71oRmhFMGiPHMsTrTn0'
);
// Export the initialized client to be used across the agent system
export { client };
