import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { GetGLTFMeshDataArray } from "../VertexDataUtils";
import { MeshBuilder, PhysicsBody, PhysicsMotionType, PhysicsShapeConvexHull, Plane, Ray, Space, Vector3 } from "@babylonjs/core";
import { Game } from "../Game";
import { Chunck } from "../voxel-engine/Chunck";
import { Rotate, RotateInPlace } from "babylonjs-geometry-kit";
import { BlockType } from "../voxel-engine/BlockType";
import { FloatingBlocksDetector } from "../voxel-engine/FloatingBlocksDetector";

export class Pelleteuse extends Mesh {
    
    public head: Mesh;
    public cabine: Mesh;
    public bras0: Mesh;
    public l0: number = 3;
    public targetX0: number = - Math.PI / 3;
    public bras1: Mesh;
    public l1: number = 3;
    public targetX1: number = Math.PI / 2;
    public godet: Mesh;
    
    public throttle: number = 0;
    public turn: number = 0;
    public rXSpeed: number = 0;
    public rZSpeed: number = 0;

    public digging: boolean = false;
    public diggingStart: Vector3 = Vector3.Zero();
    public diggingNormal: Vector3 = Vector3.Zero();
    public diggingAxis: Vector3 = Vector3.Forward();

    constructor(public game: Game) {
        super("pelleteuse", null);

        this.cabine = new Mesh("pelleteuse_cabine", null);
        this.cabine.parent = this;

        this.head = MeshBuilder.CreateSphere("player-visual", { diameter: 0.1 }, game.scene);
        this.head.visibility = 0.5;
        this.head.parent = this.cabine;
        this.head.position.y = 2.5;

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
            this.l0 = this.bras1.position.length();

            dataArray[5].vertexData.applyToMesh(this.godet);
            this.godet.position = dataArray[5].position.subtract(dataArray[4].position);
            this.l1 = this.godet.position.length();
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

                let p00 = Vector3.TransformCoordinates(new Vector3(-1, 0.5, -1.5), this.getWorldMatrix());
                let p10 = Vector3.TransformCoordinates(new Vector3(1, 0.5, -1.5), this.getWorldMatrix());
                let p01 = Vector3.TransformCoordinates(new Vector3(-1, 0.5, 1.5), this.getWorldMatrix());
                let p11 = Vector3.TransformCoordinates(new Vector3(1, 0.5, 1.5), this.getWorldMatrix());
                
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
                    targetY = avgY + 0.4;
                    dig00 = Vector3.Distance(intersect00, p00);
                    dig10 = Vector3.Distance(intersect10, p10);
                    dig01 = Vector3.Distance(intersect01, p01);
                    dig11 = Vector3.Distance(intersect11, p11);

                    this.rZSpeed += 0.5 * ((dig00 - dig10) + (dig01 - dig11));
                    this.rXSpeed += 0.5 * ((dig01 - dig00) + (dig11 - dig10));

                    this.rXSpeed = Math.max(Math.min(this.rXSpeed, Math.PI), -Math.PI);
                    this.rZSpeed = Math.max(Math.min(this.rZSpeed, Math.PI), -Math.PI);

                    this._maxRXSpeed = Math.max(this._maxRXSpeed, Math.abs(this.rXSpeed));
                    this._maxRZSpeed = Math.max(this._maxRZSpeed, Math.abs(this.rZSpeed));
                }
            }

            this.rotate(Vector3.Up(), this.turn * 0.01, Space.LOCAL);
            this.rotate(Vector3.Right(), this.rXSpeed * 0.003, Space.LOCAL);
            this.rotate(Vector3.Forward(), this.rZSpeed * 0.003, Space.LOCAL);
            this.position.addInPlace(this.forward.scale(this.throttle * 0.04));
            this.position.y = this.position.y * 0.95 + targetY * 0.05;

            this.rXSpeed *= 0.96;
            this.rZSpeed *= 0.96;

            if (this.game.player.pelleteuse === this) {
                let ray = new Ray(this.head.absolutePosition, this.head.forward, 500);
                let pickedPoint: Vector3 | null = null;
                let pickedNormal: Vector3 | null = null;
                if (this.digging) {
                    let bjsPlane = Plane.FromPositionAndNormal(this.diggingStart, this.diggingNormal);
                    let d = ray.intersectsPlane(bjsPlane);
                    if (d !== null) {
                        pickedPoint = ray.origin.add(ray.direction.scale(d));
                        pickedNormal = this.diggingNormal;
                    }
                }
                else {
                    let pickInfos = ray.intersectsMeshes(this.game.player.chuncks.map(c => c.mesh!).filter(m => m));
                    for (let pickInfo of pickInfos) {
                        if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                            pickedPoint = pickInfo.pickedPoint;
                            pickedNormal = pickInfo.getNormal(true);
                            this.diggingStart.copyFrom(pickedPoint);
                            this.diggingNormal.copyFrom(pickedNormal!);
                            if (this.diggingNormal.y > 0.5) {
                                this.diggingNormal.set(0, 1, 0);
                            }
                            this.diggingAxis.copyFrom(this.diggingNormal);
                            RotateInPlace(this.diggingAxis, this.cabine.right, - Math.PI / 2);
                            pickedPoint.addInPlace(pickedNormal!.scale(0.5));
                            break;
                        }
                    }
                }
                if (pickedPoint) {
                    let d = Vector3.Distance(pickedPoint, this.bras0.absolutePosition);
                    if (d > this.l0 + this.l1) {
                        this.targetX0 = - Math.PI / 3;
                        this.targetX1 = Math.PI / 2;
                    }
                    else {
                        let dZ = Vector3.Dot(pickedPoint.subtract(this.bras0.absolutePosition), this.cabine.forward);
                        let dY = Vector3.Dot(pickedPoint.subtract(this.bras0.absolutePosition), this.cabine.up);
                        let alpha0 = - Math.atan2(dY, dZ);

                        let a0 = Math.acos((this.l0 * this.l0 + d * d - this.l1 * this.l1) / (2 * this.l0 * d));
                        let a1 = Math.acos((this.l0 * this.l0 + this.l1 * this.l1 - d * d) / (2 * this.l0 * this.l1));

                        //console.log(alpha0 / Math.PI * 180, a0 / Math.PI * 180, a1 / Math.PI * 180);
                        this.targetX0 = - (a0 - alpha0);
                        this.targetX1 = Math.PI - a1;
                    }

                    if (this.digging) {
                        let ijk = this.game.terrain.getChunckAndIJKAtPos(pickedPoint.subtract(this.diggingNormal.scale(0.2)), 0, false);
                        if (ijk) {
                            let block = BlockType.None;
                            let chunck = ijk.chunck;
                            if (chunck.getData(ijk.ijk.i, ijk.ijk.j, ijk.ijk.k) !== BlockType.None) {
                                let affectedChuncks = chunck.setData(block, ijk.ijk.i, ijk.ijk.j, ijk.ijk.k);
                                //let floatingChunks = this.floatingBlocksDetector?.findFloatingBlocks(chunck.iPos * this.game.terrain!.chunckLengthIJ + ijk.ijk.i, chunck.jPos * this.game.terrain!.chunckLengthIJ + ijk.ijk.j, ijk.ijk.k);
                                //if (floatingChunks) {
                                //    affectedChuncks.push(...floatingChunks.array);
                                //}
                                affectedChuncks.forEach(c => c.redrawMesh(true));
                            }
                        }
                    }
                }

                this.bras0.rotation.x = this.bras0.rotation.x * 0.97 + this.targetX0 * 0.03;
                this.bras1.rotation.x = this.bras1.rotation.x * 0.97 + this.targetX1 * 0.03;
            }
        }
    }
    private _maxRXSpeed = 0;
    private _maxRZSpeed = 0;
}