// import child_process in ES module
import { spawn } from 'child_process';
import { default as argsParser } from "args-parser"


const localhost = "http://localhost:8080";
const serverProf = "https://deliveroojs2.rtibdi.disi.unitn.it/";
const server = "https://deliveroojs25.azurewebsites.net";

const id_1 = "985a80";
const id_2 = "7cc5b9";

const agent_1 = { id: id_1 , name: 'chris1',
token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4NWE4MCIsIm5hbWUiOiJjaHJpczEiLCJ0ZWFtSWQiOiIwM2VhMjUiLCJ0ZWFtTmFtZSI6IkF1dG9Cb3QiLCJyb2xlIjoidXNlciIsImlhdCI6MTc0NzkxMDIxNH0.p2Fvhx50SLaSbMstBJzMxvRSu5F12exMFPThNSZLoY8'
};

const agent_2 = { id: id_2, name: 'chris2',
token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjdjYzViOSIsIm5hbWUiOiJjaHJpczIiLCJ0ZWFtSWQiOiI2OGEzOTYiLCJ0ZWFtTmFtZSI6IkF1dG9Cb3QiLCJyb2xlIjoidXNlciIsImlhdCI6MTc0NzkxMDIxOX0.hmFJCT0VQ7pxn2-5aSiaVhD-g0PXZ9Zec1Tf9SX_aiU'
};

const args = argsParser(process.argv);
if (args['number'] === 'SINGLE') {
    spawnProcess(agent_1);
} else if (args['number'] === 'MULTI') {
    spawnProcesses(agent_1, agent_2);
    spawnProcesses(agent_2, agent_1);
} else {
    console.error('Error: invalid parameter, u must use SINGLE or MULTI as argument');
    process.exit(1); // codice di uscita diverso da 0 indica un errore
}

// Start the processes
spawnProcesses( agent_1, agent_2 ); // I am marco and team mate is paolo
spawnProcesses( agent_2, agent_1 ); // I am paolo and team mate is marco

// Function to spawn child processes
function spawnProcesses( me, teamMate ) {
    
    const childProcess = spawn(
        `node agent.js \
        host="${localhost}" \
        token="${me.token}" \
        teamId="${teamMate.id}" `,
        { shell: true }
    );

    childProcess.stdout.on('data', data => {
        console.log(me.name, '>', data.toString());
    });

    childProcess.stderr.on('data', data => {
        console.error(me.name, '>', data.toString());
    });

    childProcess.on('close', code => {
        console.log(`${me.name}: exited with code ${code}`);
    });

};
function spawnProcess(me){
    const childProcess = spawn(
        `node agent.js \
        host="${localhost}" \
        token="${me.token}"`,
        { shell: true }
    );

    childProcess.stdout.on('data', data => {
        console.log(me.name, '>', data.toString());
    });

    childProcess.stderr.on('data', data => {
        console.error(me.name, '>', data.toString());
    });

    childProcess.on('close', code => {
        console.log(`${me.name}: exited with code ${code}`);
    });
}

