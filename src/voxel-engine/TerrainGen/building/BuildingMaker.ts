import * as earcut from "earcut"
import { Chunck, DRAW_CHUNCK_MARGIN } from "../../Chunck";
import { ChunckDataGeneratorDataSets, IBuildingData } from "../ChunckDataGeneratorDataSets";
import { RasterizeTriangle } from "../../../Math2D";
import { BlockType } from "../../BlockType";

export function drawBuilding(buildingData: IBuildingData, chunck: Chunck, chunckGenerator: ChunckDataGeneratorDataSets): void {
    let m = DRAW_CHUNCK_MARGIN;

    let heightMap = chunckGenerator.getDataIfReady();
    if (!heightMap) {
        return;
    }

    let h0 = chunckGenerator.evaluateHeight(heightMap, buildingData.ijGlobalCenter[0], buildingData.ijGlobalCenter[1]);
    let h = (buildingData.h !== undefined ? buildingData.h! : 6);

    let localIJs = buildingData.ijGlobals.map((ijGlobal, index) => {
        if (index % 2 === 0) {
            return ijGlobal - chunck.iPos * chunck.chunckLengthIJ;
        } else {
            return ijGlobal - chunck.jPos * chunck.chunckLengthIJ;
        }
    });

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
                    for (let k = 0; k < h; k++) {
                        let blockType = BlockType.WhiteConcrete + buildingData.c;
                        chunck.setRawData(blockType, i + m, j + m, k);
                    }
                }
            }
        }
    }

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
                chunck.setRawData(BlockType.Laterite, i + m, j + m, Math.floor(h + h0 + 1));
            },
            -m, chunck.chunckLengthIJ + m - 1, -m, chunck.chunckLengthIJ + m - 1
        );
    }
}