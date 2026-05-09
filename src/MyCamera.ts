
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Game } from "./Game";
import { Color3, FreeCamera, Matrix, Mesh, MeshBuilder, Ray, StandardMaterial, UniversalCamera } from "@babylonjs/core";
import { MakeStandardMaterial } from "./MaterialUtils";
import { Chunck } from "./voxel-engine/Chunck";
import { BlockType } from "./voxel-engine/BlockType";
import { FloatingBlocksDetector } from "./voxel-engine/FloatingBlocksDetector";

export class MyCamera extends UniversalCamera {

    public targetPosition?: Vector3;
    public targetSpeed: number = 1;
    public currentSpeed: number = 0;
    public fly: boolean = false;
    public chuncks: Chunck[] = [];
    public floatingBlocksDetector?: FloatingBlocksDetector;

    public editionMode: number = 0;

    public pointer: Mesh;

    constructor(public game: Game) {
        super("my-camera", new Vector3(0, 64, 0), game.scene);

        this.maxZ = 5000;
        this.minZ = 0.1

        this.speed = 0.2;
        console.log(this.speed);

        this.pointer = MeshBuilder.CreateBox("pointer", { size: 0.5 }, game.scene);
        let cyanMaterial = MakeStandardMaterial(new Color3(0.5, 1, 1), 0, 0.3);
        cyanMaterial.alpha = 0.5;
        let redMaterial = MakeStandardMaterial(new Color3(1, 0.5, 0.5), 0, 0.3);
        redMaterial.alpha = 0.5;

        this.attachControl(game.engine.getRenderingCanvas(), true);
        this.game.scene.onBeforeRenderObservable.add(this._update);

        window.addEventListener("keydown", (event) => {
            if (event.code === "Space") {
                this.fly = !this.fly;
                this.speed = this.fly ? 1 : 0.2;
            }
        });

        this.game.canvas.addEventListener("pointerdown", this._pointerDown);

        document.getElementById("add-concrete")?.addEventListener("click", () => {
            if (this.editionMode === 1) {
                this.editionMode = 0;
            }
            else {
                this.editionMode = 1;
                this.pointer.material = cyanMaterial;
                this.pointer.scaling.copyFromFloats(0.95, 0.95, 0.95);
            }
        });

        document.getElementById("remove-block")?.addEventListener("click", () => {
            if (this.editionMode === 2) {
                this.editionMode = 0;
            }
            else {
                this.editionMode = 2;
                this.pointer.material = redMaterial;
                this.pointer.scaling.copyFromFloats(1.05, 1.05, 1.05);
            }
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

    public _pointerDown = () => {
        if (this.game.terrain && this.editionMode !== 0) {
            let ray = this._scene.createPickingRay(this._scene.pointerX, this._scene.pointerY, Matrix.Identity(), this);
            let pickInfos = ray.intersectsMeshes(this.chuncks.map(c => c.mesh!).filter(m => m));
            for (let pickInfo of pickInfos) {
                if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                    let p = pickInfo.pickedPoint;
                    if (this.editionMode === 1) {
                        p.addInPlace(pickInfo.getNormal(true)!.scale(0.2));
                    }
                    else if (this.editionMode === 2) {
                        p.subtractInPlace(pickInfo.getNormal(true)!.scale(0.2));
                    }
                    let ijk = this.game.terrain.getChunckAndIJKAtPos(p, 0, false);
                    if (ijk) {
                        let block = BlockType.WhiteConcrete;
                        if (this.editionMode === 2) {
                            block = BlockType.None;
                            if (!this.floatingBlocksDetector) {
                                this.floatingBlocksDetector = new FloatingBlocksDetector(this.game.terrain!);
                            }
                        }
                        let chunck = ijk.chunck;
                        let affectedChuncks = chunck.setData(block, ijk.ijk.i, ijk.ijk.j, ijk.ijk.k);
                        if (this.editionMode === 2) {
                            let floatingChunks = this.floatingBlocksDetector?.findFloatingBlocks(chunck.iPos * this.game.terrain!.chunckLengthIJ + ijk.ijk.i, chunck.jPos * this.game.terrain!.chunckLengthIJ + ijk.ijk.j, ijk.ijk.k);
                            if (floatingChunks) {
                                affectedChuncks.push(...floatingChunks.array);
                            }
                        }
                        affectedChuncks.forEach(c => c.redrawMesh(true));
                    }
                }
            }
        }
    }

    private _update = () => {
        if (this.game.terrain) {
            localStorage.setItem("last-pos", JSON.stringify([this.position.x, this.position.y, this.position.z, this.rotation.x, this.rotation.y, this.rotation.z]));

            let ray = new Ray(this.position.add(new Vector3(0, 1.8, 0)), Vector3.Down(), 500);
            if (!this.targetPosition) {
                ray.direction.x += 0.1 * Math.random() - 0.05;
                ray.direction.z += 0.1 * Math.random() - 0.05;
                ray.direction.normalize();
            }
            let ijk = this.game.terrain.getChunckAndIJKAtPos(this.position, 0, false);
            if (ijk) {
                let chunck = ijk.chunck;
                this.chuncks = [chunck];
                if (ijk.ijk.i < this.chuncks[0].chunckLengthIJ * 0.5) {
                    let leftChunck = this.game.terrain.getChunck(chunck.level, chunck.iPos - 1, chunck.jPos);
                    if (leftChunck) {
                        this.chuncks.push(leftChunck);
                    }
                }
                else {
                    let rightChunck = this.game.terrain.getChunck(chunck.level, chunck.iPos + 1, chunck.jPos);
                    if (rightChunck) {
                        this.chuncks.push(rightChunck);
                    }
                }
                if (ijk.ijk.j < this.chuncks[0].chunckLengthIJ * 0.5) {
                    let topChunck = this.game.terrain.getChunck(chunck.level, chunck.iPos, chunck.jPos - 1);
                    if (topChunck) {
                        this.chuncks.push(topChunck);
                    }
                }
                else {
                    let bottomChunck = this.game.terrain.getChunck(chunck.level, chunck.iPos, chunck.jPos + 1);
                    if (bottomChunck) {
                        this.chuncks.push(bottomChunck);
                    }
                }
                let pickInfos = ray.intersectsMeshes(this.chuncks.map(c => c.mesh!).filter(m => m));
                for (let pickInfo of pickInfos) {
                    if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                        this.targetPosition = pickInfo.pickedPoint.add(new Vector3(0, 1.8, 0));
                    }
                }
            }
        }

        if (this.targetPosition && !this.fly) {
            Vector3.LerpToRef(this.position, this.targetPosition, 0.1, this.position);
            if (this.position.y < this.targetPosition.y - 0.5) {
                this.position.y = this.targetPosition.y - 0.5;
            }
        }

        if (this.game.terrain && this.editionMode !== 0) {
            let ray = this._scene.createPickingRay(this._scene.pointerX, this._scene.pointerY, Matrix.Identity(), this);
            let pickInfos = ray.intersectsMeshes(this.chuncks.map(c => c.mesh!).filter(m => m));
            for (let pickInfo of pickInfos) {
                if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                    let p = pickInfo.pickedPoint;
                    if (this.editionMode === 1) {
                        p.addInPlace(pickInfo.getNormal(true)!.scale(0.2));
                    }
                    else if (this.editionMode === 2) {
                        p.subtractInPlace(pickInfo.getNormal(true)!.scale(0.2));
                    }
                    let ijk = this.game.terrain.getChunckAndIJKAtPos(p, 0, false);
                    if (ijk) {
                        this.pointer.position = ijk.chunck.getPosAtIJK(ijk.ijk);
                        this.pointer.isVisible = true;
                        return;
                    }
                }
            }
        }
        this.pointer.isVisible = false;
    }
}