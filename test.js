import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const client = new DeliverooApi(
    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQwMzdmMiIsIm5hbWUiOiJtYXJjbyIsInRlYW1JZCI6IjQxOTMyYSIsInRlYW1OYW1lIjoiZGlzaSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzQ0Nzk1NjUyfQ.zPWRmZQ0gyR9af8KbuaTj2g9CHDudB8smFcEF2qv--8'
)

function distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) )
    const dy = Math.abs( Math.round(y1) - Math.round(y2) )
    return dx + dy;
}



/**
 * @type { Map< string, {x:number, y:number, type:string} > }
 */
const map = new Map()

client.onTile( ({x, y, type}) => {
    const key = `${x}_${y}`;
    map.set(key, {x, y, type});
} );



const me = {};

await new Promise( res => {
    client.onYou( ( {id, name, x, y, score} ) => {
        me.id = id
        me.name = name
        me.x = x
        me.y = y
        me.score = score
        console.log( 'me:', me.x, me.y );
        res()
    } )
} );




