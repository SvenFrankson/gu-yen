
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Game } from "./Game";
import { Color3, FreeCamera, Matrix, Mesh, MeshBuilder, Ray, StandardMaterial, UniversalCamera } from "@babylonjs/core";
import { MakeStandardMaterial } from "./MaterialUtils";
import { Chunck } from "./voxel-engine/Chunck";
import { BlockType } from "./voxel-engine/BlockType";
import { FloatingBlocksDetector } from "./voxel-engine/FloatingBlocksDetector";
import { Pelleteuse } from "./vehicles/Pelleteuse";
import { Player } from "./Player";
import { QuaternionFromZYAxis } from "babylonjs-geometry-kit";

export class MyCamera extends UniversalCamera {

    public floatingBlocksDetector?: FloatingBlocksDetector;

    public editionMode: number = 0;

    public pointer: Mesh;

    constructor(public player: Player, public game: Game) {
        super("my-camera", new Vector3(0, 64, 0), game.scene);

        this.maxZ = 5000;
        this.minZ = 0.1

        this.speed = 0.2;

        this.pointer = MeshBuilder.CreateBox("pointer", { size: 0.5 }, game.scene);
        let cyanMaterial = MakeStandardMaterial(new Color3(0.5, 1, 1), 0, 0.3);
        cyanMaterial.alpha = 0.5;
        let redMaterial = MakeStandardMaterial(new Color3(1, 0.5, 0.5), 0, 0.3);
        redMaterial.alpha = 0.5;

        this.game.scene.onBeforeRenderObservable.add(this._update);

        window.addEventListener("keydown", (event) => {
            if (event.code === "Space") {
                this.player.fly = !this.player.fly;
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
    }

    public _pointerDown = () => {
        if (this.game.terrain && this.editionMode !== 0) {
            let ray = this._scene.createPickingRay(this._scene.pointerX, this._scene.pointerY, Matrix.Identity(), this);
            let pickInfos = ray.intersectsMeshes(this.player.chuncks.map(c => c.mesh!).filter(m => m));
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
        console.log("Camera position: ", this.position.clone());
        if (this.player.pelleteuse) {
            this.position.copyFrom(this.player.pelleteuse.head.absolutePosition);
            this.position.subtractInPlace(this.player.pelleteuse.head.forward.scale(7));
            this.rotationQuaternion = QuaternionFromZYAxis(this.player.pelleteuse.head.forward, Vector3.Up());
        }
        else {
            this.position.copyFrom(this.player.head.absolutePosition);
            this.rotationQuaternion = QuaternionFromZYAxis(this.player.head.forward, this.player.head.up);
        }
        if (this.game.terrain && this.editionMode !== 0) {
            let ray = this._scene.createPickingRay(this._scene.pointerX, this._scene.pointerY, Matrix.Identity(), this);
            let pickInfos = ray.intersectsMeshes(this.player.chuncks.map(c => c.mesh!).filter(m => m));
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