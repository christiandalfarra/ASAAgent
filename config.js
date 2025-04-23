import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
//import AStar from "../astar.js";
const localhost = "http://localhost:8080";
const serverProf = "https://deliveroojs2.rtibdi.disi.unitn.it/";
const server = "https://deliveroojs25.azurewebsites.net";
const client = new DeliverooApi(
  localhost,
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQwMzdmMiIsIm5hbWUiOiJtYXJjbyIsInRlYW1JZCI6IjQxOTMyYSIsInRlYW1OYW1lIjoiZGlzaSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzQ0Nzk1NjUyfQ.zPWRmZQ0gyR9af8KbuaTj2g9CHDudB8smFcEF2qv--8"
);
export {client}