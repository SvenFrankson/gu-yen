import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { GetGLTFMeshDataArray } from "../VertexDataUtils";
import { Color3, MeshBuilder, PhysicsBody, PhysicsMotionType, PhysicsShapeConvexHull, Plane, Ray, Space, StandardMaterial, Vector3 } from "@babylonjs/core";
import { Game } from "../Game";
import { Chunck } from "../voxel-engine/Chunck";
import { AngleFromToAround, Rotate, RotateInPlace } from "babylonjs-geometry-kit";
import { BlockType } from "../voxel-engine/BlockType";
import { FloatingBlocksDetector } from "../voxel-engine/FloatingBlocksDetector";
import { MakeStandardMaterial } from "../MaterialUtils";
import { IsVeryFinite, StepAngle } from "../Number";
import { TerrainMaterial } from "../TerrainMaterial";
import { Player } from "../player/Player";
import { ToonMaterial } from "../ToonMaterial";

export interface IPelleteuse {
    pelleteuse: Pelleteuse;
}

export class PelleteusePart extends Mesh implements IPelleteuse {
    constructor(name: string, public pelleteuse: Pelleteuse) {
        super(name, pelleteuse.game.scene);
    }
}

export class Pelleteuse extends Mesh implements IPelleteuse {
    
    public head: Mesh;
    public pointer: Mesh;
    public cabine: PelleteusePart;
    public bras0: PelleteusePart;
    public l0: number = 3;
    public targetX0: number = - Math.PI / 3;
    public minX0: number = - Math.PI / 2;
    public maxX0: number = 0;
    public bras1: PelleteusePart;
    public l1: number = 3;
    public targetX1: number = Math.PI / 2;
    public minX1: number = 0;
    public maxX1: number = 0.9 * Math.PI;
    public godet: PelleteusePart;
    public targetX2: number = 0;

    public get pelleteuse(): Pelleteuse {
        return this;
    }
    
    public get throttle(): number {
        if (this.controler) {
            return this.controler.forwardInput - this.controler.backwardInput;
        }
        return 0;
    }
    public get turn(): number {
        if (this.controler) {
            return this.controler.rightInput - this.controler.leftInput;
        }
        return 0;
    }
    public rXSpeed: number = 0;
    public rYSpeed: number = 0;
    public rZSpeed: number = 0;

    public digging: boolean = false;
    public lastGodetDist: number = 0;
    public replacing: boolean = false;
    //public get replacing(): boolean {
    //    return Vector3.Distance(this.godet.absolutePosition, this.cabine.absolutePosition) > this.lastGodetDist;
    //}
    public diggingStart: Vector3 = Vector3.Zero();
    public diggingNormal: Vector3 = Vector3.Up();
    public diggingAxis: Vector3 = Vector3.Forward();
    public diggingRight: Vector3 = Vector3.Right();

    public red: StandardMaterial;
    public green: StandardMaterial;

    public controler?: Player;

    public velocity: Vector3 = Vector3.Zero();

    constructor(position: Vector3, public game: Game) {
        super("pelleteuse", null);
        this.position.copyFrom(position);
        
        let toonMaterial = new ToonMaterial("test", game.scene);
        this.material = toonMaterial;

        this.red = MakeStandardMaterial(new Color3(1, 0.2, 0.2));
        this.green = MakeStandardMaterial(new Color3(0.2, 1, 0.2));

        this.cabine = new PelleteusePart("pelleteuse_cabine", this);
        this.cabine.material = this.material;
        this.cabine.parent = this;

        this.head = MeshBuilder.CreateSphere("player-visual", { diameter: 0.1 }, game.scene);
        this.head.position.copyFrom(this.position);
        this.head.position.y += 3.5 + this.cabine.position.y;
        this.head.rotation.y = this.cabine.rotation.y + AngleFromToAround(Vector3.Forward(), Vector3.Normalize(new Vector3(this.forward.x, 0, this.forward.z)), Vector3.Up());
        this.head.visibility = 0.5;

        this.bras0 = new PelleteusePart("pelleteuse_bras0", this);
        this.bras0.material = this.material;
        this.bras0.parent = this.cabine;
        this.bras0.rotation.x = - Math.PI / 3;

        this.bras1 = new PelleteusePart("pelleteuse_bras1", this);
        this.bras1.material = this.material;
        this.bras1.parent = this.bras0;
        this.bras1.rotation.x = Math.PI / 2;

        this.godet = new PelleteusePart("pelleteuse_godet", this);
        this.godet.material = this.material;
        this.godet.parent = this.bras1;

        this.pointer = MeshBuilder.CreateBox("pointer", { size: 0.5 }, game.scene);
        this.pointer.scaling.copyFromFloats(1.05, 1.05, 1.05);
        let redMaterial = MakeStandardMaterial(new Color3(1, 0.5, 0.5), 0, 0.3);
        redMaterial.alpha = 0.5;
        this.pointer.material = redMaterial;
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
            this.bras1.position.z = dataArray[4].position.subtract(dataArray[3].position).length();
            this.l0 = this.bras1.position.length();

            dataArray[5].vertexData.applyToMesh(this.godet);
            this.godet.position.z = dataArray[5].position.subtract(dataArray[4].position).length();
            this.l1 = this.godet.position.length();
        }

        this.game.scene.onBeforeRenderObservable.add(this._update);
    }

    public takeControl(player: Player) {
        this.controler = player;
        player.pelleteuse = this;
    }

    public dropControl() {
        if (this.controler) {
            this.controler.pelleteuse = undefined;
        }
        this.controler = undefined;
        if (this.game.terrain) {
            let material = this.game.terrain.getMaterial(0) as TerrainMaterial;
            material.setRangeRadius(0);
        }
    }

    private _update = () => {
        if (this.game.terrain && this.controler) {
            this.head.position.copyFrom(this.absolutePosition);
            this.head.position.y += 3.5 + this.cabine.position.y;
            this.head.rotation.y = this.cabine.rotation.y + AngleFromToAround(Vector3.Forward(), Vector3.Normalize(new Vector3(this.forward.x, 0, this.forward.z)), Vector3.Up());

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

                let p00 = Vector3.TransformCoordinates(new Vector3(-1.11, 0.5, -1.66), this.getWorldMatrix());
                let p10 = Vector3.TransformCoordinates(new Vector3(1.11, 0.5, -1.66), this.getWorldMatrix());
                let p01 = Vector3.TransformCoordinates(new Vector3(-1.11, 0.5, 1.66), this.getWorldMatrix());
                let p11 = Vector3.TransformCoordinates(new Vector3(1.11, 0.5, 1.66), this.getWorldMatrix());
                
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

            this.rYSpeed += this.turn * 0.02;
            this.rYSpeed *= 0.98;

            this.rotate(Vector3.Up(), this.rYSpeed * 0.01, Space.LOCAL);
            this.rotate(Vector3.Right(), this.rXSpeed * 0.003, Space.LOCAL);
            this.rotate(Vector3.Forward(), this.rZSpeed * 0.003, Space.LOCAL);

            this.velocity.addInPlace(this.forward.scale(this.throttle * 0.005));
            let forwardVelocity = Vector3.Dot(this.velocity, this.forward);
            let rightVelocity = Vector3.Dot(this.velocity, this.right);
            forwardVelocity *= 0.98;
            rightVelocity *= 0.95;
            this.velocity = this.forward.scale(forwardVelocity).add(this.right.scale(rightVelocity));

            this.position.addInPlace(this.velocity.scale(0.1));
            this.position.y = this.position.y * 0.95 + targetY * 0.05;

            this.rXSpeed *= 0.96;
            this.rZSpeed *= 0.96;

            this.pointer.isVisible = false;

            if (this.controler) {
                let material = this.game.terrain.getMaterial(0) as TerrainMaterial;
                material.setRangePosition(this.cabine.absolutePosition);
                material.setRangeRadius(this.l0 + this.l1);

                let ray = new Ray(this.head.absolutePosition, this.head.forward, 500);
                let pickedPoint: Vector3 | null = null;
                let pickedNormal: Vector3 | null = null;
                if (this.digging) {
                    let bjsPlane = Plane.FromPositionAndNormal(this.diggingStart, this.diggingNormal);
                    let d = ray.intersectsPlane(bjsPlane);
                    if (d !== null) {
                        pickedPoint = ray.origin.add(ray.direction.scale(d));
                        pickedNormal = this.diggingNormal;
                        if (this.replacing) {
                            pickedPoint.addInPlace(pickedNormal!.scale(2));
                        }
                    }
                }
                else {
                    let pickInfos = ray.intersectsMeshes(chuncks.map(c => c.mesh!).filter(m => m));
                    for (let pickInfo of pickInfos) {
                        if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                            pickedPoint = pickInfo.pickedPoint;
                            pickedNormal = pickInfo.getNormal(true);
                            this.diggingStart.copyFrom(pickedPoint);
                            this.diggingNormal.set(0, 1, 0);
                            this.diggingAxis.copyFrom(this.diggingNormal);
                            RotateInPlace(this.diggingAxis, this.cabine.right, - Math.PI / 2);
                            this.diggingRight = Vector3.Cross(this.diggingNormal, this.diggingAxis);
                            pickedPoint.addInPlace(pickedNormal!.scale(2));
                            break;
                        }
                    }
                }

                let f = 0.99;
                if (pickedPoint) {
                    let p: Vector3;
                    if (this.digging && !this.replacing) {
                        p = pickedPoint.clone();
                    }
                    else {
                        p = pickedPoint.subtract(pickedNormal!.scale(2));
                    }
                    p.subtractInPlace(this.diggingNormal.scale(0.2));
                    let ijk = this.game.terrain.getChunckAndIJKAtPos(p, 0, false);
                    if (ijk) {
                        this.pointer.position = ijk.chunck.getPosAtIJK(ijk.ijk);
                        this.pointer.isVisible = true;
                    }

                    let d = Vector3.Distance(pickedPoint, this.bras0.absolutePosition);
                    if (d > this.l0 + this.l1) {
                        this.targetX0 = - Math.PI / 3;
                        this.targetX1 = Math.PI / 2;
                    }
                    else {
                        f = 0.95;
                        let dZ = Vector3.Dot(pickedPoint.subtract(this.bras0.absolutePosition), this.cabine.forward);
                        let dY = Vector3.Dot(pickedPoint.subtract(this.bras0.absolutePosition), this.cabine.up);
                        let alpha0 = - Math.atan2(dY, dZ);

                        let a0 = Math.acos((this.l0 * this.l0 + d * d - this.l1 * this.l1) / (2 * this.l0 * d));
                        let a1 = Math.acos((this.l0 * this.l0 + this.l1 * this.l1 - d * d) / (2 * this.l0 * this.l1));

                        //console.log(alpha0 / Math.PI * 180, a0 / Math.PI * 180, a1 / Math.PI * 180);
                        let tX0 = - (a0 - alpha0);
                        let tX1 = Math.PI - a1;

                        if (IsVeryFinite(tX0) && IsVeryFinite(tX1)) {
                            this.targetX0 = Math.max(this.minX0, Math.min(this.maxX0, tX0));
                            this.targetX1 = Math.max(this.minX1, Math.min(this.maxX1, tX1));
                        }
                        this.targetX2 = 0;

                        if (this.digging && !this.replacing) {
                            this.targetX2 = Math.PI / 4;
                            let affectedChuncks: Chunck[] = [];
                            let w = 4;
                            for (let y = 2; y >= 0; y--) {
                                for (let x = 0; x < w; x++) {
                                    let p = pickedPoint.add(this.diggingRight.scale((x - (w - 1) * 0.5) * 0.5)).add(this.diggingNormal.scale(- 0.2 + y * 0.5));
                                    let ijk = this.game.terrain.getChunckAndIJKAtPos(p, 0, false);
                                    if (ijk) {
                                        let block = BlockType.None;
                                        let chunck = ijk.chunck;
                                        if (chunck.getData(ijk.ijk.i, ijk.ijk.j, ijk.ijk.k) !== BlockType.None) {
                                            if (y === 2) {
                                                this.replacing = true;
                                                x = w;
                                                y = -1;
                                            }
                                            else {
                                                let newAffectedChuncks = chunck.setData(block, ijk.ijk.i, ijk.ijk.j, ijk.ijk.k);
                                                //let floatingChunks = this.floatingBlocksDetector?.findFloatingBlocks(chunck.iPos * this.game.terrain!.chunckLengthIJ + ijk.ijk.i, chunck.jPos * this.game.terrain!.chunckLengthIJ + ijk.ijk.j, ijk.ijk.k);
                                                //if (floatingChunks) {
                                                //    newAffectedChuncks.push(...floatingChunks.array);
                                                //}
                                                affectedChuncks.push(...newAffectedChuncks);
                                            }
                                        }
                                    }
                                }
                            }
                            affectedChuncks.forEach(c => c.redrawMesh(true));
                        }
                    }
                }

                //this.bras0.rotation.x = StepAngle(this.bras0.rotation.x, this.targetX0, this.maxrXSpeed);
                //this.bras1.rotation.x = StepAngle(this.bras1.rotation.x, this.targetX1, this.maxrXSpeed);

                this.bras0.rotation.x = this.bras0.rotation.x * f + this.targetX0 * (1 - f);
                this.bras1.rotation.x = this.bras1.rotation.x * f + this.targetX1 * (1 - f);
                this.godet.rotation.x = this.godet.rotation.x * f + this.targetX2 * (1 - f);

                this.lastGodetDist = Vector3.Distance(this.godet.absolutePosition, this.cabine.absolutePosition);
            }
        }
    }
    private _maxRXSpeed = 0;
    private _maxRZSpeed = 0;
}