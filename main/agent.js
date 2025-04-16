import { DeliverooApi } from "@unitn-asa/deliveroo-js-client"
import AStar from '../astar.js'
const localhost = 'http://localhost:8080'
const serverProf = 'https://deliveroojs2.rtibdi.disi.unitn.it/'
const server = 'https://deliveroojs25.azurewebsites.net'
const client = new DeliverooApi(
    localhost,
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQwMzdmMiIsIm5hbWUiOiJtYXJjbyIsInRlYW1JZCI6IjQxOTMyYSIsInRlYW1OYW1lIjoiZGlzaSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzQ0Nzk1NjUyfQ.zPWRmZQ0gyR9af8KbuaTj2g9CHDudB8smFcEF2qv--8'
)

function distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) )
    const dy = Math.abs( Math.round(y1) - Math.round(y2) )
    return dx + dy;
}
function getMap(client) {
    return new Promise((resolve) => {
      client.onMap((width, height, tiles) => {
        let map = []
        let grid = [...tiles]
        for (let i = 0; i < width; i++) {
          map[i] = []
          for (let j = 0; j < height; j++) {
            map[i][j] = grid[i * width + j].type
          }
        }
        resolve(map); // restituisce la mappa pronta
      })
    })
}
async function agentPosition() {
    return new Promise( res => {client.onYou( ( {id, name, x, y, score} ) => {
        me.id = id
        me.name = name
        me.x = x
        me.y = y
        me.score = score
        // console.log( 'me:', me.x, me.y );
        res()
        })
    })
}
/**
 * @type { {id:string, name:string, x:number, y:number, score:number} }
 */
const me = {id: null, name: null, x: null, y: null, score: null};
agentPosition()

//map[x][y] contiene il tipo della casella
const map = await getMap(client)

//check where is my agent
/* client.onYou( ( {id, name, x, y, score} ) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
} ) */
const start = { x: Math.round(me.x), y: Math.round(me.y) };
const goal = { x: 1, y: 4 };
const actions = AStar.findPath(map, start, goal);
console.log(actions);
for (const element of actions) {
    await client.emitMove(element)
    console.log('moving', element) 
}