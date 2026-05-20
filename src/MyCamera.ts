
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Game } from "./Game";
import { Color3, FreeCamera, Matrix, Mesh, MeshBuilder, PassPostProcess, Ray, RenderTargetTexture, StandardMaterial, UniversalCamera } from "@babylonjs/core";
import { MakeStandardMaterial } from "./MaterialUtils";
import { Chunck } from "./voxel-engine/Chunck";
import { BlockType } from "./voxel-engine/BlockType";
import { FloatingBlocksDetector } from "./voxel-engine/FloatingBlocksDetector";
import { Pelleteuse } from "./vehicles/Pelleteuse";
import { Player } from "./player/Player";
import { QuaternionFromZYAxis } from "babylonjs-tiaratumgames-tools";
import { OutlinePostProcess } from "./OutlinePostProcess";
import { Vehicle } from "./vehicles/Vehicle";

export var NO_OUTLINE_LAYERMASK = 0x10000000;

export class MyCamera extends UniversalCamera {

    public editionMode: number = 0;
    public noOutlineCamera?: FreeCamera;

    public pointer: Mesh;

    constructor(public player: Player, public game: Game, public useOutline: boolean = true) {
        super("my-camera", new Vector3(0, 64, 0), game.scene);

        this.maxZ = 2000;
        this.minZ = 0.2;

        this.speed = 0.2;

        this.pointer = MeshBuilder.CreateBox("pointer", { size: 0.5 }, game.scene);
        let cyanMaterial = MakeStandardMaterial(new Color3(0.5, 1, 1), 0, 0.3);
        cyanMaterial.alpha = 0.5;
        let redMaterial = MakeStandardMaterial(new Color3(1, 0.5, 0.5), 0, 0.3);
        redMaterial.alpha = 0.5;

        this.game.scene.onBeforeRenderObservable.add(this._update);

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

        this.initOutline();
    }

    public initOutline(): void {
        if (this.useOutline) {
            try {
                const rtt = new RenderTargetTexture('render target', { width: this.game.engine.getRenderWidth(), height: this.game.engine.getRenderHeight() }, this.game.scene);
                rtt.samples = 1;
                this.outputRenderTarget = rtt;
        
                this.noOutlineCamera = new FreeCamera(
                    "no-outline-camera",
                    Vector3.Zero(),
                    this.game.scene
                );

                this.noOutlineCamera.minZ = 0.2;
                this.noOutlineCamera.maxZ = 2000;
                this.noOutlineCamera.layerMask = NO_OUTLINE_LAYERMASK;
                this.noOutlineCamera.parent = this;
        
                let postProcess = OutlinePostProcess.AddOutlinePostProcess(this);
                //let postProcess = new PassPostProcess("pass-test", 1, this);
                postProcess.onSizeChangedObservable.add(() => {
                    if (!postProcess.inputTexture.depthStencilTexture) {
                        postProcess.inputTexture.createDepthStencilTexture(0, true, false, 4);
                        postProcess.inputTexture.shareDepth(rtt.renderTarget!);
                    }
                });
                
                const pp = new PassPostProcess("pass", 1, this.noOutlineCamera);
                pp.inputTexture = rtt.renderTarget!;
                pp.autoClear = false;

                this.game.engine.onResizeObservable.add(() => {
                    //console.log("w " + this.game.engine.getRenderWidth());
                    //console.log("h " + this.game.engine.getRenderHeight());
                    //postProcess.getEffect().setFloat("width", this.game.engine.getRenderWidth());
                    //postProcess.getEffect().setFloat("height", this.game.engine.getRenderHeight());
                    rtt.resize({ width: this.game.engine.getRenderWidth(), height: this.game.engine.getRenderHeight() });
                    postProcess.inputTexture.createDepthStencilTexture(0, true, false, 4);
                    postProcess.inputTexture.shareDepth(rtt.renderTarget!);
                    this.outputRenderTarget = rtt;
                    pp.inputTexture = rtt.renderTarget!;
                });

                this.game.scene.activeCameras = [this, this.noOutlineCamera];
            }
            catch (e) {
                console.error(e);
            }
        }
        else {
            this.layerMask |= NO_OUTLINE_LAYERMASK;
        }
    }

    public _pointerDown = () => {
        
    }

    private _update = () => {
        if (this.player.vehicle instanceof Vehicle) {
            this.position.copyFrom(this.player.vehicle.head.absolutePosition);
            this.position.subtractInPlace(this.player.vehicle.head.forward.scale(7));
            this.rotationQuaternion = QuaternionFromZYAxis(this.player.vehicle.head.forward, Vector3.Up());
        }
        else {
            this.position.copyFrom(this.player.head.absolutePosition);
            this.rotationQuaternion = QuaternionFromZYAxis(this.player.head.forward, this.player.head.up);
        }
        if (this.game.terrain && this.editionMode !== 0) {
            let ray = this._scene.createPickingRay(this._scene.pointerX, this._scene.pointerY, Matrix.Identity(), this);
            let pickInfos = ray.intersectsMeshes(this.player.chuncks.flatMap(c => c.meshes!).filter(m => m));
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