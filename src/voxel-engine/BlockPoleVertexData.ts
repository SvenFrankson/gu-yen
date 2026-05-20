import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { ExtendedVertexData } from "./ExtendedVertexData";
import { ImportMeshAsync, SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { ColorizeVertexDataInPlace, GetGLTFVertexData, MirrorZVertexDataInPlace, TriFlipVertexDataInPlace } from "babylonjs-tiaratumgames-tools";
import { Scene } from "@babylonjs/core/scene";
import { Color3 } from "@babylonjs/core/Maths/math.color";

export class BlockPoleVertexData {

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
        return BlockPoleVertexData.ReOrder(ref, 0, 1, 4, 5, 3, 2);
    }

    public static RotateYChunckPartRef(ref: number): number {
        return BlockPoleVertexData.ReOrder(ref, 2, 3, 1, 0, 4, 5);
    }

    public static RotateZChunckPartRef(ref: number): number {
        return BlockPoleVertexData.ReOrder(ref, 5, 4, 2, 3, 0, 1);
    }

    public static FlipChunckPartRef(ref: number): number {
        return ref ^ 0b111111;
    }

    public static AddChunckPartRef(ref1: number, ref2: number): number {
        return ref1 | ref2;    
    }

    public static MirrorXChunckPartRef(ref: number): number {
        return BlockPoleVertexData.ReOrder(ref, 1, 0, 2, 3, 4, 5);
    }

    public static MirrorYChunckPartRef(ref: number): number {
        return BlockPoleVertexData.ReOrder(ref, 0, 1, 2, 3, 5, 4);
    }

    public static MirrorZChunckPartRef(ref: number): number {
        return BlockPoleVertexData.ReOrder(ref, 0, 1, 3, 2, 4, 5);
    }

    private static _TryAddMirrorXChunckPart(lod: number, ref: number, data: VertexData): boolean {
        let mirrorXRef = BlockPoleVertexData.MirrorXChunckPartRef(ref);
        if (!BlockPoleVertexData._VertexDatas[lod].has(mirrorXRef)) {
            let mirrorXData = BlockPoleVertexData.MirrorX(data);
            BlockPoleVertexData._VertexDatas[lod].set(mirrorXRef, [new ExtendedVertexData(mirrorXData)]);
            BlockPoleVertexData._TryAddMirrorYChunckPart(lod, mirrorXRef, mirrorXData);
            BlockPoleVertexData._TryAddMirrorZChunckPart(lod, mirrorXRef, mirrorXData);
            return true;
        }
        return false;
    }

    private static _TryAddMirrorYChunckPart(lod: number, ref: number, data: VertexData): boolean {
        let mirrorYRef = BlockPoleVertexData.MirrorYChunckPartRef(ref);
        if (!BlockPoleVertexData._VertexDatas[lod].has(mirrorYRef)) {
            let mirrorYData = BlockPoleVertexData.MirrorY(data);
            BlockPoleVertexData._VertexDatas[lod].set(mirrorYRef, [new ExtendedVertexData(mirrorYData)]);
            BlockPoleVertexData._TryAddMirrorZChunckPart(lod, mirrorYRef, mirrorYData);
            return true;
        }
        return false;
    }

    private static _TryAddMirrorZChunckPart(lod: number, ref: number, data: VertexData): boolean {
        let mirrorZRef = BlockPoleVertexData.MirrorZChunckPartRef(ref);
        if (!BlockPoleVertexData._VertexDatas[lod].has(mirrorZRef)) {
            let mirrorZData = BlockPoleVertexData.MirrorZ(data);
            BlockPoleVertexData._VertexDatas[lod].set(mirrorZRef, [new ExtendedVertexData(mirrorZData)]);
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
        useful = BlockPoleVertexData._TryAddMirrorXChunckPart(lod, ref, data) || useful;
        useful = BlockPoleVertexData._TryAddMirrorYChunckPart(lod, ref, data) || useful;
        useful = BlockPoleVertexData._TryAddMirrorZChunckPart(lod, ref, data) || useful;

        if (useXZAxisRotation) {
            let rotatedXRef = ref;
            let rotatedXData = data;
            for (let j = 0; j < 3; j++) {
                rotatedXRef = BlockPoleVertexData.RotateXChunckPartRef(rotatedXRef);
                rotatedXData = BlockPoleVertexData.RotateX(rotatedXData);
                if (!BlockPoleVertexData._VertexDatas[lod].has(rotatedXRef)) {
                    BlockPoleVertexData._VertexDatas[lod].set(rotatedXRef, [new ExtendedVertexData(rotatedXData)]);
                    useful = true;
                }
                useful = BlockPoleVertexData._TryAddMirrorXChunckPart(lod, rotatedXRef, rotatedXData) || useful;
                useful = BlockPoleVertexData._TryAddMirrorYChunckPart(lod, rotatedXRef, rotatedXData) || useful;
                useful = BlockPoleVertexData._TryAddMirrorZChunckPart(lod, rotatedXRef, rotatedXData) || useful;

                let rotatedYRef = rotatedXRef;
                let rotatedYData = rotatedXData;
                for (let j = 0; j < 3; j++) {
                    rotatedYRef = BlockPoleVertexData.RotateYChunckPartRef(rotatedYRef);
                    rotatedYData = BlockPoleVertexData.RotateY(rotatedYData);
                    if (!BlockPoleVertexData._VertexDatas[lod].has(rotatedYRef)) {
                        BlockPoleVertexData._VertexDatas[lod].set(rotatedYRef, [new ExtendedVertexData(rotatedYData)]);
                        useful = true;
                    }
                    useful = BlockPoleVertexData._TryAddMirrorXChunckPart(lod, rotatedYRef, rotatedYData) || useful;
                    useful = BlockPoleVertexData._TryAddMirrorYChunckPart(lod, rotatedYRef, rotatedYData) || useful;
                    useful = BlockPoleVertexData._TryAddMirrorZChunckPart(lod, rotatedYRef, rotatedYData) || useful;
                }
            }
        }

        let rotatedYRef = ref;
        let rotatedYData = data;
        for (let j = 0; j < 3; j++) {
            rotatedYRef = BlockPoleVertexData.RotateYChunckPartRef(rotatedYRef);
            rotatedYData = BlockPoleVertexData.RotateY(rotatedYData);
            if (!BlockPoleVertexData._VertexDatas[lod].has(rotatedYRef)) {
                BlockPoleVertexData._VertexDatas[lod].set(rotatedYRef, [new ExtendedVertexData(rotatedYData)]);
                useful = true;
            }
            useful = BlockPoleVertexData._TryAddMirrorXChunckPart(lod, rotatedYRef, rotatedYData) || useful;
            useful = BlockPoleVertexData._TryAddMirrorYChunckPart(lod, rotatedYRef, rotatedYData) || useful;
            useful = BlockPoleVertexData._TryAddMirrorZChunckPart(lod, rotatedYRef, rotatedYData) || useful;
        }

        if (useXZAxisRotation) {
            let rotatedZRef = ref;
            let rotatedZData = data;
            for (let j = 0; j < 3; j++) {
                rotatedZRef = BlockPoleVertexData.RotateZChunckPartRef(rotatedZRef);
                rotatedZData = BlockPoleVertexData.RotateZ(rotatedZData);
                if (!BlockPoleVertexData._VertexDatas[lod].has(rotatedZRef)) {
                    BlockPoleVertexData._VertexDatas[lod].set(rotatedZRef, [new ExtendedVertexData(rotatedZData)]);
                    useful = true;
                }
                useful = BlockPoleVertexData._TryAddMirrorXChunckPart(lod, rotatedZRef, rotatedZData) || useful;
                useful = BlockPoleVertexData._TryAddMirrorYChunckPart(lod, rotatedZRef, rotatedZData) || useful;
                useful = BlockPoleVertexData._TryAddMirrorZChunckPart(lod, rotatedZRef, rotatedZData) || useful;

                let rotatedYRef = rotatedZRef;
                let rotatedYData = rotatedZData;
                for (let j = 0; j < 3; j++) {
                    rotatedYRef = BlockPoleVertexData.RotateYChunckPartRef(rotatedYRef);
                    rotatedYData = BlockPoleVertexData.RotateY(rotatedYData);
                    if (!BlockPoleVertexData._VertexDatas[lod].has(rotatedYRef)) {
                        BlockPoleVertexData._VertexDatas[lod].set(rotatedYRef, [new ExtendedVertexData(rotatedYData)]);
                        useful = true;
                    }
                    useful = BlockPoleVertexData._TryAddMirrorXChunckPart(lod, rotatedYRef, rotatedYData) || useful;
                    useful = BlockPoleVertexData._TryAddMirrorYChunckPart(lod, rotatedYRef, rotatedYData) || useful;
                    useful = BlockPoleVertexData._TryAddMirrorZChunckPart(lod, rotatedYRef, rotatedYData) || useful;
                }
            }
        }

        return useful;
    }

    private static _AddChunckPartMesh(mesh: Mesh, lod: number, useXZAxisRotation: boolean): boolean {
        let useful = false;
        let name = mesh.name;
        let ref = BlockPoleVertexData.NameToRef(name);
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
            //data = PlanetBlockPoleVertexData.SplitVertexDataTriangles(data);
            
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
        if (!BlockPoleVertexData._VertexDatas[lod].has(ref)) {
            BlockPoleVertexData._VertexDatas[lod].set(ref, [new ExtendedVertexData(data)]);
            useful = true;
        }

        useful = BlockPoleVertexData._TryAddVariations(lod, ref, data, useXZAxisRotation) || useful;

        if (!useful) {
            console.warn("Chunck-Part " + name + " is redundant.");
        }

        return useful;
    }

    private static async _LoadBlockPoleVertexDatasFromFile(filePath: string, lod: number, useXZAxisRotation: boolean, scene: Scene): Promise<void> {
        console.log("_LoadBlockPoleVertexDatasFromFile : " + filePath);
        const data = await ImportMeshAsync(filePath, scene);
        data.meshes.forEach(mesh => {
            if (mesh instanceof Mesh && mesh.name !== "__root__") {
                console.log(mesh.name);
                let vData = VertexData.ExtractFromMesh(mesh);
                ColorizeVertexDataInPlace(vData, new Color3(1, 1, 1));
                MirrorZVertexDataInPlace(vData);
                TriFlipVertexDataInPlace(vData);
                vData.applyToMesh(mesh);

                BlockPoleVertexData._AddChunckPartMesh(mesh, lod, useXZAxisRotation);
            }
        });
    }

    public static async InitializeData(filePath: string, scene: Scene): Promise<boolean> {
        await BlockPoleVertexData._LoadBlockPoleVertexDatasFromFile(filePath, 0, true, scene);

        console.log(BlockPoleVertexData._VertexDatas);
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
        let datas = BlockPoleVertexData._VertexDatas[lod].get(ref);
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
