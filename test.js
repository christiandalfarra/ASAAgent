import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
const client = new DeliverooApi(
    "http://localhost:8080/",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjgxOTg0YSIsIm5hbWUiOiJtYXJjbyIsInRlYW1JZCI6IjZkNTg2YiIsInRlYW1OYW1lIjoiZGlzaSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzQyOTg0NDAwfQ.QHYWbTxGKhUGjflwONw0hJsgxlmUP2HeCvjgehAsEts"
);
//client.onYou(me => console.log(me));
let map = []; //map[x][y] contiene il tipo della casella
client.onMap((width,height,tiles)=>{
    let grid = [...tiles]
    for (let i = 0; i < width; i++) {
        map[i] = []
        for (let j = 0; j < height; j++) {
            map[i][j] = grid[i*width+j].type
        }
    }
    console.log(map[0][1])
    console.log(map)
})
function tileType(x,y){
    client.onMap((width,height,tiles)=>{
        return tiles[x*width+y].type
    })
}