import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { ExtendedVertexData } from "./ExtendedVertexData";
import { ImportMeshAsync, SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { ColorizeVertexDataInPlace, GetGLTFVertexData, MirrorZVertexDataInPlace, TriFlipVertexDataInPlace } from "../VertexDataUtils";
import { Scene } from "@babylonjs/core/scene";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";
registerBuiltInLoaders();

export class ChunckVertexData {

    // key : ChunckPart reference (0bxxxxxxxx). value : Array of ChunckPart mesh versions.
    private static _VertexDatas: Map<number, ExtendedVertexData[]>[] = [
        new Map<number, ExtendedVertexData[]>(),
        new Map<number, ExtendedVertexData[]>(),
        new Map<number, ExtendedVertexData[]>()
    ];

    private static NameToRef(name: string): number {
        let v: number = 0b0;
        for (let i = 0; i < name.length; i++) {
            if (name[i] === "1") {
                v |= (0b1 << i);
            }
        }
        return v;
    }

    private static ReOrder = (ref: number, ...order: number[]) => {
        let v: number[] = [];
        for (let i = 0; i < order.length; i++) {
            v[i] = ref & (0b1 << i);
        }
        
        ref = 0b0;
        for (let i = 0; i < order.length; i++) {
            if (v[order[i]]) {
                ref |= 0b1 << i;
            }
        }
        return ref;
    }

    public static RotateXChunckPartRef(ref: number): number {
        return ChunckVertexData.ReOrder(ref, 3, 2, 6, 7, 0, 1, 5, 4);
    }

    public static RotateYChunckPartRef(ref: number): number {
        return ChunckVertexData.ReOrder(ref, 1, 2, 3, 0, 5, 6, 7, 4);
    }

    public static RotateZChunckPartRef(ref: number): number {
        return ChunckVertexData.ReOrder(ref, 4, 0, 3, 7, 5, 1, 2, 6);
    }

    public static FlipChunckPartRef(ref: number): number {
        return ref ^ 0b11111111;
    }

    public static AddChunckPartRef(ref1: number, ref2: number): number {
        return ref1 | ref2;    
    }

    public static MirrorXChunckPartRef(ref: number): number {
        return ChunckVertexData.ReOrder(ref, 1, 0, 3, 2, 5, 4, 7, 6);
    }

    public static MirrorYChunckPartRef(ref: number): number {
        return ChunckVertexData.ReOrder(ref, 4, 5, 6, 7, 0, 1, 2, 3);
    }

    public static MirrorZChunckPartRef(ref: number): number {
        return ChunckVertexData.ReOrder(ref, 3, 2, 1, 0, 7, 6, 5, 4);
    }

    private static _TryAddFlippedChunckPart(lod: number, ref: number, data: VertexData): boolean {
        let flippedRef = ChunckVertexData.FlipChunckPartRef(ref);
        if (!ChunckVertexData._VertexDatas[lod].has(flippedRef)) {
            let flippedData = ChunckVertexData.Flip(data);
            ChunckVertexData._VertexDatas[lod].set(flippedRef, [new ExtendedVertexData(flippedData)]);
            ChunckVertexData._TryAddVariations(lod, flippedRef, flippedData, false);
            return true;
        }
        return false;
    }

    private static _TryAddMirrorXChunckPart(lod: number, ref: number, data: VertexData): boolean {
        let mirrorXRef = ChunckVertexData.MirrorXChunckPartRef(ref);
        if (!ChunckVertexData._VertexDatas[lod].has(mirrorXRef)) {
            let mirrorXData = ChunckVertexData.MirrorX(data);
            ChunckVertexData._VertexDatas[lod].set(mirrorXRef, [new ExtendedVertexData(mirrorXData)]);
            ChunckVertexData._TryAddMirrorYChunckPart(lod, mirrorXRef, mirrorXData);
            ChunckVertexData._TryAddMirrorZChunckPart(lod, mirrorXRef, mirrorXData);
            return true;
        }
        return false;
    }

    private static _TryAddMirrorYChunckPart(lod: number, ref: number, data: VertexData): boolean {
        let mirrorYRef = ChunckVertexData.MirrorYChunckPartRef(ref);
        if (!ChunckVertexData._VertexDatas[lod].has(mirrorYRef)) {
            let mirrorYData = ChunckVertexData.MirrorY(data);
            ChunckVertexData._VertexDatas[lod].set(mirrorYRef, [new ExtendedVertexData(mirrorYData)]);
            ChunckVertexData._TryAddMirrorZChunckPart(lod, mirrorYRef, mirrorYData);
            return true;
        }
        return false;
    }

    private static _TryAddMirrorZChunckPart(lod: number, ref: number, data: VertexData): boolean {
        let mirrorZRef = ChunckVertexData.MirrorZChunckPartRef(ref);
        if (!ChunckVertexData._VertexDatas[lod].has(mirrorZRef)) {
            let mirrorZData = ChunckVertexData.MirrorZ(data);
            ChunckVertexData._VertexDatas[lod].set(mirrorZRef, [new ExtendedVertexData(mirrorZData)]);
            return true;
        }
        return false;
    }

    public static SplitVertexDataTriangles(data: VertexData): VertexData {
        if (!data.indices || !data.positions || !data.normals) {
            return data;
        }
        let splitData = new VertexData();
        let positions: number[] = [];
        let indices: number[] = [];
        let normals: number[] = [];
        let uvs: number[] = [];
        let colors: number[] = [];

        let useUvs = data.uvs && data.uvs.length > 0;
        let useColors = data.colors && data.colors.length > 0;
        
        for (let i = 0; i < data.indices.length / 3; i++) {
            let l = positions.length / 3;

            let i0 = data.indices[3 * i];
            let i1 = data.indices[3 * i + 1];
            let i2 = data.indices[3 * i + 2];

            let x0 = data.positions[3 * i0];
            let y0 = data.positions[3 * i0 + 1];
            let z0 = data.positions[3 * i0 + 2];
            
            let x1 = data.positions[3 * i1];
            let y1 = data.positions[3 * i1 + 1];
            let z1 = data.positions[3 * i1 + 2];
            
            let x2 = data.positions[3 * i2];
            let y2 = data.positions[3 * i2 + 1];
            let z2 = data.positions[3 * i2 + 2];

            /*
            let x = x0 + x1 + x2;
            x = x / 3;
            x0 = 0.98 * x0 + 0.02 * x;
            x1 = 0.98 * x1 + 0.02 * x;
            x2 = 0.98 * x2 + 0.02 * x;
            
            let y = y0 + y1 + y2;
            y = y / 3;
            y0 = 0.98 * y0 + 0.02 * y;
            y1 = 0.98 * y1 + 0.02 * y;
            y2 = 0.98 * y2 + 0.02 * y;
            
            let z = z0 + z1 + z2;
            z = z / 3;
            z0 = 0.98 * z0 + 0.02 * z;
            z1 = 0.98 * z1 + 0.02 * z;
            z2 = 0.98 * z2 + 0.02 * z;
            */
            
            positions.push(x0, y0, z0);
            positions.push(x1, y1, z1);
            positions.push(x2, y2, z2);

            let nx0 = data.normals[3 * i0];
            let ny0 = data.normals[3 * i0 + 1];
            let nz0 = data.normals[3 * i0 + 2];
            
            let nx1 = data.normals[3 * i1];
            let ny1 = data.normals[3 * i1 + 1];
            let nz1 = data.normals[3 * i1 + 2];
            
            let nx2 = data.normals[3 * i2];
            let ny2 = data.normals[3 * i2 + 1];
            let nz2 = data.normals[3 * i2 + 2];
            
            normals.push(nx0, ny0, nz0);
            normals.push(nx1, ny1, nz1);
            normals.push(nx2, ny2, nz2);

            let u0: number;
            let v0: number;
            let u1: number;
            let v1: number;
            let u2: number;
            let v2: number;
            if (useUvs) {
                u0 = data.positions[2 * i0];
                v0 = data.positions[2 * i0 + 1];
                
                u1 = data.positions[2 * i1];
                v1 = data.positions[2 * i1 + 1];
                
                u2 = data.positions[2 * i2];
                v2 = data.positions[2 * i2 + 1];

                uvs.push(u0, v0);
                uvs.push(u1, v1);
                uvs.push(u2, v2);
            }

            let r0: number;
            let g0: number;
            let b0: number;
            let a0: number;
            let r1: number;
            let g1: number;
            let b1: number;
            let a1: number;
            let r2: number;
            let g2: number;
            let b2: number;
            let a2: number;
            if (useColors && data.colors) {
                r0 = data.colors[4 * i0];
                g0 = data.colors[4 * i0 + 1];
                b0 = data.colors[4 * i0 + 2];
                a0 = data.colors[4 * i0 + 3];

                r1 = data.colors[4 * i0];
                g1 = data.colors[4 * i0 + 1];
                b1 = data.colors[4 * i0 + 2];
                a1 = data.colors[4 * i0 + 3];

                r2 = data.colors[4 * i0];
                g2 = data.colors[4 * i0 + 1];
                b2 = data.colors[4 * i0 + 2];
                a2 = data.colors[4 * i0 + 3];

                colors.push(r0, g0, b0, a0);
                colors.push(r1, g1, b1, a1);
                colors.push(r2, g2, b2, a2);
            }

            indices.push(l, l + 1, l + 2);
        }

        splitData.positions = positions;
        splitData.indices = indices;
        splitData.normals = normals;
        if (useUvs) {
            splitData.uvs = uvs;
        }
        if (useColors) {
            splitData.colors = colors;
        }

        return splitData;
    }

    private static _TryAddVariations(lod: number, ref: number, data: VertexData, useXZAxisRotation: boolean): boolean {
        let useful = false;
        useful = ChunckVertexData._TryAddMirrorXChunckPart(lod, ref, data) || useful;
        useful = ChunckVertexData._TryAddMirrorYChunckPart(lod, ref, data) || useful;
        useful = ChunckVertexData._TryAddMirrorZChunckPart(lod, ref, data) || useful;

        if (useXZAxisRotation) {
            let rotatedXRef = ref;
            let rotatedXData = data;
            for (let j = 0; j < 3; j++) {
                rotatedXRef = ChunckVertexData.RotateXChunckPartRef(rotatedXRef);
                rotatedXData = ChunckVertexData.RotateX(rotatedXData);
                if (!ChunckVertexData._VertexDatas[lod].has(rotatedXRef)) {
                    ChunckVertexData._VertexDatas[lod].set(rotatedXRef, [new ExtendedVertexData(rotatedXData)]);
                    useful = true;
                }
                useful = ChunckVertexData._TryAddMirrorXChunckPart(lod, rotatedXRef, rotatedXData) || useful;
                useful = ChunckVertexData._TryAddMirrorYChunckPart(lod, rotatedXRef, rotatedXData) || useful;
                useful = ChunckVertexData._TryAddMirrorZChunckPart(lod, rotatedXRef, rotatedXData) || useful;
            }
        }

        let rotatedYRef = ref;
        let rotatedYData = data;
        for (let j = 0; j < 3; j++) {
            rotatedYRef = ChunckVertexData.RotateYChunckPartRef(rotatedYRef);
            rotatedYData = ChunckVertexData.RotateY(rotatedYData);
            if (!ChunckVertexData._VertexDatas[lod].has(rotatedYRef)) {
                ChunckVertexData._VertexDatas[lod].set(rotatedYRef, [new ExtendedVertexData(rotatedYData)]);
                useful = true;
            }
            useful = ChunckVertexData._TryAddMirrorXChunckPart(lod, rotatedYRef, rotatedYData) || useful;
            useful = ChunckVertexData._TryAddMirrorYChunckPart(lod, rotatedYRef, rotatedYData) || useful;
            useful = ChunckVertexData._TryAddMirrorZChunckPart(lod, rotatedYRef, rotatedYData) || useful;
        }

        if (useXZAxisRotation) {
            let rotatedZRef = ref;
            let rotatedZData = data;
            for (let j = 0; j < 3; j++) {
                rotatedZRef = ChunckVertexData.RotateZChunckPartRef(rotatedZRef);
                rotatedZData = ChunckVertexData.RotateZ(rotatedZData);
                if (!ChunckVertexData._VertexDatas[lod].has(rotatedZRef)) {
                    ChunckVertexData._VertexDatas[lod].set(rotatedZRef, [new ExtendedVertexData(rotatedZData)]);
                    useful = true;
                }
                useful = ChunckVertexData._TryAddMirrorXChunckPart(lod, rotatedZRef, rotatedZData) || useful;
                useful = ChunckVertexData._TryAddMirrorYChunckPart(lod, rotatedZRef, rotatedZData) || useful;
                useful = ChunckVertexData._TryAddMirrorZChunckPart(lod, rotatedZRef, rotatedZData) || useful;
            }
        }

        return useful;
    }

    private static _AddChunckPartMesh(mesh: Mesh, lod: number, useXZAxisRotation: boolean): boolean {
        let useful = false;
        let name = mesh.name;
        let ref = ChunckVertexData.NameToRef(name);
        if (ref === 0) {
            return false;
        }
        let data = VertexData.ExtractFromMesh(mesh);
        
        /*
        let normals = []
        for (let j = 0; j < data.positions.length / 3; j++) {
            let x = data.positions[3 * j];
            let y = data.positions[3 * j + 1];
            let z = data.positions[3 * j + 2];

            let nx = data.normals[3 * j];
            let ny = data.normals[3 * j + 1];
            let nz = data.normals[3 * j + 2];

            if (Math.abs(x) > 0.49 && Math.abs(y) > 0.49 || Math.abs(x) > 0.49 && Math.abs(z) > 0.49 || Math.abs(y) > 0.49 && Math.abs(z) > 0.49) {
                if (Math.abs(nx) > Math.abs(ny) && Math.abs(nx) > Math.abs(nz)) {
                    ny = 0;
                    nz = 0;
                }
                else if (Math.abs(ny) > Math.abs(nx) && Math.abs(ny) > Math.abs(nz)) {
                    nx = 0;
                    nz = 0;
                }
                else if (Math.abs(nz) > Math.abs(nx) && Math.abs(nz) > Math.abs(ny)) {
                    nx = 0;
                    ny = 0;
                }
            }
            if (Math.abs(x) > 0.49) {
                nx = 0;
            }
            if (Math.abs(y) > 0.49) {
                ny = 0;
            }
            if (Math.abs(z) > 0.49) {
                nz = 0;
            }
            if (Math.abs(x) > 0.49 || Math.abs(y) > 0.49 || Math.abs(z) > 0.49) {
                if (Math.abs(Math.abs(x) - 0.144) < 0.02 || Math.abs(Math.abs(y) - 0.144) < 0.02 || Math.abs(Math.abs(z) - 0.144) < 0.02) {
                    if (Math.abs(nx) > Math.abs(ny) && Math.abs(nx) > Math.abs(nz)) {
                        nx = Math.sign(nx) * 0.818
                        if (Math.abs(ny) > Math.abs(nz)) {
                            ny = Math.sign(ny) * 0.582;
                            nz = 0;
                        }
                        else {
                            ny = 0;
                            nz = Math.sign(nz) * 0.582;
                        }
                    }
                    if (Math.abs(ny) > Math.abs(nx) && Math.abs(ny) > Math.abs(nz)) {
                        ny = Math.sign(ny) * 0.818
                        if (Math.abs(nx) > Math.abs(nz)) {
                            nx = Math.sign(nx) * 0.582;
                            nz = 0;
                        }
                        else {
                            nx = 0;
                            nz = Math.sign(nz) * 0.582;
                        }
                    }
                    if (Math.abs(nz) > Math.abs(nx) && Math.abs(nz) > Math.abs(ny)) {
                        nz = Math.sign(nz) * 0.818
                        if (Math.abs(nx) > Math.abs(ny)) {
                            nx = Math.sign(nx) * 0.582;
                            ny = 0;
                        }
                        else {
                            nx = 0;
                            ny = Math.sign(ny) * 0.582;
                        }
                    }
                }
            }

            let l = Math.sqrt(nx * nx + ny * ny + nz * nz);
            normals[3 * j] = nx / l;
            normals[3 * j + 1] = ny / l;
            normals[3 * j + 2] = nz / l;
        }
        data.normals = normals;
        */

        if (data.positions) {
            data.positions = data.positions.map((p: number) => {
                //p = p * 0.95;
                p += 0.5;
                p = Math.round(p * 100) / 100;
                return p;
            });
            //data = PlanetChunckVertexData.SplitVertexDataTriangles(data);
            
            //data.positions = data.positions.map((n: number) => { return n * 0.98 + 0.01; });

            if (!data.colors || data.colors.length / 4 != data.positions.length / 3) {
                let colors = [];
                for (let j = 0; j < data.positions.length / 3; j++) {
                    colors.push(1, 1, 1, 1);
                }
                data.colors = colors;
            }
        }
        
        mesh.dispose();
        if (!ChunckVertexData._VertexDatas[lod].has(ref)) {
            ChunckVertexData._VertexDatas[lod].set(ref, [new ExtendedVertexData(data)]);
            useful = true;
        }

        useful = ChunckVertexData._TryAddVariations(lod, ref, data, useXZAxisRotation) || useful;

        if (!useful) {
            console.warn("Chunck-Part " + name + " is redundant.");
        }

        return useful;
    }

    private static async _LoadChunckVertexDatasFromFile(filePath: string, lod: number, useXZAxisRotation: boolean, scene: Scene): Promise<void> {
        const data = await ImportMeshAsync(filePath, scene);
        data.meshes.forEach(mesh => {
            if (mesh instanceof Mesh && mesh.name !== "__root__") {
                console.log(mesh.name);
                let vData = VertexData.ExtractFromMesh(mesh);
                ColorizeVertexDataInPlace(vData, new Color3(1, 1, 1));
                MirrorZVertexDataInPlace(vData);
                TriFlipVertexDataInPlace(vData);
                vData.applyToMesh(mesh);

                ChunckVertexData._AddChunckPartMesh(mesh, lod, useXZAxisRotation);
            }
        });
        
        data.meshes.forEach(mesh => {
            mesh.dispose(true);
        });
    }

    private static _LoadAltTriangulationChunckVertexDatas(lod: number): void {
        let ref0 = 0b00001111;
        let baseData0 = ChunckVertexData.Get(lod, ref0);
        if (baseData0) {
            let altTriangulationVertexData0 = ChunckVertexData.RotateY(baseData0.vertexData);
            let altTriangulationData0 = new ExtendedVertexData(altTriangulationVertexData0);
            ChunckVertexData._VertexDatas[lod]?.get(ref0)?.push(altTriangulationData0);
        }
    }

    private static _LoadComposedChunckVertexDatas(lod: number, useXZAxisRotation: boolean): void {
        let ref13 = 0b10000010;
        let baseData13A = ChunckVertexData.Get(lod, 0b10000000);
        let baseData13B = ChunckVertexData.Get(lod, 0b00000010);
        if (baseData13A && baseData13B) {
            let data13 = ChunckVertexData.Add(baseData13A.vertexData, baseData13B.vertexData);
            if (!ChunckVertexData._VertexDatas[lod].has(ref13)) {
                ChunckVertexData._VertexDatas[lod].set(ref13, [new ExtendedVertexData(data13)]);
            }
            ChunckVertexData._TryAddVariations(lod, ref13, data13, useXZAxisRotation);
        }
        
        let ref0 = 0b01111111;
        let baseData0 = ChunckVertexData.Get(lod, 0b10000000);
        if (baseData0) {
            let data0 = ChunckVertexData.Flip(baseData0.vertexData);
            if (!ChunckVertexData._VertexDatas[lod].has(ref0)) {
                ChunckVertexData._VertexDatas[lod].set(ref0, [new ExtendedVertexData(data0)]);
            }
            ChunckVertexData._TryAddVariations(lod, ref0, data0, useXZAxisRotation);
        }

        let ref10 = 0b00111111;
        let baseData10 = ChunckVertexData.Get(lod, 0b11000000);
        if (baseData10) {
            let data10 = ChunckVertexData.Flip(baseData10.vertexData);
            if (!ChunckVertexData._VertexDatas[lod].has(ref10)) {
                ChunckVertexData._VertexDatas[lod].set(ref10, [new ExtendedVertexData(data10)]);
            }
            ChunckVertexData._TryAddVariations(lod, ref10, data10, useXZAxisRotation);
        }

        let ref11 = 0b01110111;
        let baseData11 = ChunckVertexData.Get(lod, 0b10001000);
        if (baseData11) {
            let data11 = ChunckVertexData.Flip(baseData11.vertexData);
            if (!ChunckVertexData._VertexDatas[lod].has(ref11)) {
                ChunckVertexData._VertexDatas[lod].set(ref11, [new ExtendedVertexData(data11)]);
            }
            ChunckVertexData._TryAddVariations(lod, ref11, data11, useXZAxisRotation);
        }

        let ref1 = 0b00011111;
        let baseData1 = ChunckVertexData.Get(lod, 0b11100000);
        if (baseData1) {
            let data1 = ChunckVertexData.Flip(baseData1.vertexData);
            if (!ChunckVertexData._VertexDatas[lod].has(ref1)) {
                ChunckVertexData._VertexDatas[lod].set(ref1, [new ExtendedVertexData(data1)]);
            }
            ChunckVertexData._TryAddVariations(lod, ref1, data1, useXZAxisRotation);
        }

        let ref12 = 0b00110111;
        let baseData12 = ChunckVertexData.Get(lod, 0b11001000);
        if (baseData12) {
            let data12 = ChunckVertexData.Flip(baseData12.vertexData);
            if (!ChunckVertexData._VertexDatas[lod].has(ref12)) {
                ChunckVertexData._VertexDatas[lod].set(ref12, [new ExtendedVertexData(data12)]);
            }
            ChunckVertexData._TryAddVariations(lod, ref12, data12, useXZAxisRotation);
        }

        let ref2 = 0b11110101;
        let baseData2A = ChunckVertexData.Get(lod, 0b11110111);
        let baseData2B = ChunckVertexData.Get(lod, 0b11111101);
        if (baseData2A && baseData2B) {
            let data2 = ChunckVertexData.Add(baseData2A.vertexData, baseData2B.vertexData);
            if (!ChunckVertexData._VertexDatas[lod].has(ref2)) {
                ChunckVertexData._VertexDatas[lod].set(ref2, [new ExtendedVertexData(data2)]);
            }
            ChunckVertexData._TryAddVariations(lod, ref2, data2, useXZAxisRotation);
        }

        let ref3 = 0b01011010;
        let baseData3A = ChunckVertexData.Get(lod, 0b01011111);
        let baseData3B = ChunckVertexData.Get(lod, 0b11111010);
        if (baseData3A && baseData3B) {
            let data3 = ChunckVertexData.Add(baseData3A.vertexData, baseData3B.vertexData);
            if (!ChunckVertexData._VertexDatas[lod].has(ref3)) {
                ChunckVertexData._VertexDatas[lod].set(ref3, [new ExtendedVertexData(data3)]);
            }
            ChunckVertexData._TryAddVariations(lod, ref3, data3, useXZAxisRotation);
        }

        let ref4 = 0b10100100;
        let baseData4A = ChunckVertexData.Get(lod, 0b11100100);
        let baseData4B = ChunckVertexData.Get(lod, 0b10111111);
        if (baseData4A && baseData4B) {
            let data4 = ChunckVertexData.Add(baseData4A.vertexData, baseData4B.vertexData);
            if (!ChunckVertexData._VertexDatas[lod].has(ref4)) {
                ChunckVertexData._VertexDatas[lod].set(ref4, [new ExtendedVertexData(data4)]);
            }
            ChunckVertexData._TryAddVariations(lod, ref4, data4, useXZAxisRotation);
        }

        let ref5 = 0b11000011;
        let baseData5A = ChunckVertexData.Get(lod, 0b11001111);
        let baseData5B = ChunckVertexData.Get(lod, 0b11110011);
        if (baseData5A && baseData5B) {
            let data5 = ChunckVertexData.Add(baseData5A.vertexData, baseData5B.vertexData);
            if (!ChunckVertexData._VertexDatas[lod].has(ref5)) {
                ChunckVertexData._VertexDatas[lod].set(ref5, [new ExtendedVertexData(data5)]);
            }
            ChunckVertexData._TryAddVariations(lod, ref5, data5, useXZAxisRotation);
        }

        let ref6 = 0b01110101;
        let baseData6A = ChunckVertexData.Get(lod, 0b01110111);
        let baseData6B = ChunckVertexData.Get(lod, 0b11111101);
        if (baseData6A && baseData6B) {
            let data6 = ChunckVertexData.Add(baseData6A.vertexData, baseData6B.vertexData);
            if (!ChunckVertexData._VertexDatas[lod].has(ref6)) {
                ChunckVertexData._VertexDatas[lod].set(ref6, [new ExtendedVertexData(data6)]);
            }
            ChunckVertexData._TryAddVariations(lod, ref6, data6, useXZAxisRotation);
        }

        let ref7 = 0b01111101;
        let baseData7A = ChunckVertexData.Get(lod, 0b01111111);
        let baseData7B = ChunckVertexData.Get(lod, 0b11111101);
        if (baseData7A && baseData7B) {
            let data7 = ChunckVertexData.Add(baseData7A.vertexData, baseData7B.vertexData);
            if (!ChunckVertexData._VertexDatas[lod].has(ref7)) {
                ChunckVertexData._VertexDatas[lod].set(ref7, [new ExtendedVertexData(data7)]);
            }
            ChunckVertexData._TryAddVariations(lod, ref7, data7, useXZAxisRotation);
        }

        let ref8 = 0b11100101;
        let baseData8A = ChunckVertexData.Get(lod, 0b11101111);
        let baseData8B = ChunckVertexData.Get(lod, 0b11110101);
        if (baseData8A && baseData8B) {
            let data8 = ChunckVertexData.Add(baseData8A.vertexData, baseData8B.vertexData);
            if (!ChunckVertexData._VertexDatas[lod].has(ref8)) {
                ChunckVertexData._VertexDatas[lod].set(ref8, [new ExtendedVertexData(data8)]);
            }
            ChunckVertexData._TryAddVariations(lod, ref8, data8, useXZAxisRotation);
        }

        let ref9 = 0b11100001;
        let baseData9A = ChunckVertexData.Get(lod, 0b11101111);
        let baseData9B = ChunckVertexData.Get(lod, 0b11110001);
        if (baseData9A && baseData9B) {
            let data9 = ChunckVertexData.Add(baseData9A.vertexData, baseData9B.vertexData);
            if (!ChunckVertexData._VertexDatas[lod].has(ref9)) {
                ChunckVertexData._VertexDatas[lod].set(ref9, [new ExtendedVertexData(data9)]);
            }
            ChunckVertexData._TryAddVariations(lod, ref9, data9, useXZAxisRotation);
        }
    }

    public static async InitializeData(filePath: string, scene: Scene): Promise<boolean> {
        await ChunckVertexData._LoadChunckVertexDatasFromFile(filePath, 0, true, scene);
        ChunckVertexData._LoadComposedChunckVertexDatas(0, true);
        ChunckVertexData._LoadAltTriangulationChunckVertexDatas(0);

        return true;
    }

    public static Clone(data: VertexData): VertexData {
        let clonedData = new VertexData();
        if (data.positions) {
            clonedData.positions = [...data.positions];
        }
        if (data.indices) {
            clonedData.indices = [...data.indices];
        }
        if (data.normals) {
            clonedData.normals = [...data.normals];
        }
        if (data.uvs) {
            clonedData.uvs = [...data.uvs];
        }
        if (data.colors) {
            clonedData.colors = [...data.colors];
        }
        return clonedData;
    }

    public static Get(lod: number, ref: number, alternative: number = 0): ExtendedVertexData | undefined {
        let datas = ChunckVertexData._VertexDatas[lod].get(ref);
        return datas ? datas[alternative] : undefined;
    }

    public static RotateX(baseData: VertexData): VertexData {
        if (!baseData.positions || !baseData.indices) {
            return baseData;
        }
        let data = new VertexData();
        let positions = [...baseData.positions];
        let normals: number[] | undefined;
        if (baseData.normals && baseData.normals.length === baseData.positions.length) {
            normals = [...baseData.normals];
        }
        data.indices = [...baseData.indices];

        for (let i = 0; i < positions.length / 3; i++) {
            let y = positions[3 * i + 1] - 0.5;
            let z = positions[3 * i + 2] - 0.5;
            positions[3 * i + 1] = - z + 0.5;
            positions[3 * i + 2] =  y + 0.5;
            if (normals) {
                let yn = normals[3 * i + 1];
                let zn = normals[3 * i + 2];
                normals[3 * i + 1] = - zn;
                normals[3 * i + 2] =  yn;
            }
        }
        data.positions = positions;
        if (normals) {
            data.normals = normals;
        }
        if (baseData.colors) {
            data.colors = [...baseData.colors];
        }

        return data;
    }

    public static RotateY(baseData: VertexData): VertexData {
        if (!baseData.positions || !baseData.indices) {
            return baseData;
        }
        let data = new VertexData();
        let positions = [...baseData.positions];
        let normals: number[] | undefined;
        if (baseData.normals && baseData.normals.length === baseData.positions.length) {
            normals = [...baseData.normals];
        }
        data.indices = [...baseData.indices];

        for (let i = 0; i < positions.length / 3; i++) {
            let x = positions[3 * i] - 0.5;
            let z = positions[3 * i + 2] - 0.5;
            positions[3 * i] = z + 0.5;
            positions[3 * i + 2] =  - x + 0.5;
            if (normals) {
                let xn = normals[3 * i];
                let zn = normals[3 * i + 2];
                normals[3 * i] = zn;
                normals[3 * i + 2] = - xn;
            }
        }
        data.positions = positions;
        if (normals) {
            data.normals = normals;
        }
        if (baseData.colors) {
            data.colors = [...baseData.colors];
        }

        return data;
    }

    public static RotateZ(baseData: VertexData): VertexData {
        if (!baseData.positions || !baseData.indices) {
            return baseData;
        }
        let data = new VertexData();
        let positions = [...baseData.positions];
        let normals: number[] | undefined;
        if (baseData.normals && baseData.normals.length === baseData.positions.length) {
            normals = [...baseData.normals];
        }
        data.indices = [...baseData.indices];

        for (let i = 0; i < positions.length / 3; i++) {
            let x = positions[3 * i] - 0.5;
            let y = positions[3 * i + 1] - 0.5;
            positions[3 * i] = - y + 0.5;
            positions[3 * i + 1] = x + 0.5;
            if (normals) {
                let xn = normals[3 * i];
                let yn = normals[3 * i + 1];
                normals[3 * i] = - yn;
                normals[3 * i + 1] = xn;
            }
        }
        data.positions = positions;
        if (normals) {
            data.normals = normals;
        }
        if (baseData.colors) {
            data.colors = [...baseData.colors];
        }

        return data;
    }

    public static Flip(baseData: VertexData): VertexData {
        if (!baseData.positions || !baseData.indices) {
            return baseData;
        }
        let data = new VertexData();
        data.positions = [...baseData.positions];
        if (baseData.normals && baseData.normals.length === baseData.positions.length) {
            let normals: number[] = [];
            for (let i = 0; i < baseData.normals.length / 3; i++) {
                normals.push(- baseData.normals[3 * i], - baseData.normals[3 * i + 1], - baseData.normals[3 * i + 2]);
            }
            data.normals = normals;
        }
        let indices: number[] = [];
        for (let i = 0; i < baseData.indices.length / 3; i++) {
            indices.push(baseData.indices[3 * i], baseData.indices[3 * i + 2], baseData.indices[3 * i + 1]);
        }
        data.indices = indices;

        if (baseData.colors) {
            data.colors = [...baseData.colors];
        }
        
        return data;
    }

    public static Add(baseData1: VertexData, baseData2: VertexData): VertexData {
        if (!baseData1.positions || !baseData1.indices || !baseData2.positions || !baseData2.indices) {
            return baseData1;
        }
        let l = baseData1.positions.length / 3;
        let data = new VertexData();
        data.positions = [...baseData1.positions, ...baseData2.positions];
        if (baseData1.normals && baseData2.normals) {
            data.normals = [...baseData1.normals, ...baseData2.normals];
        }
        data.indices =  [...baseData1.indices, ...baseData2.indices.map((i: number) => { return i + l; })];
        if (baseData1.colors && baseData2.colors) {
            data.colors = [...baseData1.colors, ...baseData2.colors];
        }
        
        return data;
    }

    public static MirrorX(baseData: VertexData): VertexData {
        if (!baseData.positions || !baseData.indices) {
            return baseData;
        }
        let data = new VertexData();

        let positions: number[] = [];
        for (let i = 0; i < baseData.positions.length / 3; i++) {
            positions.push(1 - baseData.positions[3 * i], baseData.positions[3 * i + 1], baseData.positions[3 * i + 2]);
        }
        data.positions = positions;

        if (baseData.normals && baseData.normals.length === baseData.positions.length) {
            let normals: number[] = [];
            for (let i = 0; i < baseData.normals.length / 3; i++) {
                normals.push(- baseData.normals[3 * i], baseData.normals[3 * i + 1], baseData.normals[3 * i + 2]);
            }
            data.normals = normals;
        }

        let indices: number[] = [];
        for (let i = 0; i < baseData.indices.length / 3; i++) {
            indices.push(baseData.indices[3 * i], baseData.indices[3 * i + 2], baseData.indices[3 * i + 1]);
        }
        data.indices = indices;
        
        if (baseData.colors) {
            data.colors = [...baseData.colors];
        }
        
        return data;
    }

    public static MirrorY(baseData: VertexData): VertexData {
        if (!baseData.positions || !baseData.indices) {
            return baseData;
        }
        let data = new VertexData();

        let positions: number[] = [];
        for (let i = 0; i < baseData.positions.length / 3; i++) {
            positions.push(baseData.positions[3 * i], 1 - baseData.positions[3 * i + 1], baseData.positions[3 * i + 2]);
        }
        data.positions = positions;

        if (baseData.normals && baseData.normals.length === baseData.positions.length) {
            let normals: number[] = [];
            for (let i = 0; i < baseData.normals.length / 3; i++) {
                normals.push(baseData.normals[3 * i], - baseData.normals[3 * i + 1], baseData.normals[3 * i + 2]);
            }
            data.normals = normals;
        }

        let indices: number[] = [];
        for (let i = 0; i < baseData.indices.length / 3; i++) {
            indices.push(baseData.indices[3 * i], baseData.indices[3 * i + 2], baseData.indices[3 * i + 1]);
        }
        data.indices = indices;
        
        if (baseData.colors) {
            data.colors = [...baseData.colors];
        }
        
        return data;
    }

    public static MirrorZ(baseData: VertexData): VertexData {
        if (!baseData.positions || !baseData.indices) {
            return baseData;
        }
        let data = new VertexData();

        let positions: number[] = [];
        for (let i = 0; i < baseData.positions.length / 3; i++) {
            positions.push(baseData.positions[3 * i], baseData.positions[3 * i + 1], 1 - baseData.positions[3 * i + 2]);
        }
        data.positions = positions;

        if (baseData.normals && baseData.normals.length === baseData.positions.length) {
            let normals: number[] = [];
            for (let i = 0; i < baseData.normals.length / 3; i++) {
                normals.push(baseData.normals[3 * i], baseData.normals[3 * i + 1], - baseData.normals[3 * i + 2]);
            }
            data.normals = normals;
        }

        let indices: number[] = [];
        for (let i = 0; i < baseData.indices.length / 3; i++) {
            indices.push(baseData.indices[3 * i], baseData.indices[3 * i + 2], baseData.indices[3 * i + 1]);
        }
        data.indices = indices;
        
        if (baseData.colors) {
            data.colors = [...baseData.colors];
        }
        
        return data;
    }
}
