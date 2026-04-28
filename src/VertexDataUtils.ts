import { StandardMaterial } from "@babylonjs/core";
import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";

export async function GetGLTFVertexData(path: string, meshName: string, scene: Scene): Promise<VertexData | null> {
    const data = await ImportMeshAsync(path, scene);
    let mesh = data.meshes.find(m => m.name === meshName);

    if (mesh instanceof Mesh) {
        let vData = VertexData.ExtractFromMesh(mesh);
        ColorizeVertexDataInPlace(vData, new Color3(1, 1, 1));
        MirrorZVertexDataInPlace(vData);
        TriFlipVertexDataInPlace(vData);

        return vData;
    }
    
    data.meshes.forEach(mesh => {
        mesh.dispose(true);
    });

    return null;
}

export function CloneVertexData(data: VertexData): VertexData {
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

export function MergeVertexDatas(...datas: VertexData[]): VertexData {
    let mergedData = new VertexData();
    
    let positions = [];
    let indices = [];
    let normals = [];
    let uvs = [];
    let uvs2 = [];
    let colors = [];

    let useColors = false;
    for (let i = 0; i < datas.length; i++) {
        if (datas[i].colors) {
            useColors = true;
        }
    }

    for (let i = 0; i < datas.length; i++) {
        let data = datas[i];
        let offset = positions.length / 3;
        if (data.positions) {
            positions.push(...data.positions);
        }
        if (data.indices) {
            indices.push(...data.indices.map(index => { return index + offset; }));
        }
        if (data.normals) {
            normals.push(...data.normals);
        }
        if (data.uvs) {
            uvs.push(...data.uvs);
        }
        if (data.uvs2) {
            uvs2.push(...data.uvs2);
        }
        if (data.colors) {
            colors.push(...data.colors);
        }
        else if (useColors) {
            for (let j = 0; j < positions.length / 3; j++) {
                colors.push(1, 1, 1, 1);
            }
        }
    }

    mergedData.positions = positions;
    mergedData.indices = indices;
    mergedData.normals = normals;
    if (uvs.length > 0) {
        mergedData.uvs = uvs;
    }
    if (uvs2.length > 0) {
        mergedData.uvs2 = uvs2;
    }
    if (colors.length > 0) {
        mergedData.colors = colors;
    }

    return mergedData;
}

export function TranslateVertexDataInPlace(data: VertexData, t: Vector3): VertexData {
    if (data.positions) {
        let positions = [...data.positions];
        for (let i = 0; i < positions.length / 3; i++) {
            positions[3 * i] += t.x;
            positions[3 * i + 1] += t.y;
            positions[3 * i + 2] += t.z;
        }
        data.positions = positions;
    }

    return data;
}

export function RotateAngleAxisVertexDataInPlace(data: VertexData, angle: number, axis: Vector3): VertexData {
    let q = Quaternion.RotationAxis(axis, angle);
    return RotateVertexDataInPlace(data, q);
}

export function RotateVertexDataInPlace(data: VertexData, q: Quaternion): VertexData {
    let pos = Vector3.Zero();
    let normal = Vector3.Up();
    if (data.positions && data.normals) {
        let positions = [...data.positions];
        let normals = [...data.normals];
        let L = positions.length;
        for (let i = 0; i < L / 3; i++) {
            pos.copyFromFloats(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]);
            normal.copyFromFloats(normals[3 * i], normals[3 * i + 1], normals[3 * i + 2]);
            pos.rotateByQuaternionToRef(q, pos);
            normal.rotateByQuaternionToRef(q, normal);
            positions[3 * i] = pos.x;
            positions[3 * i + 1] = pos.y;
            positions[3 * i + 2] = pos.z;
            normals[3 * i] = normal.x;
            normals[3 * i + 1] = normal.y;
            normals[3 * i + 2] = normal.z;
        }
        data.positions = positions;
        data.normals = normals;
    }

    return data;
}

export function ScaleVertexDataInPlace(data: VertexData, s: number): VertexData {
    if (data.positions) {
        data.positions = data.positions.map((n: number) => { return n * s; });
    }
    return data;
}

export function ShrinkVertexDataInPlace(data: VertexData, d: number): VertexData {
    if (data.positions && data.normals) {
        let positions = [...data.positions];
        let normals = data.normals;
        for (let i = 0; i < positions.length / 3; i++) {
            let nx = normals[3 * i];
            let ny = normals[3 * i + 1];
            let nz = normals[3 * i + 2];
            positions[3 * i] += d * nx;
            positions[3 * i + 1] += d * ny;
            positions[3 * i + 2] += d * nz;
        }
        data.positions = positions;
    }

    return data;
}

export function MirrorXVertexDataInPlace(data: VertexData): VertexData {
    if (data.positions && data.normals && data.indices) {
        let positions = [...data.positions];
        let normals = [...data.normals];
        let uvs: number[] | undefined = undefined;
        if (data.uvs) {
            uvs = [...data.uvs];
        }
        for (let i = 0; i < positions.length / 3; i++) {
            normals[3 * i] *= -1;
            positions[3 * i] *= -1;
            if (uvs) {
                uvs[2 * i] *= -1;
            }
        }
        data.positions = positions;
        data.normals = normals;
        if (uvs) {
            data.uvs = uvs;
        }

        let indices = [...data.indices];
        for (let i = 0; i < indices.length / 3; i++) {
            let i1 = indices[3 * i];
            let i2 = indices[3 * i + 1];
            indices[3 * i] = i2;
            indices[3 * i + 1] = i1;
        }
        data.indices = indices;
    }

    return data;
}

export function MirrorZVertexDataInPlace(data: VertexData): VertexData {
    if (data.positions && data.normals && data.indices) {
        let positions = [...data.positions];
        let normals = [...data.normals];
        let uvs: number[] | undefined = undefined;
        if (data.uvs) {
            uvs = [...data.uvs];
        }
        for (let i = 0; i < positions.length / 3; i++) {
            normals[3 * i + 2] *= -1;
            positions[3 * i + 2] *= -1;
            if (uvs) {
                uvs[2 * i] *= -1;
            }
        }
        data.positions = positions;
        data.normals = normals;
        if (uvs) {
            data.uvs = uvs;
        }

        let indices = [...data.indices];
        for (let i = 0; i < indices.length / 3; i++) {
            let i1 = indices[3 * i];
            let i2 = indices[3 * i + 1];
            indices[3 * i] = i2;
            indices[3 * i + 1] = i1;
        }
        data.indices = indices;
    }

    return data;
}

export function TriFlipVertexDataInPlace(data: VertexData, flipNormals: boolean = false): VertexData {
    if (data.indices) {
        let indices = [...data.indices];
        for (let i = 0; i < indices.length / 3; i++) {
            let i1 = indices[3 * i + 1];
            let i2 = indices[3 * i + 2];
            indices[3 * i + 1] = i2;
            indices[3 * i + 2] = i1;
        }
        data.indices = indices;
    }
    if (flipNormals && data.normals) {
        data.normals = data.normals.map((n: number) => { return - n; });
    }

    return data;
}

export function ColorizeVertexDataInPlace(data: VertexData, color: Color3, colorToReplace?: Color3): VertexData {
    let colors: number[] = [];
    if (colorToReplace && data.colors) {
        colors = [...data.colors];
    }
    if (data.positions) {
        for (let i = 0; i < data.positions.length / 3; i++) {
            if (colorToReplace && data.colors) {
                let r = data.colors[4 * i];
                let g = data.colors[4 * i + 1];
                let b = data.colors[4 * i + 2];
                if (r != colorToReplace.r || g != colorToReplace.g || b != colorToReplace.b) {
                    continue;
                }
            }
            colors[4 * i] = color.r;
            colors[4 * i + 1] = color.g;
            colors[4 * i + 2] = color.b;
            colors[4 * i + 3] = 1;
        }
    }
    data.colors = colors;

    return data;
}