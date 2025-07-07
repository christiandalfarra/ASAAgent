// import child_process in ES module
import { spawn } from "child_process";
import { default as argsParser } from "args-parser";
import { jwtDecode } from "jwt-decode";

const localhost = "http://localhost:8080";
const serverProf = "https://deliveroojs.rtibdi.disi.unitn.it/";
const server = "https://deliveroojs25.azurewebsites.net";
let host = localhost; // default host

/* const token1 =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImU4ZDRlMiIsIm5hbWUiOiJjaHJpczEiLCJ0ZWFtSWQiOiIwODBjYzUiLCJ0ZWFtTmFtZSI6IkF1dG9NaW5kIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NDgzNDA5MTh9.HsZSnnzzHdOXqjryiTjeRuzQSRfcJl90ofZFjymldGE";
const token2 =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVlNmZiNiIsIm5hbWUiOiJjaHJpczIiLCJ0ZWFtSWQiOiJjMTFiZWQiLCJ0ZWFtTmFtZSI6IkF1dG9NaW5kIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NDgzNDA5MjJ9.K9a7tL61JmtAg3A2u-y0R4yi5A33S86fclcmlQLtmPI"; */

const token1 =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZGJmMCIsIm5hbWUiOiJjaHJpczEiLCJ0ZWFtSWQiOiJjOTk1YmUiLCJ0ZWFtTmFtZSI6IkF1dG9NaW5kIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NDgzMzkzNDZ9.86a3ybVUXEFOZwTP23ijECeIbG8lGF7rpzIEuGkRCrc";
const token2 =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBlM2ZmNiIsIm5hbWUiOiJjaHJpczIiLCJ0ZWFtSWQiOiIyMjNjM2UiLCJ0ZWFtTmFtZSI6IkF1dG9NaW5kIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NDgzMzkzNTB9.5z8a6XCqc2yYX8Pkumc-lRcpPvv5f40lFtG1LvGG-RE";

const token3 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJiN2FmMCIsIm5hbWUiOiJhbm9ueW1vdXMiLCJyb2xlIjoidXNlciIsImlhdCI6MTc1MTcwOTA1NH0.XKcfBFTwjYvKvmuIL0v9FvvZQQCOg_h6A-QXDK5K_zk"


const agent_1 = {
  id: jwtDecode(token1).id,
  name: jwtDecode(token1).name,
  token: token1,
};

const agent_2 = {
  id: jwtDecode(token2).id,
  name: jwtDecode(token2).name,
  token: token2,
};

const args = argsParser(process.argv);
if (args["number"] === "S") {
  spawnProcess(agent_1);
} else if (args["number"] === "M") {
  spawnProcesses(agent_1, agent_2);
  spawnProcesses(agent_2, agent_1);
} else {
  console.error(
    "Error: invalid parameter, u must use S (single-agent mode) or M (multi-agent mode) as argument"
  );
  process.exit(1); // codice di uscita diverso da 0 indica un errore
}

// Function to spawn child processes
function spawnProcesses(me, teamMate) {
  const childProcess = spawn(
    `node agent.js \
        host="${host}" \
        token="${me.token}" \
        teamId="${teamMate.id}" `,
    { shell: true }
  );

  childProcess.stdout.on("data", (data) => {
    console.log(me.name, ">", data.toString());
  });

  childProcess.stderr.on("data", (data) => {
    console.error(me.name, ">", data.toString());
  });

  childProcess.on("close", (code) => {
    console.log(`${me.name}: exited with code ${code}`);
  });
}
function spawnProcess(me) {
  const childProcess = spawn(
    `node agent.js \
        host="${host}" \
        token="${me.token}" \
        teamId="${me.id}" `,
    { shell: true }
  );

  childProcess.stdout.on("data", (data) => {
    console.log(me.name, ">", data.toString());
  });

  childProcess.stderr.on("data", (data) => {
    console.error(me.name, ">", data.toString());
  });

  childProcess.on("close", (code) => {
    console.log(`${me.name}: exited with code ${code}`);
  });
}
