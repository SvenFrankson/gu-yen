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
import { smoothNSec } from "../Tools";

export interface IVehicle {
    vehicle: Vehicle;
}

export class VehiclePart extends Mesh implements IVehicle {
    constructor(name: string, public vehicle: Vehicle) {
        super(name, vehicle.game.scene);
    }
}

export class Vehicle extends Mesh implements IVehicle {
    
    public head: Mesh;

    public get vehicle(): Vehicle {
        return this;
    }
    
    public height: number = 0.5;
    public throttlePower: number = 0.1;
    public throttleSmoothNSec: number = 5;
    public turnPower: number = 0.1;

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

    public controler?: Player;

    public velocity: Vector3 = Vector3.Zero();

    constructor(position: Vector3, public game: Game) {
        super("Vehicle", null);
        this.position.copyFrom(position);
        
        this.head = MeshBuilder.CreateSphere("player-visual", { diameter: 0.1 }, game.scene);
        this.head.visibility = 0.5;

        let toonMaterial = new ToonMaterial("test", game.scene);
        this.material = toonMaterial;
    }

    public async instantiate(): Promise<void> {
        this.game.scene.onBeforeRenderObservable.add(this._update);
    }

    public takeControl(player: Player) {
        this.controler = player;
        player.vehicle = this;
    }

    public dropControl() {
        if (this.controler) {
            this.controler.vehicle = undefined;
        }
        this.controler = undefined;
        if (this.game.terrain) {
            let material = this.game.terrain.getMaterial(0) as TerrainMaterial;
            material.setRangeRadius(0);
        }
    }

    private _update = () => {
        if (this.game.terrain && this.controler) {
            let dt = this.game.engine.getDeltaTime() / 1000;

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

                let p00 = Vector3.TransformCoordinates(new Vector3(-1.11, 2, -1.66), this.getWorldMatrix());
                let p10 = Vector3.TransformCoordinates(new Vector3(1.11, 2, -1.66), this.getWorldMatrix());
                let p01 = Vector3.TransformCoordinates(new Vector3(-1.11, 2, 1.66), this.getWorldMatrix());
                let p11 = Vector3.TransformCoordinates(new Vector3(1.11, 2, 1.66), this.getWorldMatrix());
                
                let ray00 = new Ray(p00, this.up.scale(-1), 20);
                let ray10 = new Ray(p10, this.up.scale(-1), 20);
                let ray01 = new Ray(p01, this.up.scale(-1), 20);
                let ray11 = new Ray(p11, this.up.scale(-1), 20);
                
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
                        let hit00 = ray00.intersectsMesh(chunck.mesh!, false);
                        if (hit00) {
                            intersect00 = hit00.pickedPoint;
                        }
                    }
                    if (!intersect10) {
                        let hit10 = ray10.intersectsMesh(chunck.mesh!, false);
                        if (hit10) {
                            intersect10 = hit10.pickedPoint;
                        }
                    }
                    if (!intersect01) {
                        let hit01 = ray01.intersectsMesh(chunck.mesh!, false);
                        if (hit01) {
                            intersect01 = hit01.pickedPoint;
                        }
                    }
                    if (!intersect11) {
                        let hit11 = ray11.intersectsMesh(chunck.mesh!, false);
                        if (hit11) {
                            intersect11 = hit11.pickedPoint;
                        }
                    }
                }

                if (intersect00 && intersect10 && intersect01 && intersect11) {
                    let avgY = (intersect00.y + intersect10.y + intersect01.y + intersect11.y) / 4;
                    targetY = avgY + this.height;
                    dig00 = Vector3.Distance(intersect00, p00);
                    dig10 = Vector3.Distance(intersect10, p10);
                    dig01 = Vector3.Distance(intersect01, p01);
                    dig11 = Vector3.Distance(intersect11, p11);

                    this.rZSpeed += 0.5 * ((dig00 - dig10) + (dig01 - dig11));
                    this.rXSpeed += 0.5 * ((dig01 - dig00) + (dig11 - dig10));

                    this.rXSpeed = Math.max(Math.min(this.rXSpeed, Math.PI), -Math.PI);
                    this.rZSpeed = Math.max(Math.min(this.rZSpeed, Math.PI), -Math.PI);
                }
            }

            this.rYSpeed += this.turn * this.turnPower * dt;
            this.rYSpeed *= smoothNSec(1 / dt, 1);

            this.rotate(Vector3.Up(), this.rYSpeed * 0.01, Space.LOCAL);
            this.rotate(Vector3.Right(), this.rXSpeed * 0.003, Space.LOCAL);
            this.rotate(Vector3.Forward(), this.rZSpeed * 0.003, Space.LOCAL);

            this.velocity.addInPlace(this.forward.scale(this.throttle * this.throttlePower * dt));
            let forwardVelocity = Vector3.Dot(this.velocity, this.forward);
            let rightVelocity = Vector3.Dot(this.velocity, this.right);
            forwardVelocity *= smoothNSec(1 / dt, this.throttleSmoothNSec);
            rightVelocity *= smoothNSec(1 / dt, 0.5);
            this.velocity = this.forward.scale(forwardVelocity).add(this.right.scale(rightVelocity));

            this.position.addInPlace(this.velocity.scale(0.1));
            if (this.position.y < targetY) {
                let f = smoothNSec(1 / dt, 0.01);
                this.position.y = this.position.y * f + targetY * (1 - f);
            }
            else {
                let f = smoothNSec(1 / dt, 3);
                this.position.y = this.position.y * f + targetY * (1 - f);
            }

            this.rXSpeed *= 0.96;
            this.rZSpeed *= 0.96;
        }

        this.specificUpdate();
    }

    public specificUpdate(): void {
        
    }
}