// Import the Deliveroo API client
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

// Server URLs
const localhost = "http://localhost:8080";
const serverProf = "https://deliveroojs2.rtibdi.disi.unitn.it/";
const server = "https://deliveroojs25.azurewebsites.net";

// Client initialization with chosen server and authentication token
const client = new DeliverooApi(
  localhost, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NzU4ZiIsIm5hbWUiOiJjaWFvIiwidGVhbUlkIjoiMmMyM2MzIiwidGVhbU5hbWUiOiJjaWFvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NDc4MjIzMDZ9.SIc0FshBRj_dEdptui1cHRdSER5qpKtvCUYsosl7lLw');
// Export the initialized client to be used across the agent system
export { client };
