import { Color4, MeshBuilder, Vector2, Vector3 } from "@babylonjs/core";
import { Game } from "../Game";
import { IsVeryFinite } from "../Number";
import { ChunckDataGeneratorDataSets, IBuildingData, IDataTile, IDataTilesCollection, IRoadData } from "../voxel-engine/TerrainGen/ChunckDataGeneratorDataSets";
import { UniqueList } from "../UniqueList";
import { CapsuleRectCheck } from "../Math2D";
import { download, WaitNSeconds } from "../Tools";

export async function generateBuildingData(game: Game) {
    let NBuildingTiles = 1024;
    let BuildingTileLengthIJ = game.terrain ? game.terrain.terrainLengthIJ / NBuildingTiles : 32;
    let NBuildingFetchTiles = 32;
    //NBuildingFetchTiles = 128;
    
    let dLat = Math.atan2(16384, game.geoConverter.radius) / Math.PI * 180;
    let dLong = Math.atan2(16384, game.geoConverter.radius * Math.cos(game.geoConverter.latZero * Math.PI / 180)) / Math.PI * 180;

    let lat0 = game.geoConverter.latZero - dLat;
    let long0 = game.geoConverter.longZero - dLong;
    let lat1 = game.geoConverter.latZero + dLat;
    let long1 = game.geoConverter.longZero + dLong;

    
    let latStep = (lat1 - lat0) / NBuildingFetchTiles;
    let longStep = (long1 - long0) / NBuildingFetchTiles;


    let buildingTiles: IBuildingData[][][] = [];
    for (let i = 0; i < NBuildingTiles; i++) {
        buildingTiles[i] = [];
        for (let j = 0; j < NBuildingTiles; j++) {
            buildingTiles[i][j] = [];
        }
    }

    let tags: UniqueList<string> = new UniqueList<string>();

    let s = 1;
    let min = NBuildingFetchTiles / 2 - s;
    let max = NBuildingFetchTiles / 2 + s;
    if (s === 0) {
        min = NBuildingFetchTiles / 2 - 0.5;
        max = NBuildingFetchTiles / 2 + 0.5;
    }
    for (let i = min; i < max; i++) {
        for (let j = min; j < max; j++) {
    //for (let i = 0; i < count; i++) {
    //    for (let j = 0; j < count; j++) {
            console.log("fetching buildings for tile " + i + ", " + j);
            let latMin = lat1 - (i + 1) * latStep;
            let latMax = lat1 - i * latStep;
            let longMin = long0 + j * longStep;
            let longMax = long0 + (j + 1) * longStep;

            var query = `
                [bbox:${latMin.toFixed(7)},${longMin.toFixed(7)},${latMax.toFixed(7)},${longMax.toFixed(7)}]
                [out:json]
                [timeout:120]
                ;
                way(${latMin.toFixed(7)}, ${longMin.toFixed(7)}, ${latMax.toFixed(7)}, ${longMax.toFixed(7)})[building];
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
                let building: IBuildingData = {
                    ijGlobalCenter: [0, 0],
                    ijGlobals: [],
                    type: "",
                    floors: 1,
                    c: Math.floor(Math.random() * 4)
                }

                if (e.tags && e.tags["building"]) {
                    tags.push(e.tags["building"]);
                    building.type = e.tags["building"];
                    if (building.type === "yes") {
                        building.floors = 1 + Math.floor(Math.random() * 3);
                    }
                    else if (building.type === "apartments") {
                        building.floors = 3 + Math.floor(Math.random() * 6);
                    }
                    else if (building.type === "house") {
                        building.floors = 1 + Math.floor(Math.random() * 2);
                    }
                }
                
                //let line: Vector3[] = [];
                let shapeGlobalIMin = Number.POSITIVE_INFINITY;
                let shapeGlobalIMax = Number.NEGATIVE_INFINITY;
                let shapeGlobalJMin = Number.POSITIVE_INFINITY;
                let shapeGlobalJMax = Number.NEGATIVE_INFINITY;
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
                        building.ijGlobals.push(globalIJK.i, globalIJK.j);
                        shapeGlobalIMin = Math.min(shapeGlobalIMin, globalIJK.i);
                        shapeGlobalIMax = Math.max(shapeGlobalIMax, globalIJK.i);
                        shapeGlobalJMin = Math.min(shapeGlobalJMin, globalIJK.j);
                        shapeGlobalJMax = Math.max(shapeGlobalJMax, globalIJK.j);
                    }
                    //line.push(position);
                }

                shapeGlobalIMin -= 4;
                shapeGlobalIMax += 4;
                shapeGlobalJMin -= 4;
                shapeGlobalJMax += 4;

                building.ijGlobalCenter[0] = (shapeGlobalIMin + shapeGlobalIMax) / 2;
                building.ijGlobalCenter[1] = (shapeGlobalJMin + shapeGlobalJMax) / 2;

                let i0 = Math.floor(shapeGlobalIMin / BuildingTileLengthIJ);
                let i1 = Math.floor(shapeGlobalIMax / BuildingTileLengthIJ);
                let j0 = Math.floor(shapeGlobalJMin / BuildingTileLengthIJ);
                let j1 = Math.floor(shapeGlobalJMax / BuildingTileLengthIJ);

                let tileMin = Vector2.Zero();
                let tileMax = Vector2.Zero();
                for (let ii = i0; ii <= i1; ii++) {
                    for (let jj = j0; jj <= j1; jj++) {
                        if (ii >= 0 && ii < NBuildingTiles && jj >= 0 && jj < NBuildingTiles) {
                            tileMin.x = ii * BuildingTileLengthIJ;
                            tileMin.y = jj * BuildingTileLengthIJ;
                            tileMax.x = (ii + 1) * BuildingTileLengthIJ;
                            tileMax.y = (jj + 1) * BuildingTileLengthIJ;
                            
                            for (let n = 0; n < building.ijGlobals.length - 2; n += 2) {
                                let p0 = new Vector2(building.ijGlobals[n], building.ijGlobals[n + 1]);
                                let p1 = new Vector2(building.ijGlobals[n + 2], building.ijGlobals[n + 3]);
                                if (CapsuleRectCheck(p0, p1, 1, tileMin, tileMax)) {
                                    buildingTiles[ii][jj].push(building);
                                    break;
                                }
                            }
                        }
                    }
                }            
                //MeshBuilder.CreateLines("line", { points: line, colors: line.map(() => new Color4(0, 1, 0, 1)) }, game.scene);
            }

            console.log("waiting a bit to avoid overloading the server...");
            await WaitNSeconds(3);
            console.log("continuing");    
        }
    }

    console.log(tags.array);

    let sparseBuildingTiles: IDataTilesCollection<IDataTile<IBuildingData>> = { size: NBuildingTiles, tiles: [] };
    let maxBuildingsPerTile = 0;
    for (let i = 0; i < NBuildingTiles; i++) {
        for (let j = 0; j < NBuildingTiles; j++) {
            maxBuildingsPerTile = Math.max(maxBuildingsPerTile, buildingTiles[i][j].length);
            if (buildingTiles[i][j].length > 0) {
                sparseBuildingTiles.tiles.push({
                    i: i,
                    j: j,
                    dataArray: buildingTiles[i][j],
                });
            }
        }
    }

    download("buildings.json", JSON.stringify(sparseBuildingTiles));
}