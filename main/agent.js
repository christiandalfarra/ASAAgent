import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
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
//save the map model
let map = [] //map[x][y] contiene il tipo della casella
client.onMap((width,height,tiles)=>{
    let grid = [...tiles]
    for (let i = 0; i < width; i++) {
        map[i] = []
        for (let j = 0; j < height; j++) {
            map[i][j] = grid[i*width+j].type
        }
    }
    console.log(map)
})

/**
 * @type { {id:string, name:string, x:number, y:number, score:number} }
 */
const me = {id: null, name: null, x: null, y: null, score: null};

//check where is my agent
client.onYou( ( {id, name, x, y, score} ) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
} )

//perceive parcels and move to them and pick it up
//assuming the world is completely empty, so the agent can move freely
async function blindPickUp ( target ) {
    console.log(me.name, 'goes from', me.x, me.y, 'to', target.x, target.y);

    var m = new Promise( res => client.onYou( m => m.x % 1 != 0 || m.y % 1 != 0 ? null : res() ) );
    if ( me.x < target.x )
        await client.emitMove('right');
    else if ( me.x > target.x )
        await client.emitMove('left');
    if ( me.y < target.y )
        await client.emitMove('up');
    else if ( me.y > target.y )
        await client.emitMove('down');
    await m;
    if ( me.x == target.x && me.y == target.y ) {
        await client.emitPickup()
    }
}
client.onParcelsSensing( ( parcels ) => {
    //parcels is an array of objects with x,y and id
    console.log(parcels)
    for (let i = 0; i < parcels.length; i++) {
        let target = parcels[i]
        blindPickUp(target)
    }
} )

//upgrade the function with a path finding algorithm given the map and the target
