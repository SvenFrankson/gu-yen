import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Terrain } from "./Terrain";
import { Chunck, DRAW_CHUNCK_MARGIN, Fillness } from "./Chunck";
import { ChunckVertexData } from "./ChunckVertexData";
import { ExtendedVertexData } from "./ExtendedVertexData";
import { BlockType } from "./BlockType";
import { IChunckAnalyticBuildOccurence } from "./ChunckAnalytic";
import { IJK, IsVeryFinite, MinMax } from "../Number";
import { NextFrame } from "../Tools";
import { CreateBoxVertexData } from "@babylonjs/core";
import { CloneVertexData, MergeVertexDatas, ScaleVertexDataInPlace, TranslateVertexDataInPlace } from "babylonjs-tiaratumgames-tools";
import { BlockPoleVertexData } from "./BlockPoleVertexData";

export interface IChunckSubZone {
    i0: number;
    j0: number;
    i1: number;
    j1: number;
}
export class ChunckMeshBuilder {

    public static SplitChunckParts: boolean = false;

    public static MaxVerticesLength: number = 0;
    private readonly _BaseVerticesCountIJ: number;
    private readonly _BaseVerticesCountK: number;
    private readonly _ReferencesLengthIJ: number;
    private readonly _DataLengthIJ: number;
    private readonly _ReferencesLengthK: number;
    private readonly _DataLengthK: number;
    private readonly FlatMesh: boolean;
    private readonly _References: Uint8Array;
    private readonly _PoleReferences: Uint8Array;
    private readonly _Colors: Uint8Array;
    
    private _Vertices: number[][][];
    private _Normals: Vector3[][][];

    constructor(public terrain: Terrain) {
        this._BaseVerticesCountIJ = 2 * terrain.chunckLengthIJ + 1;
        this._BaseVerticesCountK = 2 * terrain.chunckLengthK + 1;
        this._ReferencesLengthIJ = terrain.chunckLengthIJ + 2 * DRAW_CHUNCK_MARGIN;
        this._DataLengthIJ = terrain.chunckLengthIJ + 2 * DRAW_CHUNCK_MARGIN + 1;
        this._ReferencesLengthK = terrain.chunckLengthK + 2 * DRAW_CHUNCK_MARGIN;
        this._DataLengthK = terrain.chunckLengthK + 2 * DRAW_CHUNCK_MARGIN + 1;
        this.FlatMesh = false;
        this._Vertices = [];
        this._Normals = [];
        this._References = new Uint8Array(this._ReferencesLengthIJ * this._ReferencesLengthIJ * this._ReferencesLengthK);
        this._PoleReferences = new Uint8Array(this._ReferencesLengthIJ * this._ReferencesLengthIJ * this._ReferencesLengthK);
        this._Colors = new Uint8Array(this._DataLengthIJ * this._DataLengthIJ * this._DataLengthK);
    }

    private _GetVertex(x: number, y: number, z: number): number | undefined {
        z = Math.floor(z / 2);
        if (y % 2 === 1) {
            x = x / 2;
            z = z / 2;
        }

        if (this.FlatMesh) {
            return undefined;
        }
        if (this._Vertices[y]) {
            if (this._Vertices[y][x]) {
                return this._Vertices[y][x][z];
            }
        }
    }

    private _SetVertex(v: number, x: number, y: number, z: number): void {
        z = Math.floor(z / 2);
        if (y % 2 === 1) {
            x = x / 2;
            z = z / 2;
        }
        
        if (this.FlatMesh) {
            return;
        }
        if (!this._Vertices[y]) {
            this._Vertices[y] = [];
        }
        if (!this._Vertices[y][x]) {
            this._Vertices[y][x] = [];
        }
        
        this._Vertices[y][x][z] = v;
    }

    private _GetNormal(x: number, y: number, z: number): Vector3 {
        //z = Math.floor(z / 2);
        //if (y % 2 === 1) {
        //    x = x / 2;
        //    z = z / 2;
        //}

        if (!this._Normals[y]) {
            this._Normals[y] = [];
        }
        if (!this._Normals[y][x]) {
            this._Normals[y][x] = [];
        }
        if (!this._Normals[y][x][z]) {
            this._Normals[y][x][z] = Vector3.Zero();
        }
        
        return this._Normals[y][x][z];
    }
    
    private _mutex: boolean = false;
    public async BuildMesh(chunck: Chunck, sides: number, subZone?: IChunckSubZone,analyticOccurence?: IChunckAnalyticBuildOccurence): Promise<VertexData> {
        while (this._mutex) {
            await NextFrame();
        }
        this._mutex = true;
        subZone = subZone || { i0: 0, j0: 0, i1: chunck.chunckLengthIJ, j1: chunck.chunckLengthIJ };

        this._Vertices = [];
        this._Normals = [];

        let m = DRAW_CHUNCK_MARGIN;

        let lod = 0;
        let vertexData = new VertexData();
        let positions: number[] = [];
        let indices: number[] = [];
        let normals: number[] = [];
        let colors: number[] = [];
        let uv1s: number[] = [];
        let uv2s: number[] = [];

        let xMin = 2 * subZone.i0;
        let zMin = 2 * subZone.j0;
        let xMax = 2 * subZone.i1 + 1;
        let zMax = 2 * subZone.j1 + 1;
        if (sides & 0b1) {
            xMin = - 2;
        }
        if (sides & 0b10) {
            xMax = this._BaseVerticesCountIJ + 2;
        }
        if (sides & 0b100) {
            zMin = - 2;
        }
        if (sides & 0b1000) {
            zMax = this._BaseVerticesCountIJ + 2;
        }

        let getData: (ii: number, jj: number, kk: number) => number;

        if (sides > 0) {
            getData = (ii: number, jj: number, kk: number) => {
                if (ii <= -1 && sides & 0b1) {
                    return BlockType.None;
                }
                if (jj <= -1 && sides & 0b100) {
                    return BlockType.None;
                }
                if (kk <= 0 && sides & 0b10000) {
                    return BlockType.None;
                }
                if (ii >= chunck.chunckLengthIJ + 1 && sides & 0b10) {
                    return BlockType.None;
                }
                if (jj >= chunck.chunckLengthIJ + 1 && sides & 0b1000) {
                    return BlockType.None;
                }
                if (kk >= chunck.chunckLengthK + 1 && sides & 0b100000) {
                    return BlockType.None;
                }
                
                return chunck.getRawData(ii + m, jj + m, kk);
            }
        }
        else {
            getData = (ii: number, jj: number, kk: number) => {            
                return chunck.getRawData(ii + m, jj + m, kk);
            }
        }

        let firstNonEmptyReferenceK: number = chunck.chunckLengthK;
        let lastNonEmptyReferenceK: number = - m;
        let firstPoleK: number = chunck.chunckLengthK;
        let lastPoleK: number = - m;
        let l = this._ReferencesLengthIJ;
        let references = this._References;
        references.fill(0);
        let poleReferences = this._PoleReferences;
        poleReferences.fill(0);
        let clonedData = this._Colors;
        clonedData.fill(0);
        let profile_buildReferencesArray = () => {
            let prevFillness = chunck.getFillness(- m);
            let currFillness = chunck.getFillness(- m + 1);
            let nextFillness = chunck.getFillness(- m + 2);
            for (let k = 0; k < chunck.dataSizeK; k++) {
                prevFillness = currFillness;
                currFillness = nextFillness;
                nextFillness = chunck.getFillness(k + 1);
                if (currFillness === Fillness.Empty || currFillness === Fillness.Filled) {
                    if (currFillness === prevFillness && currFillness === nextFillness) {
                        continue;
                    }
                }

                firstNonEmptyReferenceK = Math.min(firstNonEmptyReferenceK, k);
                lastNonEmptyReferenceK = Math.max(lastNonEmptyReferenceK, k);

                for (let j = subZone.j0 - m; j < subZone.j1 + m; j++) {
                    for (let i = subZone.i0 - m; i < subZone.i1 + m; i++) {
                        let data = getData(i, j, k);
                        if (data > BlockType.Water && data < BlockType.MetalPole) {
                            let ii = i + m;
                            let jj = j + m;
                            let kk = k;
                            clonedData[ii + jj * l + kk * l * l] = data;
                            references[ii + jj * l + kk * l * l] |= 0b1 << 0;
                            poleReferences[ii + jj * l + (kk + 1) * l * l] |= 0b1 << 5;
                            if (ii > 0) {
                                references[(ii - 1) + jj * l + kk * l * l] |= 0b1 << 1;
                                if (jj > 0) {
                                    references[(ii - 1) + (jj - 1) * l + kk * l * l] |= 0b1 << 2;
                                    if (kk > 0) {
                                        references[(ii - 1) + (jj - 1) * l + (kk - 1) * l * l] |= 0b1 << 6;
                                    }
                                }
                                if (kk > 0) {
                                    references[(ii - 1) + jj * l + (kk - 1) * l * l] |= 0b1 << 5;
                                }
                            }
                            if (jj > 0) {
                                references[ii + (jj - 1) * l + kk * l * l] |= 0b1 << 3;
                                if (kk > 0) {
                                    references[ii + (jj - 1) * l + (kk - 1) * l * l] |= 0b1 << 7;
                                }
                            }
                            if (kk > 0) {
                                references[ii + jj * l + (kk - 1) * l * l] |= 0b1 << 4;
                            }
                        }
                        if (data === BlockType.MetalPole) {
                            let ii = i + m;
                            let jj = j + m;
                            let kk = k;
                            poleReferences[ii + jj * l + kk * l * l] |= 0b1 << 0;
                            if (ii > 0) {
                                poleReferences[(ii - 1) + jj * l + kk * l * l] |= 0b1 << 2;
                            }
                            if (ii < chunck.chunckLengthIJ + m - 1) {
                                poleReferences[(ii + 1) + jj * l + kk * l * l] |= 0b1 << 1;
                            }
                            if (jj > 0) {
                                poleReferences[ii + (jj - 1) * l + kk * l * l] |= 0b1 << 4;
                            }
                            if (jj < chunck.chunckLengthIJ + m - 1) {
                                poleReferences[ii + (jj + 1) * l + kk * l * l] |= 0b1 << 3;
                            }
                            if (kk > 0) {
                                poleReferences[ii + jj * l + (kk - 1) * l * l] |= 0b1 << 6;
                            }
                            if (kk < chunck.chunckLengthK + m - 1) {
                                poleReferences[ii + jj * l + (kk + 1) * l * l] |= 0b1 << 5;
                            }
                            firstPoleK = Math.min(firstPoleK, k);
                            lastPoleK = Math.max(lastPoleK, k);
                        }
                    }
                }
            }
        }
        if (analyticOccurence) {
            let t0 = performance.now();
            profile_buildReferencesArray();
            analyticOccurence.buildRefDuration = performance.now() - t0;
        }
        else {
            profile_buildReferencesArray();
        }

        //await NextFrame();

        if (analyticOccurence) {
            analyticOccurence.firstNonEmptyReferenceK = firstNonEmptyReferenceK;
            analyticOccurence.lastNonEmptyReferenceK = lastNonEmptyReferenceK;
        }

        let profile_fillVertexDataArrays = () => {
            for (let k = firstNonEmptyReferenceK; k < lastNonEmptyReferenceK; k++) {
                for (let j = subZone.j0 - m; j < subZone.j1 + m; j++) {
                    for (let i = subZone.i0 - m; i < subZone.i1 + m; i++) {
                        let ii = i + m;
                        let jj = j + m;
                        let kk = k;
                        let reference = references[ii + jj * l + kk * l * l];

                        if (IsVeryFinite(reference) && reference != 0 && reference != 0b11111111) {
                            let alternativeTriangulation = 0;
                            if (reference === 0b00001111) {
                                let colorA = chunck.getRawData(ii, jj, kk);
                                let colorB = chunck.getRawData(ii + 1, jj, kk);
                                let colorC = chunck.getRawData(ii + 1, jj + 1, kk);
                                let colorD = chunck.getRawData(ii, jj + 1, kk);
                                if (colorA != colorB && colorA != colorD) {
                                    alternativeTriangulation = 1;
                                }
                                else if (colorC != colorB && colorC != colorD) {
                                    alternativeTriangulation = 1;
                                }
                            }
                            let extendedpartVertexData = ChunckVertexData.Get(lod, reference, alternativeTriangulation);
                            if (extendedpartVertexData) {
                                let fastTriangles = extendedpartVertexData.triangles;
                                let fastNormals = extendedpartVertexData.triangleNormals;
                                let fastColorIndexes = extendedpartVertexData.fastColorIndex;
                                for (let triIndex = 0; triIndex < fastTriangles.length; triIndex++) {
                                    let triIndexes = [];
                                    let colorsMap = [];
                                    let addTri = true;
                                    let sumX = 0;
                                    let sumY = 0;
                                    let sumZ = 0;
                                    for (let vIndex = 0; vIndex < 3; vIndex++) {
                                        let x = fastTriangles[triIndex][vIndex].x;
                                        let y = fastTriangles[triIndex][vIndex].y;
                                        let z = fastTriangles[triIndex][vIndex].z;

                                        let cx = fastColorIndexes[triIndex][vIndex].x;
                                        let cy = fastColorIndexes[triIndex][vIndex].y;
                                        let cz = fastColorIndexes[triIndex][vIndex].z;

                                        let xIndex = x + i * 2;
                                        let yIndex = y + k * 2;
                                        let zIndex = z + j * 2;

                                        x = x * 0.5 + i;
                                        y = y * 0.5 + k;
                                        z = z * 0.5 + j;

                                        sumX += x;
                                        sumY += y;
                                        sumZ += z;

                                        let pIndex = positions.length / 3;
                                        if (xIndex >= xMin && zIndex >= zMin && xIndex < xMax && zIndex < zMax) {
                                            let dataAtVertex = chunck.getRawData(i + cx + m, j + cz + m, k + cy);

                                            positions.push(x, y, z);
                                            colors.push(vIndex === 0 ? 1 : 0, vIndex === 1 ? 1 : 0, vIndex === 2 ? 1 : 0, 1);
                                            colorsMap.push(dataAtVertex);
                                            
                                            let n = this._GetNormal(xIndex, yIndex, zIndex);
                                            n.x += fastNormals[triIndex].x;
                                            n.y += fastNormals[triIndex].y;
                                            n.z += fastNormals[triIndex].z;
                                        }
                                        else {
                                            addTri = false;
                                        }
                                        triIndexes[vIndex] = pIndex;
                                    }

                                    for (let vIndex = 0; vIndex < colorsMap.length; vIndex++) {
                                        uv1s.push(colorsMap[0] / 32 + 1 / 64, colorsMap[1] / 32 + 1 / 64);
                                        uv2s.push(colorsMap[2] / 32 + 1 / 64, 0);
                                    }

                                    if (addTri) {
                                        indices.push(...triIndexes);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        if (analyticOccurence) {
            let t0 = performance.now();
            profile_fillVertexDataArrays();
            analyticOccurence.fillVertexDuration = performance.now() - t0;
        }
        else {
            profile_fillVertexDataArrays();
        }
        
        let profile_postProcessVertexDataArrays = () => {
            if (positions.length === 0 || indices.length === 0) {
                return;
            }

            for (let i = 0; i < positions.length / 3; i++) {
                let xIndex = Math.floor(positions[3 * i] * 2);
                let yIndex = Math.floor(positions[3 * i + 1] * 2);
                let zIndex = Math.floor(positions[3 * i + 2] * 2);

                let n = this._GetNormal(xIndex, yIndex, zIndex);
                n.normalize();

                normals[3 * i] = n.x;
                normals[3 * i + 1] = n.y;
                normals[3 * i + 2] = n.z;           

                positions[3 * i] = (positions[3 * i] * chunck.levelFactor + 0.5) * chunck.blockSizeIJ_m;
                positions[3 * i + 1] = (positions[3 * i + 1] * chunck.levelFactor + 0.5) * chunck.blockSizeK_m;
                positions[3 * i + 2] = (positions[3 * i + 2] * chunck.levelFactor + 0.5) * chunck.blockSizeIJ_m;
            }

            let poleVertexDatas: VertexData[] = [];
            for (let k = firstPoleK; k <= lastPoleK; k++) {
                for (let j = 0; j < chunck.chunckLengthIJ; j++) {
                    for (let i = 0; i < chunck.chunckLengthIJ; i++) {
                        let ii = i + m;
                        let jj = j + m;
                        let kk = k;
                        let poleReference = poleReferences[ii + jj * l + kk * l * l];
                        if (poleReference & 0b1) {
                            let poleVertexData = BlockPoleVertexData.Get(0, poleReference >> 1, 0);
                            if (poleVertexData) {
                                poleVertexDatas.push(
                                    TranslateVertexDataInPlace(
                                        ScaleVertexDataInPlace(
                                            CloneVertexData(poleVertexData.vertexData),
                                            chunck.blockSizeIJ_m
                                        ),
                                        new Vector3((i) * chunck.blockSizeIJ_m, (k) * chunck.blockSizeK_m, (j) * chunck.blockSizeIJ_m)
                                    )
                                );
                            }
                            else {
                                //console.log((poleReference >> 1).toString(2) + " not found " + ((poleReference >> 1).toString(10)));
                            }
                        }
                    }
                }
            }

            vertexData.positions = positions;
            vertexData.colors = colors;
            vertexData.normals = normals;
            vertexData.indices = indices;
            vertexData.uvs = uv1s;
            vertexData.uvs2 = uv2s;

            //console.log("VerticesCount = " + (vertexData.positions?.length / 3) + " TrianglesCount = " + (vertexData.indices?.length / 3));
            if (poleVertexDatas.length > 0) {
                let mergedPoleVertexData = MergeVertexDatas(...poleVertexDatas);
                vertexData = MergeVertexDatas(vertexData, mergedPoleVertexData);
            }
        }
        if (analyticOccurence) {
            let t0 = performance.now();
            profile_postProcessVertexDataArrays();
            analyticOccurence.postProcessDuration = performance.now() - t0;
        }
        else {
            profile_postProcessVertexDataArrays();
        }
        
        this._mutex = false;
        return vertexData;
    }

    public BuildFloatingMesh(terrain: Terrain, data: Uint8Array, size: number, i0: number, j0: number, k0: number, i1: number, j1: number, k1: number): VertexData {
        this._Vertices = [];
        this._Normals = [];

        let lod = 0;
        let vertexData = new VertexData();
        let positions: number[] = [];
        let indices: number[] = [];
        let normals: number[] = [];
        let colors: number[] = [];
        let uv1s: number[] = [];
        let uv2s: number[] = [];

        let getData: (ii: number, jj: number, kk: number) => number = (ii: number, jj: number, kk: number) => {
            if (ii < i0 || ii > i1 || jj < j0 || jj > j1 || kk < k0 || kk > k1) {
                return BlockType.None;
            }
            return data[ii + jj * size + kk * size * size];
        }

        let l = size + 2;
        let references = new Uint8Array(l * l * l);
        references.fill(0);
        let profile_buildReferencesArray = () => {
            for (let k = k0 - 1; k <= k1 + 1; k++) {
                for (let j = j0 - 1; j <= j1 + 1; j++) {
                    for (let i = i0 - 1; i <= i1 + 1; i++) {
                        let data = getData(i, j, k);
                        if (data > BlockType.Water) {
                            let ii = i;
                            let jj = j;
                            let kk = k;
                            references[ii + jj * l + kk * l * l] |= 0b1 << 0;
                            if (ii > 0) {
                                references[(ii - 1) + jj * l + kk * l * l] |= 0b1 << 1;
                                if (jj > 0) {
                                    references[(ii - 1) + (jj - 1) * l + kk * l * l] |= 0b1 << 2;
                                    if (kk > 0) {
                                        references[(ii - 1) + (jj - 1) * l + (kk - 1) * l * l] |= 0b1 << 6;
                                    }
                                }
                                if (kk > 0) {
                                    references[(ii - 1) + jj * l + (kk - 1) * l * l] |= 0b1 << 5;
                                }
                            }
                            if (jj > 0) {
                                references[ii + (jj - 1) * l + kk * l * l] |= 0b1 << 3;
                                if (kk > 0) {
                                    references[ii + (jj - 1) * l + (kk - 1) * l * l] |= 0b1 << 7;
                                }
                            }
                            if (kk > 0) {
                                references[ii + jj * l + (kk - 1) * l * l] |= 0b1 << 4;
                            }
                        }
                    }
                }
            }
        }
        profile_buildReferencesArray();

        let profile_fillVertexDataArrays = () => {
            for (let k = k0 - 1; k <= k1 + 1; k++) {
                for (let j = j0 - 1; j <= j1 + 1; j++) {
                    for (let i = i0 - 1; i <= i1 + 1; i++) {
                        let ii = i;
                        let jj = j;
                        let kk = k;
                        let reference = references[ii + jj * l + kk * l * l];

                        if (IsVeryFinite(reference) && reference != 0 && reference != 0b11111111) {
                            let alternativeTriangulation = 0;
                            let extendedpartVertexData = ChunckVertexData.Get(lod, reference, alternativeTriangulation);
                            if (extendedpartVertexData) {
                                let fastTriangles = extendedpartVertexData.triangles;
                                let fastNormals = extendedpartVertexData.triangleNormals;
                                let fastColorIndexes = extendedpartVertexData.fastColorIndex;
                                for (let triIndex = 0; triIndex < fastTriangles.length; triIndex++) {
                                    let triIndexes = [];
                                    let colorsMap: number[] = [];
                                    let addTri = true;
                                    let sumX = 0;
                                    let sumY = 0;
                                    let sumZ = 0;
                                    for (let vIndex = 0; vIndex < 3; vIndex++) {
                                        let x = fastTriangles[triIndex][vIndex].x;
                                        let y = fastTriangles[triIndex][vIndex].y;
                                        let z = fastTriangles[triIndex][vIndex].z;

                                        let cx = fastColorIndexes[triIndex][vIndex].x;
                                        let cy = fastColorIndexes[triIndex][vIndex].y;
                                        let cz = fastColorIndexes[triIndex][vIndex].z;

                                        x = x * 0.5 + i - i0;
                                        y = y * 0.5 + k - k0;
                                        z = z * 0.5 + j - j0;

                                        let xIndex = Math.floor(x * 2);
                                        let yIndex = Math.floor(y * 2);
                                        let zIndex = Math.floor(z * 2);

                                        sumX += x;
                                        sumY += y;
                                        sumZ += z;

                                        let pIndex = positions.length / 3;
                                        positions.push(x, y, z);
                                        colors.push(vIndex === 0 ? 1 : 0, vIndex === 1 ? 1 : 0, vIndex === 2 ? 1 : 0, 1);
                                        let dataAtVertex = getData(i + cx, j + cz, k + cy);
                                        colorsMap.push(dataAtVertex);
                                        
                                        let n = this._GetNormal(xIndex, yIndex, zIndex);
                                        n.x += fastNormals[triIndex].x;
                                        n.y += fastNormals[triIndex].y;
                                        n.z += fastNormals[triIndex].z;
                                        triIndexes[vIndex] = pIndex;
                                    }

                                    for (let vIndex = 0; vIndex < colorsMap.length; vIndex++) {
                                        uv1s.push(colorsMap[0] / 32 + 1 / 64, colorsMap[1] / 32 + 1 / 64);
                                        uv2s.push(colorsMap[2] / 32 + 1 / 64, 0);
                                    }

                                    if (addTri) {
                                        indices.push(...triIndexes);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        profile_fillVertexDataArrays();

        let profile_postProcessVertexDataArrays = () => {
            if (positions.length === 0 || indices.length === 0) {
                return;
            }

            for (let i = 0; i < positions.length / 3; i++) {
                let xIndex = Math.floor(positions[3 * i] * 2);
                let yIndex = Math.floor(positions[3 * i + 1] * 2);
                let zIndex = Math.floor(positions[3 * i + 2] * 2);

                console.log(xIndex, yIndex, zIndex);

                let n = this._GetNormal(xIndex, yIndex, zIndex);
                n.normalize();

                normals[3 * i] = n.x;
                normals[3 * i + 1] = n.y;
                normals[3 * i + 2] = n.z;           

                positions[3 * i] = (positions[3 * i] + 0.5) * terrain.blockSizeIJ_m;
                positions[3 * i + 1] = (positions[3 * i + 1] + 0.5) * terrain.blockSizeK_m;
                positions[3 * i + 2] = (positions[3 * i + 2] + 0.5) * terrain.blockSizeIJ_m;
            }

            vertexData.positions = positions;
            vertexData.normals = normals;
            vertexData.colors = colors;
            vertexData.indices = indices;
            vertexData.uvs = uv1s;
            vertexData.uvs2 = uv2s;
        }
        profile_postProcessVertexDataArrays();
        
        return vertexData;
    }

    public BuildGridMesh(chunck: Chunck, ijk: IJK, radius: number, color: Color3, alphaMax: number = 1): VertexData {
        let datas = new VertexData();

        let positions: number[] = [];
        let indices: number[] = [];
        let normals: number[] = [];
        let colors: number[] = [];

        let o = 0.005;

        for (let i = - Math.ceil(radius); i <= Math.ceil(radius); i++) {
            for (let j = - Math.ceil(radius); j <= Math.ceil(radius); j++) {
                for (let k = - Math.ceil(radius); k <= Math.ceil(radius); k++) {
                    let d = Math.sqrt(i * i + j * j + k * k);
                    if (d <= radius + 0.5) {
                        let I = ijk.i + i;
                        let J = ijk.j + j;
                        let K = ijk.k + k;

                        let a = alphaMax * (1 - (d / radius));
                        a = MinMax(a, 0, 1);

                        let b = chunck.getData(I, J, K);
                        if (b > BlockType.Water) {
                            let x0 = I * chunck.blockSizeIJ_m;
                            let x1 = (I + 1) * chunck.blockSizeIJ_m;
                            let y0 = K * chunck.blockSizeK_m;
                            let y1 = (K + 1) * chunck.blockSizeK_m;
                            let z0 = J * chunck.blockSizeIJ_m;
                            let z1 = (J + 1) * chunck.blockSizeIJ_m;

                            let bIP = chunck.getData(I + 1, J, K);
                            if (bIP <= BlockType.Water) {
                                let l = positions.length / 3;
                                positions.push(x1 + o, y0 + o, z0 + o);
                                positions.push(x1 + o, y1 - o, z0 + o);
                                positions.push(x1 + o, y1 - o, z1 - o);
                                positions.push(x1 + o, y0 + o, z1 - o);
                                indices.push(l, l + 2, l + 1);
                                indices.push(l, l + 3, l + 2);
                                normals.push(1, 0, 0);
                                normals.push(1, 0, 0);
                                normals.push(1, 0, 0);
                                normals.push(1, 0, 0);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                            }

                            let bIM = chunck.getData(I - 1, J, K);
                            if (bIM <= BlockType.Water) {
                                let l = positions.length / 3;
                                positions.push(x0 - o, y0 + o, z1 + o);
                                positions.push(x0 - o, y1 - o, z1 + o);
                                positions.push(x0 - o, y1 - o, z0 - o);
                                positions.push(x0 - o, y0 + o, z0 - o);
                                indices.push(l, l + 2, l + 1);
                                indices.push(l, l + 3, l + 2);
                                normals.push(- 1, 0, 0);
                                normals.push(- 1, 0, 0);
                                normals.push(- 1, 0, 0);
                                normals.push(- 1, 0, 0);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                            }
                            
                            let bKP = chunck.getData(I, J, K + 1);
                            if (bKP <= BlockType.Water) {
                                let l = positions.length / 3;
                                positions.push(x0 + o, y1 + o, z0 + o);
                                positions.push(x0 + o, y1 + o, z1 - o);
                                positions.push(x1 - o, y1 + o, z1 - o);
                                positions.push(x1 - o, y1 + o, z0 + o);
                                indices.push(l, l + 2, l + 1);
                                indices.push(l, l + 3, l + 2);
                                normals.push(0, 1, 0);
                                normals.push(0, 1, 0);
                                normals.push(0, 1, 0);
                                normals.push(0, 1, 0);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                            }
                            
                            let bKM = chunck.getData(I, J, K - 1);
                            if (bKM <= BlockType.Water) {
                                let l = positions.length / 3;
                                positions.push(x0 + o, y0 - o, z1 - o);
                                positions.push(x0 + o, y0 - o, z0 + o);
                                positions.push(x1 - o, y0 - o, z0 + o);
                                positions.push(x1 - o, y0 - o, z1 - o);
                                indices.push(l, l + 2, l + 1);
                                indices.push(l, l + 3, l + 2);
                                normals.push(0, - 1, 0);
                                normals.push(0, - 1, 0);
                                normals.push(0, - 1, 0);
                                normals.push(0, - 1, 0);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                            }
                            
                            let bJP = chunck.getData(I, J + 1, K);
                            if (bJP <= BlockType.Water) {
                                let l = positions.length / 3;
                                positions.push(x1 - o, y0 + o, z1 + o);
                                positions.push(x1 - o, y1 - o, z1 + o);
                                positions.push(x0 + o, y1 - o, z1 + o);
                                positions.push(x0 + o, y0 + o, z1 + o);
                                indices.push(l, l + 2, l + 1);
                                indices.push(l, l + 3, l + 2);
                                normals.push(0, 0, 1);
                                normals.push(0, 0, 1);
                                normals.push(0, 0, 1);
                                normals.push(0, 0, 1);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                            }

                            let bJM = chunck.getData(I, J - 1, K);
                            if (bJM <= BlockType.Water) {
                                let l = positions.length / 3;
                                positions.push(x0 - o, y0 + o, z0 - o);
                                positions.push(x0 - o, y1 - o, z0 - o);
                                positions.push(x1 + o, y1 - o, z0 - o);
                                positions.push(x1 + o, y0 + o, z0 - o);
                                indices.push(l, l + 2, l + 1);
                                indices.push(l, l + 3, l + 2);
                                normals.push(0, 0, - 1);
                                normals.push(0, 0, - 1);
                                normals.push(0, 0, - 1);
                                normals.push(0, 0, - 1);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                                colors.push(color.r, color.g, color.b, a);
                            }
                        }
                    }
                }
            }
        }

        datas.positions = positions;
        datas.indices = indices;
        datas.normals = normals;
        //datas.colors = colors;

        return datas;
    }
}

var CMB = ChunckMeshBuilder;
