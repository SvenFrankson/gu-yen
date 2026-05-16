import * as earcut from "earcut"
import { Chunck, DRAW_CHUNCK_MARGIN } from "../../Chunck";
import { ChunckDataGeneratorDataSets, IBuildingData } from "../ChunckDataGeneratorDataSets";
import { AngleFromTo, RasterizeTriangle, RasterizeTriangles } from "../../../Math2D";
import { BlockType } from "../../BlockType";
import { IsVeryFinite } from "../../../Number";
import { Vector2 } from "@babylonjs/core/Maths/math.vector";

export function drawBuilding(buildingData: IBuildingData, chunck: Chunck, chunckGenerator: ChunckDataGeneratorDataSets): void {
    let m = DRAW_CHUNCK_MARGIN;

    let heightMap = chunckGenerator.getDataIfReady();
    if (!heightMap) {
        return;
    }

    let floorHeight = 7;
    let h0 = Math.floor(chunckGenerator.evaluateHeight(heightMap, buildingData.ijGlobalCenter[0], buildingData.ijGlobalCenter[1]));
    if (!IsVeryFinite(buildingData.floors)) {
        buildingData.floors = 1;
    }
    let h = buildingData.floors * floorHeight;

    let localIJs = buildingData.ijGlobals.map((ijGlobal, index) => {
        if (index % 2 === 0) {
            return ijGlobal - chunck.iPos * chunck.chunckLengthIJ;
        } else {
            return ijGlobal - chunck.jPos * chunck.chunckLengthIJ;
        }
    });

    let triangles = earcut.default(localIJs, undefined, 2);
    for (let t = 0; t < triangles.length; t += 3) {
        let i0 = localIJs[2 * triangles[t]];
        let j0 = localIJs[2 * triangles[t] + 1];

        let i1 = localIJs[2 * triangles[t + 1]];
        let j1 = localIJs[2 * triangles[t + 1] + 1];

        let i2 = localIJs[2 * triangles[t + 2]];
        let j2 = localIJs[2 * triangles[t + 2] + 1];

        RasterizeTriangle(
            i0, j0,
            i1, j1,
            i2, j2,
            (i, j) => {
                chunck.setRawData(BlockType.Regolith, i + m, j + m, h0);
                for (let k = 1; k < 3; k++) {
                    chunck.setRawData(BlockType.None, i + m, j + m, h0 + k);
                }
                for (let f = 1; f < buildingData.floors; f++) {
                    let k = h0 + f * floorHeight;
                    if (chunck.getRawData(i + m, j + m, k) === BlockType.None) {
                        chunck.setRawData(BlockType.Regolith, i + m, j + m, k);
                    }
                }
                chunck.setRawData(BlockType.Laterite, i + m, j + m, Math.floor(h + h0 + 1));
            },
            -m, chunck.chunckLengthIJ + m - 1, -m, chunck.chunckLengthIJ + m - 1
        );
    }

    let stairW = 5;
    let stairL = floorHeight * 2;
    let stairP: Vector2 | undefined = undefined;
    let stairDir: Vector2 | undefined = undefined;
    let stairRightDir: Vector2 | undefined = undefined;
    let l = localIJs.length;
    for (let n = 0; n < localIJs.length - 2; n += 2) {
        let prev = new Vector2(localIJs[(n - 2 + l) % l], localIJs[(n - 2 + 1 + l) % l]);
        let p = new Vector2(localIJs[n], localIJs[n + 1]);
        let next = new Vector2(localIJs[(n + 2) % l], localIJs[(n + 2 + 1) % l]);
        
        let v0 = p.subtract(prev);
        if (v0.length() > 2 * stairW) {
            let v1 = next.subtract(p);
            if (v1.length() > stairW + stairL) {
                let angle = AngleFromTo(v0, v1);
                if (Math.abs(angle - Math.PI / 2) < Math.PI / 8) {
                    stairP = p;
                    stairRightDir = v0.normalize().scaleInPlace(-1);
                    stairDir = v1.normalize();
                    break;
                }
            }
        }
    }

    if (stairP && stairDir && stairRightDir) {
        let p0 = stairP.clone();
        let p1 = stairP.add(stairDir.scale(stairW));
        let p2 = stairP.add(stairDir.scale(stairW + stairL));
        let p3 = p2.add(stairRightDir.scale(stairW));
        let p4 = p1.add(stairRightDir.scale(stairW));
        let p5 = stairP.add(stairRightDir.scale(stairW));

        for (let f = 0; f < buildingData.floors - 1; f++) {
            /*
            for (let nn = 0; nn <= stairW; nn++) {
                let iBase = Math.round(p2.x + (p3.x - p2.x) * nn / stairW);
                let jBase = Math.round(p2.y + (p3.y - p2.y) * nn / stairW);
                let kBase = h0 + f * floorHeight;

                let iTop = Math.round(p1.x + (p4.x - p1.x) * nn / stairW);
                let jTop = Math.round(p1.y + (p4.y - p1.y) * nn / stairW);
                let kTop = h0 + (f + 1) * floorHeight;
            }*/
            if (f % 2 === 0) {
                RasterizeTriangles([p1, p2, p3, p1, p3, p4], (i, j) => {
                    let d = new Vector2(i, j).subtract(p2);
                    let dr = stairRightDir!.dot(d);
                    let dl = stairDir!.dot(d);
                    let k = h0 + f * floorHeight + Math.floor(-dl / stairL * floorHeight);
                    chunck.setRawData(BlockType.None, i + m, j + m, h0 + (f + 1) * floorHeight);
                    chunck.setRawData(BlockType.Wood, i + m, j + m, k);
                }, -m, chunck.chunckLengthIJ + m - 1, -m, chunck.chunckLengthIJ + m - 1);
            }
            else {
                RasterizeTriangles([p1.add(stairRightDir.scale(stairW)), p2.add(stairRightDir.scale(stairW)), p3.add(stairRightDir.scale(stairW)), p1.add(stairRightDir.scale(stairW)), p3.add(stairRightDir.scale(stairW)), p4.add(stairRightDir.scale(stairW))], (i, j) => {
                    let d = new Vector2(i, j).subtract(p1.add(stairRightDir.scale(stairW)));
                    let dr = stairRightDir!.dot(d);
                    let dl = - stairDir!.dot(d);
                    let k = h0 + f * floorHeight + Math.floor(-dl / stairL * floorHeight);
                    chunck.setRawData(BlockType.None, i + m, j + m, h0 + (f + 1) * floorHeight);
                    chunck.setRawData(BlockType.Wood, i + m, j + m, k);
                }, -m, chunck.chunckLengthIJ + m - 1, -m, chunck.chunckLengthIJ + m - 1);
            }
        }
    }

    let localCenterI = Math.floor(buildingData.ijGlobalCenter[0]) - chunck.iPos * chunck.chunckLengthIJ;
    let localCenterJ = Math.floor(buildingData.ijGlobalCenter[1]) - chunck.jPos * chunck.chunckLengthIJ;

    for (let n = 0; n < localIJs.length - 2; n += 2) {
        let i0 = localIJs[n];
        let j0 = localIJs[n + 1];
        let i1 = localIJs[n + 2];
        let j1 = localIJs[n + 3];

        let l = Math.max(Math.abs(i1 - i0), Math.abs(j1 - j0));
        for (let nn = 0; nn <= l; nn++) {
            let i = Math.round(i0 + (i1 - i0) * nn / l);
            if (i >= -m && i < chunck.chunckLengthIJ + m) {
                let j = Math.round(j0 + (j1 - j0) * nn / l);
                if (j >= -m && j < chunck.chunckLengthIJ + m) {
                    let wallType = 0;
                    if (nn % 6 >= 2 && nn % 6 <= 3) {
                        wallType = 2;
                    }
                    else if (nn % 6 >= 1 && nn % 6 <= 4) {
                        wallType = 3;
                    }
                    for (let k = 0; k <= h; k++) {
                        let kGlobal = h0 + k;
                        let blockType = BlockType.WhiteConcrete + buildingData.c;
                        if (wallType === 0) {
                            chunck.setRawData(blockType, i + m, j + m, kGlobal);
                        }
                        else if (wallType === 2) {
                            if (k < floorHeight) {
                                let dH = k % floorHeight;
                                if (dH >= 6) {
                                    chunck.setRawData(blockType, i + m, j + m, kGlobal);
                                }
                                else {
                                    chunck.setRawData(BlockType.None, i + m, j + m, kGlobal);
                                }
                            }
                            else {
                                let dH = k % floorHeight;
                                if (dH <= 2 || dH >= 6) {
                                    chunck.setRawData(blockType, i + m, j + m, kGlobal);
                                }
                                else {
                                    chunck.setRawData(BlockType.None, i + m, j + m, kGlobal);
                                }
                            }
                        }
                        else if (wallType === 3) {
                            if (k < floorHeight) {
                                let dH = k % floorHeight;
                                if (dH >= 6) {
                                    chunck.setRawData(blockType, i + m, j + m, kGlobal);
                                }
                                else {
                                    chunck.setRawData(BlockType.None, i + m, j + m, kGlobal);
                                }
                            }
                            else {
                                chunck.setRawData(blockType, i + m, j + m, kGlobal);
                            }
                        }
                    }
                }
            }
        }
    }
}