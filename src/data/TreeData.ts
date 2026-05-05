import { Game } from "../Game";
import { IsVeryFinite } from "../Number";
import { IDataTile, IDataTilesCollection, ITreeData } from "../voxel-engine/TerrainGen/ChunckDataGeneratorDataSets";

export async function generateTreeData(game: Game) {
    let NTreeTiles = 1024;
    
    let dLat = Math.atan2(16384, game.geoConverter.radius) / Math.PI * 180;
    let dLong = Math.atan2(16384, game.geoConverter.radius * Math.cos(game.geoConverter.latZero * Math.PI / 180)) / Math.PI * 180;

    let lat0 = game.geoConverter.latZero - dLat;
    let long0 = game.geoConverter.longZero - dLong;
    let lat1 = game.geoConverter.latZero + dLat;
    let long1 = game.geoConverter.longZero + dLong;

    let res = await fetch("ec_arbre_p.json");

    let json = await res.json();
    console.log(json.length);
    
    let canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 2048;
    let ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    json = json.filter((p: any) => {
        let point = p["geo_point_2d"];
        if (point) {
            let lat = point["lat"];
            let long = point["lon"];
            return lat >= lat0 && lat <= lat1 && long >= long0 && long <= long1;
        }
        return false;
    });

    let treeTiles: ITreeData[][][] = [];
    for (let i = 0; i < NTreeTiles; i++) {
        treeTiles[i] = [];
        for (let j = 0; j < NTreeTiles; j++) {
            treeTiles[i][j] = [];
        }
    }

    for (let p of json) {
        let point = p["geo_point_2d"];
        let lat = point["lat"];
        let long = point["lon"];


        let i = Math.floor((long - long0) / (long1 - long0) * NTreeTiles);
        let j = Math.floor((lat - lat0) / (lat1 - lat0) * NTreeTiles);

        let tree: ITreeData = {
            lat: lat,
            long: long,
            h: p["hauteur"],
            d: p["diametre_tronc"]
        }
        if (IsVeryFinite(tree.h) && IsVeryFinite(tree.d)) {
            treeTiles[i][j].push(tree);
        }

    }

    let sparseTreeTiles: IDataTilesCollection<IDataTile<ITreeData>> = { size: NTreeTiles, tiles: [] };
    let maxTreesPerTile = 0;
    for (let i = 0; i < NTreeTiles; i++) {
        for (let j = 0; j < NTreeTiles; j++) {
            maxTreesPerTile = Math.max(maxTreesPerTile, treeTiles[i][j].length);
            while (treeTiles[i][j].length > 2) {
                treeTiles[i][j].splice(Math.floor(Math.random() * treeTiles[i][j].length), 1);
            }
            if (treeTiles[i][j].length > 0) {
                for (let n = 0; n < treeTiles[i][j].length; n++) {
                    let tree = treeTiles[i][j][n];
                    let lat = tree.lat;
                    let long = tree.long;

                    let x = (long - long0) / (long1 - long0);
                    let y = (lat1 - lat) / (lat1 - lat0);
                    
                    ctx.fillStyle = "lime";
                    ctx.fillRect(x * canvas.width, y * canvas.height, 1, 1);
                }
                sparseTreeTiles.tiles.push({
                    i: i,
                    j: j,
                    dataArray: treeTiles[i][j],
                });
            }
        }
    }
    console.log(sparseTreeTiles);
    console.log("maxTreesPerTile: " + maxTreesPerTile);
    
    var tmpLink = document.createElement( 'a' );
    tmpLink.download = "trees" + ".png";
    tmpLink.href = canvas.toDataURL();  
    
    document.body.appendChild( tmpLink );
    tmpLink.click(); 
    document.body.removeChild( tmpLink );
}