import { Color4, MeshBuilder, Vector2, Vector3 } from "@babylonjs/core";
import { Game } from "../Game";
import { IsVeryFinite } from "../Number";
import { ChunckDataGeneratorDataSets, IDataTile, IDataTilesCollection, IRoadData } from "../voxel-engine/TerrainGen/ChunckDataGeneratorDataSets";
import { UniqueList } from "../UniqueList";
import { CapsuleRectCheck } from "../Math2D";

export async function generateRoadData(game: Game) {
    let NRoadTiles = 1024;
    let RoadTileLengthIJ = game.terrain ? game.terrain.terrainLengthIJ / NRoadTiles : 32;
    let NRoadFetchTiles = 8;
    
    let dLat = Math.atan2(16384, game.geoConverter.radius) / Math.PI * 180;
    let dLong = Math.atan2(16384, game.geoConverter.radius * Math.cos(game.geoConverter.latZero * Math.PI / 180)) / Math.PI * 180;

    let lat0 = game.geoConverter.latZero - dLat;
    let long0 = game.geoConverter.longZero - dLong;
    let lat1 = game.geoConverter.latZero + dLat;
    let long1 = game.geoConverter.longZero + dLong;

    
    let latStep = (lat1 - lat0) / NRoadFetchTiles;
    let longStep = (long1 - long0) / NRoadFetchTiles;


    let roadTiles: IRoadData[][][] = [];
    for (let i = 0; i < NRoadTiles; i++) {
        roadTiles[i] = [];
        for (let j = 0; j < NRoadTiles; j++) {
            roadTiles[i][j] = [];
        }
    }

    let tags: UniqueList<string> = new UniqueList<string>();

    let s = 0;
    let min = NRoadFetchTiles / 2 - s;
    let max = NRoadFetchTiles / 2 + s;
    if (s === 0) {
        min = NRoadFetchTiles / 2 - 0.5;
        max = NRoadFetchTiles / 2 + 0.5;
    }
    for (let i = min; i < max; i++) {
        for (let j = min; j < max; j++) {
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
            console.log(data);

            for (let e of data.elements) {
                let road: IRoadData = {
                    w: 4,
                    ijGlobals: [],
                    type: "",
                }

                if (e.tags && e.tags["highway"]) {
                    tags.push(e.tags["highway"]);
                    road.type = e.tags["highway"];
                }
                
                let line: Vector3[] = [];
                let roadGlobalIMin = Number.POSITIVE_INFINITY;
                let roadGlobalIMax = Number.NEGATIVE_INFINITY;
                let roadGlobalJMin = Number.POSITIVE_INFINITY;
                let roadGlobalJMax = Number.NEGATIVE_INFINITY;
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
                        roadGlobalIMin = Math.min(roadGlobalIMin, globalIJK.i);
                        roadGlobalIMax = Math.max(roadGlobalIMax, globalIJK.i);
                        roadGlobalJMin = Math.min(roadGlobalJMin, globalIJK.j);
                        roadGlobalJMax = Math.max(roadGlobalJMax, globalIJK.j);
                    }
                    line.push(position);
                }

                roadGlobalIMin -= 4;
                roadGlobalIMax += 4;
                roadGlobalJMin -= 4;
                roadGlobalJMax += 4;

                let i0 = Math.floor(roadGlobalIMin / RoadTileLengthIJ);
                let i1 = Math.floor(roadGlobalIMax / RoadTileLengthIJ);
                let j0 = Math.floor(roadGlobalJMin / RoadTileLengthIJ);
                let j1 = Math.floor(roadGlobalJMax / RoadTileLengthIJ);

                let tileMin = Vector2.Zero();
                let tileMax = Vector2.Zero();
                for (let ii = i0; ii <= i1; ii++) {
                    for (let jj = j0; jj <= j1; jj++) {
                        if (ii >= 0 && ii < NRoadTiles && jj >= 0 && jj < NRoadTiles) {
                            tileMin.x = ii * RoadTileLengthIJ;
                            tileMin.y = jj * RoadTileLengthIJ;
                            tileMax.x = (ii + 1) * RoadTileLengthIJ;
                            tileMax.y = (jj + 1) * RoadTileLengthIJ;
                            
                            for (let n = 0; n < road.ijGlobals.length - 2; n += 2) {
                                let p0 = new Vector2(road.ijGlobals[n], road.ijGlobals[n + 1]);
                                let p1 = new Vector2(road.ijGlobals[n + 2], road.ijGlobals[n + 3]);
                                if (CapsuleRectCheck(p0, p1, road.w, tileMin, tileMax)) {
                                    roadTiles[ii][jj].push(road);
                                    break;
                                }
                            }
                        }
                    }
                }
                
                MeshBuilder.CreateLines("line", { points: line, colors: line.map(() => new Color4(0, 1, 0, 1)) }, game.scene);
            }
        }
    }

    console.log(tags.array);

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