// Import the Deliveroo API client
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

// Server URLs
const localhost = "http://localhost:8080";
const serverProf = "https://deliveroojs2.rtibdi.disi.unitn.it/";
const server = "https://deliveroojs25.azurewebsites.net";

// Client initialization with chosen server and authentication token
const client = new DeliverooApi(
  localhost,
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEwM2ViZiIsIm5hbWUiOiJjaWNjaWFuIiwidGVhbUlkIjoiMGFkYmI2IiwidGVhbU5hbWUiOiJjaWNjaWFuIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NDY1NDk2ODJ9.JvzKg39fAr9xETClyyWJIg3cnvszGafFofPn3aPh68s');

// Export the initialized client to be used across the agent system
export { client };
