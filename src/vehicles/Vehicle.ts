import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { GetGLTFMeshDataArray } from "../VertexDataUtils";
import { Color3, MeshBuilder, PhysicsBody, PhysicsMotionType, PhysicsShapeConvexHull, Plane, Ray, Space, StandardMaterial, Vector3 } from "@babylonjs/core";
import { Game } from "../Game";
import { Chunck } from "../voxel-engine/Chunck";
import { Angle, AngleFromToAround, Rotate, RotateInPlace } from "babylonjs-geometry-kit";
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
    
    public width: number = 2;
    public length: number = 4;
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
            dt = Math.min(dt, 1 / 60);

            let grounded = false;
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

                let p00 = Vector3.TransformCoordinates(new Vector3(-this.width * 0.5, 2, -this.length * 0.5), this.getWorldMatrix());
                let p10 = Vector3.TransformCoordinates(new Vector3(this.width * 0.5, 2, -this.length * 0.5), this.getWorldMatrix());
                let p01 = Vector3.TransformCoordinates(new Vector3(-this.width * 0.5, 2, this.length * 0.5), this.getWorldMatrix());
                let p11 = Vector3.TransformCoordinates(new Vector3(this.width * 0.5, 2, this.length * 0.5), this.getWorldMatrix());
                
                let ray00 = new Ray(p00, this.up.scale(-1), 4);
                let ray10 = new Ray(p10, this.up.scale(-1), 4);
                let ray01 = new Ray(p01, this.up.scale(-1), 4);
                let ray11 = new Ray(p11, this.up.scale(-1), 4);
                
                let intersect00: Vector3 | null = null;
                let intersect10: Vector3 | null = null;
                let intersect01: Vector3 | null = null;
                let intersect11: Vector3 | null = null;

                let dig00: number = 2 + this.height;
                let dig10: number = 2 + this.height;
                let dig01: number = 2 + this.height;
                let dig11: number = 2 + this.height;

                for (let chunck of chuncks) {
                    if (!intersect00) {
                        let hit00 = ray00.intersectsMesh(chunck.mesh!, false);
                        if (hit00 && hit00.pickedPoint) {
                            intersect00 = hit00.pickedPoint;
                            dig00 = Vector3.Distance(hit00.pickedPoint, p00);
                        }
                    }
                    if (!intersect10) {
                        let hit10 = ray10.intersectsMesh(chunck.mesh!, false);
                        if (hit10 && hit10.pickedPoint) {
                            intersect10 = hit10.pickedPoint;
                            dig10 = Vector3.Distance(hit10.pickedPoint, p10);
                        }
                    }
                    if (!intersect01) {
                        let hit01 = ray01.intersectsMesh(chunck.mesh!, false);
                        if (hit01 && hit01.pickedPoint) {
                            intersect01 = hit01.pickedPoint;
                            dig01 = Vector3.Distance(hit01.pickedPoint, p01);
                        }
                    }
                    if (!intersect11) {
                        let hit11 = ray11.intersectsMesh(chunck.mesh!, false);
                        if (hit11 && hit11.pickedPoint) {
                            intersect11 = hit11.pickedPoint;
                            dig11 = Vector3.Distance(hit11.pickedPoint, p11);
                        }
                    }
                }

                let avgY = 0;
                let count = 0;
                if (intersect00) {
                    avgY += intersect00.y;
                    count++;
                }
                if (intersect10) {
                    avgY += intersect10.y;
                    count++;
                }
                if (intersect01) {
                    avgY += intersect01.y;
                    count++;
                }
                if (intersect11) {
                    avgY += intersect11.y;
                    count++;
                }

                if (count > 0) {
                grounded = true;
                    avgY /= count;
                    targetY = avgY + this.height;
                }

                this.rZSpeed += 20 * dt * (dig00 - dig10);
                this.rZSpeed += 20 * dt * (dig01 - dig11);
                this.rXSpeed += 20 * dt * (dig01 - dig00);
                this.rXSpeed += 20 * dt * (dig11 - dig10);
            }

            this.rYSpeed += this.turn * this.turnPower * dt;
            this.rYSpeed *= smoothNSec(1 / dt, 1);

            this.velocity.addInPlace(this.forward.scale(this.throttle * this.throttlePower * dt));
            let rightVelocity = Vector3.Dot(this.velocity, this.right);
            rightVelocity *= smoothNSec(1 / dt, 0.5);
            let upVelocity = Vector3.Dot(this.velocity, this.up);
            //upVelocity *= smoothNSec(1 / dt, 10);
            let forwardVelocity = Vector3.Dot(this.velocity, this.forward);
            forwardVelocity *= smoothNSec(1 / dt, this.throttleSmoothNSec);

            this.velocity = this.forward.scale(forwardVelocity).add(this.right.scale(rightVelocity)).add(this.up.scale(upVelocity));
            this.velocity.y -= 9.81 * dt;
            if (this.position.y < targetY) {
                this.velocity.y += 100 * (targetY - this.position.y) * dt;
                if (this.velocity.y < 0) {
                    this.velocity.y = - this.velocity.y * 0.1;
                }
                //this.position.y = targetY;
            }

            grounded = grounded && this.position.y <= targetY + 0.1;
            this.rXSpeed *= smoothNSec(1 / dt, 0.2);
            this.rZSpeed *= smoothNSec(1 / dt, 0.2);

            this.position.addInPlace(this.velocity.scale(dt));
            this.rotate(Vector3.Up(), this.rYSpeed * dt, Space.LOCAL);
            this.rotate(Vector3.Right(), this.rXSpeed * dt, Space.LOCAL);
            this.rotate(Vector3.Forward(), this.rZSpeed * dt, Space.LOCAL);

            let axis = Vector3.Cross(Vector3.Up(), this.up).normalize();
            let a = AngleFromToAround(Vector3.Up(), this.up, axis);
            if (a > Math.PI / 3) {
                this.rotate(axis, Math.PI / 3 - a, Space.WORLD);
            }
        }

        this.specificUpdate();
    }

    public specificUpdate(): void {
        
    }
}