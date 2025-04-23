function mapToMatrix(width, height, tiles){
    // map updated 0 = wall, 1 = spawnable, 2 = delivery, 3 = walkable not spawnable
    let map = []
    let grid = [...tiles]
    for (let i = 0; i < width; i++) {
        map[i] = [];
        for (let j = 0; j < height; j++) {
            map[i][j] = grid[i * width + j].type;
        }
    }
    return map;
}
export {mapToMatrix}