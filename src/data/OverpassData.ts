import { Color4, MeshBuilder, Vector3 } from "@babylonjs/core";
import { Game } from "../Game";
import { IsVeryFinite } from "../Number";
import { ChunckDataGeneratorDataSets, IDataTile, IDataTilesCollection, IRoadData } from "../voxel-engine/TerrainGen/ChunckDataGeneratorDataSets";

export async function generateOverpassData(game: Game) {
    let NRoadTiles = 128;
    
    let dLat = Math.atan2(16384, game.geoConverter.radius) / Math.PI * 180;
    let dLong = Math.atan2(16384, game.geoConverter.radius * Math.cos(game.geoConverter.latZero * Math.PI / 180)) / Math.PI * 180;

    let lat0 = game.geoConverter.latZero - dLat;
    let long0 = game.geoConverter.longZero - dLong;
    let lat1 = game.geoConverter.latZero + dLat;
    let long1 = game.geoConverter.longZero + dLong;

    
    let latStep = (lat1 - lat0) / NRoadTiles;
    let longStep = (long1 - long0) / NRoadTiles;


    let roadTiles: IRoadData[][][] = [];
    for (let i = 0; i < NRoadTiles; i++) {
        roadTiles[i] = [];
        for (let j = 0; j < NRoadTiles; j++) {
            roadTiles[i][j] = [];
        }
    }

    let s = 1;
    for (let i = NRoadTiles / 2 - s; i < NRoadTiles / 2 + s; i++) {
        for (let j = NRoadTiles / 2 - s; j < NRoadTiles / 2 + s; j++) {
    //for (let i = 0; i < count; i++) {
    //    for (let j = 0; j < count; j++) {
            console.log("fetching roads for tile " + i + ", " + j);
            let latMin = lat1 - (i + 1) * latStep;
            let latMax = lat1 - i * latStep;
            let longMin = long0 + j * longStep;
            let longMax = long0 + (j + 1) * longStep;

            var query = `
                [bbox:${latMin.toFixed(7)},${longMin.toFixed(7)},${latMax.toFixed(7)},${longMax.toFixed(7)}]
                [out:json]
                [timeout:90]
                ;
                way(${latMin.toFixed(7)}, ${longMin.toFixed(7)}, ${latMax.toFixed(7)}, ${longMax.toFixed(7)})[highway];
                out geom;
            `;

            let res = await fetch(
                "https://overpass-api.de/api/interpreter",
                {
                    method: "POST",
                    body: "data=" + encodeURIComponent(query),
                }
            );
            let data = await res.json();

            for (let e of data.elements) {
                
                let road: IRoadData = {
                    w: 4,
                    ijGlobals: []
                }
                
                let line: Vector3[] = [];
                for (let p of e.geometry) {
                    let lat = p.lat;
                    let long = p.lon;
                    let position = game.geoConverter.latLongToVector3(lat, long);
                    //let mark = MeshBuilder.CreateBox("mark", { width: 0.1, depth: 0.1, height: 100 }, game.scene);
                    //mark.position = position.add(new Vector3(0, 50, 0));
                    let globalIJK = game.terrain?.worldPosToGlobalIJK(position);
                    if (globalIJK && game.terrain?.chunckDataGenerator instanceof ChunckDataGeneratorDataSets) {
                        let height = await game.terrain.chunckDataGenerator.asyncEvaluateHeight(globalIJK.i, globalIJK.j);
                        position.y = height + 3;
                        road.ijGlobals.push(globalIJK.i, globalIJK.j);
                    }
                    line.push(position);
                }

                roadTiles[i][j].push(road);
                MeshBuilder.CreateLines("line", { points: line, colors: line.map(() => new Color4(0, 1, 0, 1)) }, game.scene);
            }
        }
    }

    let sparseRoadTiles: IDataTilesCollection<IDataTile<IRoadData>> = { size: NRoadTiles, tiles: [] };
    let maxRoadsPerTile = 0;
    for (let i = 0; i < NRoadTiles; i++) {
        for (let j = 0; j < NRoadTiles; j++) {
            maxRoadsPerTile = Math.max(maxRoadsPerTile, roadTiles[i][j].length);
            if (roadTiles[i][j].length > 0) {
                sparseRoadTiles.tiles.push({
                    i: i,
                    j: j,
                    dataArray: roadTiles[i][j],
                });
            }
        }
    }

    console.log(sparseRoadTiles);
    console.log("maxRoadsPerTile: " + maxRoadsPerTile);
}