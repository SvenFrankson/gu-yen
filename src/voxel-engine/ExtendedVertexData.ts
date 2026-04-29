import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class ExtendedVertexData {

    public triangles: Vector3[][] = [];
    public triangleNormals: Vector3[] = [];
    public fastColorIndex: Vector3[][] = [];
    
    constructor(
        public vertexData: VertexData
    ) {
        if (vertexData.indices && vertexData.positions) {
            for (let i = 0; i < vertexData.indices.length / 3; i++) {
                let i1 = vertexData.indices[3 * i];
                let i2 = vertexData.indices[3 * i + 1];
                let i3 = vertexData.indices[3 * i + 2];

                let x1 = vertexData.positions[3 * i1];
                let y1 = vertexData.positions[3 * i1 + 1];
                let z1 = vertexData.positions[3 * i1 + 2];

                let x2 = vertexData.positions[3 * i2];
                let y2 = vertexData.positions[3 * i2 + 1];
                let z2 = vertexData.positions[3 * i2 + 2];

                let x3 = vertexData.positions[3 * i3];
                let y3 = vertexData.positions[3 * i3 + 1];
                let z3 = vertexData.positions[3 * i3 + 2];

                this.triangles.push([
                    new Vector3(Math.floor(x1 * 2), Math.floor(y1 * 2), Math.floor(z1 * 2)),
                    new Vector3(Math.floor(x2 * 2), Math.floor(y2 * 2), Math.floor(z2 * 2)),
                    new Vector3(Math.floor(x3 * 2), Math.floor(y3 * 2), Math.floor(z3 * 2))
                ]);

                let v1 = new Vector3(x1, y1, z1);
                let v2 = new Vector3(x2, y2, z2);
                let v3 = new Vector3(x3, y3, z3);
                let n = Vector3.Cross(v3.subtract(v1), v2.subtract(v1));
                n.normalize();
                let exists = false;
                //for (let j = 0; j < this.triangleNormals.length; j++) {
                //    let existingN = this.triangleNormals[j];
                //    if (Vector3.Dot(existingN, n) > 0.99) {
                //        exists = true;
                //        break;
                //    }
                //}
                if (exists) {
                    this.triangleNormals.push(Vector3.Zero());
                }
                else {
                    this.triangleNormals.push(n);
                }

                let color1 = v1.subtract(n.scale(0.5));
                let color2 = v2.subtract(n.scale(0.5));
                let color3 = v3.subtract(n.scale(0.5));
                this.fastColorIndex.push([
                    new Vector3(Math.round(color1.x), Math.round(color1.y), Math.round(color1.z)),
                    new Vector3(Math.round(color2.x), Math.round(color2.y), Math.round(color2.z)),
                    new Vector3(Math.round(color3.x), Math.round(color3.y), Math.round(color3.z))
                ]);
            }
        }
    }
}   
