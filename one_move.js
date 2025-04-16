import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const client = new DeliverooApi(
    "http://localhost:8080/",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjgxOTg0YSIsIm5hbWUiOiJtYXJjbyIsInRlYW1JZCI6IjZkNTg2YiIsInRlYW1OYW1lIjoiZGlzaSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzQyOTg0NDAwfQ.QHYWbTxGKhUGjflwONw0hJsgxlmUP2HeCvjgehAsEts"
);

function distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) )
    const dy = Math.abs( Math.round(y1) - Math.round(y2) )
    return dx + dy;
}

const me = {};

client.onYou( ( {id, name, x, y, score} ) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
} )

const db = new Map()

client.onParcelsSensing( async ( parcels ) => {
    
    console.log( `me(${me.x},${me.y})`,
        parcels
        .map( p => `${p.reward}@(${p.x},${p.y})` )
        .join( ' ' )
    );

    for ( let p of parcels ) {
        if ( ! p.carriedBy ) {
            if ( me.x < p.x && me.y==p.y)
                await client.emitMove('right');
            else if ( me.x > p.x && me.y==p.y)
                await client.emitMove('left')
            else if ( me.y < p.y && me.x==p.x)
                await client.emitMove('up')
            else if ( me.y > p.y && me.x==p.x)
                await client.emitMove('down')
            client.emitPickup();
        }
    }

} )


