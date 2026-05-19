import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Game } from "../Game";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Pelleteuse } from "../vehicles/Pelleteuse";
import { Chunck } from "../voxel-engine/Chunck";
import { Ray } from "@babylonjs/core/Culling/ray.core";
import { Vector3, Matrix, TransformNode } from "@babylonjs/core";
import { PlayerAction, PlayerActionDefault } from "./PlayerAction";
import { PlayerActionManager } from "./PlayerActionManager";
import { PlayerActionDelete } from "./PlayerActionDelete";
import { PlayerActionBlock } from "./PlayerActionBlock";
import { PlayerActionTreeGenerator } from "./PlayerActionTreeGenerator";
import { Vehicle } from "../vehicles/Vehicle";
import { Car } from "../vehicles/Car";
import { PlayerActionBall } from "./PlayerActionBall";
import { BlockType } from "../voxel-engine/BlockType";

export class Player extends Mesh {

    public canUsePointerLock: boolean = true;
    public isPointerLocked: boolean = false;

    public playerActionManager: PlayerActionManager;
    public action?: PlayerAction;
    public defaultAction: PlayerActionDefault;

    public head: TransformNode;
    public vehicle: Vehicle | undefined;
    public chuncks: Chunck[] = [];
    public targetPosition?: Vector3;
    public targetSpeed: number = 1;
    public currentSpeed: number = 0;
    public fly: boolean = false;

    public forwardInput: number = 0;
    public backwardInput: number = 0;
    public leftInput: number = 0;
    public rightInput: number = 0;

    public aimedObject: Vehicle | undefined;
    public aimedIJK: { chunck: Chunck, ijk: { i: number, j: number, k: number } } | undefined;

    public get zInput(): number {
        return this.forwardInput - this.backwardInput;
    }

    public get xInput(): number {
        return this.rightInput - this.leftInput;
    }

    constructor(public game: Game) {
        super("player", null);

        this.head = new TransformNode("player-head", game.scene);
        this.head.parent = this;
        this.head.position.y = 1.8;

        this.playerActionManager = new PlayerActionManager(this);
        this.defaultAction = new PlayerActionDefault(this);

        this.playerActionManager.linkAction(1, new PlayerActionBlock(this, BlockType.Grass));
        this.playerActionManager.linkAction(2, new PlayerActionDelete(this));
        this.playerActionManager.linkAction(3, new PlayerActionTreeGenerator(this));
        this.playerActionManager.linkAction(4, new PlayerActionBall(this));
        this.playerActionManager.linkAction(5, new PlayerActionBlock(this, BlockType.MetalPole));

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
                if (this.vehicle instanceof Pelleteuse && !this.vehicle.digging) {
                    this.vehicle.digging = true;
                    this.vehicle.replacing = false;
                }
            }
            else if (event.code === "Space") {
                if (this.vehicle) {
                    this.position.copyFrom(this.vehicle.absolutePosition).addInPlace(this.vehicle.right.scale(-2));
                    this.vehicle.dropControl();
                    this.action = undefined;
                }
                else {
                    this.fly = !this.fly;
                }
            }
            for (let i = 0; i < 10; i++) {
                if (event.code === "Digit" + i) {
                    let action = this.playerActionManager.actions[i];
                    if (action) {
                        if (!action.equiped) {
                            action.equip();
                        }
                        else if (action.equiped) {
                            action.unEquip();
                        }
                    }
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
                if (this.vehicle instanceof Pelleteuse) {
                    this.vehicle.digging = false;       
                }
                else if (this.aimedObject) {
                    this.aimedObject.takeControl(this);
                    this.action = undefined;
                }
            }
        });

        this.game.canvas.addEventListener("pointerdown", this._pointerDown);
        this.game.canvas.addEventListener("pointerup", this._pointerUp);
        this.game.canvas.addEventListener("pointermove", this._pointerMove);

        let updatePointerLockState = () => {
            if (document.pointerLockElement === this.game.canvas) {
                this.isPointerLocked = true;
            }
            else {
                this.isPointerLocked = false;
            }
        };
        document.addEventListener("pointerlockchange", () => {
            updatePointerLockState();
            requestAnimationFrame(updatePointerLockState);
        });
        
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

            if (this.vehicle) {
                this.position.copyFrom(this.vehicle.position);
                this.rotation.copyFrom(this.vehicle.rotation);
            }
            else {
                if (this.fly) {
                    this.position.addInPlace(this.head.forward.scale(this.zInput * 0.1));
                }
                else {
                    this.position.addInPlace(this.forward.scale(this.zInput * 0.1));
                }
                this.position.addInPlace(this.right.scale(this.xInput * 0.1));

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

            this.defaultAction.update();
            if (this.action) {
                this.action.update();
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
                if (this.vehicle instanceof Pelleteuse && !this.vehicle.digging) {
                    this.vehicle.digging = true;
                    this.vehicle.replacing = false;
                }
            }
        }
        this._pointerIsDown = true;
        
        let defaultActionValue = this.defaultAction.pointerDown(e);
        if (!defaultActionValue && this.action) {
            this.action.pointerDown(e);
        }
    }

    private _pointerUp = (e: PointerEvent) => {
        if (this.canUsePointerLock) {
            if (this.isPointerLocked) {
                if (this.vehicle instanceof Pelleteuse) {
                    this.vehicle.digging = false;
                }
            }
        }
        this._pointerIsDown = false;
        let defaultActionValue = this.defaultAction.pointerUp(e);
        if (!defaultActionValue && this.action) {
            this.action.pointerUp(e);
        }
    }

    private _pointerMove = (e: PointerEvent) => {
        let movementX = Math.max(-10, Math.min(10, e.movementX));
        let movementY = Math.max(-10, Math.min(10, e.movementY));
        if (this.isPointerLocked || this._pointerIsDown) {
            if (this.vehicle instanceof Pelleteuse) {
                if (this.vehicle.digging) {
                    this.vehicle.cabine.rotation.y += movementX * 0.0005;
                    this.vehicle.head.rotation.x += movementY * 0.002;
                }
                else {
                    this.vehicle.cabine.rotation.y += movementX * 0.004;
                    this.vehicle.head.rotation.x += movementY * 0.004;
                }

                if (movementY > 0) {
                    this.vehicle.replacing = false;
                }
                else if (movementY < 0) {
                    this.vehicle.replacing = true;
                }
            }
            else if (this.vehicle instanceof Car) {
                this.vehicle.head.rotation.y += movementX * 0.0005;
                this.vehicle.head.rotation.x += movementY * 0.002;
            }
            else {
                this.rotation.y += movementX * 0.004;
                this.head.rotation.x += movementY * 0.004;
            }
        }
        let defaultActionValue = this.defaultAction.pointerMove(e);
        if (!defaultActionValue && this.action) {
            this.action.pointerMove(e);
        }
    }
}