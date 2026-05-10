import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { GetGLTFMeshDataArray } from "../VertexDataUtils";
import { PhysicsBody, PhysicsMotionType, PhysicsShapeConvexHull, Ray, Space, Vector3 } from "@babylonjs/core";
import { Game } from "../Game";
import { Chunck } from "../voxel-engine/Chunck";

export class Pelleteuse extends Mesh {
    
    public cabine: Mesh;
    public bras0: Mesh;
    public bras1: Mesh;
    public godet: Mesh;
    
    public throttle: number = 0;
    public turn: number = 0;

    constructor(public game: Game) {
        super("pelleteuse", null);

        this.cabine = new Mesh("pelleteuse_cabine", null);
        this.cabine.parent = this;

        this.bras0 = new Mesh("pelleteuse_bras0", null);
        this.bras0.parent = this.cabine;
        this.bras0.rotation.x = - Math.PI / 3;

        this.bras1 = new Mesh("pelleteuse_bras1", null);
        this.bras1.parent = this.bras0;
        this.bras1.rotation.x = Math.PI / 2;

        this.godet = new Mesh("pelleteuse_godet", null);
        this.godet.parent = this.bras1;
                
        this.game.canvas.addEventListener("keydown", (event) => {
            if (event.code === "KeyW") {
                this.throttle = 1;
            }
            else if (event.code === "KeyS") {
                this.throttle = -1;
            }
            else if (event.code === "KeyA") {
                this.turn = -1;
            }
            else if (event.code === "KeyD") {
                this.turn = 1;
            }
        });
        
        this.game.canvas.addEventListener("keyup", (event) => {
            if (event.code === "KeyW") {
                this.throttle = 0;
            }
            else if (event.code === "KeyS") {
                this.throttle = 0;
            }
            else if (event.code === "KeyA") {
                this.turn = 0;
            }
            else if (event.code === "KeyD") {
                this.turn = 0;
            }
        });
    }

    public async instantiate(): Promise<void> {
        // Load the model for the Pelleteuse
        let dataArray = await GetGLTFMeshDataArray("meshes/pelleteuse.gltf", this.getScene());
        
        if (dataArray) {
            dataArray[1].vertexData.applyToMesh(this);

            dataArray[2].vertexData.applyToMesh(this.cabine);
            this.cabine.position = dataArray[2].position.clone();

            dataArray[3].vertexData.applyToMesh(this.bras0);
            this.bras0.position = dataArray[3].position.subtract(dataArray[2].position);

            dataArray[4].vertexData.applyToMesh(this.bras1);
            this.bras1.position = dataArray[4].position.subtract(dataArray[3].position);

            dataArray[5].vertexData.applyToMesh(this.godet);
            this.godet.position = dataArray[5].position.subtract(dataArray[4].position);
        }

        this.game.scene.onBeforeRenderObservable.add(this._update);
    }

    private _update = () => {
        if (this.game.terrain) {     
            let targetY = this.position.y;       
            let ijk = this.game.terrain.getChunckAndIJKAtPos(this.position, 0, false);
            let chuncks: Chunck[] = []
            if (ijk) {
                let chunck = ijk.chunck;
                chuncks = [chunck];
                let i0 = ijk.ijk.i < this.game.terrain.chunckLengthIJ * 0.5 ? -1 : 0;
                let j0 = ijk.ijk.j < this.game.terrain.chunckLengthIJ * 0.5 ? -1 : 0;
                for (let i = i0; i <= i0 + 1; i++) {
                    for (let j = j0; j <= j0 + 1; j++) {
                        if (i != 0 || j != 0) {
                            let c = this.game.terrain.getChunck(chunck.level, chunck.iPos + i, chunck.jPos + j);
                            if (c) {
                                chuncks.push(c);
                            }
                        }
                    }
                }

                let p00 = Vector3.TransformCoordinates(new Vector3(-0.5, 0.5, -1.5), this.getWorldMatrix());
                let p10 = Vector3.TransformCoordinates(new Vector3(0.5, 0.5, -1.5), this.getWorldMatrix());
                let p01 = Vector3.TransformCoordinates(new Vector3(-0.5, 0.5, 1.5), this.getWorldMatrix());
                let p11 = Vector3.TransformCoordinates(new Vector3(0.5, 0.5, 1.5), this.getWorldMatrix());
                
                let ray00 = new Ray(p00, this.up.scale(-1), 500);
                let ray10 = new Ray(p10, this.up.scale(-1), 500);
                let ray01 = new Ray(p01, this.up.scale(-1), 500);
                let ray11 = new Ray(p11, this.up.scale(-1), 500);
                
                let intersect00: Vector3 | null = null;
                let intersect10: Vector3 | null = null;
                let intersect01: Vector3 | null = null;
                let intersect11: Vector3 | null = null;

                let dig00 = 0;
                let dig10 = 0;
                let dig01 = 0;
                let dig11 = 0;

                for (let chunck of chuncks) {
                    if (!intersect00) {
                        let hit00 = ray00.intersectsMesh(chunck.mesh!, true);
                        if (hit00) {
                            intersect00 = hit00.pickedPoint;
                        }
                    }
                    if (!intersect10) {
                        let hit10 = ray10.intersectsMesh(chunck.mesh!, true);
                        if (hit10) {
                            intersect10 = hit10.pickedPoint;
                        }
                    }
                    if (!intersect01) {
                        let hit01 = ray01.intersectsMesh(chunck.mesh!, true);
                        if (hit01) {
                            intersect01 = hit01.pickedPoint;
                        }
                    }
                    if (!intersect11) {
                        let hit11 = ray11.intersectsMesh(chunck.mesh!, true);
                        if (hit11) {
                            intersect11 = hit11.pickedPoint;
                        }
                    }
                }

                if (intersect00 && intersect10 && intersect01 && intersect11) {
                    let avgY = (intersect00.y + intersect10.y + intersect01.y + intersect11.y) / 4;
                    targetY = avgY + 0.5;
                    dig00 = Vector3.Distance(intersect00, p00);
                    dig10 = Vector3.Distance(intersect10, p10);
                    dig01 = Vector3.Distance(intersect01, p01);
                    dig11 = Vector3.Distance(intersect11, p11);

                    this.rotate(Vector3.Forward(), 0.01 * (dig00 - dig10), Space.LOCAL);
                    this.rotate(Vector3.Forward(), 0.01 * (dig01 - dig11), Space.LOCAL);
                    this.rotate(Vector3.Right(), 0.01 * (dig01 - dig00), Space.LOCAL);
                    this.rotate(Vector3.Right(), 0.01 * (dig11 - dig10), Space.LOCAL);
                }
            }

            this.rotate(Vector3.Up(), this.turn * 0.01);
            this.position.addInPlace(this.forward.scale(this.throttle * 0.05));
            this.position.y = this.position.y * 0.95 + targetY * 0.05;
        }
    }
}