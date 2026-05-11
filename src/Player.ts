import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Game } from "./Game";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { IPelleteuse, Pelleteuse, PelleteusePart } from "./vehicles/Pelleteuse";
import { Chunck } from "./voxel-engine/Chunck";
import { Ray } from "@babylonjs/core/Culling/ray.core";
import { Vector3, Matrix, TransformNode } from "@babylonjs/core";

export class Player extends Mesh {

    public canUsePointerLock: boolean = true;
    public isPointerLocked: boolean = false;

    public head: TransformNode;
    public pelleteuse: Pelleteuse | undefined;
    public chuncks: Chunck[] = [];
    public targetPosition?: Vector3;
    public targetSpeed: number = 1;
    public currentSpeed: number = 0;
    public fly: boolean = false;

    public forwardInput: number = 0;
    public backwardInput: number = 0;
    public leftInput: number = 0;
    public rightInput: number = 0;

    public aimedObject: Pelleteuse | undefined;

    public get zInput(): number {
        return this.forwardInput - this.backwardInput;
    }

    public get xInput(): number {
        return this.rightInput - this.leftInput;
    }

    constructor(public game: Game) {
        super("player", null);

        MeshBuilder.CreateSphere("player-visual", { diameter: 0.5 }, game.scene).parent = this;
        this.head = new TransformNode("player-head", game.scene);
        this.head.parent = this;
        this.head.position.y = 1.8;

        this.game.scene.onBeforeRenderObservable.add(this._update);

        this.game.canvas.addEventListener("keydown", (event) => {
            if (event.code === "KeyW") {
                this.forwardInput = 1;
            }
            else if (event.code === "KeyS") {
                this.backwardInput = 1;
            }
            else if (event.code === "KeyA") {
                this.leftInput = 1;
            }
            else if (event.code === "KeyD") {
                this.rightInput = 1;
            }
            else if (event.code === "KeyE") {
                if (this.pelleteuse && !this.pelleteuse.digging) {
                    this.pelleteuse.digging = true;
                    this.pelleteuse.replacing = false;
                }
            }
            else if (event.code === "Space") {
                if (this.pelleteuse) {
                    this.position.copyFrom(this.pelleteuse.cabine.absolutePosition).addInPlace(this.pelleteuse.cabine.right.scale(-2));
                    this.pelleteuse.dropControl();
                }
            }
        });
        
        this.game.canvas.addEventListener("keyup", (event) => {
            if (event.code === "KeyW") {
                this.forwardInput = 0;
            }
            else if (event.code === "KeyS") {
                this.backwardInput = 0;
            }
            else if (event.code === "KeyA") {
                this.leftInput = 0;
            }
            else if (event.code === "KeyD") {
                this.rightInput = 0;
            }
            else if (event.code === "KeyE") {
                if (this.pelleteuse) {
                    this.pelleteuse.digging = false;       
                }
                else if (this.aimedObject) {
                    this.aimedObject.takeControl(this);
                }
            }
        });

        this.game.canvas.addEventListener("pointerdown", this._pointerDown);
        this.game.canvas.addEventListener("pointerup", this._pointerUp);
        this.game.canvas.addEventListener("pointermove", this._pointerMove);
        
        let lastPosString = localStorage.getItem("last-pos");
        if (lastPosString) {
            let lastPos = JSON.parse(lastPosString);
            if (lastPos.length === 6) {
                this.position = new Vector3(lastPos[0], lastPos[1], lastPos[2]);
                this.rotation = new Vector3(lastPos[3], lastPos[4], lastPos[5]);
            }
        }
    }

    private _update = () => {
        if (this.game.terrain) {
            localStorage.setItem("last-pos", JSON.stringify([this.absolutePosition.x, this.absolutePosition.y, this.absolutePosition.z, this.rotation.x, this.rotation.y, this.rotation.z]));

            let ijk = this.game.terrain.getChunckAndIJKAtPos(this.position, 0, false);
            this.chuncks = [];
            if (ijk) {
                let chunck = ijk.chunck;
                this.chuncks = [chunck];
                let i0 = ijk.ijk.i < this.game.terrain.chunckLengthIJ * 0.5 ? -1 : 0;
                let j0 = ijk.ijk.j < this.game.terrain.chunckLengthIJ * 0.5 ? -1 : 0;
                for (let i = i0; i <= i0 + 1; i++) {
                    for (let j = j0; j <= j0 + 1; j++) {
                        if (i != 0 || j != 0) {
                            let c = this.game.terrain.getChunck(chunck.level, chunck.iPos + i, chunck.jPos + j);
                            if (c) {
                                this.chuncks.push(c);
                            }
                        }
                    }
                }
            }

            if (this.pelleteuse) {
                this.position.copyFrom(this.pelleteuse.position);
                this.rotation.copyFrom(this.pelleteuse.rotation);
            }
            else {
                this.position.addInPlace(this.forward.scale(this.zInput * 0.1));
                this.position.addInPlace(this.right.scale(this.xInput * 0.1));

                let aimRay = new Ray(this.head.absolutePosition, this.head.forward, 10);
                let aimPickInfo = this.game.scene.pickWithRay(aimRay, (mesh) => {
                    return mesh instanceof PelleteusePart;
                });
                if (aimPickInfo && aimPickInfo.pickedMesh instanceof PelleteusePart) {
                    this.aimedObject = aimPickInfo.pickedMesh.pelleteuse;
                }
                else {
                    this.aimedObject = undefined;
                }

                let ray = new Ray(this.position.add(new Vector3(0, 1.8, 0)), Vector3.Down(), 500);
                if (!this.targetPosition) {
                    ray.direction.x += 0.1 * Math.random() - 0.05;
                    ray.direction.z += 0.1 * Math.random() - 0.05;
                    ray.direction.normalize();
                }
                let pickInfos = ray.intersectsMeshes(this.chuncks.map(c => c.mesh!).filter(m => m));
                for (let pickInfo of pickInfos) {
                    if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                        this.targetPosition = pickInfo.pickedPoint;
                    }
                }

                if (this.targetPosition && !this.fly) {
                    Vector3.LerpToRef(this.position, this.targetPosition, 0.1, this.position);
                    if (this.position.y < this.targetPosition.y - 0.5) {
                        this.position.y = this.targetPosition.y - 0.5;
                    }
                }
            }
        }
    }

    private _pointerIsDown: boolean = false;
    private _pointerDown = (e: PointerEvent) => {
        if (this.canUsePointerLock) {
            this.game.canvas.requestPointerLock().then(() => {
                this.isPointerLocked = true;
            });
            if (this.isPointerLocked) {
                if (this.pelleteuse && !this.pelleteuse.digging) {
                    this.pelleteuse.digging = true;
                    this.pelleteuse.replacing = false;
                }
            }
        }
        this._pointerIsDown = true;
    }

    private _pointerUp = (e: PointerEvent) => {
        if (this.canUsePointerLock) {
            if (this.isPointerLocked) {
                if (this.pelleteuse) {
                    this.pelleteuse.digging = false;
                }
            }
        }
        this._pointerIsDown = false;
    }

    private _pointerMove = (e: PointerEvent) => {
        if (this.isPointerLocked || this._pointerIsDown) {
            if (this.pelleteuse) {
                if (this.pelleteuse.digging) {
                    this.pelleteuse.cabine.rotation.y += e.movementX * 0.0005;
                    this.pelleteuse.head.rotation.x += e.movementY * 0.002;
                }
                else {
                    this.pelleteuse.cabine.rotation.y += e.movementX * 0.004;
                    this.pelleteuse.head.rotation.x += e.movementY * 0.004;
                }

                if (e.movementY > 0) {
                    this.pelleteuse.replacing = false;
                }
                else if (e.movementY < 0) {
                    this.pelleteuse.replacing = true;
                }
            }
            else {
                this.rotation.y += e.movementX * 0.004;
                this.head.rotation.x += e.movementY * 0.004;
            }
        }
    }
}